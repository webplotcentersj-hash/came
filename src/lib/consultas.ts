import { db, type Postulacion } from './db';

export interface Filtros {
  q: string;
  estado: string;
  tipo: string;
  pagina: number;
}

export const POR_PAGINA = 25;

export function leerFiltros(url: URL): Filtros {
  return {
    q: (url.searchParams.get('q') ?? '').trim(),
    estado: url.searchParams.get('estado') ?? '',
    tipo: url.searchParams.get('tipo') ?? '',
    pagina: Math.max(1, Number(url.searchParams.get('p')) || 1),
  };
}

function filtrar(query: any, f: Filtros) {
  if (f.q) {
    const t = f.q.replace(/[%_,()]/g, '');
    if (t) {
      query = query.or(
        `nombre.ilike.%${t}%,apellido.ilike.%${t}%,empresa.ilike.%${t}%,email.ilike.%${t}%,cuit.ilike.%${t}%`,
      );
    }
  }
  if (f.estado) query = query.eq('estado', f.estado);
  if (f.tipo) query = query.eq('tipo', f.tipo);
  return query;
}

export async function listar(f: Filtros): Promise<{ filas: Postulacion[]; total: number; paginas: number }> {
  const conteo = await filtrar(
    db().from('postulaciones').select('*', { count: 'exact', head: true }),
    f,
  );
  if (conteo.error) throw conteo.error;

  const total = conteo.count ?? 0;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const pagina = Math.min(f.pagina, paginas);
  const desde = (pagina - 1) * POR_PAGINA;

  const { data, error } = await filtrar(db().from('postulaciones').select('*'), f)
    .order('creado_en', { ascending: false })
    .order('id', { ascending: false })
    .range(desde, desde + POR_PAGINA - 1);
  if (error) throw error;

  return { filas: (data ?? []) as Postulacion[], total, paginas };
}

export async function listarTodo(f: Filtros): Promise<Postulacion[]> {
  const { data, error } = await filtrar(db().from('postulaciones').select('*'), f)
    .order('creado_en', { ascending: false })
    .order('id', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Postulacion[];
}

export interface Metricas {
  total: number;
  nuevo: number;
  en_revision: number;
  preseleccionado: number;
  descartado: number;
  postulaciones: number;
  nominaciones: number;
  ultimos7: number;
}

export async function metricas(): Promise<Metricas> {
  const { data, error } = await db().rpc('metricas_postulaciones');
  if (error) throw error;
  const r = Array.isArray(data) ? data[0] : data;
  const n = (v: unknown) => Number(v ?? 0);
  return {
    total: n(r?.total),
    nuevo: n(r?.nuevo),
    en_revision: n(r?.en_revision),
    preseleccionado: n(r?.preseleccionado),
    descartado: n(r?.descartado),
    postulaciones: n(r?.postulaciones),
    nominaciones: n(r?.nominaciones),
    ultimos7: n(r?.ultimos7),
  };
}

export async function obtener(id: number): Promise<Postulacion | null> {
  const { data, error } = await db().from('postulaciones').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as Postulacion | null) ?? null;
}

export async function actualizar(id: number, estado: string, notas: string): Promise<void> {
  const { error } = await db()
    .from('postulaciones')
    .update({ estado, notas: notas || null })
    .eq('id', id);
  if (error) throw error;
}

export async function eliminar(id: number): Promise<void> {
  const { error } = await db().from('postulaciones').delete().eq('id', id);
  if (error) throw error;
}

/** Construye una querystring conservando los filtros activos. */
export function qs(f: Filtros, cambios: Partial<Record<'q' | 'estado' | 'tipo' | 'p', string | number>> = {}): string {
  const p = new URLSearchParams();
  const val = (k: 'q' | 'estado' | 'tipo' | 'p', actual: string | number) =>
    String(cambios[k] ?? actual ?? '');

  if (val('q', f.q)) p.set('q', val('q', f.q));
  if (val('estado', f.estado)) p.set('estado', val('estado', f.estado));
  if (val('tipo', f.tipo)) p.set('tipo', val('tipo', f.tipo));
  const pag = val('p', f.pagina);
  if (pag && pag !== '1') p.set('p', pag);

  const s = p.toString();
  return s ? `?${s}` : '';
}
