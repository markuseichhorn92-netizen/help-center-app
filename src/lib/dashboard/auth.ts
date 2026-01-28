import { SignJWT, jwtVerify } from 'jose';
import { compare, hash } from 'bcryptjs';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'default-secret-please-change-in-production'
);

const COOKIE_NAME = 'fitinn_session';
const BCRYPT_ROUNDS = 10;

export interface JWTPayload {
  authenticated: boolean;
  iat: number;
  exp: number;
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return compare(password, hashedPassword);
}

export async function createToken(expiresIn: number = 86400): Promise<string> {
  const token = await new SignJWT({ authenticated: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${expiresIn}s`)
    .sign(JWT_SECRET);

  return token;
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string, maxAge: number = 86400): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge,
    path: '/',
  });
}

export async function getSessionCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getSessionCookie();
  if (!token) {
    return false;
  }

  const payload = await verifyToken(token);
  return payload !== null && payload.authenticated === true;
}

export async function requireAuth(): Promise<{ authenticated: true } | { authenticated: false; error: string }> {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return { authenticated: false, error: 'Unauthorized' };
  }
  return { authenticated: true };
}
