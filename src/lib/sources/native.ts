/** Lectura del disco en la app de escritorio: el proceso principal lista y sirve los archivos (solo lectura). */
import type { DiscSource } from '../types';
import type { DiscNativeAPI } from '../native';
import { collectDirs, makeDiscFile, sortFiles } from './common';

export async function nativeSource(api: DiscNativeAPI, root: string): Promise<DiscSource> {
  const scan = await api.scan(root);
  const files = scan.files.map((info) => {
    const url = api.mediaUrl(info.nativePath);
    return makeDiscFile({
      path: info.path,
      size: info.size,
      lastModified: info.mtime,
      nativePath: info.nativePath,
      url: async () => url,
      readRange: async (start, end) => {
        const res = await fetch(url, { headers: { Range: `bytes=${start}-${Math.max(start, end - 1)}` } });
        if (!res.ok) throw new Error(`read-failed:${res.status}`);
        return res.arrayBuffer();
      },
      getFile: async () => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`read-failed:${res.status}`);
        return new File([await res.blob()], info.path.split('/').pop() ?? 'file', { lastModified: info.mtime });
      },
    });
  });
  sortFiles(files);
  return {
    label: scan.label,
    origin: 'native',
    root: scan.root,
    files,
    dirs: collectDirs(files),
    dispose: () => {},
  };
}
