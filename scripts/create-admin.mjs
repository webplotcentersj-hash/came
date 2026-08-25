#!/usr/bin/env node
/**
 * Alta de usuarios del panel.
 *
 *   npm run admin:create                                   (modo interactivo)
 *   npm run admin:create -- email@dominio.com "Nombre" clave
 */
import crypto from 'node:crypto';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
try { process.loadEnvFile('.env'); } catch { /* sin .env: se usan los valores por defecto */ }

const url = (process.env.DATABASE_URL ?? '').trim() || 'file:./data/premio.db';
const authToken = process.env.DATABASE_AUTH_TOKEN;
const { createClient } = url.startsWith('file:')
  ? await import('@libsql/client')
  : await import('@libsql/client/web');

const client = createClient({ url, authToken });

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

await client.execute(`
  CREATE TABLE IF NOT EXISTS admins (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE,
    nombre        TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    creado_en     TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

let [email, nombre, password] = process.argv.slice(2);

if (!email || !nombre || !password) {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  email ??= await rl.question('Email: ');
  nombre ??= await rl.question('Nombre y apellido: ');
  password ??= await rl.question('Contraseña (mínimo 8 caracteres): ');
  rl.close();
}

email = String(email).trim().toLowerCase();
nombre = String(nombre).trim();

if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
  console.error('✗ El email no es válido.');
  process.exit(1);
}
if (String(password).length < 8) {
  console.error('✗ La contraseña debe tener al menos 8 caracteres.');
  process.exit(1);
}

const existe = await client.execute({ sql: 'SELECT id FROM admins WHERE email = ?', args: [email] });

if (existe.rows.length > 0) {
  await client.execute({
    sql: 'UPDATE admins SET nombre = ?, password_hash = ? WHERE email = ?',
    args: [nombre, hashPassword(password), email],
  });
  console.log(`✓ Usuario actualizado: ${email}`);
} else {
  await client.execute({
    sql: 'INSERT INTO admins (email, nombre, password_hash) VALUES (?,?,?)',
    args: [email, nombre, hashPassword(password)],
  });
  console.log(`✓ Usuario creado: ${email}`);
}

console.log('  Ingresá en /admin/login');
