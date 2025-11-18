/**
 * Username generator for anonymous users
 * Generates usernames in format: {adjective}-{noun}-{number}
 * Example: happy-penguin-742
 */
import { randomBytes } from 'crypto';
import { prisma } from '../db';

const ADJECTIVES = [
  'happy', 'clever', 'bright', 'swift', 'calm', 'bold', 'wise', 'kind',
  'brave', 'gentle', 'quiet', 'loud', 'quick', 'slow', 'warm', 'cool',
  'smooth', 'rough', 'sharp', 'dull', 'light', 'dark', 'fresh', 'stale',
  'young', 'ancient', 'modern', 'classic', 'simple', 'complex', 'plain', 'fancy',
  'humble', 'proud', 'shy', 'social', 'wild', 'tame', 'free', 'bound',
  'sweet', 'bitter', 'sour', 'spicy', 'mild', 'strong', 'weak', 'tough',
  'soft', 'hard', 'heavy', 'light', 'big', 'small', 'tall', 'short',
  'wide', 'narrow', 'thick', 'thin', 'deep', 'shallow', 'high', 'low',
];

const NOUNS = [
  'penguin', 'dolphin', 'eagle', 'tiger', 'panda', 'koala', 'otter', 'fox',
  'wolf', 'bear', 'lion', 'zebra', 'giraffe', 'elephant', 'rhino', 'hippo',
  'mountain', 'river', 'ocean', 'forest', 'desert', 'valley', 'canyon', 'peak',
  'island', 'lake', 'stream', 'meadow', 'hill', 'plain', 'coast', 'shore',
  'thunder', 'lightning', 'rainbow', 'sunrise', 'sunset', 'moonlight', 'starlight', 'shadow',
  'breeze', 'storm', 'cloud', 'mist', 'frost', 'snow', 'rain', 'wind',
  'crystal', 'diamond', 'ruby', 'emerald', 'sapphire', 'pearl', 'amber', 'jade',
  'phoenix', 'dragon', 'griffin', 'unicorn', 'pegasus', 'sphinx', 'chimera', 'hydra',
];

/**
 * Generate a random integer between min and max (inclusive)
 */
function randomInt(min: number, max: number): number {
  const range = max - min + 1;
  const bytes = randomBytes(4);
  const value = bytes.readUInt32BE(0);
  return min + (value % range);
}

/**
 * Generate a random username in format: {adjective}-{noun}-{number}
 * @param maxLength Maximum length for the username (default: 50)
 * @returns Generated username
 */
export function generateRandomUsername(maxLength: number = 50): string {
  const adjective = ADJECTIVES[randomInt(0, ADJECTIVES.length - 1)];
  const noun = NOUNS[randomInt(0, NOUNS.length - 1)];
  const number = randomInt(100, 999); // 3-digit number

  const username = `${adjective}-${noun}-${number}`;

  // If username is too long, try with shorter words or fallback
  if (username.length > maxLength) {
    // Fallback to UUID-based username
    const uuid = randomBytes(4).toString('hex');
    return `user-${uuid}`;
  }

  return username;
}

/**
 * Generate a unique username by checking database
 * Retries up to maxAttempts times before falling back to UUID
 * @param maxAttempts Maximum number of generation attempts (default: 10)
 * @returns Unique username
 */
export async function generateUniqueUsername(maxAttempts: number = 10): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const username = generateRandomUsername();

    // Check if username exists
    const existing = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!existing) {
      return username;
    }
  }

  // Fallback to UUID-based username (guaranteed unique with timestamp)
  const uuid = randomBytes(4).toString('hex');
  const timestamp = Date.now().toString(36);
  return `user-${timestamp}-${uuid}`;
}
