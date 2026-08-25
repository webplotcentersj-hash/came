import type { APIRoute } from 'astro';
import { destroySession } from '../../lib/auth';

export const prerender = false;

const salir: APIRoute = ({ cookies, redirect }) => {
  destroySession(cookies);
  return redirect('/admin/login');
};

export const POST = salir;
export const GET = salir;
