import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env.js';
import { getGroqTools, getGeminiTools } from '../tools/index.js';
import { ChatMessage } from '../db/memory.js';

let groq: Groq | null = null;
let genAIClients: GoogleGenerativeAI[] = [];

if (config.groqApiKey) {
    const isXAI = config.groqApiKey.startsWith('xai-');
    groq = new Groq({ 
        apiKey: config.groqApiKey,
        baseURL: isXAI ? 'https://api.x.ai/v1' : undefined // xAI standard base
    });
}

if (config.geminiApiKeys.length > 0) {
    genAIClients = config.geminiApiKeys.map(key => new GoogleGenerativeAI(key));
}

export interface LLMResponse {
  content: string | null;
  toolCall?: {
    name: string;
    arguments: any;
  };
}

const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant'
];

const XAI_MODELS = [
  'grok-2-1212',
  'grok-2-latest',
  'grok-beta'
];

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-3.1-pro-preview'
];

// Helper to wait avoid hitting rate limits too fast
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function askLLM(messages: ChatMessage[], systemPrompt?: string): Promise<LLMResponse> {
  if (!groq) {
      console.log('Groq/xAI not initialized, going straight to Gemini...');
      return askGeminiFallback(messages, systemPrompt);
  }

  const groqMessages = [];
  if (systemPrompt) {
    groqMessages.push({ role: 'system', content: systemPrompt });
  }
  groqMessages.push(...messages);

  const isXAI = config.groqApiKey.startsWith('xai-');
  const modelsToTry = isXAI ? XAI_MODELS : GROQ_MODELS;

  for (const model of modelsToTry) {
      try {
        const chatCompletion = await groq.chat.completions.create({
          messages: groqMessages as any,
          model: model,
          tools: getGroqTools() as any,
          tool_choice: 'auto',
        });

        const choice = chatCompletion.choices[0];
        const message = choice.message;

        if (message.tool_calls && message.tool_calls.length > 0) {
          const toolCall = message.tool_calls[0];
          return {
            content: message.content,
            toolCall: {
              name: toolCall.function.name,
              arguments: JSON.parse(toolCall.function.arguments || '{}'),
            }
          };
        }

        return { content: message.content || null };
      } catch (error: any) {
         console.error(`[${isXAI ? 'xAI' : 'Groq'} Error with ${model}]: ${error.message}`);
         if (error.status === 401 || error.status === 403) {
             console.error('Authentication failed. Aborting loop.');
             break;
         }
         // Wait before trying next model
         await wait(1000);
      }
  }
  
  console.log('Falling back to Gemini...');
  return askGeminiFallback(messages, systemPrompt);
}

async function askGeminiFallback(messages: ChatMessage[], systemPrompt?: string): Promise<LLMResponse> {
  if (genAIClients.length === 0) {
      throw new Error("Both Groq/xAI and Gemini failed/are unavailable.");
  }
  
  const history = messages.slice(0, -1).map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  })).filter(msg => msg.role !== 'system');

  const lastMessage = messages[messages.length - 1];

  for (const modelName of GEMINI_MODELS) {
    // Try each available key for this model
    for (let i = 0; i < genAIClients.length; i++) {
        const client = genAIClients[i];
        try {
          const model = client.getGenerativeModel({
            model: modelName,
            systemInstruction: systemPrompt,
            tools: getGeminiTools() as any,
          });
        
          const chat = model.startChat({ history });
          const result = await chat.sendMessage(lastMessage.content);
          const response = result.response;
          
          const functionCall = response.functionCalls()?.[0];
          if (functionCall) {
            return {
              content: response.text() || null,
              toolCall: {
                name: functionCall.name,
                arguments: functionCall.args,
              }
            };
          }
        
          return { content: response.text() };
          
        } catch (error: any) {
          const isLastKey = i === genAIClients.length - 1;
          const errorMessage = error.message || '';
          console.error(`[Gemini Key #${i+1} Error with ${modelName}]: ${errorMessage}`);

          // If it's an auth error, skip this key
          if (error.status === 401 || error.status === 403 || errorMessage.includes('401') || errorMessage.includes('403')) {
              console.error(`Key #${i+1} seems invalid. Skipping.`);
              if (isLastKey && modelName === GEMINI_MODELS[GEMINI_MODELS.length - 1]) {
                  throw new Error('Authentication failed for all Gemini keys.');
              }
              continue; // Try next key
          }

          // More aggressive detection of rate limits or quota issues
          const isRateLimited = error.status === 429 || 
                               errorMessage.includes('429') || 
                               errorMessage.toLowerCase().includes('quota') ||
                               errorMessage.toLowerCase().includes('rate limit');

          if (isRateLimited) {
              console.warn(`Key #${i+1} rate limited or quota full. Rotating to next key...`);
              continue; // Try next key immediately
          }

          // For other errors, if it's the last key, move to next model
          if (isLastKey) {
              console.log(`All keys failed for ${modelName}. Trying next model...`);
              await wait(2000);
          } else {
              // Try next key after a short rest for non-quota errors
              await wait(500);
          }
        }
    }
  }

  // --- LAST RESORT FALLBACK ---
  // If we reach here, every model and every key failed.
  // One last try: gemini-2.5-flash with NO tools and NO system prompt.
  console.log('--- EMERGENCY LAST RESORT ---');
  for (const client of genAIClients) {
    try {
      const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent(lastMessage.content);
      return { content: result.response.text() || "I'm experiencing heavy load but I'm back!" };
    } catch (e) {
      continue; // Move to next key if even this fails
    }
  }

  throw new Error("All Groq/xAI and Gemini models/keys failed. Please check your API quotas.");
}
