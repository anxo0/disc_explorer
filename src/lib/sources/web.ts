/**
 * Lectura del disco desde el navegador. Todo es de SOLO LECTURA:
 *  - File System Access API (Chrome/Edge) con `mode: 'read'`.
 *  - <input webkitdirectory> como alternativa universal.
 *  - Arrastrar y soltar una carpeta o unidad.
 */
import type { DiscFile, DiscSource } from '../types';
import { collectDirs, makeDiscFile, sortFiles } from './common';
import { t } from '../i18n/index.svelte';

export type ScanProgress = (count: number, current: string) => void;

interface DirHandle {
  kind: 'directory';
  name: string;
  values(): AsyncIterable<DirHandle | FileHandle>;
}
interface FileHandle {
  kind: 'file';
  name: string;
  getFile(): Promise<File>;
}

type PickerWindow = Window & {
  showDirectoryPicker?: (opts?: { mode?: 'read' | 'readwrite'; id?: string; startIn?: string }) => Promise<DirHandle>;
};

export const supportsDirectoryPicker = () => typeof window !== 'undefined' && 'showDirectoryPicker' in window;

function createSource(label: string, entries: { path: string; file: File }[]): DiscSource {
  const urls = new Map<string, string>();
  const files: DiscFile[] = entries.map(({ path, file }) =>
    makeDiscFile({
      path,
      size: file.size,
      lastModified: file.lastModified,
      getFile: async () => file,
      readRange: (start, end) => file.slice(start, end).arrayBuffer(),
      url: async () => {
        let url = urls.get(path);
        if (!url) {
          url = URL.createObjectURL(file);
          urls.set(path, url);
        }
        return url;
      },
    }),
  );
  sortFiles(files);
  return {
    label,
    origin: 'web',
    root: label,
    files,
    dirs: collectDirs(files),
    dispose: () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
      urls.clear();
    },
  };
}

/** Las raíces de unidad se llaman "D:\" o similar; mostramos algo más limpio. */
function cleanLabel(name: string): string {
  return name.replace(/[\\/]+$/, '') || name;
}

async function walkHandle(dir: DirHandle, prefix: string, out: { path: string; file: File }[], onProgress?: ScanProgress) {
  for await (const entry of dir.values()) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.kind === 'directory') {
      await walkHandle(entry, path, out, onProgress);
    } else {
      try {
        out.push({ path, file: await entry.getFile() });
        onProgress?.(out.length, path);
      } catch {
        // Archivo ilegible (sector dañado o acceso denegado): lo omitimos sin abortar el escaneo.
      }
    }
  }
}

async function sourceFromHandle(handle: DirHandle, onProgress?: ScanProgress): Promise<DiscSource> {
  const entries: { path: string; file: File }[] = [];
  await walkHandle(handle, '', entries, onProgress);
  return createSource(cleanLabel(handle.name), entries);
}

/** Abre el selector de carpetas del sistema. Devuelve null si el usuario cancela. */
export async function pickDirectory(onProgress?: ScanProgress): Promise<DiscSource | null> {
  const picker = (window as PickerWindow).showDirectoryPicker;
  if (!picker) throw new Error('picker-unsupported');
  let handle: DirHandle;
  try {
    handle = await picker({ mode: 'read', id: 'disclens-disc' });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return null;
    throw err;
  }
  return sourceFromHandle(handle, onProgress);
}

/** Alternativa para navegadores sin File System Access API. */
export function sourceFromFileList(list: FileList): DiscSource | null {
  const files = [...list];
  if (!files.length) return null;
  const first = files[0].webkitRelativePath || files[0].name;
  const label = first.includes('/') ? first.split('/')[0] : t('source.disc');
  const entries = files.map((file) => {
    const rel = file.webkitRelativePath || file.name;
    return { path: rel.includes('/') ? rel.slice(rel.indexOf('/') + 1) : rel, file };
  });
  return createSource(label, entries);
}

/* ---------- arrastrar y soltar ---------- */

type LegacyEntry = {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  file?: (ok: (f: File) => void, ko: (e: unknown) => void) => void;
  createReader?: () => { readEntries: (ok: (e: LegacyEntry[]) => void, ko: (e: unknown) => void) => void };
};

async function walkLegacy(entry: LegacyEntry, prefix: string, out: { path: string; file: File }[], onProgress?: ScanProgress) {
  const path = prefix ? `${prefix}/${entry.name}` : entry.name;
  if (entry.isFile && entry.file) {
    const file = await new Promise<File>((ok, ko) => entry.file!(ok, ko)).catch(() => null);
    if (file) {
      out.push({ path, file });
      onProgress?.(out.length, path);
    }
    return;
  }
  const reader = entry.createReader?.();
  if (!reader) return;
  // readEntries devuelve los resultados por lotes: hay que repetir hasta recibir un lote vacío.
  for (;;) {
    const batch = await new Promise<LegacyEntry[]>((ok, ko) => reader.readEntries(ok, ko)).catch(() => []);
    if (!batch.length) break;
    for (const child of batch) await walkLegacy(child, path, out, onProgress);
  }
}

export async function sourceFromDrop(dt: DataTransfer, onProgress?: ScanProgress): Promise<DiscSource | null> {
  const items = [...dt.items].filter((i) => i.kind === 'file');
  if (!items.length) return null;

  type ModernItem = DataTransferItem & { getAsFileSystemHandle?: () => Promise<DirHandle | FileHandle | null> };
  // Hay que pedir todos los handles de forma síncrona, antes del primer await.
  const handles = items.map((i) => (i as ModernItem).getAsFileSystemHandle?.());
  const legacy = items.map((i) => ((i.webkitGetAsEntry?.() ?? null) as unknown as LegacyEntry | null));

  if (handles.every(Boolean)) {
    const resolved = await Promise.all(handles);
    const dir = resolved.find((h): h is DirHandle => h?.kind === 'directory');
    if (dir && resolved.length === 1) return sourceFromHandle(dir, onProgress);
    const entries: { path: string; file: File }[] = [];
    for (const h of resolved) {
      if (h?.kind === 'directory') await walkHandle(h, h.name, entries, onProgress);
      else if (h?.kind === 'file') entries.push({ path: h.name, file: await h.getFile() });
    }
    return entries.length ? createSource(dir ? cleanLabel(dir.name) : t('source.files'), entries) : null;
  }

  const entries: { path: string; file: File }[] = [];
  const roots = legacy.filter((e): e is LegacyEntry => !!e);
  if (roots.length === 1 && roots[0].isDirectory) {
    const reader = roots[0].createReader?.();
    for (;;) {
      const batch = reader ? await new Promise<LegacyEntry[]>((ok, ko) => reader.readEntries(ok, ko)).catch(() => []) : [];
      if (!batch.length) break;
      for (const child of batch) await walkLegacy(child, '', entries, onProgress);
    }
    return createSource(roots[0].name, entries);
  }
  for (const root of roots) await walkLegacy(root, '', entries, onProgress);
  return entries.length ? createSource(t('source.files'), entries) : null;
}
