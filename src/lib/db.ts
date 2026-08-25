import type { Client } from '@libsql/client';

/**
 * En el servidor, `process.env` es la fuente confiable en tiempo de ejecución
 * (así un cambio de variable en Vercel no exige recompilar). `import.meta.env`
 * queda como respaldo para `astro dev`, que carga el .env solo ahí.
 */
function variable(nombre: string): string | undefined {
  return process.env[nombre] ?? (import.meta.env as Record<string, string | undefined>)[nombre];
}

const url = variable('DATABASE_URL') ?? 'file:./data/premio.db';
const authToken = variable('DATABASE_AUTH_TOKEN');

/** Turso y cualquier base remota; solo `file:` usa el cliente con binario nativo. */
const esRemota = !url.startsWith('file:');

let client: Client | null = null;
let ready: Promise<void> | null = null;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS postulaciones (
     id             INTEGER PRIMARY KEY AUTOINCREMENT,
     tipo           TEXT    NOT NULL DEFAULT 'postulacion',
     nombre         TEXT    NOT NULL,
     apellido       TEXT    NOT NULL,
     email          TEXT    NOT NULL,
     telefono       TEXT    NOT NULL,
     fecha_nacimiento TEXT,
     empresa        TEXT    NOT NULL,
     cuit           TEXT,
     rubro          TEXT,
     localidad      TEXT,
     web            TEXT,
     anio_inicio    INTEGER,
     empleados      TEXT,
     historia       TEXT,
     -- datos de quien nomina (solo cuando tipo = 'nominacion')
     nominador_nombre TEXT,
     nominador_email  TEXT,
     nominador_tel    TEXT,
     estado         TEXT    NOT NULL DEFAULT 'nuevo',
     notas          TEXT,
     ip             TEXT,
     user_agent     TEXT,
     creado_en      TEXT    NOT NULL DEFAULT (datetime('now'))
   )`,
  `CREATE INDEX IF NOT EXISTS idx_post_creado ON postulaciones (creado_en DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_post_estado ON postulaciones (estado)`,
  `CREATE INDEX IF NOT EXISTS idx_post_tipo   ON postulaciones (tipo)`,
  `CREATE TABLE IF NOT EXISTS admins (
     id            INTEGER PRIMARY KEY AUTOINCREMENT,
     email         TEXT NOT NULL UNIQUE,
     nombre        TEXT NOT NULL,
     password_hash TEXT NOT NULL,
     creado_en     TEXT NOT NULL DEFAULT (datetime('now'))
   )`,
];

async function crearCliente(): Promise<Client> {
  // El entrypoint `/web` es HTTP puro: es el que corresponde en serverless,
  // donde no conviene arrastrar el binario nativo de libSQL.
  const { createClient } = esRemota
    ? await import('@libsql/client/web')
    : await import('@libsql/client');
  return createClient({ url, authToken });
}

/** Cliente libSQL con el esquema garantizado (una sola vez por proceso). */
export async function db(): Promise<Client> {
  if (!ready) {
    ready = (async () => {
      client = await crearCliente();
      // En un solo viaje: en serverless cada arranque en frío pagaría el costo.
      await client.batch(SCHEMA, 'write');
    })().catch((err) => {
      // Un fallo no debe dejar cacheada una promesa rechazada para siempre.
      ready = null;
      client = null;
      throw err;
    });
  }
  await ready;
  return client!;
}

export type Estado = 'nuevo' | 'en_revision' | 'preseleccionado' | 'descartado';

export const ESTADOS: { value: Estado; label: string }[] = [
  { value: 'nuevo', label: 'Nuevo' },
  { value: 'en_revision', label: 'En revisión' },
  { value: 'preseleccionado', label: 'Preseleccionado' },
  { value: 'descartado', label: 'Descartado' },
];

export interface Postulacion {
  id: number;
  tipo: 'postulacion' | 'nominacion';
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  fecha_nacimiento: string | null;
  empresa: string;
  cuit: string | null;
  rubro: string | null;
  localidad: string | null;
  web: string | null;
  anio_inicio: number | null;
  empleados: string | null;
  historia: string | null;
  nominador_nombre: string | null;
  nominador_email: string | null;
  nominador_tel: string | null;
  estado: Estado;
  notas: string | null;
  ip: string | null;
  user_agent: string | null;
  creado_en: string;
}
