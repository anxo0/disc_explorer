export type Category = 'video' | 'audio' | 'image' | 'document' | 'archive' | 'disc' | 'other';

export interface DiscFile {
  /** Ruta relativa a la raíz del disco, con "/" como separador. Única. */
  path: string;
  name: string;
  /** Carpeta contenedora relativa ("" para la raíz). */
  dir: string;
  /** Extensión en minúsculas, sin punto. */
  ext: string;
  size: number;
  lastModified: number;
  category: Category;
  /** Identificador del formato real (ver `detect.ts`); se traduce con `kindLabel()`. */
  kind: string;
  /** Ruta absoluta en disco (solo en la app de escritorio). */
  nativePath?: string;
  getFile(): Promise<File>;
  readRange(start: number, end: number): Promise<ArrayBuffer>;
  /** URL reproducible por <video>/<audio>/<img>. */
  url(): Promise<string>;
}

export interface DiscSource {
  label: string;
  origin: 'web' | 'native';
  /** Ruta raíz legible (p. ej. "D:\"). */
  root: string;
  files: DiscFile[];
  dirs: string[];
  dispose(): void;
}

export type DiscType =
  | 'dvd-video'
  | 'dvd-vr'
  | 'bluray'
  | 'avchd'
  | 'audio-cd'
  | 'vcd'
  | 'svcd'
  | 'camera'
  | 'data';

/** Unidad reproducible/exportable: un archivo suelto o un grupo (título de DVD, pista de CD…). */
export interface MediaItem {
  id: string;
  /** Las etiquetas son funciones para que se traduzcan al cambiar de idioma. */
  title: () => string;
  subtitle?: () => string;
  category: Category;
  files: DiscFile[];
  /** Duración en segundos, si se conoce. */
  duration?: number;
  meta: () => [label: string, value: string][];
  /** Clave i18n del motivo por el que no se puede reproducir ni convertir. */
  unsupported?: string;
  /** Nombre base sugerido para exportar. */
  exportName: string;
}

export interface DiscAnalysis {
  type: DiscType;
  featured: MediaItem[];
  /** Clave i18n del encabezado de la sección destacada. */
  featuredLabel: string;
  totals: Record<Category, { count: number; size: number }>;
  totalSize: number;
}
