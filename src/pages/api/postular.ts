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
    const desde = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: repetida, error: errorDup } = await db()
      .from('postulaciones')
      .select('id')
      .eq('email', datos.email)
      .eq('cuit', datos.cuit)
      .gt('creado_en', desde)
      .limit(1);
    if (errorDup) throw errorDup;
    if (repetida && repetida.length > 0) {
      return responder(quierejson, 200, { ok: true, redirect: '/gracias?dup=1' }, '/gracias?dup=1');
    }

    const { error } = await db().from('postulaciones').insert({
      tipo: datos.tipo,
      nombre: datos.nombre,
      apellido: datos.apellido,
      email: datos.email,
      telefono: datos.telefono,
      fecha_nacimiento: datos.fecha_nacimiento || null,
      empresa: datos.empresa,
      cuit: datos.cuit,
      rubro: datos.rubro || null,
      localidad: datos.localidad || null,
      web: datos.web || null,
      anio_inicio: datos.anio_inicio,
      empleados: datos.empleados || null,
      historia: datos.historia,
      nominador_nombre: datos.tipo === 'nominacion' ? datos.nominador_nombre : null,
      nominador_email: datos.tipo === 'nominacion' ? datos.nominador_email : null,
      nominador_tel: datos.tipo === 'nominacion' ? datos.nominador_tel || null : null,
      ip: clientAddress ?? null,
      user_agent: request.headers.get('user-agent'),
    });
    if (error) throw error;
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
