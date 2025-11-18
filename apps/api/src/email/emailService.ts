/**
 * Email service for sending transactional emails via smtp2go
 */
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { promises as fs } from 'fs';
import path from 'path';

// Email configuration from environment
const SMTP_HOST = process.env.SMTP_HOST || 'mail.smtp2go.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '2525', 10);
const SMTP_USER = process.env.SMTP2GO_USERNAME || '';
const SMTP_PASS = process.env.SMTP2GO_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@megadirectory.local';
const FROM_NAME = process.env.FROM_NAME || 'Mega Directory';
const SITE_NAME = process.env.SITE_NAME || 'Mega Directory';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Create reusable transporter
let transporter: Transporter | null = null;

/**
 * Initialize email transporter
 */
function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // true for 465, false for other ports
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }
  return transporter;
}

/**
 * Load email template from file
 * @param templateName Template file name (without extension)
 * @param extension File extension ('html' or 'txt')
 * @returns Template content as string
 */
async function loadTemplate(templateName: string, extension: 'html' | 'txt'): Promise<string> {
  const templatePath = path.join(__dirname, 'templates', `${templateName}.${extension}`);
  return fs.readFile(templatePath, 'utf-8');
}

/**
 * Replace template placeholders with actual values
 * @param template Template string with {{placeholder}} markers
 * @param variables Object with placeholder values
 * @returns Processed template string
 */
function processTemplate(template: string, variables: Record<string, string>): string {
  let processed = template;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    processed = processed.replace(placeholder, value);
  }
  return processed;
}

/**
 * Send magic link email
 * @param to Recipient email address
 * @param code Magic link verification code
 * @param returnUrl Optional URL to redirect to after verification
 */
export async function sendMagicLinkEmail(
  to: string,
  code: string,
  returnUrl?: string
): Promise<void> {
  // Build magic link URL
  const magicLinkUrl = `${BASE_URL}/v1/auth/magic-link/verify?code=${code}${
    returnUrl ? `&return_url=${encodeURIComponent(returnUrl)}` : ''
  }`;

  // Load templates
  const [htmlTemplate, textTemplate] = await Promise.all([
    loadTemplate('magic-link', 'html'),
    loadTemplate('magic-link', 'txt'),
  ]);

  // Process templates with variables
  const variables = {
    siteName: SITE_NAME,
    magicLinkUrl,
    code,
  };

  const html = processTemplate(htmlTemplate, variables);
  const text = processTemplate(textTemplate, variables);

  // Send email
  const transport = getTransporter();
  await transport.sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to,
    subject: `Your login link for ${SITE_NAME}`,
    text,
    html,
  });
}

/**
 * Verify email service configuration
 * @returns true if configured, false otherwise
 */
export function isEmailConfigured(): boolean {
  return !!(SMTP_USER && SMTP_PASS);
}

/**
 * Test email connection
 * @returns Promise that resolves if connection is successful
 */
export async function testEmailConnection(): Promise<void> {
  const transport = getTransporter();
  await transport.verify();
}
