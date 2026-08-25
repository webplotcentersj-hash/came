import { db, type Postulacion } from './db';
import type { InValue } from '@libsql/client';

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

/** Construye el WHERE compartido por el listado, el contador y la exportación CSV. */
function condiciones(f: Filtros): { sql: string; args: InValue[] } {
  const partes: string[] = [];
  const args: InValue[] = [];

  if (f.q) {
    partes.push(
      `(nombre LIKE ?1 OR apellido LIKE ?1 OR empresa LIKE ?1 OR email LIKE ?1 OR cuit LIKE ?1
        OR (nombre || ' ' || apellido) LIKE ?1)`,
    );
    args.push(`%${f.q}%`);
  }
  if (f.estado) {
    partes.push(`estado = ?${args.length + 1}`);
    args.push(f.estado);
  }
  if (f.tipo) {
    partes.push(`tipo = ?${args.length + 1}`);
    args.push(f.tipo);
  }

  return { sql: partes.length ? `WHERE ${partes.join(' AND ')}` : '', args };
}

export async function listar(f: Filtros): Promise<{ filas: Postulacion[]; total: number; paginas: number }> {
  const client = await db();
  const { sql: where, args } = condiciones(f);

  const conteo = await client.execute({
    sql: `SELECT COUNT(*) AS n FROM postulaciones ${where}`,
    args,
  });
  const total = Number((conteo.rows[0] as any).n);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const pagina = Math.min(f.pagina, paginas);

  const { rows } = await client.execute({
    sql: `SELECT * FROM postulaciones ${where}
          ORDER BY creado_en DESC, id DESC
          LIMIT ?${args.length + 1} OFFSET ?${args.length + 2}`,
    args: [...args, POR_PAGINA, (pagina - 1) * POR_PAGINA],
  });

  return { filas: rows as unknown as Postulacion[], total, paginas };
}

export async function listarTodo(f: Filtros): Promise<Postulacion[]> {
  const client = await db();
  const { sql: where, args } = condiciones(f);
  const { rows } = await client.execute({
    sql: `SELECT * FROM postulaciones ${where} ORDER BY creado_en DESC, id DESC`,
    args,
  });
  return rows as unknown as Postulacion[];
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
  const client = await db();
  const { rows } = await client.execute(`
    SELECT
      COUNT(*)                                                        AS total,
      SUM(estado = 'nuevo')                                           AS nuevo,
      SUM(estado = 'en_revision')                                     AS en_revision,
      SUM(estado = 'preseleccionado')                                 AS preseleccionado,
      SUM(estado = 'descartado')                                      AS descartado,
      SUM(tipo = 'postulacion')                                       AS postulaciones,
      SUM(tipo = 'nominacion')                                        AS nominaciones,
      SUM(creado_en > datetime('now', '-7 days'))                     AS ultimos7
    FROM postulaciones
  `);
  const r = rows[0] as any;
  const n = (v: unknown) => Number(v ?? 0);
  return {
    total: n(r.total),
    nuevo: n(r.nuevo),
    en_revision: n(r.en_revision),
    preseleccionado: n(r.preseleccionado),
    descartado: n(r.descartado),
    postulaciones: n(r.postulaciones),
    nominaciones: n(r.nominaciones),
    ultimos7: n(r.ultimos7),
  };
}

export async function obtener(id: number): Promise<Postulacion | null> {
  const client = await db();
  const { rows } = await client.execute({
    sql: 'SELECT * FROM postulaciones WHERE id = ? LIMIT 1',
    args: [id],
  });
  return (rows[0] as unknown as Postulacion) ?? null;
}

export async function actualizar(id: number, estado: string, notas: string): Promise<void> {
  const client = await db();
  await client.execute({
    sql: 'UPDATE postulaciones SET estado = ?, notas = ? WHERE id = ?',
    args: [estado, notas || null, id],
  });
}

export async function eliminar(id: number): Promise<void> {
  const client = await db();
  await client.execute({ sql: 'DELETE FROM postulaciones WHERE id = ?', args: [id] });
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
