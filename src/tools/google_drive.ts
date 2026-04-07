import { ToolDefinition } from './index.js';
import { getGoogleAuth } from '../config/google_auth.js';
import { google } from 'googleapis';

export const searchDriveFilesTool: ToolDefinition = {
  name: 'search_drive_files',
  description: 'Searches for files in Google Drive matching a query.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query (e.g. "project plan" or "invoice")'
      }
    },
    required: ['query']
  },
  execute: async (input: any) => {
    const auth = await getGoogleAuth();
    if (!auth) return "Error: Google authentication missing (token.json). Tell the user to check their terminal to log in.";

    const drive = google.drive({ version: 'v3', auth });

    try {
      const res = await drive.files.list({
        pageSize: 5,
        fields: 'nextPageToken, files(id, name, mimeType)',
        q: `name contains '${input.query}'`
      });

      const files = res.data.files;
      if (!files || files.length === 0) {
        return `No files found matching query '${input.query}'.`;
      }

      let summary = `Top results for '${input.query}':\n`;
      for (const file of files) {
        summary += `- ${file.name} (Type: ${file.mimeType})\n`;
      }

      return summary;
    } catch (err: any) {
      return `Error searching Drive: ${err.message}`;
    }
  }
};
