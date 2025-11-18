/**
 * hCaptcha verification utility
 * Verifies CAPTCHA tokens from client submissions
 */
import axios from 'axios';
import { createLogger } from '../logger';

const logger = createLogger({ name: 'hcaptcha' });

const HCAPTCHA_VERIFY_URL = 'https://hcaptcha.com/siteverify';
const HCAPTCHA_SECRET = process.env.HCAPTCHA_SECRET || '';

export interface HCaptchaVerifyResult {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  error_codes?: string[];
}

/**
 * Verify hCaptcha token
 * @param token hCaptcha response token from client
 * @param remoteIp Optional client IP address
 * @returns Verification result
 */
export async function verifyHCaptcha(
  token: string,
  remoteIp?: string
): Promise<HCaptchaVerifyResult> {
  // If secret not configured, return failure
  if (!HCAPTCHA_SECRET) {
    logger.warn('hCaptcha secret not configured. Verification disabled.');
    return {
      success: false,
      error_codes: ['secret-not-configured'],
    };
  }

  // Validate token
  if (!token || typeof token !== 'string') {
    return {
      success: false,
      error_codes: ['invalid-token'],
    };
  }

  try {
    // Build form data
    const params = new URLSearchParams();
    params.append('secret', HCAPTCHA_SECRET);
    params.append('response', token);
    if (remoteIp) {
      params.append('remoteip', remoteIp);
    }

    // Call hCaptcha verify API
    const response = await axios.post<HCaptchaVerifyResult>(
      HCAPTCHA_VERIFY_URL,
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 5000, // 5 second timeout
      }
    );

    const result = response.data;

    logger.info({
      success: result.success,
      errorCodes: result.error_codes,
      hostname: result.hostname,
    }, 'hCaptcha verification completed');

    return result;
  } catch (error: any) {
    logger.error({ error }, 'hCaptcha verification failed');

    // On network/API error, return failure
    return {
      success: false,
      error_codes: ['verification-failed'],
    };
  }
}

/**
 * Check if hCaptcha is enabled
 * @returns true if secret is configured
 */
export function isHCaptchaEnabled(): boolean {
  return !!HCAPTCHA_SECRET;
}

/**
 * Verify hCaptcha and throw error if invalid
 * @param token hCaptcha response token
 * @param remoteIp Optional client IP
 * @throws Error if verification fails
 */
export async function requireValidCaptcha(
  token: string | undefined,
  remoteIp?: string
): Promise<void> {
  if (!isHCaptchaEnabled()) {
    // If hCaptcha not enabled, skip verification
    logger.warn('hCaptcha not enabled. Skipping verification.');
    return;
  }

  if (!token) {
    throw new Error('CAPTCHA token is required');
  }

  const result = await verifyHCaptcha(token, remoteIp);

  if (!result.success) {
    const errorCodes = result.error_codes?.join(', ') || 'unknown';
    logger.warn({ errorCodes }, 'CAPTCHA verification failed');
    throw new Error('CAPTCHA verification failed. Please try again.');
  }
}
