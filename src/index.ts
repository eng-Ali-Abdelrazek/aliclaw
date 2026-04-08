import { config, validateConfig } from './config/env.js';
import { setupBot } from './bot.js';
import { initDb } from './db/index.js';

async function start() {
    try {
        console.log('Initializing AliClaw...');
        validateConfig();
        
        console.log(`Database initialized at: ${config.dbPath}`);
        initDb();

        console.log('--- Startup Config Check ---');
        console.log(`Whitelist: ${config.whitelistedUserIds.join(', ')}`);
        console.log(`Groq/xAI Key: ${config.groqApiKey ? '✅ Present' : '❌ Missing'}`);
        console.log(`Gemini Keys: ${config.geminiApiKeys.length > 0 ? `✅ ${config.geminiApiKeys.length} Present` : '❌ Missing'}`);
        console.log('----------------------------');
        
        const bot = setupBot();
        console.log('Telegram Bot configured... Starting long polling.');
        
        // Starts the bot (using long polling by default in grammy)
        await bot.start({
            onStart: (botInfo) => {
                console.log(`AliClaw is officially running!`);
                console.log(`Bot username: @${botInfo.username}`);
            }
        });
        
    } catch (err) {
        console.error('Failed to start AliClaw:', err);
        process.exit(1);
    }
}

// Ensure graceful shutdown
for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
        console.log(`Received ${signal}, shutting down...`);
        process.exit(0);
    });
}

start();
