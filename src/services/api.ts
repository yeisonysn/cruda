// src/services/api.ts — Capa HTTP centralizada para comunicarse con el backend Express

export interface Matera {
  id: string;
  nombre: string;
  precio: number | null;
  color: string;        // hex, ej. "#9e9e99"
  archivo: string;      // filename en uploads/
  archivoUrl: string;   // URL pública /uploads/xxx.stl
  creadoEn: string;
}

const BASE = '/api';

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function login(password: string): Promise<string> {
  const res = await fetch(`${BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Error al iniciar sesión.');
  return data.token as string;
}

// ─── Catálogo (público) ───────────────────────────────────────────────────────

export async function getMateras(): Promise<Matera[]> {
  const res = await fetch(`${BASE}/materas`);
  if (!res.ok) throw new Error('No se pudo cargar el catálogo.');
  return res.json();
}

// ─── Admin ───────────────────────────────────────────────────────────────────

export async function uploadMatera(token: string, fd: FormData): Promise<Matera> {
  const res = await fetch(`${BASE}/materas`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Error al subir la matera.');
  return data.matera as Matera;
}

export async function updateColor(token: string, id: string, color: string): Promise<Matera> {
  const res = await fetch(`${BASE}/materas/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ color }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Error al actualizar el color.');
  return data.matera as Matera;
}

export async function deleteMatera(token: string, id: string): Promise<void> {
  const res = await fetch(`${BASE}/materas/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Error al eliminar la matera.');
}

