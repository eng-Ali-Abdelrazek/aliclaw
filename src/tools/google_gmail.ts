import { ToolDefinition } from './index.js';
import { getGoogleAuth } from '../config/google_auth.js';
import { google } from 'googleapis';

export const getRecentEmailsTool: ToolDefinition = {
  name: 'get_recent_emails',
  description: 'Fetches the subjects and senders of recently received emails from Gmail.',
  parameters: {
    type: 'object',
    properties: {
      maxResults: {
        type: 'number',
        description: 'Number of emails to fetch (default is 5)'
      }
    },
    required: []
  },
  execute: async (input: any) => {
    const auth = await getGoogleAuth();
    if (!auth) return "Error: Google authentication missing (token.json). Tell the user to check their terminal to log in.";

    const maxResults = input.maxResults || 5;
    const gmail = google.gmail({ version: 'v1', auth });

    try {
      const res = await gmail.users.messages.list({
        userId: 'me',
        maxResults,
        q: 'in:inbox'
      });

      const messages = res.data.messages;
      if (!messages || messages.length === 0) {
        return "You have no new messages in your inbox.";
      }

      let emailSummaries = "Recent Emails:\n";
      for (const msg of messages) {
        const fullMsg = await gmail.users.messages.get({ userId: 'me', id: msg.id! });
        const headers = fullMsg.data.payload?.headers;
        const subject = headers?.find(h => h.name === 'Subject')?.value || 'No Subject';
        const from = headers?.find(h => h.name === 'From')?.value || 'Unknown Sender';
        emailSummaries += `- From: ${from} | Subject: ${subject}\n`;
      }

      return emailSummaries;
    } catch (err: any) {
      return `Error fetching emails: ${err.message}`;
    }
  }
};
