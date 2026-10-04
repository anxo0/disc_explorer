import type { DiscFile, DiscSource } from '../types';
import { classify, extOf, needsSniff, sniff } from '../detect';

export type FileInit = Pick<DiscFile, 'path' | 'size' | 'lastModified' | 'nativePath' | 'getFile' | 'readRange' | 'url'>;

export function makeDiscFile(init: FileInit): DiscFile {
  const slash = init.path.lastIndexOf('/');
  const name = init.path.slice(slash + 1);
  const dir = slash >= 0 ? init.path.slice(0, slash) : '';
  const { category, kind } = classify(name, dir);
  return { ...init, name, dir, ext: extOf(name), category, kind };
}

export function collectDirs(files: DiscFile[]): string[] {
  const dirs = new Set<string>();
  for (const f of files) {
    const parts = f.dir.split('/').filter(Boolean);
    for (let i = 1; i <= parts.length; i++) dirs.add(parts.slice(0, i).join('/'));
  }
  return [...dirs].sort((a, b) => a.localeCompare(b));
}

/** Analiza por firma binaria los archivos de extensión desconocida o ambigua (.DAT, .BIN, sin extensión…). */
export async function refineBySignature(source: DiscSource, concurrency = 4): Promise<void> {
  const queue = source.files.filter((f) => needsSniff(f.ext, f.category) && f.size > 0);
  const worker = async () => {
    for (let f = queue.shift(); f; f = queue.shift()) {
      try {
        const found = sniff(await f.readRange(0, 512));
        if (found) {
          f.category = found.category;
          f.kind = found.kind;
        }
      } catch {
        // archivo ilegible (disco rayado…): se queda como está
      }
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
}

export function sortFiles(files: DiscFile[]): DiscFile[] {
  return files.sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: 'base' }));
}
