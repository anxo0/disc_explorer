export interface ProgressInfo {
  /** 0–1, o undefined si no se conoce la duración. */
  ratio?: number;
  /** Segundos procesados. */
  time: number;
  speed?: number;
}

const toSeconds = (h: string, m: string, s: string) => Number(h) * 3600 + Number(m) * 60 + Number(s);

/** Interpreta la salida de ffmpeg (stderr) para calcular el progreso. */
export class ProgressParser {
  private duration?: number;
  readonly tail: string[] = [];

  constructor(durationHint?: number, private readonly limit?: number) {
    this.duration = durationHint;
  }

  feed(line: string): ProgressInfo | null {
    this.tail.push(line);
    if (this.tail.length > 30) this.tail.shift();

    if (!this.duration) {
      const d = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(line);
      if (d) this.duration = toSeconds(d[1], d[2], d[3]);
    }
    const tm = /time=\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(line);
    if (!tm) return null;
    const time = toSeconds(tm[1], tm[2], tm[3]);
    const sp = /speed=\s*([\d.]+)x/.exec(line);
    const total = this.limit ? Math.min(this.limit, this.duration ?? this.limit) : this.duration;
    return {
      time,
      speed: sp ? Number(sp[1]) : undefined,
      ratio: total ? Math.min(time / total, 0.999) : undefined,
    };
  }

  /** Últimas líneas útiles para mostrar un error comprensible. */
  errorSummary(): string {
    const relevant = this.tail.filter((l) => /error|invalid|not found|unsupported|could not|failed/i.test(l));
    return (relevant.length ? relevant : this.tail).slice(-3).join('\n');
  }
}
