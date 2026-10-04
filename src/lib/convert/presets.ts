import type { Category, MediaItem } from '../types';

export type PresetGroup = 'video' | 'audio' | 'image';
export type Speed = 'fast' | 'medium' | 'slow';
export type Engine = 'wasm' | 'native';

export interface Preset {
  id: string;
  group: PresetGroup;
  ext: string;
  mime: string;
  /** Nombre corto visible (no se traduce: son nombres de formato). */
  label: string;
  /** Clave i18n con la descripción. */
  desc: string;
  speed: Speed;
}

export interface ConvertOptions {
  /** Altura máxima de salida; 0 = original. */
  height: number;
  deinterlace: boolean;
  /** kbps */
  audioBitrate: number;
  /** 0–1 para JPEG/WebP. */
  imageQuality: number;
}

export const DEFAULT_OPTIONS: ConvertOptions = { height: 0, deinterlace: true, audioBitrate: 192, imageQuality: 0.92 };

export const PRESETS: Preset[] = [
  { id: 'mp4', group: 'video', ext: 'mp4', mime: 'video/mp4', label: 'MP4', desc: 'preset.mp4', speed: 'medium' },
  { id: 'mkv-copy', group: 'video', ext: 'mkv', mime: 'video/x-matroska', label: 'MKV', desc: 'preset.mkvCopy', speed: 'fast' },
  { id: 'mkv', group: 'video', ext: 'mkv', mime: 'video/x-matroska', label: 'MKV · H.264', desc: 'preset.mkv', speed: 'medium' },
  { id: 'webm', group: 'video', ext: 'webm', mime: 'video/webm', label: 'WebM', desc: 'preset.webm', speed: 'slow' },
  { id: 'mov', group: 'video', ext: 'mov', mime: 'video/quicktime', label: 'MOV', desc: 'preset.mov', speed: 'medium' },
  { id: 'avi', group: 'video', ext: 'avi', mime: 'video/x-msvideo', label: 'AVI', desc: 'preset.avi', speed: 'medium' },
  { id: 'mp3', group: 'audio', ext: 'mp3', mime: 'audio/mpeg', label: 'MP3', desc: 'preset.mp3', speed: 'fast' },
  { id: 'wav', group: 'audio', ext: 'wav', mime: 'audio/wav', label: 'WAV', desc: 'preset.wav', speed: 'fast' },
  { id: 'flac', group: 'audio', ext: 'flac', mime: 'audio/flac', label: 'FLAC', desc: 'preset.flac', speed: 'fast' },
  { id: 'ogg', group: 'audio', ext: 'ogg', mime: 'audio/ogg', label: 'OGG', desc: 'preset.ogg', speed: 'fast' },
  { id: 'm4a', group: 'audio', ext: 'm4a', mime: 'audio/mp4', label: 'M4A', desc: 'preset.m4a', speed: 'fast' },
  { id: 'opus', group: 'audio', ext: 'opus', mime: 'audio/ogg', label: 'Opus', desc: 'preset.opus', speed: 'fast' },
  { id: 'png', group: 'image', ext: 'png', mime: 'image/png', label: 'PNG', desc: 'preset.png', speed: 'fast' },
  { id: 'jpeg', group: 'image', ext: 'jpg', mime: 'image/jpeg', label: 'JPEG', desc: 'preset.jpeg', speed: 'fast' },
  { id: 'webp', group: 'image', ext: 'webp', mime: 'image/webp', label: 'WebP', desc: 'preset.webp', speed: 'fast' },
];

export function presetsFor(category: Category): Preset[] {
  if (category === 'video') return PRESETS.filter((p) => p.group !== 'image');
  if (category === 'audio') return PRESETS.filter((p) => p.group === 'audio');
  if (category === 'image') return PRESETS.filter((p) => p.group === 'image');
  return [];
}

/** Fuentes MPEG Program Stream (DVD, VCD, DVD-VR): necesitan más análisis y regenerar marcas de tiempo. */
export function isProgramStream(item: MediaItem): boolean {
  return item.files.some((f) => ['vob', 'vro', 'mpeg-ps', 'vcd', 'mpeg'].includes(f.kind));
}

/** Argumentos de entrada: varias partes (VOB troceados) se concatenan a nivel binario. */
export function inputArgs(paths: string[], programStream: boolean, seek?: number): string[] {
  const args = ['-hide_banner', '-nostdin'];
  if (programStream) args.push('-fflags', '+genpts', '-analyzeduration', '100M', '-probesize', '100M');
  if (seek) args.push('-ss', String(seek));
  args.push('-i', paths.length > 1 ? `concat:${paths.join('|')}` : paths[0]);
  return args;
}

