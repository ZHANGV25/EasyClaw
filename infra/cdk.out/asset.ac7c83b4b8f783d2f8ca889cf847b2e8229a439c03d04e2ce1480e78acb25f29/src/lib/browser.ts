import { chromium, type Browser, type Page, type BrowserContext } from 'playwright-core';

export interface BrowserSnapshot {
  url: string;
  title: string;
  content: string;
  screenshot?: string;
}

export interface BrowserSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  async initialize() {
    console.log('[Browser] Initializing Chromium...');

    // Use system Chromium if available (in Docker container)
    const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined;

    this.browser = await chromium.launch({
      headless: true,
      executablePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    });

    this.page = await this.context.newPage();
    console.log('[Browser] Initialized successfully');
  }

  async navigate(url: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    console.log(`[Browser] Navigating to: ${url}`);
    await this.page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
  }

  async snapshot(): Promise<BrowserSnapshot> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    const url = this.page.url();
    const title = await this.page.title();

    // Get text content from the page (simple version)
    const content = (await this.page.evaluate('document.body.innerText')) as string;

    // Take screenshot
    const screenshotBuffer = await this.page.screenshot({
      type: 'png',
      fullPage: false,
    });
    const screenshot = screenshotBuffer.toString('base64');

    return {
      url,
      title,
      content: content.slice(0, 50000), // Limit to 50k chars
      screenshot,
    };
  }

  async search(query: string): Promise<BrowserSearchResult[]> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    console.log(`[Browser] Searching for: ${query}`);

    // Navigate to Google
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    await this.navigate(searchUrl);

    // Wait for results
    await this.page.waitForSelector('#search', { timeout: 10000 });

    // Extract search results using string-based evaluate to avoid DOM type issues
    const results = (await this.page.evaluate(`
      (() => {
        const resultElements = Array.from(document.querySelectorAll('#search .g'));
        const extracted = [];

        for (const element of resultElements) {
          const titleEl = element.querySelector('h3');
          const linkEl = element.querySelector('a');
          const snippetEl = element.querySelector('.VwiC3b, .yXK7lf');

          if (titleEl && linkEl) {
            extracted.push({
              title: titleEl.textContent?.trim() || '',
              url: linkEl.getAttribute('href') || '',
              snippet: snippetEl?.textContent?.trim() || '',
            });
          }
        }

        return extracted.slice(0, 10);
      })()
    `)) as BrowserSearchResult[];

    return results;
  }

  async click(selector: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    await this.page.click(selector);
  }

  async type(selector: string, text: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    await this.page.fill(selector, text);
  }

  async waitForSelector(selector: string, timeout: number = 10000): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    await this.page.waitForSelector(selector, { timeout });
  }

  async evaluate<T>(fn: () => T): Promise<T> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    return await this.page.evaluate(fn);
  }

  async close() {
    console.log('[Browser] Closing...');

    if (this.page) {
      await this.page.close();
      this.page = null;
    }

    if (this.context) {
      await this.context.close();
      this.context = null;
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }

    console.log('[Browser] Closed successfully');
  }

  isInitialized(): boolean {
    return this.browser !== null && this.page !== null;
  }

  getPage(): Page | null {
    return this.page;
  }
}
