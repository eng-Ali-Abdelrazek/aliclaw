export interface ToolInput {
  [key: string]: any;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: {
      [plugin: string]: {
        type: string;
        description: string;
      };
    };
    required: string[];
  };
  execute: (input: ToolInput) => Promise<string> | string;
}

import { getCurrentTimeTool } from './get_current_time.js';
import { getRecentEmailsTool } from './google_gmail.js';
import { getUpcomingMeetingsTool } from './google_calendar.js';
import { searchDriveFilesTool } from './google_drive.js';
import { generateImageTool } from './generate_image.js';

export const availableTools: ToolDefinition[] = [
  getCurrentTimeTool,
  getRecentEmailsTool,
  getUpcomingMeetingsTool,
  searchDriveFilesTool,
  generateImageTool
];

export async function executeTool(name: string, args: ToolInput): Promise<string> {
  const tool = availableTools.find((t) => t.name === name);
  if (!tool) {
    return `Error: Tool ${name} not found.`;
  }
  
  try {
    const result = await tool.execute(args);
    return result;
  } catch (error: any) {
    return `Error executing test: ${error.message}`;
  }
}

export function getGroqTools() {
  return availableTools.map(t => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }
  }));
}

export function getGeminiTools() {
  return [
    {
      functionDeclarations: availableTools.map(t => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters as any,
      }))
    }
  ];
}
