import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env.js';
import { getGroqTools, getGeminiTools } from '../tools/index.js';
import { ChatMessage } from '../db/memory.js';

let groq: Groq | null = null;
let genAI: GoogleGenerativeAI | null = null;

if (config.groqApiKey) {
    const isXAI = config.groqApiKey.startsWith('xai-');
    groq = new Groq({ 
        apiKey: config.groqApiKey,
        baseURL: isXAI ? 'https://api.x.ai/v1' : undefined
    });
}
if (config.geminiApiKey) {
    genAI = new GoogleGenerativeAI(config.geminiApiKey);
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
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768',
  'gemma2-9b-it'
];

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-1.5-pro-latest',
  'gemini-pro'
];

export async function askLLM(messages: ChatMessage[], systemPrompt?: string): Promise<LLMResponse> {
  if (!groq) {
      console.log('Groq not initialized, going straight to Gemini...');
      return askGeminiFallback(messages, systemPrompt);
  }

  const groqMessages = [];
  if (systemPrompt) {
    groqMessages.push({ role: 'system', content: systemPrompt });
  }
  groqMessages.push(...messages);

  for (const model of GROQ_MODELS) {
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
         console.error(`[Groq Error with ${model}]: ${error.message}`);
         // If it's a critical auth error, stop trying Groq models and break to Gemini
         if (error.status === 401 || error.status === 403) {
             console.error('Authentication failed for Groq. Aborting Groq loop.');
             break;
         }
         // Otherwise, try the next model
      }
  }
  
  console.log('Falling back to Gemini...');
  return askGeminiFallback(messages, systemPrompt);
}

async function askGeminiFallback(messages: ChatMessage[], systemPrompt?: string): Promise<LLMResponse> {
  if (!genAI) {
      throw new Error("Both Groq and Gemini failed/are unavailable.");
  }
  
  const history = messages.slice(0, -1).map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  })).filter(msg => msg.role !== 'system');

  const lastMessage = messages[messages.length - 1];

  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
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
        console.error(`[Gemini Error with ${modelName}]: ${error.message}`);
         if (error.status === 401 || error.status === 403) {
             throw new Error('Authentication failed for Gemini.');
         }
         // Otherwise try the next Gemini model
    }
  }

  throw new Error("All Groq and Gemini models failed to process the request.");
}
