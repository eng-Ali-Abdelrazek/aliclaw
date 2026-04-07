import { ChatMessage } from '../db/memory.js';
import { askLLM } from './llm.js';
import { executeTool } from '../tools/index.js';
import { loadSkills, detectSkills } from './skills.js';

const BASE_SYSTEM_PROMPT = `You are AliClaw, an AI personal assistant agent created from scratch. You run locally and use Firebase for memory.
You can help the user by responding directly or by using the tools provided to you. 
If the user asks you to generate, create, or draw an image, you MUST use the 'generate_image' tool. Do not claim you are a text AI that cannot generate images.
Keep your responses helpful, concise, and straight to the point.
`;

const MAX_ITERATIONS = 5;

export async function runAgentLoop(messages: ChatMessage[], appendHistory: (role: 'user'|'assistant', content: string) => Promise<void>): Promise<string> {
    
    // Skill Detection
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
    const allSkills = await loadSkills();
    const activeSkills = detectSkills(lastUserMessage, allSkills);
    
    let currentSystemPrompt = BASE_SYSTEM_PROMPT;
    if (activeSkills.length > 0) {
        console.log(`[Skill Dispatcher] Activating skills: ${activeSkills.map(s => s.name).join(', ')}`);
        currentSystemPrompt += `\n\n### ACTIVE SPECIALIZED SKILLS\n`;
        for (const skill of activeSkills) {
            currentSystemPrompt += `\n#### ${skill.name} Workflow:\n${skill.prompt}\n`;
        }
        currentSystemPrompt += `\nRemember to strictly follow the specific rules and objectives of the active skills above.`;
    }

    // We clone the messages array because we will mutate it during our internal thought loop
    const internalMemory = [...messages];
    
    for (let i = 0; i < MAX_ITERATIONS; i++) {
        const response = await askLLM(internalMemory, currentSystemPrompt);
        
        let assistantContent = response.content || '';

        if (response.toolCall) {
             const { name, arguments: args } = response.toolCall;
             const toolCallMessage = `[Thought: I need to use the tool '${name}']`;
             
             // Optionally surface what we're doing if we have content
             if (assistantContent) {
                assistantContent += '\n' + toolCallMessage;
             } else {
                 assistantContent = toolCallMessage;
             }
             
             internalMemory.push({ role: 'assistant', content: assistantContent });
             console.log(`Agent executing tool: ${name} with args`, args);
             
             const toolResult = await executeTool(name, args);
             
             // We inject the tool result back as a user message
             const resultMessage = `[System: The tool '${name}' execution completed. The result is: ${toolResult} \nPlease continue answering based on this result.]`;
             internalMemory.push({ role: 'user', content: resultMessage });
        } else {
            // No tool call, we reached a final answer
            await appendHistory('assistant', assistantContent);
            return assistantContent;
        }
    }
    
    const maxIterationReachedStr = "I'm sorry, but I took too many steps to answer this question. Please try asking in a different way.";
    await appendHistory('assistant', maxIterationReachedStr);
    return maxIterationReachedStr;
}
