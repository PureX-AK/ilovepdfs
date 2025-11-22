import fs from 'fs';
import path from 'path';

interface GoogleCredentials {
  web: {
    client_id: string;
    client_secret: string;
    redirect_uris: string[];
  };
}

let cachedCredentials: { client_id: string; client_secret: string } | null = null;

export function getGoogleCredentials(): { client_id: string; client_secret: string } | null {
  // First, try environment variables
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    return {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
    };
  }

  // If cached, return cached
  if (cachedCredentials) {
    return cachedCredentials;
  }

  // Try to read from JSON file
  try {
    const jsonFiles = fs.readdirSync(process.cwd()).filter(
      (file) => file.startsWith('client_secret') && file.endsWith('.json')
    );

    if (jsonFiles.length > 0) {
      const jsonPath = path.join(process.cwd(), jsonFiles[0]);
      const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
      const credentials: GoogleCredentials = JSON.parse(jsonContent);

      if (credentials.web) {
        cachedCredentials = {
          client_id: credentials.web.client_id,
          client_secret: credentials.web.client_secret,
        };
        return cachedCredentials;
      }
    }
  } catch (error) {
    console.error('Error reading Google credentials JSON:', error);
  }

  return null;
}

