/**
 * Lectores de estructuras binarias de discos ópticos:
 *  - .CDA: accesos directos de Windows a pistas de CD de audio (RIFF/CDDA, 44 bytes).
 *  - VTS_xx_0.IFO: información de títulos de DVD-Video.
 */

const ascii = (v: DataView, o: number, n: number) =>
  String.fromCodePoint(...Array.from({ length: n }, (_, i) => v.getUint8(o + i)));

export interface CdaInfo {
  track: number;
  /** Duración en segundos (75 sectores = 1 s). */
  duration: number;
  startSector: number;
}

export function parseCda(buf: ArrayBuffer): CdaInfo | null {
  if (buf.byteLength < 44) return null;
  const v = new DataView(buf);
  if (ascii(v, 0, 4) !== 'RIFF' || ascii(v, 8, 4) !== 'CDDA') return null;
  return {
    track: v.getUint16(22, true),
    startSector: v.getUint32(28, true),
    duration: v.getUint32(32, true) / 75,
  };
}

export interface DvdAudioTrack {
  /** Código ISO 639-1 (puede venir vacío). */
  lang: string;
  codec: string;
  channels: number;
}

export interface DvdTitleInfo {
  /** Duración del programa (PGC) más largo, en segundos. */
  duration?: number;
  chapters?: number;
  video?: string;
  audio: DvdAudioTrack[];
  /** Códigos de idioma de los subtítulos. */
  subtitles: string[];
}

const AUDIO_CODECS: Record<number, string> = {
  0: 'Dolby Digital',
  2: 'MPEG-1',
  3: 'MPEG-2',
  4: 'LPCM',
  6: 'DTS',
};

const bcd = (n: number) => (n >> 4) * 10 + (n & 0x0f);

function videoAttributes(v: DataView): string {
  const va = v.getUint16(0x200);
  const coding = (va >> 14) & 0x3;
  const standard = (va >> 12) & 0x3;
  const aspect = (va >> 10) & 0x3;
  return [coding === 0 ? 'MPEG-1' : 'MPEG-2', standard === 0 ? 'NTSC' : 'PAL', aspect === 3 ? '16:9' : '4:3'].join(' · ');
}

/** Pistas de audio: nº en 0x202, atributos de 8 bytes desde 0x204. */
function audioTracks(v: DataView): DvdAudioTrack[] {
  const count = Math.min(v.getUint16(0x202), 8);
  return Array.from({ length: count }, (_, i) => {
    const o = 0x204 + i * 8;
    return {
      codec: AUDIO_CODECS[(v.getUint8(o) >> 5) & 0x7] ?? 'Audio',
      channels: (v.getUint8(o + 1) & 0x7) + 1,
      lang: ascii(v, o + 2, 2),
    };
  });
}

/** Subtítulos: nº en 0x254, atributos de 6 bytes desde 0x256. */
function subtitleLangs(v: DataView): string[] {
  const count = Math.min(v.getUint16(0x254), 32);
  return Array.from({ length: count }, (_, i) => ascii(v, 0x256 + i * 6 + 2, 2));
}

function pgcSeconds(v: DataView, pgc: number): number {
  const frameByte = v.getUint8(pgc + 7);
  const fps = frameByte >> 6 === 3 ? 29.97 : 25;
  return bcd(v.getUint8(pgc + 4)) * 3600 + bcd(v.getUint8(pgc + 5)) * 60 + bcd(v.getUint8(pgc + 6)) + bcd(frameByte & 0x3f) / fps;
}

/** Recorre la tabla de PGC (sector en 0xCC) y devuelve el programa más largo. */
function longestProgram(v: DataView): { duration: number; chapters: number } | null {
  try {
    const pgcit = v.getUint32(0xcc) * 2048;
    const count = v.getUint16(pgcit);
    let best = { duration: 0, chapters: 0 };
    for (let i = 0; i < count; i++) {
      const pgc = pgcit + v.getUint32(pgcit + 12 + i * 8);
      const duration = pgcSeconds(v, pgc);
      if (duration > best.duration) best = { duration, chapters: v.getUint8(pgc + 2) };
    }
    return best.duration > 0 ? best : null;
  } catch {
    return null; // IFO truncado o no estándar
  }
}

export function parseVtsIfo(buf: ArrayBuffer): DvdTitleInfo | null {
  if (buf.byteLength < 0x400) return null;
  const v = new DataView(buf);
  if (ascii(v, 0, 12) !== 'DVDVIDEO-VTS') return null;
  const program = longestProgram(v);
  return {
    video: videoAttributes(v),
    audio: audioTracks(v),
    subtitles: subtitleLangs(v),
    duration: program?.duration,
    chapters: program?.chapters,
  };
}
