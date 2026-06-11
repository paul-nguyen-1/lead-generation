import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { chromium, type Browser } from 'playwright';

const MIN_BODY_TEXT_LENGTH = 200;

export interface FetchResult {
  html: string;
  renderedWithBrowser: boolean;
}

/**
 * Fetches a page's HTML, preferring a lightweight static request and only
 * falling back to a headless browser when the static response looks like an
 * empty client-rendered shell. This keeps the common case cheap so the
 * scraper scales without spinning up a browser per page.
 */
@Injectable()
export class FetcherService implements OnModuleDestroy {
  private readonly logger = new Logger(FetcherService.name);
  private readonly userAgent: string;
  private readonly timeoutMs: number;
  private browser: Browser | null = null;
  private browserLaunch: Promise<Browser> | null = null;

  constructor(private readonly configService: ConfigService) {
    this.userAgent =
      this.configService.get<string>('SCRAPER_USER_AGENT') ?? 'LeadGenBot/1.0';
    this.timeoutMs = Number(
      this.configService.get<string>('SCRAPER_REQUEST_TIMEOUT_MS') ?? 15000,
    );
  }

  async fetch(url: string): Promise<FetchResult> {
    const staticHtml = await this.fetchStatic(url);
    if (this.hasSubstantialContent(staticHtml)) {
      return { html: staticHtml, renderedWithBrowser: false };
    }

    try {
      const html = await this.fetchWithBrowser(url);
      return { html, renderedWithBrowser: true };
    } catch (err) {
      this.logger.warn(`Browser fallback failed for ${url}: ${String(err)}`);
      return { html: staticHtml, renderedWithBrowser: false };
    }
  }

  private async fetchStatic(url: string): Promise<string> {
    try {
      const res = await axios.get<string>(url, {
        timeout: this.timeoutMs,
        headers: {
          'User-Agent': this.userAgent,
          Accept: 'text/html,application/xhtml+xml',
        },
        responseType: 'text',
        validateStatus: (status) => status >= 200 && status < 400,
      });
      return typeof res.data === 'string' ? res.data : '';
    } catch (err) {
      this.logger.debug(`Static fetch failed for ${url}: ${String(err)}`);
      return '';
    }
  }

  private hasSubstantialContent(html: string): boolean {
    if (!html) return false;
    const $ = cheerio.load(html);
    const text = $('body').text().replace(/\s+/g, ' ').trim();
    return text.length >= MIN_BODY_TEXT_LENGTH;
  }

  private async fetchWithBrowser(url: string): Promise<string> {
    const browser = await this.getBrowser();
    const context = await browser.newContext({ userAgent: this.userAgent });
    try {
      const page = await context.newPage();
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: this.timeoutMs,
      });
      return await page.content();
    } finally {
      await context.close();
    }
  }

  private async getBrowser(): Promise<Browser> {
    if (this.browser) return this.browser;
    if (!this.browserLaunch) {
      this.browserLaunch = chromium
        .launch({ headless: true })
        .then((browser) => {
          this.browser = browser;
          return browser;
        });
    }
    return this.browserLaunch;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }
}
