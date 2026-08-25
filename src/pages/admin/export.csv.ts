import type { APIRoute } from 'astro';
import { requireAdmin } from '../../lib/auth';
import { leerFiltros, listarTodo } from '../../lib/consultas';

export const prerender = false;

const COLUMNAS: { clave: string; titulo: string }[] = [
  { clave: 'id', titulo: 'ID' },
  { clave: 'creado_en', titulo: 'Fecha' },
  { clave: 'tipo', titulo: 'Tipo' },
  { clave: 'estado', titulo: 'Estado' },
  { clave: 'nombre', titulo: 'Nombre' },
  { clave: 'apellido', titulo: 'Apellido' },
  { clave: 'email', titulo: 'Email' },
  { clave: 'telefono', titulo: 'Teléfono' },
  { clave: 'fecha_nacimiento', titulo: 'Fecha nacimiento' },
  { clave: 'empresa', titulo: 'Empresa' },
  { clave: 'cuit', titulo: 'CUIT' },
  { clave: 'rubro', titulo: 'Rubro' },
  { clave: 'localidad', titulo: 'Departamento' },
  { clave: 'anio_inicio', titulo: 'Año inicio' },
  { clave: 'empleados', titulo: 'Empleados' },
  { clave: 'web', titulo: 'Web' },
  { clave: 'historia', titulo: 'Historia' },
  { clave: 'nominador_nombre', titulo: 'Nominador' },
  { clave: 'nominador_email', titulo: 'Email nominador' },
  { clave: 'nominador_tel', titulo: 'Teléfono nominador' },
  { clave: 'notas', titulo: 'Notas internas' },
];

/** Escapa un valor para CSV; el prefijo evita que Excel interprete fórmulas. */
function celda(valor: unknown): string {
  let s = valor === null || valor === undefined ? '' : String(valor);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export const GET: APIRoute = async (ctx) => {
  const sesion = requireAdmin(ctx);
  if (sesion instanceof Response) return sesion;

  const filtros = leerFiltros(ctx.url);
  const filas = await listarTodo(filtros);

  const lineas = [
    COLUMNAS.map((c) => celda(c.titulo)).join(';'),
    ...filas.map((f) => COLUMNAS.map((c) => celda((f as any)[c.clave])).join(';')),
  ];

  // BOM para que Excel en español abra el archivo en UTF-8.
  const csv = '﻿' + lineas.join('\r\n');
  const fecha = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="postulaciones-${fecha}.csv"`,
      'cache-control': 'no-store',
    },
  });
};
