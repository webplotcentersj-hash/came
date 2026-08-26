import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

const SUPABASE_URL_DEFAULT = 'https://ftdhunbwaglhxuwnbrit.supabase.co';

let client: SupabaseClient | null = null;

/** Cliente de Supabase con la service role: todo el acceso es server-side. */
export function db(): SupabaseClient {
  if (!client) {
    const url = env('SUPABASE_URL') ?? SUPABASE_URL_DEFAULT;
    const key = env('SUPABASE_SERVICE_ROLE_KEY');
    if (!key) {
      throw new Error(
        'SUPABASE_SERVICE_ROLE_KEY no configurado. Pegalo en .env local y en las variables de Vercel.',
      );
    }
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
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
