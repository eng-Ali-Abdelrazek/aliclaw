import { Bot } from 'grammy';
import { config } from './config/env.js';
import { saveMessage, getHistory } from './db/memory.js';
import { runAgentLoop } from './agent/loop.js';
import { loadSkills } from './agent/skills.js';

let bot: Bot;

export function setupBot() {
  bot = new Bot(config.telegramBotToken);
  
  // Whitelist Middleware
  bot.use(async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) {
      console.log('Received message without User ID');
      return;
    }
    
    if (!config.whitelistedUserIds.includes(userId)) {
      console.log(`Rejected unauthorized user override: ${userId}. Message ignored.`);
      if (ctx.chat?.type === 'private') {
           await ctx.reply("Unauthorized access. You are not on the AliClaw whitelist.");
      }
      return;
    }
    
    await next();
  });

  bot.command('start', async (ctx) => {
    await ctx.reply('Welcome to AliClaw! I am your secure, local AI agent with Firebase cloud memory and 55+ specialized skills. \n\nType /skills to see my superpowers!');
  });

  bot.command('skills', async (ctx) => {
    const skills = await loadSkills();
    let message = "🚀 **ALICLAW SPECIALIZED SKILLS**\n\n";
    message += "I automatically activate these modes based on your request:\n\n";
    
    for (const skill of skills) {
        message += `🔹 **${skill.name}**: ${skill.description}\n`;
    }
    
    message += "\nJust ask me for 'strategic analysis', 'research', or 'prompt optimization' to see them in action!";
    await ctx.reply(message, { parse_mode: 'Markdown' });
  });

  bot.command('clear', async (ctx) => {
    const { clearHistory } = await import('./db/memory.js');
    await clearHistory(ctx.from!.id);
    await ctx.reply('Conversation history cleared.');
  });

  bot.on('message:text', async (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text;

    // Send a "thinking" action to the user
    await ctx.replyWithChatAction('typing');
    
    // Save user's message
    await saveMessage(userId, 'user', text);
    
    // Retrieve history (e.g. last 10 messages)
    const history = await getHistory(userId, 10);
    
    try {
        const replyText = await runAgentLoop(history, async (role, content) => {
             await saveMessage(userId, role, content);
        });
        
        let finalReply = replyText;
        const imageRegex = /\[IMAGE_URL:\s*(https?:\/\/[^\]]+)\]/g;
        const imageUrls: string[] = [];
        let match;
        
        while ((match = imageRegex.exec(replyText)) !== null) {
            imageUrls.push(match[1]);
        }
        
        finalReply = finalReply.replace(imageRegex, '').trim();

        if (finalReply.length > 0) {
            await ctx.reply(finalReply);
        }
        
        for (const url of imageUrls) {
            try {
                await ctx.replyWithPhoto(url);
            } catch (err: any) {
                console.error("Failed to send photo:", err);
                await ctx.reply(`I generated an image, but it was too large or failed to send! You can view it here: ${url}`);
            }
        }

    } catch (error: any) {
        console.error('Agent Loop Error:', error);
        await ctx.reply(`An error occurred while processing your request: ${error.message}`);
    }
  });

  bot.catch((err) => {
    console.error(`Error while handling update ${err.ctx.update.update_id}:`, err);
  });

  return bot;
}
