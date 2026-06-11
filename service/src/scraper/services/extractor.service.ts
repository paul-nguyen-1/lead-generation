import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX =
  /(?:\+?\d{1,2}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;

export interface ExtractedLead {
  businessName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  contactName: string | null;
}

/**
 * Pulls structured data out of HTML using per-source CSS selectors
 * (directory listings) or generic email/phone heuristics (company sites).
 */
@Injectable()
export class ExtractorService {
  /**
   * Extracts one entry per matching `selectors.listItem` element. Each
   * sub-field selector is resolved relative to that item.
   */
  extractDirectoryListings(
    html: string,
    baseUrl: string,
    selectors: Record<string, string>,
  ): ExtractedLead[] {
    if (!selectors.listItem) return [];
    const $ = cheerio.load(html);

    const results: ExtractedLead[] = [];
    $(selectors.listItem).each((_, el) => {
      const $item = $(el);
      const text = (selector?: string): string | null => {
        if (!selector) return null;
        const value = $item
          .find(selector)
          .first()
          .text()
          .replace(/\s+/g, ' ')
          .trim();
        return value || null;
      };
      const link = (selector?: string): string | null => {
        if (!selector) return null;
        const href = $item.find(selector).first().attr('href');
        return href ? this.resolveUrl(href, baseUrl) : null;
      };

      const entry: ExtractedLead = {
        businessName: text(selectors.name),
        phone: text(selectors.phone),
        address: text(selectors.address),
        website: link(selectors.website),
        email: text(selectors.email),
        contactName: text(selectors.contactName),
      };

      if (entry.businessName || entry.phone || entry.website || entry.email) {
        results.push(entry);
      }
    });

    return results;
  }

  /**
   * Extracts contact details (email/phone/business name) from a company
   * page using mailto:/tel: links first, falling back to regex matches in
   * the visible page text.
   */
  extractContactInfo(html: string, pageUrl: string): ExtractedLead {
    const $ = cheerio.load(html);
    const bodyText = $('body').text();

    const mailtoEmails = $('a[href^="mailto:" i]')
      .map(
        (_, el) =>
          $(el)
            .attr('href')
            ?.replace(/^mailto:/i, '')
            .split('?')[0],
      )
      .get()
      .filter((value): value is string => Boolean(value));
    const textEmails = bodyText.match(EMAIL_REGEX) ?? [];
    const email =
      [...mailtoEmails, ...textEmails][0]?.toLowerCase().trim() ?? null;

    const telLinks = $('a[href^="tel:" i]')
      .map((_, el) => $(el).attr('href')?.replace(/^tel:/i, ''))
      .get()
      .filter((value): value is string => Boolean(value));
    const textPhones = bodyText.match(PHONE_REGEX) ?? [];
    const phone = [...telLinks, ...textPhones][0]?.trim() ?? null;

    const businessName =
      $('meta[property="og:site_name"]').attr('content')?.trim() ||
      $('title').first().text().trim() ||
      null;

    return {
      businessName,
      email,
      phone,
      address: null,
      website: pageUrl,
      contactName: null,
    };
  }

  /** Returns the absolute URL of the first element matching `selector`'s href. */
  findLink(html: string, baseUrl: string, selector?: string): string | null {
    if (!selector) return null;
    const $ = cheerio.load(html);
    const href = $(selector).first().attr('href');
    return href ? this.resolveUrl(href, baseUrl) : null;
  }

  /** Returns absolute URLs of links whose path matches any of `contactPaths`. */
  findContactPageLinks(
    html: string,
    baseUrl: string,
    contactPaths: string[],
  ): string[] {
    if (contactPaths.length === 0) return [];
    const $ = cheerio.load(html);
    const links = new Set<string>();

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      const resolved = this.resolveUrl(href, baseUrl);
      if (!resolved) return;

      const path = this.safePathname(resolved)?.toLowerCase();
      if (path && contactPaths.some((p) => path.includes(p.toLowerCase()))) {
        links.add(resolved);
      }
    });

    return [...links];
  }

  resolveUrl(href: string, baseUrl: string): string | null {
    try {
      return new URL(href, baseUrl).toString();
    } catch {
      return null;
    }
  }

  isAllowedDomain(url: string, allowedDomains: string[]): boolean {
    const hostname = this.safeHostname(url);
    if (!hostname) return false;
    return allowedDomains.some(
      (domain) =>
        hostname === domain.toLowerCase() ||
        hostname.endsWith(`.${domain.toLowerCase()}`),
    );
  }

  private safeHostname(url: string): string | null {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return null;
    }
  }

  private safePathname(url: string): string | null {
    try {
      return new URL(url).pathname;
    } catch {
      return null;
    }
  }
}
