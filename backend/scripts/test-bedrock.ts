
import { ChatBedrockConverse } from "@langchain/aws";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const MODEL_ID = "us.anthropic.claude-opus-4-6-v1";

async function main() {
    console.log("Initializing model:", MODEL_ID);
    const model = new ChatBedrockConverse({
        model: MODEL_ID,
        region: "us-east-1",
        maxTokens: 1024,
    });

    const systemPrompt = "You are a helpful assistant.";
    const message = "Hello, can you help me?";

    const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(message)
    ];

    try {
        console.log("Invoking model...");
        const response = await model.invoke(messages);
        console.log("Response:", response);
    } catch (error: any) {
        console.error("Error invoking model:");
        console.error(JSON.stringify(error, null, 2));
        if (error.$metadata) {
             console.error("AWS Metadata:", error.$metadata);
        }
    }
}

main();