function videoFilter(opts: ConvertOptions, programStream: boolean, maxHeight = opts.height): string[] {
  const filters: string[] = [];
  if (programStream && opts.deinterlace) filters.push('yadif');
  if (maxHeight > 0) filters.push(`scale=-2:'min(${maxHeight},ih)'`);
  return filters.length ? ['-vf', filters.join(',')] : [];
}

function x264(engine: Engine): string[] {
  // En WebAssembly (un solo hilo) solo "ultrafast" es razonable; en nativo priorizamos calidad.
  return engine === 'wasm'
    ? ['-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23', '-pix_fmt', 'yuv420p']
    : ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p'];
}

/** Argumentos de salida (códecs/mapeo) para un preset. */
export function outputArgs(preset: Preset, opts: ConvertOptions, ctx: { engine: Engine; programStream: boolean }): string[] {
  const br = `${opts.audioBitrate}k`;
  const vf = () => videoFilter(opts, ctx.programStream);
  const firstAV = ['-map', '0:v:0', '-map', '0:a:0?'];
  switch (preset.id) {
    case 'mp4':
    case 'mov':
      return [...firstAV, ...vf(), ...x264(ctx.engine), '-c:a', 'aac', '-b:a', br, '-movflags', '+faststart', '-sn', '-map_metadata', '0'];
    case 'mkv':
      return ['-map', '0:v:0', '-map', '0:a?', ...vf(), ...x264(ctx.engine), '-c:a', 'aac', '-b:a', br, '-sn'];
    case 'mkv-copy':
      // Copia directa de las pistas: sin pérdida y muy rápido. Los subtítulos de DVD se omiten
      // porque a menudo carecen de dimensiones y hacen fallar el muxer.
      return ['-map', '0:v?', '-map', '0:a?', ...(ctx.programStream ? [] : ['-map', '0:s?']), '-c', 'copy'];
    case 'webm':
      return [...firstAV, ...vf(), '-c:v', 'libvpx-vp9', '-deadline', 'realtime', '-cpu-used', '8', '-crf', '33', '-b:v', '0', '-c:a', 'libopus', '-b:a', '128k', '-sn'];
    case 'avi':
      return [...firstAV, ...vf(), '-c:v', 'mpeg4', '-vtag', 'xvid', '-q:v', '4', '-c:a', 'libmp3lame', '-b:a', br, '-sn'];
    case 'mp3':
      return ['-vn', '-map', '0:a:0', '-c:a', 'libmp3lame', '-b:a', br, '-map_metadata', '0'];
    case 'wav':
      return ['-vn', '-map', '0:a:0', '-c:a', 'pcm_s16le'];
    case 'flac':
      return ['-vn', '-map', '0:a:0', '-c:a', 'flac', '-map_metadata', '0'];
    case 'ogg':
      return ['-vn', '-map', '0:a:0', '-c:a', 'libvorbis', '-b:a', br, '-map_metadata', '0'];
    case 'm4a':
      return ['-vn', '-map', '0:a:0', '-c:a', 'aac', '-b:a', br, '-map_metadata', '0'];
    case 'opus':
      return ['-vn', '-map', '0:a:0', '-c:a', 'libopus', '-b:a', `${Math.min(opts.audioBitrate, 256)}k`, '-map_metadata', '0'];
    case 'png':
      return ['-frames:v', '1', '-c:v', 'png'];
    case 'jpeg':
      return ['-frames:v', '1', '-c:v', 'mjpeg', '-q:v', String(Math.round(2 + (1 - opts.imageQuality) * 29))];
    case 'webp':
      return ['-frames:v', '1', '-c:v', 'libwebp', '-quality', String(Math.round(opts.imageQuality * 100))];
    default:
      throw new Error(`preset desconocido: ${preset.id}`);
  }
}

export const PREVIEW_SECONDS = 45;

/** Vista previa ligera para formatos que el navegador no reproduce (VOB, M2TS, WMA, TIFF…). */
export function previewArgs(category: Category, programStream: boolean): { args: string[]; ext: string; mime: string } {
  if (category === 'audio') return { args: ['-vn', '-map', '0:a:0', '-c:a', 'libmp3lame', '-b:a', '160k'], ext: 'mp3', mime: 'audio/mpeg' };
  if (category === 'image') return { args: ['-frames:v', '1', '-c:v', 'png'], ext: 'png', mime: 'image/png' };
  return {
    args: [
      '-t', String(PREVIEW_SECONDS),
      '-map', '0:v:0', '-map', '0:a:0?',
      ...videoFilter({ ...DEFAULT_OPTIONS, deinterlace: true }, programStream, 480),
      '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '128k', '-ac', '2', '-movflags', '+faststart', '-sn',
    ],
    ext: 'mp4',
    mime: 'video/mp4',
  };
}
