import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function getMemoryDbPath(): string {
  const dbPath = process.env.DB_PATH || join(__dirname, '../../memory.db');
  return dbPath;
}

const parseWhitelist = (idsStr: string | undefined): number[] => {
  if (!idsStr) return [];
  return idsStr.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
};

export const config = {
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  groqApiKey: process.env.GROQ_API_KEY || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  dbPath: getMemoryDbPath(),
  whitelistedUserIds: parseWhitelist(process.env.WHITELISTED_USER_IDS),
};

export function validateConfig() {
  if (!config.telegramBotToken) {
    throw new Error('Missing required environment variable: TELEGRAM_BOT_TOKEN');
  }

  if (!config.groqApiKey) {
    console.warn('⚠️  GROQ_API_KEY not set — Groq/xAI models will be skipped.');
  }
  if (!config.geminiApiKey) {
    console.warn('⚠️  GEMINI_API_KEY not set — Gemini fallback will be unavailable.');
  }
  if (!config.groqApiKey && !config.geminiApiKey) {
    throw new Error('At least one LLM API key is required (GROQ_API_KEY or GEMINI_API_KEY).');
  }
}
