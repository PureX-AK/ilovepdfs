import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { createUser, findUserByEmail } from '../../../../lib/models/User';
import { getGoogleCredentials } from '../../../../lib/google-credentials';

const REDIRECT_URI = process.env.REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8080'}/api/auth/google/callback`;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, request.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL('/login?error=no_code', request.url));
    }

    // Decode state to get action
    let action = 'login';
    try {
      if (state) {
        const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
        action = decoded.action || 'login';
      }
    } catch {
      // Use default
    }

    // Get credentials
    const credentials = getGoogleCredentials();
    if (!credentials || !credentials.client_id || !credentials.client_secret) {
      throw new Error('Google OAuth credentials not configured');
    }

    // Exchange code for token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const tokens = await tokenResponse.json();
    const accessToken = tokens.access_token;

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userInfoResponse.ok) {
      throw new Error('Failed to get user info from Google');
    }

    const googleUser = await userInfoResponse.json();

    // Check if user exists in database
    let user = await findUserByEmail(googleUser.email);

    // If user doesn't exist, create user (for both login and signup via OAuth)
    if (!user) {
      // Create user with a random password (they'll use Google to login)
      const randomPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
      try {
        await createUser(
          googleUser.email,
          randomPassword, // This won't be used since they login with Google
          googleUser.name || googleUser.given_name || 'User'
        );
        user = await findUserByEmail(googleUser.email);
      } catch (error: any) {
        // If user was created between check and create, try to find again
        if (error.message.includes('already exists')) {
          user = await findUserByEmail(googleUser.email);
        } else {
          throw error;
        }
      }
    }

    if (!user) {
      return NextResponse.redirect(new URL('/login?error=user_creation_failed', request.url));
    }

    // Create JWT token
    const secret = new TextEncoder().encode(JWT_SECRET);
    const token = await new SignJWT({
      userId: user._id?.toString(),
      email: user.email,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret);

    // Create response and set cookie
    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message || 'oauth_failed')}`, request.url));
  }
}

