import type { Category } from './types';

export interface TypeInfo {
  category: Category;
  /** Identificador de formato; se traduce con `kindLabel()`. */
  kind: string;
}

const T = (category: Category, kind: string): TypeInfo => ({ category, kind });

/** Mapa de extensiones → categoría e identificador de formato. */
const EXTENSIONS: Record<string, TypeInfo> = {
  // vídeo
  mp4: T('video', 'mp4'),
  m4v: T('video', 'mp4'),
  mov: T('video', 'mov'),
  mkv: T('video', 'mkv'),
  webm: T('video', 'webm'),
  avi: T('video', 'avi'),
  wmv: T('video', 'wmv'),
  asf: T('video', 'wmv'),
  flv: T('video', 'flv'),
  mpg: T('video', 'mpeg'),
  mpeg: T('video', 'mpeg'),
  vob: T('video', 'vob'),
  vro: T('video', 'vro'),
  evo: T('video', 'evo'),
  m2ts: T('video', 'm2ts'),
  mts: T('video', 'mts'),
  m2t: T('video', 'ts'),
  ts: T('video', 'ts'),
  '3gp': T('video', '3gp'),
  ogv: T('video', 'ogv'),
  divx: T('video', 'divx'),
  rm: T('video', 'rm'),
  rmvb: T('video', 'rm'),
  // audio
  mp3: T('audio', 'mp3'),
  mpa: T('audio', 'mp3'),
  wav: T('audio', 'wav'),
  flac: T('audio', 'flac'),
  ogg: T('audio', 'ogg'),
  oga: T('audio', 'ogg'),
  opus: T('audio', 'opus'),
  m4a: T('audio', 'm4a'),
  aac: T('audio', 'aac'),
  wma: T('audio', 'wma'),
  aif: T('audio', 'aiff'),
  aiff: T('audio', 'aiff'),
  ape: T('audio', 'ape'),
  wv: T('audio', 'wv'),
  ac3: T('audio', 'ac3'),
  dts: T('audio', 'dts'),
  mka: T('audio', 'mka'),
  cda: T('audio', 'cda'),
  // imagen
  jpg: T('image', 'jpeg'),
  jpeg: T('image', 'jpeg'),
  jfif: T('image', 'jpeg'),
  png: T('image', 'png'),
  gif: T('image', 'gif'),
  webp: T('image', 'webp'),
  avif: T('image', 'avif'),
  bmp: T('image', 'bmp'),
  tif: T('image', 'tiff'),
  tiff: T('image', 'tiff'),
  heic: T('image', 'heic'),
  heif: T('image', 'heic'),
  svg: T('image', 'svg'),
  ico: T('image', 'ico'),
  // documentos
  pdf: T('document', 'pdf'),
  txt: T('document', 'txt'),
  nfo: T('document', 'nfo'),
  md: T('document', 'txt'),
  rtf: T('document', 'rtf'),
  doc: T('document', 'word'),
  docx: T('document', 'word'),
  xls: T('document', 'excel'),
  xlsx: T('document', 'excel'),
  ppt: T('document', 'ppt'),
  pptx: T('document', 'ppt'),
  odt: T('document', 'odt'),
  htm: T('document', 'html'),
  html: T('document', 'html'),
  xml: T('document', 'xml'),
  json: T('document', 'json'),
  csv: T('document', 'csv'),
  // archivos / imágenes de disco
  zip: T('archive', 'zip'),
  rar: T('archive', 'rar'),
  '7z': T('archive', '7z'),
  iso: T('archive', 'iso'),
  img: T('archive', 'img'),
  nrg: T('archive', 'img'),
  cue: T('archive', 'cue'),
  exe: T('other', 'exe'),
  msi: T('other', 'msi'),
  dll: T('other', 'dll'),
  // estructura de disco
  ifo: T('disc', 'ifo'),
  bup: T('disc', 'bup'),
  mpls: T('disc', 'mpls'),
  clpi: T('disc', 'clpi'),
  bdmv: T('disc', 'bdmv'),
  inf: T('disc', 'inf'),
  ini: T('disc', 'ini'),
  dat: T('other', 'dat'),
  bin: T('other', 'bin'),
};

export function extOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
}

