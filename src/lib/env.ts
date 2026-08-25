/**
 * Lee una variable de entorno en runtime (Vercel) o desde el .env de `astro dev`.
 * Cadena vacía o solo comillas cuenta como "no definida".
 */
export function env(nombre: string): string | undefined {
  const cruda =
    process.env[nombre] ?? (import.meta.env as Record<string, string | undefined>)[nombre];
  if (cruda == null) return undefined;
  const valor = cruda.trim().replace(/^["']|["']$/g, '');
  return valor || undefined;
}
