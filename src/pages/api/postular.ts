import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { validarPostulacion, limpiar } from '../../lib/validacion';

export const prerender = false;

/** El bot rellena el honeypot o envía en menos de 3 segundos. */
function pareceSpam(form: FormData): boolean {
  if (limpiar(form.get('website'))) return true;
  const t0 = Number(limpiar(form.get('t0')));
  return Boolean(t0) && Date.now() - t0 < 3000;
}

function responder(
  quierejson: boolean,
  status: number,
  cuerpo: Record<string, unknown>,
  redirect: string,
): Response {
  if (quierejson) {
    return new Response(JSON.stringify(cuerpo), {
      status,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }
  return new Response(null, { status: 303, headers: { location: redirect } });
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const quierejson = (request.headers.get('accept') ?? '').includes('application/json');

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return responder(quierejson, 400, { ok: false, mensaje: 'Formulario inválido.' }, '/?error=1#postulate');
  }

  // Los bots reciben un "ok" silencioso: no se guarda nada.
  if (pareceSpam(form)) {
    return responder(quierejson, 200, { ok: true, redirect: '/gracias' }, '/gracias');
  }

  const { datos, errores } = validarPostulacion(form);

  if (!limpiar(form.get('acepta'))) {
    errores.acepta = 'Necesitamos tu confirmación para continuar';
  }

  if (Object.keys(errores).length > 0) {
    return responder(quierejson, 422, { ok: false, errores }, '/?error=1#postulate');
  }

  try {
    const client = await db();

    // Evita duplicados exactos enviados dos veces seguidas (doble click, reintento).
    const { rows } = await client.execute({
      sql: `SELECT id FROM postulaciones
            WHERE email = ? AND cuit = ? AND creado_en > datetime('now', '-10 minutes')
            LIMIT 1`,
      args: [datos.email, datos.cuit],
    });
    if (rows.length > 0) {
      return responder(quierejson, 200, { ok: true, redirect: '/gracias?dup=1' }, '/gracias?dup=1');
    }

    await client.execute({
      sql: `INSERT INTO postulaciones
              (tipo, nombre, apellido, email, telefono, fecha_nacimiento, empresa, cuit, rubro,
               localidad, web, anio_inicio, empleados, historia,
               nominador_nombre, nominador_email, nominador_tel, ip, user_agent)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        datos.tipo,
        datos.nombre,
        datos.apellido,
        datos.email,
        datos.telefono,
        datos.fecha_nacimiento || null,
        datos.empresa,
        datos.cuit,
        datos.rubro || null,
        datos.localidad || null,
        datos.web || null,
        datos.anio_inicio,
        datos.empleados || null,
        datos.historia,
        datos.tipo === 'nominacion' ? datos.nominador_nombre : null,
        datos.tipo === 'nominacion' ? datos.nominador_email : null,
        datos.tipo === 'nominacion' ? datos.nominador_tel || null : null,
        clientAddress ?? null,
        request.headers.get('user-agent'),
      ],
    });
  } catch (err) {
    console.error('[postular] error al guardar:', err);
    return responder(
      quierejson,
      500,
      { ok: false, mensaje: 'No pudimos guardar tu postulación. Probá de nuevo en unos minutos.' },
      '/?error=2#postulate',
    );
  }

  const destino = datos.tipo === 'nominacion' ? '/gracias?tipo=nominacion' : '/gracias';
  return responder(quierejson, 200, { ok: true, redirect: destino }, destino);
};
