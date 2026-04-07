import { ToolDefinition } from './index.js';

export const getCurrentTimeTool: ToolDefinition = {
  name: 'get_current_time',
  description: 'Returns the current server time and date. Use this to find out what time or date it currently is.',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
  execute: async () => {
    const now = new Date();
    return `The current time is: ${now.toISOString()}`;
  }
};
