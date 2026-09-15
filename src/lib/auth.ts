import crypto from 'node:crypto';
import type { APIContext, AstroCookies } from 'astro';
import { db } from './db';
import { env } from './env';

const COOKIE = 'pjes_session';
const MAX_AGE = 60 * 60 * 8; // 8 horas

export type Rol = 'admin' | 'votacion';

function secret(): string {
  const s = env('SESSION_SECRET');
  if (!s || s.length < 16) {
    throw new Error(
      'SESSION_SECRET no configurado (mínimo 16 caracteres). Definilo en .env ' +
        'localmente, o en las variables de entorno del proveedor.',
    );
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

export interface SessionData {
  id: number;
  email: string;
  nombre: string;
  rol: Rol;
  exp: number;
}

function rolDe(valor: unknown): Rol {
  return valor === 'votacion' ? 'votacion' : 'admin';
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function createSession(
  cookies: AstroCookies,
  admin: { id: number; email: string; nombre: string; rol?: Rol | string | null },
) {
  const data: SessionData = {
    id: admin.id,
    email: admin.email,
    nombre: admin.nombre,
    rol: rolDe(admin.rol),
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
  try {
    const expected = sign(payload);
    if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return null;
    }
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as SessionData;
    if (data.exp <= Date.now()) return null;
    return { ...data, rol: rolDe(data.rol) };
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
  if (session.rol !== 'admin') {
    return ctx.redirect('/votacion');
  }
  return session;
}

/** Jurado de votación. No entra al panel de administración. */
export function requireVotacion(ctx: APIContext): SessionData | Response {
  const session = getSession(ctx.cookies);
  if (!session) {
    const next = encodeURIComponent(ctx.url.pathname + ctx.url.search);
    return ctx.redirect(`/votacion/login?next=${next}`);
  }
  if (session.rol !== 'votacion') {
    return ctx.redirect('/admin');
  }
  return session;
}

export type AdminRecord = {
  id: number;
  email: string;
  nombre: string;
  password_hash: string;
  rol: Rol;
};

export async function findAdminByEmail(email: string): Promise<AdminRecord | null> {
  const { data, error } = await db()
    .from('admins')
    .select('id, email, nombre, password_hash, rol')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as {
    id: number;
    email: string;
    nombre: string;
    password_hash: string;
    rol?: string | null;
  };
  return { ...row, rol: rolDe(row.rol) };
}

export async function countAdmins(): Promise<number> {
  const { count, error } = await db().from('admins').select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}
