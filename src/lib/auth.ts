import crypto from 'node:crypto';
import type { APIContext, AstroCookies } from 'astro';
import { db } from './db';

const COOKIE = 'pjes_session';
const MAX_AGE = 60 * 60 * 8; // 8 horas

function secret(): string {
  const s = import.meta.env.SESSION_SECRET ?? process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error('SESSION_SECRET no configurado (mínimo 16 caracteres) en el archivo .env');
  }
  return s;
}

/* ---------- contraseñas (scrypt) ---------- */

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

/* ---------- sesión (cookie firmada HMAC) ---------- */

interface SessionData {
  id: number;
  email: string;
  nombre: string;
  exp: number;
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function createSession(cookies: AstroCookies, admin: { id: number; email: string; nombre: string }) {
  const data: SessionData = {
    id: admin.id,
    email: admin.email,
    nombre: admin.nombre,
    exp: Date.now() + MAX_AGE * 1000,
  };
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  cookies.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: import.meta.env.PROD,
    path: '/',
    maxAge: MAX_AGE,
  });
}

export function destroySession(cookies: AstroCookies) {
  cookies.delete(COOKIE, { path: '/' });
}

export function getSession(cookies: AstroCookies): SessionData | null {
  const raw = cookies.get(COOKIE)?.value;
  if (!raw) return null;
  const [payload, sig] = raw.split('.');
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null;
  }
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as SessionData;
    return data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}

/** Usar al inicio de cada página/endpoint del panel. Devuelve la sesión o una Response de redirect. */
export function requireAdmin(ctx: APIContext): SessionData | Response {
  const session = getSession(ctx.cookies);
  if (!session) {
    const next = encodeURIComponent(ctx.url.pathname + ctx.url.search);
    return ctx.redirect(`/admin/login?next=${next}`);
  }
  return session;
}

export async function findAdminByEmail(email: string) {
  const client = await db();
  const { rows } = await client.execute({
    sql: 'SELECT id, email, nombre, password_hash FROM admins WHERE email = ? LIMIT 1',
    args: [email.trim().toLowerCase()],
  });
  return rows[0] as unknown as
    | { id: number; email: string; nombre: string; password_hash: string }
    | undefined;
}

export async function countAdmins(): Promise<number> {
  const client = await db();
  const { rows } = await client.execute('SELECT COUNT(*) AS n FROM admins');
  return Number((rows[0] as any).n);
}
