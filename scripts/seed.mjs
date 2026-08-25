#!/usr/bin/env node
/**
 * Carga postulaciones de ejemplo para probar el panel.
 *   npm run db:seed
 * No borra nada: solo agrega registros con emails de prueba (@ejemplo.test).
 */
import { createClient } from '@libsql/client';

try { process.loadEnvFile('.env'); } catch { /* opcional */ }

const client = createClient({
  url: process.env.DATABASE_URL ?? 'file:./data/premio.db',
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

await client.execute(`
  CREATE TABLE IF NOT EXISTS postulaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL DEFAULT 'postulacion',
    nombre TEXT NOT NULL, apellido TEXT NOT NULL, email TEXT NOT NULL, telefono TEXT NOT NULL,
    fecha_nacimiento TEXT, empresa TEXT NOT NULL, cuit TEXT, rubro TEXT, localidad TEXT, web TEXT,
    anio_inicio INTEGER, empleados TEXT, historia TEXT,
    nominador_nombre TEXT, nominador_email TEXT, nominador_tel TEXT,
    estado TEXT NOT NULL DEFAULT 'nuevo', notas TEXT, ip TEXT, user_agent TEXT,
    creado_en TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

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
  const { rows } = await client.execute({
    sql: 'SELECT id FROM postulaciones WHERE email = ? LIMIT 1',
    args: [e.email],
  });
  if (rows.length > 0) {
    console.log(`· ya existía: ${e.email}`);
    continue;
  }

  await client.execute({
    sql: `INSERT INTO postulaciones
            (tipo, nombre, apellido, email, telefono, fecha_nacimiento, empresa, cuit, rubro,
             localidad, web, anio_inicio, empleados, historia,
             nominador_nombre, nominador_email, nominador_tel, estado, notas, ip, user_agent, creado_en)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, datetime('now', ?))`,
    args: [
      e.tipo, e.nombre, e.apellido, e.email, e.telefono, e.fecha_nacimiento, e.empresa, e.cuit,
      e.rubro, e.localidad, e.web || null, e.anio_inicio, e.empleados, e.historia,
      e.nominador_nombre ?? null, e.nominador_email ?? null, e.nominador_tel ?? null,
      e.estado, e.notas ?? null, '127.0.0.1', 'seed', `-${e.dias} days`,
    ],
  });
  console.log(`✓ cargada: ${e.nombre} ${e.apellido} — ${e.empresa}`);
}

console.log('\nListo. Entrá a /admin para verlas.');
