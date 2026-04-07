import { ToolDefinition } from './index.js';

export const generateImageTool: ToolDefinition = {
  name: 'generate_image',
  description: 'Generates an image based on a text prompt.',
  parameters: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'A detailed description of the image to generate.'
      }
    },
    required: ['prompt']
  },
  execute: async (input: any) => {
    try {
      const encodedPrompt = encodeURIComponent(input.prompt);
      const randomSeed = Math.floor(Math.random() * 1000000);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${randomSeed}&width=512&height=512&nologo=true`;
      
      return `Image generated successfully! **You must include the following tag in your final response to the user:** [IMAGE_URL: ${imageUrl}]`;
    } catch (err: any) {
      return `Error generating image: ${err.message}`;
    }
  }
};
