import { Database } from './db.js';
import { S3Manager } from './s3.js';
import { BrowserManager } from './browser.js';
import { LLMClient } from './llm.js';
import type { Job, JobContext, JobResult } from '../types.js';

export class JobExecutor {
  constructor(
    private db: Database,
    private s3: S3Manager
  ) {}

  async loadContext(job: Job): Promise<JobContext> {
    console.log(`[Job ${job.id}] Loading context for user ${job.user_id}`);

    // Fetch user
    const user = await this.db.getUser(job.user_id);
    if (!user) {
      throw new Error(`User not found: ${job.user_id}`);
    }

    // Fetch conversation if exists
    let conversation = null;
    let messages: any[] = [];
    if (job.conversation_id) {
      conversation = await this.db.getConversation(job.conversation_id);
      if (conversation) {
        messages = await this.db.getMessages(job.conversation_id);
      }
    }

    // Get latest snapshot key (if exists)
    const snapshot = await this.db.getLatestSnapshot(job.id);
    const snapshotKey = snapshot?.s3_key || null;

    return {
      user,
      conversation,
      messages,
      snapshotKey,
    };
  }

  async execute(job: Job): Promise<void> {
    const workspacePath = `/tmp/workspace/${job.id}`;

    try {
      // Load context
      const context = await this.loadContext(job);

      // Download filesystem if snapshot exists
      if (context.snapshotKey) {
        await this.s3.downloadAndUnzip(context.snapshotKey, workspacePath);
      }

      // Execute job based on type
      const result = await this.executeTask(job, context, workspacePath);

      // Upload modified filesystem (if exists)
      if (result.success) {
        const newS3Key = `state/${context.user.id}/${job.id}/fs-v${Date.now()}.zip`;
        await this.s3.zipAndUpload(workspacePath, newS3Key);
        await this.db.createSnapshot(job.id, newS3Key, 1);
      }

      // Log usage if applicable
      if (result.tokensIn || result.tokensOut) {
        await this.db.logUsage(
          context.user.id,
          job.id,
          result.tokensIn || 0,
          result.tokensOut || 0,
          result.cost || 0,
          'claude-sonnet-4' // TODO: Get from job config
        );
      }

      // Mark job complete
      await this.db.completeJob(job.id, {
        success: true,
        output: result.output,
        tokens_in: result.tokensIn,
        tokens_out: result.tokensOut,
        cost: result.cost,
      });
    } catch (error: any) {
      console.error(`[Job ${job.id}] Execution failed:`, error);
      await this.db.failJob(job.id, error.message);
    } finally {
      // Cleanup workspace
      await this.s3.cleanup(workspacePath);
    }
  }

  private async executeTask(job: Job, context: JobContext, workspacePath: string): Promise<JobResult> {
    console.log(`[Job ${job.id}] Executing task type: ${job.type}`);

    switch (job.type) {
      case 'CHAT':
        return this.executeChatTask(job, context);
      case 'COMPUTER_USE':
        // COMPUTER_USE jobs are handled by the OpenClaw adapter (openclaw-adapter.ts).
        // If they reach this executor, it means we're running without OpenClaw —
        // fall back to a chat-based response explaining we can't perform the action.
        return this.executeComputerUseFallback(job, context);
      case 'RESEARCH':
        return this.executeResearchTask(job, context);
      case 'ECHO':
        return this.executeEchoTask(job);
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }
  }

  private async executeChatTask(job: Job, context: JobContext): Promise<JobResult> {
    console.log(`[Job ${job.id}] Executing CHAT task`);
    console.log(`Message: ${job.input_payload.message || job.input_payload.originalRequest}`);
    console.log(`Conversation history: ${context.messages.length} messages`);

    const llm = new LLMClient();

    try {
      // Build system prompt
      const systemPrompt = `You are EasyClaw, an AI assistant helping with the following task:
${job.input_payload.taskDescription || job.input_payload.message}

Provide a helpful, complete response.`;

      // Build conversation history
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt }
      ];

      // Add conversation history (last 10 messages for context)
      const recentMessages = context.messages.slice(-10);
      for (const msg of recentMessages) {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        });
      }

      // Add current message if not already in history
      const userMessage = job.input_payload.originalRequest || job.input_payload.message;
      if (userMessage) {
        messages.push({
          role: 'user',
          content: userMessage,
        });
      }

      // Get AI response
      console.log(`[Job ${job.id}] Invoking LLM with ${messages.length} messages`);
      const response = await llm.chat(messages);

      // Store response as message
      if (context.conversation) {
        await this.db.createMessage(
          context.conversation.id,
          'assistant',
          response
        );
      }

      // Estimate token usage (rough estimate)
      const tokensIn = messages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0);
      const tokensOut = Math.ceil(response.length / 4);
      const cost = (tokensIn * 0.000003) + (tokensOut * 0.000015); // Rough Claude pricing

      return {
        success: true,
        output: {
          message: response,
          timestamp: new Date().toISOString(),
        },
        tokensIn,
        tokensOut,
        cost,
      };
    } catch (error: any) {
      console.error(`[Job ${job.id}] LLM error:`, error);
      return {
        success: false,
        error: error.message,
        output: {
          error: 'Failed to generate response',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  private async executeResearchTask(job: Job, context: JobContext): Promise<JobResult> {
    console.log(`[Job ${job.id}] Executing RESEARCH task`);

    const browser = new BrowserManager();

    try {
      await browser.initialize();

      const query = job.input_payload.query || job.input_payload.message;
      if (!query) {
        throw new Error('No query provided for research task');
      }

      console.log(`[Job ${job.id}] Searching for: ${query}`);

      // Perform search
      const searchResults = await browser.search(query);

      console.log(`[Job ${job.id}] Found ${searchResults.length} results`);

      // Visit top result and get snapshot
      let pageSnapshot = null;
      if (searchResults.length > 0) {
        const topResult = searchResults[0];
        console.log(`[Job ${job.id}] Visiting top result: ${topResult.url}`);

        try {
          await browser.navigate(topResult.url);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for page to load
          pageSnapshot = await browser.snapshot();
        } catch (err) {
          console.error(`[Job ${job.id}] Failed to visit result:`, err);
        }
      }

      return {
        success: true,
        output: {
          query,
          searchResults,
          pageSnapshot,
          timestamp: new Date().toISOString(),
        },
        tokensIn: 200,
        tokensOut: 800,
        cost: 0.01,
      };
    } finally {
      await browser.close();
    }
  }

  private async executeComputerUseFallback(job: Job, context: JobContext): Promise<JobResult> {
    console.log(`[Job ${job.id}] COMPUTER_USE fallback (no OpenClaw adapter)`);

    const instruction = job.input_payload.instruction || job.input_payload.taskDescription || 'Unknown task';
    const reply = `Computer-use task "${instruction}" requires the OpenClaw adapter which is not available on this worker. The task has been marked as failed. Please ensure the OpenClaw-enabled workers are running.`;

    if (context.conversation) {
      await this.db.createMessage(context.conversation.id, 'assistant', reply);
    }

    return {
      success: false,
      error: 'OpenClaw adapter not available on this worker',
      output: { message: reply, timestamp: new Date().toISOString() },
    };
  }

  private async executeEchoTask(job: Job): Promise<JobResult> {
    console.log(`[Job ${job.id}] Executing ECHO task`);

    return {
      success: true,
      output: {
        echo: job.input_payload,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
