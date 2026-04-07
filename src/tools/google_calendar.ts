import { ToolDefinition } from './index.js';
import { getGoogleAuth } from '../config/google_auth.js';
import { google } from 'googleapis';

export const getUpcomingMeetingsTool: ToolDefinition = {
  name: 'get_upcoming_meetings',
  description: 'Fetches upcoming events and meetings from Google Calendar.',
  parameters: {
    type: 'object',
    properties: {
      maxResults: {
        type: 'number',
        description: 'Maximum number of events to fetch (default 5)'
      }
    },
    required: []
  },
  execute: async (input: any) => {
    const auth = await getGoogleAuth();
    if (!auth) return "Error: Google authentication missing (token.json). Tell the user to check their terminal to log in.";

    const maxResults = input.maxResults || 5;
    const calendar = google.calendar({ version: 'v3', auth });

    try {
      const res = await calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = res.data.items;
      if (!events || events.length === 0) {
        return "No upcoming events found in your calendar.";
      }

      let summary = "Upcoming Meetings/Events:\n";
      for (const event of events) {
        const start = event.start?.dateTime || event.start?.date;
        summary += `- ${start}: ${event.summary}\n`;
      }

      return summary;
    } catch (err: any) {
      return `Error fetching calendar events: ${err.message}`;
    }
  }
};
