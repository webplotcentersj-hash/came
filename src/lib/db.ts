import { createClient, type Client } from '@libsql/client';

const url = import.meta.env.DATABASE_URL ?? process.env.DATABASE_URL ?? 'file:./data/premio.db';
const authToken = import.meta.env.DATABASE_AUTH_TOKEN ?? process.env.DATABASE_AUTH_TOKEN;

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

/** Cliente libSQL con el esquema garantizado (una sola vez por proceso). */
export async function db(): Promise<Client> {
  if (!client) client = createClient({ url, authToken });
  if (!ready) {
    ready = (async () => {
      for (const stmt of SCHEMA) await client!.execute(stmt);
    })();
  }
  await ready;
  return client;
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
