import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CREDENTIALS_PATH = path.join(__dirname, '../../credentials.json');
const TOKEN_PATH = path.join(__dirname, '../../token.json');

let oauth2Client: any = null;

export async function getGoogleAuth() {
  if (oauth2Client) return oauth2Client;

  let credentials;
  const envCreds = process.env.GOOGLE_CREDENTIALS;
  
  try {
    if (envCreds) {
      credentials = JSON.parse(envCreds);
    } else {
      const content = await fs.readFile(CREDENTIALS_PATH, 'utf-8');
      credentials = JSON.parse(content);
    }
  } catch (err) {
    console.warn("⚠️ Google API Warning: 'credentials.json' or GOOGLE_CREDENTIALS env not found. Google tools will be disabled.");
    return null;
  }

  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web || credentials;
  oauth2Client = new google.auth.OAuth2(client_id, client_secret, 'http://localhost');

  try {
    let tokenData;
    const envToken = process.env.GOOGLE_TOKEN;
    
    if (envToken) {
      tokenData = JSON.parse(envToken);
    } else {
      const tokenPayload = await fs.readFile(TOKEN_PATH, 'utf-8');
      tokenData = JSON.parse(tokenPayload);
    }
    
    oauth2Client.setCredentials(tokenData);
    return oauth2Client;
  } catch (err) {
    if (process.env.NODE_ENV === 'production') {
      console.error("❌ ERROR: Running in Cloud (Production) but GOOGLE_TOKEN is missing. Please authorize locally first and copy token.json content to GOOGLE_TOKEN env.");
      return null;
    }
    return await getNewToken(oauth2Client);
  }
}

async function getNewToken(oAuth2Client: any) {
  const SCOPES = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/drive.readonly'
  ];

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('--------------------------------------------------');
  console.log('🔒 ACTION REQUIRED TO ACTIVATE GOOGLE INTEGRATION 🔒');
  console.log('Authorize AliClaw by visiting this url:');
  console.log(authUrl);
  console.log('--------------------------------------------------');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('Enter the code from that page here: ', async (code) => {
      rl.close();
      try {
          const { tokens } = await oAuth2Client.getToken(code);
          oAuth2Client.setCredentials(tokens);
          await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
          console.log('Token stored to', TOKEN_PATH);
          resolve(oAuth2Client);
      } catch (error) {
          console.error('Error retrieving access token', error);
          resolve(null);
      }
    });
  });
}
