import { db, type Postulacion } from './db';

export type PostulanteVoto = Pick<
  Postulacion,
  | 'id'
  | 'tipo'
  | 'nombre'
  | 'apellido'
  | 'empresa'
  | 'rubro'
  | 'localidad'
  | 'anio_inicio'
  | 'empleados'
  | 'historia'
  | 'fecha_nacimiento'
  | 'web'
> & { votado: boolean };

const CAMPOS =
  'id, tipo, nombre, apellido, empresa, rubro, localidad, anio_inicio, empleados, historia, fecha_nacimiento, web';

export async function listarParaVotar(adminId: number): Promise<{
  filas: PostulanteVoto[];
  votados: number;
}> {
  const [{ data, error }, votosRes] = await Promise.all([
    db()
      .from('postulaciones')
      .select(CAMPOS)
      .neq('estado', 'descartado')
      .order('apellido', { ascending: true })
      .order('nombre', { ascending: true })
      .order('id', { ascending: true }),
    db().from('votos').select('postulacion_id').eq('admin_id', adminId),
  ]);
  if (error) throw error;
  if (votosRes.error) throw votosRes.error;

  const votados = new Set((votosRes.data ?? []).map((v) => Number(v.postulacion_id)));
  const filas = ((data ?? []) as Omit<PostulanteVoto, 'votado'>[]).map((p) => ({
    ...p,
    votado: votados.has(p.id),
  }));
  return { filas, votados: votados.size };
}

export async function alternarVoto(
  adminId: number,
  postulacionId: number,
): Promise<{ votado: boolean }> {
  const { data: existe, error: errorBuscar } = await db()
    .from('votos')
    .select('id')
    .eq('admin_id', adminId)
    .eq('postulacion_id', postulacionId)
    .maybeSingle();
  if (errorBuscar) throw errorBuscar;

  if (existe) {
    const { error } = await db().from('votos').delete().eq('id', existe.id);
    if (error) throw error;
    return { votado: false };
  }

  const { error } = await db().from('votos').insert({
    admin_id: adminId,
    postulacion_id: postulacionId,
  });
  if (error) throw error;
  return { votado: true };
}

export type JuradoVoto = {
  id: number;
  nombre: string;
  email: string;
  cantidad: number;
};

export type RankingVoto = {
  id: number;
  tipo: Postulacion['tipo'];
  nombre: string;
  apellido: string;
  empresa: string;
  rubro: string | null;
  localidad: string | null;
  votos: number;
  votantes: { id: number; nombre: string }[];
};

export type ResumenVotos = {
  ranking: RankingVoto[];
  jurados: JuradoVoto[];
  totalVotos: number;
  ganadores: RankingVoto[];
  maximo: number;
};

export async function resumenVotos(): Promise<ResumenVotos> {
  const [postRes, votoRes, juradoRes] = await Promise.all([
    db()
      .from('postulaciones')
      .select('id, tipo, nombre, apellido, empresa, rubro, localidad')
      .neq('estado', 'descartado'),
    db().from('votos').select('admin_id, postulacion_id'),
    db().from('admins').select('id, nombre, email').eq('rol', 'votacion').order('nombre'),
  ]);
  if (postRes.error) throw postRes.error;
  if (votoRes.error) throw votoRes.error;
  if (juradoRes.error) throw juradoRes.error;

  const juradosBase = (juradoRes.data ?? []) as { id: number; nombre: string; email: string }[];
  const porJurado = new Map(juradosBase.map((j) => [j.id, { ...j, cantidad: 0 }]));
  const nombreJurado = new Map(juradosBase.map((j) => [j.id, j.nombre]));

  const conteo = new Map<number, { votos: number; votantes: { id: number; nombre: string }[] }>();
  for (const v of votoRes.data ?? []) {
    const postulacionId = Number(v.postulacion_id);
    const adminId = Number(v.admin_id);
    const actual = conteo.get(postulacionId) ?? { votos: 0, votantes: [] };
    actual.votos += 1;
    actual.votantes.push({ id: adminId, nombre: nombreJurado.get(adminId) ?? `Jurado #${adminId}` });
    conteo.set(postulacionId, actual);
    const jurado = porJurado.get(adminId);
    if (jurado) jurado.cantidad += 1;
  }

  const ranking: RankingVoto[] = ((postRes.data ?? []) as Omit<RankingVoto, 'votos' | 'votantes'>[])
    .map((p) => {
      const extra = conteo.get(p.id) ?? { votos: 0, votantes: [] };
      return { ...p, votos: extra.votos, votantes: extra.votantes };
    })
    .sort((a, b) => b.votos - a.votos || a.apellido.localeCompare(b.apellido, 'es') || a.nombre.localeCompare(b.nombre, 'es'));

  const maximo = ranking[0]?.votos ?? 0;
  const ganadores = maximo > 0 ? ranking.filter((p) => p.votos === maximo) : [];
  const jurados = [...porJurado.values()].sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre, 'es'));

  return {
    ranking,
    jurados,
    totalVotos: (votoRes.data ?? []).length,
    ganadores,
    maximo,
  };
}
