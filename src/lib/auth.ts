import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'leo_session';
const SESSION_DURATION = 60 * 60 * 24 * 7; // 7 days in seconds

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET environment variable is not set');
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(): Promise<string> {
  const token = await new SignJWT({ authenticated: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(getSecretKey());

  return token;
}

export async function verifySession(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSecretKey());
    return true;
  } catch {
    return false;
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION,
    path: '/',
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSessionToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getSessionToken();
  if (!token) return false;
  return verifySession(token);
}

// ... (keep existing functions if needed, but we are moving away)

// New App Token Logic for Desktop/Extension
const APP_TOKEN_DURATION = '365d'; // Long lived (1 year)

export async function createAppToken(userId: string): Promise<string> {
  const token = await new SignJWT({ sub: userId, type: 'app-token' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(APP_TOKEN_DURATION)
    .sign(getSecretKey());

  return token;
}

export async function verifyAppToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (payload.type !== 'app-token' || !payload.sub) return null;
    return payload.sub as string;
  } catch {
    return null;
  }
}

export function verifyPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error('ADMIN_PASSWORD environment variable is not set');
    return false;
  }
  return password === adminPassword;
}