export function classify(name: string, dir = ''): TypeInfo {
  const ext = extOf(name);
  // Los VCD guardan el vídeo en archivos .DAT dentro de MPEGAV/.
  if (ext === 'dat' && /(^|\/)(mpegav|mpeg2)$/i.test(dir)) return T('video', 'vcd');
  return EXTENSIONS[ext] ?? T('other', ext ? `ext:${ext}` : 'noext');
}

/** Archivos cuyo contenido real conviene analizar por firma binaria. */
export function needsSniff(ext: string, category: Category): boolean {
  return category === 'other' && !['exe', 'msi', 'dll', 'ini'].includes(ext);
}

/** Identifica el formato real a partir de los primeros bytes. */
export function sniff(buf: ArrayBuffer): TypeInfo | null {
  const b = new Uint8Array(buf);
  const ascii = (o: number, n: number) => String.fromCharCode(...b.subarray(o, o + n));
  const is = (o: number, ...bytes: number[]) => bytes.every((v, i) => b[o + i] === v);
  if (b.length < 12) return null;

  if (is(0, 0x00, 0x00, 0x01, 0xba)) return T('video', 'mpeg-ps');
  if (is(0, 0x00, 0x00, 0x01, 0xb3)) return T('video', 'mpeg-es');
  if (b[0] === 0x47 && b[188] === 0x47) return T('video', 'ts');
  if (b[4] === 0x47 && b[196] === 0x47) return T('video', 'm2ts');
  if (is(0, 0x1a, 0x45, 0xdf, 0xa3)) return T('video', 'mkv');
  if (ascii(4, 4) === 'ftyp') {
    const brand = ascii(8, 4);
    if (/heic|heix|mif1|msf1/.test(brand)) return T('image', 'heic');
    if (/avif/.test(brand)) return T('image', 'avif');
    if (/M4A |M4B /.test(brand)) return T('audio', 'm4a');
    if (/qt {2}/.test(brand)) return T('video', 'mov');
    return T('video', 'mp4');
  }
  if (ascii(0, 4) === 'RIFF') {
    const sub = ascii(8, 4);
    if (sub === 'WAVE') return T('audio', 'wav');
    if (sub === 'AVI ') return T('video', 'avi');
    if (sub === 'CDDA') return T('audio', 'cda');
    if (sub === 'WEBP') return T('image', 'webp');
    if (sub === 'CDXA') return T('video', 'vcd');
  }
  if (is(0, 0x30, 0x26, 0xb2, 0x75)) return T('video', 'wmv');
  if (ascii(0, 3) === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return T('audio', 'mp3');
  if (ascii(0, 4) === 'OggS') return T('audio', 'ogg');
  if (ascii(0, 4) === 'fLaC') return T('audio', 'flac');
  if (ascii(0, 4) === 'FORM' && ascii(8, 3) === 'AIF') return T('audio', 'aiff');
  if (is(0, 0xff, 0xd8, 0xff)) return T('image', 'jpeg');
  if (is(0, 0x89, 0x50, 0x4e, 0x47)) return T('image', 'png');
  if (ascii(0, 4) === 'GIF8') return T('image', 'gif');
  if (ascii(0, 2) === 'BM') return T('image', 'bmp');
  if (is(0, 0x49, 0x49, 0x2a, 0x00) || is(0, 0x4d, 0x4d, 0x00, 0x2a)) return T('image', 'tiff');
  if (ascii(0, 4) === '%PDF') return T('document', 'pdf');
  if (ascii(0, 4) === 'PK\u0003\u0004') return T('archive', 'zip');
  if (ascii(0, 4) === 'Rar!') return T('archive', 'rar');
  if (ascii(0, 2) === 'MZ') return T('other', 'exe');
  return null;
}

/** Formatos que Chromium reproduce/muestra sin conversión (mkv y mov se intentan; si fallan, se convierten). */
const NATIVE_KINDS = new Set(['mp4', 'webm', 'ogv', 'mov', 'mkv', 'mp3', 'wav', 'flac', 'ogg', 'opus', 'm4a', 'aac', 'jpeg', 'png', 'gif', 'webp', 'avif', 'bmp', 'svg', 'ico']);

export function browserCanShow(kind: string): boolean {
  return NATIVE_KINDS.has(kind);
}
