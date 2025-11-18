/**
 * Spam detection utility using OpenRouter AI
 * Detects spam, promotional content, and obfuscated contact information in reviews
 */
import axios from 'axios';
import { createLogger } from '../logger';

const logger = createLogger({ name: 'spam-detection' });

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const MODEL = 'meta-llama/llama-3.2-3b-instruct:free';
const DEFAULT_THRESHOLD = 0.75;

export interface SpamDetectionResult {
  isSpam: boolean;
  confidence: number;
  reasons: string[];
  extractedUrls: string[];
  extractedEmails: string[];
  extractedPhones: string[];
}

/**
 * Detect spam in review text using OpenRouter AI
 * @param reviewText Review text to analyze
 * @param threshold Confidence threshold (0.0-1.0)
 * @returns Spam detection result
 */
export async function detectSpam(
  reviewText: string,
  _threshold: number = DEFAULT_THRESHOLD
): Promise<SpamDetectionResult> {
  // If API key not configured, return default (not spam) to not block legitimate reviews
  if (!OPENROUTER_API_KEY) {
    logger.warn('OpenRouter API key not configured. Spam detection disabled.');
    return {
      isSpam: false,
      confidence: 0,
      reasons: ['API not configured'],
      extractedUrls: [],
      extractedEmails: [],
      extractedPhones: [],
    };
  }

  const prompt = `Analyze the following review for spam content. Look for:
- Obfuscated URLs (e.g., "example dot com", "www example", "site (dot) com")
- Obfuscated emails (e.g., "contact at example dot com", "email @ site")
- Obfuscated phone numbers (e.g., "five five five one two one two", "call 5 5 5 - 1 2 1 2")
- Promotional content or advertisements
- Off-topic content
- Repetitive or low-quality text
- Spam patterns or irrelevant content

Review text: ${reviewText}

Respond ONLY with a valid JSON object in this exact format (no additional text):
{
  "is_spam": true or false,
  "confidence": 0.0 to 1.0,
  "reasons": ["reason1", "reason2"],
  "extracted_urls": ["url1"],
  "extracted_emails": ["email1"],
  "extracted_phones": ["phone1"]
}`;

  try {
    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: MODEL,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent results
        max_tokens: 500,
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.BASE_URL || 'http://localhost:3000',
          'X-Title': 'Mega Directory',
        },
        timeout: 10000, // 10 second timeout
      }
    );

    // Parse response
    const content = response.data.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenRouter response');
    }

    // Extract JSON from response (may have markdown code blocks)
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    const parsed = JSON.parse(jsonStr);

    const result: SpamDetectionResult = {
      isSpam: parsed.is_spam || false,
      confidence: Math.max(0, Math.min(1, parsed.confidence || 0)),
      reasons: Array.isArray(parsed.reasons) ? parsed.reasons : [],
      extractedUrls: Array.isArray(parsed.extracted_urls) ? parsed.extracted_urls : [],
      extractedEmails: Array.isArray(parsed.extracted_emails) ? parsed.extracted_emails : [],
      extractedPhones: Array.isArray(parsed.extracted_phones) ? parsed.extracted_phones : [],
    };

    logger.info({
      isSpam: result.isSpam,
      confidence: result.confidence,
      reasons: result.reasons.length,
    }, 'Spam detection completed');

    return result;
  } catch (error: any) {
    logger.error({ error }, 'Spam detection failed');

    // On error, default to not spam (don't block legitimate reviews)
    return {
      isSpam: false,
      confidence: 0,
      reasons: ['Detection failed: ' + error.message],
      extractedUrls: [],
      extractedEmails: [],
      extractedPhones: [],
    };
  }
}

/**
 * Check if review text should be rejected based on spam score
 * @param spamResult Spam detection result
 * @param threshold Rejection threshold
 * @returns true if should be rejected
 */
export function shouldRejectReview(
  spamResult: SpamDetectionResult,
  threshold: number = DEFAULT_THRESHOLD
): boolean {
  return spamResult.isSpam && spamResult.confidence >= threshold;
}

/**
 * Basic URL detection in text (fallback if AI fails)
 * @param text Text to check
 * @returns true if URLs detected
 */
export function containsUrls(text: string): boolean {
  // Common URL patterns
  const urlPatterns = [
    /https?:\/\/[^\s]+/i,
    /www\.[^\s]+/i,
    /\w+\.com[^\s]*/i,
    /\w+\.net[^\s]*/i,
    /\w+\.org[^\s]*/i,
    /\w+ dot com/i,
    /\w+ \(dot\) com/i,
  ];

  return urlPatterns.some((pattern) => pattern.test(text));
}

/**
 * Basic email detection in text (fallback if AI fails)
 * @param text Text to check
 * @returns true if emails detected
 */
export function containsEmails(text: string): boolean {
  const emailPatterns = [
    /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,
    /\w+ at \w+ dot com/i,
    /\w+ @ \w+ \. com/i,
  ];

  return emailPatterns.some((pattern) => pattern.test(text));
}

/**
 * Basic phone number detection in text (fallback if AI fails)
 * @param text Text to check
 * @returns true if phone numbers detected
 */
export function containsPhoneNumbers(text: string): boolean {
  const phonePatterns = [
    /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/,
    /\(\d{3}\)\s*\d{3}[-.\s]?\d{4}/,
    /(one|two|three|four|five|six|seven|eight|nine|zero)[\s-]+(one|two|three|four|five|six|seven|eight|nine|zero)/i,
  ];

  return phonePatterns.some((pattern) => pattern.test(text));
}
