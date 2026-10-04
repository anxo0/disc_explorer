/** Puente con la app de escritorio (Electron). Solo existe dentro de la versión portable. */

export interface NativeDrive {
  /** Raíz de la unidad, p. ej. "D:\". */
  root: string;
  label: string;
  size: number;
  free: number;
  type: 'optical' | 'removable' | 'fixed' | 'network' | 'unknown';
  /** false si es una unidad óptica sin disco. */
  ready: boolean;
}

export interface NativeFileInfo {
  /** Ruta relativa con "/". */
  path: string;
  nativePath: string;
  size: number;
  mtime: number;
}

export interface NativeScanResult {
  label: string;
  root: string;
  files: NativeFileInfo[];
  dirs: string[];
}

export interface DiscNativeAPI {
  version: string;
  listDrives(): Promise<NativeDrive[]>;
  pickFolder(): Promise<string | null>;
  scan(root: string): Promise<NativeScanResult>;
  /** URL de streaming (con soporte de Range) para un archivo local. Solo lectura. */
  mediaUrl(nativePath: string): string;
  /** Diálogo de guardado. El proceso principal rechaza destinos dentro de la unidad de origen. */
  saveDialog(opts: { defaultName: string; ext: string; sourceRoot: string }): Promise<string | null>;
  copyFile(src: string, dest: string): Promise<void>;
  /** Escribe datos en una ruta autorizada previamente por saveDialog. */
  writeFile(dest: string, data: Uint8Array): Promise<void>;
  tempFile(ext: string): Promise<string>;
  /** Ejecuta ffmpeg nativo. El último argumento debe ser una ruta autorizada por saveDialog/tempFile. */
  runFfmpeg(jobId: string, args: string[]): Promise<number>;
  cancelFfmpeg(jobId: string): void;
  onFfmpegLog(cb: (jobId: string, line: string) => void): () => void;
  showInFolder(path: string): void;
}

declare global {
  interface Window {
    discNative?: DiscNativeAPI;
  }
}

export function getNative(): DiscNativeAPI | undefined {
  return typeof window === 'undefined' ? undefined : window.discNative;
}
