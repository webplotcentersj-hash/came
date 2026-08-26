export type Errores = Record<string, string>;

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function limpiar(v: FormDataEntryValue | null): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** Valida CUIT/CUIL argentino (11 dígitos + dígito verificador módulo 11). */
export function cuitValido(cuit: string): boolean {
  const d = cuit.replace(/\D/g, '');
  if (d.length !== 11) return false;
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = pesos.reduce((acc, p, i) => acc + p * Number(d[i]), 0);
  const resto = suma % 11;
  const verificador = resto === 0 ? 0 : resto === 1 ? 9 : 11 - resto;
  return verificador === Number(d[10]);
}

export function formatearCuit(cuit: string): string {
  const d = cuit.replace(/\D/g, '');
  return d.length === 11 ? `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}` : cuit;
}

export function edadEn(fechaNacimiento: string, referencia = new Date()): number | null {
  const [a, m, d] = fechaNacimiento.split('-').map(Number);
  if (!a || !m || !d) return null;
  const n = new Date(a, m - 1, d);
  if (n.getFullYear() !== a || n.getMonth() !== m - 1 || n.getDate() !== d) return null;
  let edad = referencia.getFullYear() - a;
  const dm = referencia.getMonth() + 1 - m;
  if (dm < 0 || (dm === 0 && referencia.getDate() < d)) edad--;
  return edad;
}

function armarFechaNacimiento(form: FormData): string {
  const iso = limpiar(form.get('fecha_nacimiento'));
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const dia = limpiar(form.get('nac_dia'));
  const mes = limpiar(form.get('nac_mes'));
  const anio = limpiar(form.get('nac_anio'));
  if (dia && mes && anio) return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
  return '';
}

export interface DatosPostulacion {
  tipo: 'postulacion' | 'nominacion';
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  fecha_nacimiento: string;
  empresa: string;
  cuit: string;
  rubro: string;
  localidad: string;
  web: string;
  anio_inicio: number | null;
  empleados: string;
  historia: string;
  nominador_nombre: string;
  nominador_email: string;
  nominador_tel: string;
}

/** Valida el formulario público. Devuelve los datos normalizados y los errores por campo. */
export function validarPostulacion(form: FormData): { datos: DatosPostulacion; errores: Errores } {
  const errores: Errores = {};
  const tipo = limpiar(form.get('tipo')) === 'nominacion' ? 'nominacion' : 'postulacion';

  const datos: DatosPostulacion = {
    tipo,
    nombre: limpiar(form.get('nombre')),
    apellido: limpiar(form.get('apellido')),
    email: limpiar(form.get('email')).toLowerCase(),
    telefono: limpiar(form.get('telefono')),
    fecha_nacimiento: armarFechaNacimiento(form),
    empresa: limpiar(form.get('empresa')),
    cuit: limpiar(form.get('cuit')),
    rubro: limpiar(form.get('rubro')),
    localidad: limpiar(form.get('localidad')),
    web: limpiar(form.get('web')),
    anio_inicio: Number(limpiar(form.get('anio_inicio'))) || null,
    empleados: limpiar(form.get('empleados')),
    historia: limpiar(form.get('historia')),
    nominador_nombre: limpiar(form.get('nominador_nombre')),
    nominador_email: limpiar(form.get('nominador_email')).toLowerCase(),
    nominador_tel: limpiar(form.get('nominador_tel')),
  };

  const quien = tipo === 'nominacion' ? 'de la persona nominada' : '';

  if (datos.nombre.length < 2) errores.nombre = `Ingresá el nombre ${quien}`.trim();
  if (datos.apellido.length < 2) errores.apellido = `Ingresá el apellido ${quien}`.trim();
  if (!RE_EMAIL.test(datos.email)) errores.email = 'Ingresá un email válido';
  if (datos.telefono.replace(/\D/g, '').length < 8) errores.telefono = 'Ingresá un teléfono de contacto';
  if (datos.empresa.length < 2) errores.empresa = 'Ingresá el nombre de la empresa';

  // Requisito: entre 18 y 40 años.
  if (!datos.fecha_nacimiento) {
    errores.fecha_nacimiento = 'Ingresá la fecha de nacimiento';
  } else {
    const edad = edadEn(datos.fecha_nacimiento);
    if (edad === null) errores.fecha_nacimiento = 'Fecha inválida';
    else if (edad < 18 || edad > 40) errores.fecha_nacimiento = `El premio es para personas de 18 a 40 años (edad calculada: ${edad})`;
  }

  // Requisito: empresa en San Juan con CUIT.
  if (!datos.cuit) errores.cuit = 'Ingresá el CUIT de la empresa';
  else if (!cuitValido(datos.cuit)) errores.cuit = 'El CUIT no es válido';

  // Requisito: mínimo 1 año operando.
  const anioActual = new Date().getFullYear();
  if (!datos.anio_inicio) {
    errores.anio_inicio = 'Ingresá el año de inicio de actividades';
  } else if (datos.anio_inicio < 1900 || datos.anio_inicio > anioActual) {
    errores.anio_inicio = 'Año inválido';
  } else if (anioActual - datos.anio_inicio < 1) {
    errores.anio_inicio = 'La empresa debe tener al menos 1 año operando';
  }

  if (!datos.localidad) errores.localidad = 'Indicá el departamento o localidad';
  if (datos.historia.length < 50) errores.historia = 'Contanos un poco más (mínimo 50 caracteres)';

  if (tipo === 'nominacion') {
    if (datos.nominador_nombre.length < 2) errores.nominador_nombre = 'Ingresá tu nombre';
    if (!RE_EMAIL.test(datos.nominador_email)) errores.nominador_email = 'Ingresá tu email';
  }

  return { datos, errores };
}
