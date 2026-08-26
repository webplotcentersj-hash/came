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
import { createClient } from '@supabase/supabase-js';

try { process.loadEnvFile('.env'); } catch { /* sin .env */ }

const url = (process.env.SUPABASE_URL ?? '').trim() || 'https://ftdhunbwaglhxuwnbrit.supabase.co';
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
if (!key) {
  console.error('✗ Falta SUPABASE_SERVICE_ROLE_KEY en .env');
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

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

const hash = hashPassword(password);
const { data: existe, error: errorBuscar } = await supabase
  .from('admins')
  .select('id')
  .eq('email', email)
  .maybeSingle();
if (errorBuscar) {
  console.error('✗ No se pudo consultar admins:', errorBuscar.message);
  process.exit(1);
}

if (existe) {
  const { error } = await supabase
    .from('admins')
    .update({ nombre, password_hash: hash })
    .eq('email', email);
  if (error) {
    console.error('✗ No se pudo actualizar:', error.message);
    process.exit(1);
  }
  console.log(`✓ Usuario actualizado: ${email}`);
} else {
  const { error } = await supabase.from('admins').insert({ email, nombre, password_hash: hash });
  if (error) {
    console.error('✗ No se pudo crear:', error.message);
    process.exit(1);
  }
  console.log(`✓ Usuario creado: ${email}`);
}

console.log('  Ingresá en /admin/login');
