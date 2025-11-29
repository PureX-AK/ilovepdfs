import { NextRequest, NextResponse } from 'next/server';
import { getGoogleCredentials } from '../../../lib/google-credentials';

// Google OAuth configuration
const REDIRECT_URI = process.env.REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8080'}/api/auth/google/callback`;

// Generate Google OAuth URL
export function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'login'; // 'login' or 'signup'

  const credentials = getGoogleCredentials();
  
  if (!credentials || !credentials.client_id) {
    return NextResponse.json(
      { error: 'Google OAuth not configured. Please add GOOGLE_CLIENT_ID to environment variables or provide a client_secret JSON file.' },
      { status: 500 }
    );
  }

  const GOOGLE_CLIENT_ID = credentials.client_id;

  const scope = 'openid email profile';
  const state = Buffer.from(JSON.stringify({ action })).toString('base64');
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
    client_id: credentials.client_id,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope,
    state,
    access_type: 'offline',
    prompt: 'consent',
  })}`;

  return NextResponse.redirect(authUrl);
}

