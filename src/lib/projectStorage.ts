import { mkdir, readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs';
import { BaseDirectory } from '@tauri-apps/plugin-fs';
import type { Shape } from '../shapes/Shape';

const BASE_DIR = BaseDirectory.Document;
const PROJECTS_PATH = 'VectorEngine/projects';
const INDEX_PATH = 'VectorEngine/index.json';

//список проектов
export interface ProjectMeta {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

//данные проекта
export interface ProjectData {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  lineAlgorithm: string;
  shapes: object[];
}

async function ensureDirs() {
  const dirExists = await exists('VectorEngine/projects', { baseDir: BASE_DIR });
  if (!dirExists) {
    await mkdir('VectorEngine/projects', { baseDir: BASE_DIR, recursive: true });
  }
}

//загрузка проектов
export async function loadProjectIndex(): Promise<ProjectMeta[]> {
  try {
    await ensureDirs();
    const indexExists = await exists(INDEX_PATH, { baseDir: BASE_DIR });
    if (!indexExists) return [];
    const text = await readTextFile(INDEX_PATH, { baseDir: BASE_DIR });
    return JSON.parse(text) as ProjectMeta[];
  } catch {
    return [];
  }
}

//сохранение списка проектов
async function saveProjectIndex(index: ProjectMeta[]) {
  await ensureDirs();
  await writeTextFile(INDEX_PATH, JSON.stringify(index, null, 2), { baseDir: BASE_DIR });
}

//сохрание проекта
export async function saveProject(
  id: string,
  name: string,
  shapes: Shape[],
  lineAlgorithm: string
): Promise<void> {
  await ensureDirs();

  const now = new Date().toISOString();
  const index = await loadProjectIndex();
  const existing = index.find(p => p.id === id);

  const meta: ProjectMeta = {
    id,
    name,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  const data: ProjectData = {
    ...meta,
    lineAlgorithm,
    shapes: shapes.map(s => s.toJSON()),
  };

  await writeTextFile(
    `${PROJECTS_PATH}/${id}.json`,
    JSON.stringify(data, null, 2),
    { baseDir: BASE_DIR }
  );

  const newIndex = existing
    ? index.map(p => p.id === id ? meta : p)
    : [...index, meta];
  await saveProjectIndex(newIndex);
}

//загрузка проекта
export async function loadProject(id: string): Promise<ProjectData | null> {
  try {
    await ensureDirs();
    const path = `${PROJECTS_PATH}/${id}.json`;
    const fileExists = await exists(path, { baseDir: BASE_DIR });
    if (!fileExists) return null;
    const text = await readTextFile(path, { baseDir: BASE_DIR });
    return JSON.parse(text) as ProjectData;
  } catch {
    return null;
  }
}

//удаление проекта
export async function deleteProject(id: string): Promise<void> {
  try {
    const index = await loadProjectIndex();
    await saveProjectIndex(index.filter(p => p.id !== id));
  } catch {
  }
}

//генерация айди
export function generateId(): string {
  return `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}