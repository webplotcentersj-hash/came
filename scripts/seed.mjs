#!/usr/bin/env node
/**
 * Carga postulaciones de ejemplo para probar el panel.
 *   npm run db:seed
 * No borra nada: solo agrega registros con emails de prueba (@ejemplo.test).
 */
import { createClient } from '@supabase/supabase-js';

try { process.loadEnvFile('.env'); } catch { /* opcional */ }

const url = (process.env.SUPABASE_URL ?? '').trim() || 'https://ftdhunbwaglhxuwnbrit.supabase.co';
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
if (!key) {
  console.error('✗ Falta SUPABASE_SERVICE_ROLE_KEY en .env');
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const ejemplos = [
  {
    tipo: 'postulacion', nombre: 'Lucía', apellido: 'Fernández', email: 'lucia@ejemplo.test',
    telefono: '264 400 1122', fecha_nacimiento: '1994-03-12', empresa: 'Viñas del Zonda',
    cuit: '27123456783', rubro: 'Agro y agroindustria', localidad: 'Zonda', web: 'instagram.com/vinaszonda',
    anio_inicio: 2019, empleados: '6 a 15', estado: 'nuevo', dias: 1,
    historia: 'Empezamos con dos hectáreas heredadas de mi abuelo y hoy exportamos vino orgánico a tres países. El proyecto emplea a doce personas de la zona y trabajamos con riego por goteo para usar un 40% menos de agua que el promedio del valle.',
  },
  {
    tipo: 'postulacion', nombre: 'Matías', apellido: 'Quiroga', email: 'matias@ejemplo.test',
    telefono: '264 455 8899', fecha_nacimiento: '1990-11-02', empresa: 'Cuyo Software',
    cuit: '20345678902', rubro: 'Tecnología y software', localidad: 'Capital', web: 'cuyosoftware.com.ar',
    anio_inicio: 2017, empleados: '16 a 50', estado: 'en_revision', dias: 4,
    historia: 'Desarrollamos software de gestión para bodegas y empresas mineras de la región. Arrancamos siendo tres amigos en un departamento y hoy somos un equipo de veintidós personas, con clientes en San Juan, Mendoza y Chile.',
  },
  {
    tipo: 'nominacion', nombre: 'Sofía', apellido: 'Ledesma', email: 'sofia@ejemplo.test',
    telefono: '264 411 3344', fecha_nacimiento: '1997-07-25', empresa: 'Pan de Ullum',
    cuit: '27234567895', rubro: 'Turismo y gastronomía', localidad: 'Ullum', web: 'instagram.com/pandeullum',
    anio_inicio: 2021, empleados: '2 a 5', estado: 'preseleccionado', dias: 9,
    nominador_nombre: 'Carlos Peña', nominador_email: 'carlos@ejemplo.test', nominador_tel: '264 466 7788',
    historia: 'Sofía levantó una panadería artesanal en Ullum que hoy abastece a todos los hoteles del dique. Formó a seis mujeres del departamento en panificación y compra la harina a molinos sanjuaninos. Merece el reconocimiento por el impacto que generó en la comunidad.',
  },
  {
    tipo: 'postulacion', nombre: 'Joaquín', apellido: 'Rivas', email: 'joaquin@ejemplo.test',
    telefono: '264 477 2211', fecha_nacimiento: '1986-01-18', empresa: 'Metalúrgica Rivas',
    cuit: '20456789013', rubro: 'Minería y proveedores', localidad: 'Rawson', web: '',
    anio_inicio: 2015, empleados: 'Más de 50', estado: 'nuevo', dias: 12,
    historia: 'Somos proveedores de estructuras metálicas para la minería. Empecé en el taller de mi papá con una soldadora prestada y hoy fabricamos para los tres proyectos más grandes de la provincia, con planta propia en Rawson y sesenta empleados.',
  },
  {
    tipo: 'postulacion', nombre: 'Camila', apellido: 'Ortiz', email: 'camila@ejemplo.test',
    telefono: '264 488 5566', fecha_nacimiento: '2000-09-30', empresa: 'Ruta Solar',
    cuit: '27345678906', rubro: 'Servicios', localidad: 'Pocito', web: 'rutasolar.ar',
    anio_inicio: 2023, empleados: '2 a 5', estado: 'descartado', dias: 20,
    notas: 'Menos de un año de operación al momento del cierre. Se le sugiere postularse el año próximo.',
    historia: 'Instalamos paneles solares en viviendas rurales de Pocito y 25 de Mayo. En el primer año hicimos treinta instalaciones y capacitamos a cuatro técnicos de la zona en energía fotovoltaica.',
  },
];

for (const e of ejemplos) {
  const { data: existe, error: errorBuscar } = await supabase
    .from('postulaciones')
    .select('id')
    .eq('email', e.email)
    .maybeSingle();
  if (errorBuscar) {
    console.error('✗', errorBuscar.message);
    process.exit(1);
  }
  if (existe) {
    console.log(`· ya existía: ${e.email}`);
    continue;
  }

  const { error } = await supabase.from('postulaciones').insert({
    tipo: e.tipo,
    nombre: e.nombre,
    apellido: e.apellido,
    email: e.email,
    telefono: e.telefono,
    fecha_nacimiento: e.fecha_nacimiento,
    empresa: e.empresa,
    cuit: e.cuit,
    rubro: e.rubro,
    localidad: e.localidad,
    web: e.web || null,
    anio_inicio: e.anio_inicio,
    empleados: e.empleados,
    historia: e.historia,
    nominador_nombre: e.nominador_nombre ?? null,
    nominador_email: e.nominador_email ?? null,
    nominador_tel: e.nominador_tel ?? null,
    estado: e.estado,
    notas: e.notas ?? null,
    ip: '127.0.0.1',
    user_agent: 'seed',
    creado_en: new Date(Date.now() - e.dias * 86400000).toISOString(),
  });
  if (error) {
    console.error(`✗ ${e.email}:`, error.message);
    process.exit(1);
  }
  console.log(`✓ cargada: ${e.nombre} ${e.apellido} — ${e.empresa}`);
}

console.log('\nListo. Entrá a /admin para verlas.');
