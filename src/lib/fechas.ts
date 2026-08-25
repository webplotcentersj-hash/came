const TZ = 'America/Argentina/Buenos_Aires';
const CIERRE_DEFAULT = '2026-09-30T23:59:00-03:00';

/** Fecha de cierre de la convocatoria. Nunca tira: un valor vacío o inválido usa el default. */
export function parseFechaCierre(valor: string | undefined): Date {
  const d = new Date(valor || CIERRE_DEFAULT);
  return Number.isNaN(d.getTime()) ? new Date(CIERRE_DEFAULT) : d;
}

export function formatearCierre(d: Date): { texto: string; hora: string; iso: string } {
  try {
    const fecha = d.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: TZ,
    });
    return {
      texto: fecha.charAt(0).toUpperCase() + fecha.slice(1),
      hora: d.toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: TZ,
      }),
      iso: d.toISOString(),
    };
  } catch {
    return { texto: '30 de septiembre de 2026', hora: '23:59', iso: d.toISOString() };
  }
}

/** SQLite guarda `datetime('now')` en UTC sin sufijo: hay que marcarlo antes de parsear. */
export function desdeSqlite(valor: string | null | undefined): Date | null {
  if (!valor) return null;
  const iso = valor.includes('T') ? valor : valor.replace(' ', 'T');
  const d = new Date(iso.endsWith('Z') || /[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function fechaHora(valor: string | null | undefined): string {
  const d = desdeSqlite(valor);
  if (!d) return '—';
  return d.toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: TZ,
  });
}

export function fechaCorta(valor: string | null | undefined): string {
  const d = desdeSqlite(valor);
  if (!d) return '—';
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: TZ });
}

/** Fecha de nacimiento: viene como YYYY-MM-DD, se muestra sin corrimiento de zona. */
export function fechaNacimiento(valor: string | null | undefined): string {
  if (!valor) return '—';
  const [a, m, d] = valor.split('-');
  return a && m && d ? `${d}/${m}/${a}` : valor;
}

export function edad(fechaNac: string | null | undefined): number | null {
  if (!fechaNac) return null;
  const [a, m, d] = fechaNac.split('-').map(Number);
  if (!a || !m || !d) return null;
  const hoy = new Date();
  let e = hoy.getFullYear() - a;
  const dm = hoy.getMonth() + 1 - m;
  if (dm < 0 || (dm === 0 && hoy.getDate() < d)) e--;
  return e;
}
