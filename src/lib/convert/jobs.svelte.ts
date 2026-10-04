import type { MediaItem } from '../types';
import { getNative, type DiscNativeAPI } from '../native';
import { browserCanShow } from '../detect';
import { safeFileName } from '../format';
import { downloadBlob, downloadUrl } from '../download';
import { t } from '../i18n/index.svelte';
import { convertImageCanvas } from './image';
import { ProgressParser, type ProgressInfo } from './progress';
import { AbortedError, isEngineLoaded, runWasm } from './wasm';
import {
  inputArgs,
  isProgramStream,
  outputArgs,
  previewArgs,
  PREVIEW_SECONDS,
  type ConvertOptions,
  type Preset,
} from './presets';

export type JobStatus = 'queued' | 'loading' | 'running' | 'done' | 'error' | 'canceled';

export type JobOutput =
  | { kind: 'blob'; url: string; filename: string; size: number }
  | { kind: 'file'; path: string; filename: string };

export interface Job {
  id: string;
  title: string;
  format: string;
  status: JobStatus;
  ratio?: number;
  time: number;
  speed?: number;
  error?: string;
  output?: JobOutput;
  engine: 'wasm' | 'native' | 'canvas' | 'copy';
}

/** Por encima de este tamaño ffmpeg.wasm puede quedarse sin memoria al generar la salida. */
export const WASM_SAFE_BYTES = 1.6 * 1024 ** 3;

const isAbort = (err: unknown) => err instanceof AbortedError || (err instanceof DOMException && err.name === 'AbortError');

/** ¿Podemos usar el ffmpeg nativo de la app de escritorio para este elemento? */
function nativeFor(item: MediaItem): DiscNativeAPI | undefined {
  const api = getNative();
  return api && item.files.every((f) => f.nativePath) ? api : undefined;
}

function friendlyError(err: unknown, parser?: ProgressParser): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/out of memory|RangeError|Array buffer allocation/i.test(msg)) return t('error.memory');
  if (/fetch|NetworkError|Failed to load/i.test(msg) && !isEngineLoaded()) return t('error.engineLoad');
  if (/NotReadable|read-failed/i.test(msg)) return t('error.read');
  if (/encode-failed|InvalidStateError|decode/i.test(msg)) return t('error.image');
  const summary = parser?.errorSummary();
  return summary ? t('error.ffmpeg', { detail: summary }) : msg;
}

class JobsStore {
  list = $state<Job[]>([]);
  private controllers = new Map<string, AbortController>();

  get active() {
    return this.list.filter((j) => j.status === 'queued' || j.status === 'loading' || j.status === 'running');
  }

  private add(title: string, format: string, engine: Job['engine']): { job: Job; signal: AbortSignal } {
    const id = crypto.randomUUID();
    this.list.unshift({ id, title, format, status: 'queued', time: 0, engine });
    const controller = new AbortController();
    this.controllers.set(id, controller);
    // Devolvemos el proxy reactivo, no el objeto original.
    return { job: this.list[0], signal: controller.signal };
  }

  private progress(job: Job, info: ProgressInfo | null) {
    if (!info || job.status === 'canceled') return;
    job.status = 'running';
    job.time = info.time;
    job.speed = info.speed;
    if (info.ratio !== undefined) job.ratio = info.ratio;
  }

  cancel(id: string) {
    const job = this.list.find((j) => j.id === id);
    if (!job || !this.active.includes(job)) return;
    this.controllers.get(id)?.abort();
    if (job.engine === 'native') getNative()?.cancelFfmpeg(id);
    job.status = 'canceled';
  }

  dismiss(id: string) {
    const job = this.list.find((j) => j.id === id);
    if (job?.output?.kind === 'blob') URL.revokeObjectURL(job.output.url);
    this.controllers.delete(id);
    this.list = this.list.filter((j) => j.id !== id);
  }

  clearFinished() {
    for (const j of [...this.list]) if (!this.active.includes(j)) this.dismiss(j.id);
  }

  /** Descarga/copia el archivo original tal cual (no modifica el disco). */
  async downloadOriginal(item: MediaItem) {
    const api = nativeFor(item);
    for (const file of item.files) {
      if (api && file.nativePath) {
        const dest = await api.saveDialog({ defaultName: file.name, ext: file.ext, sourceRoot: file.nativePath });
        if (!dest) return;
        const { job } = this.add(file.name, t('format.original'), 'copy');
        job.status = 'running';
        try {
          await api.copyFile(file.nativePath, dest);
          job.status = 'done';
          job.ratio = 1;
          job.output = { kind: 'file', path: dest, filename: file.name };
        } catch (err) {
          job.status = 'error';
          job.error = friendlyError(err);
        }
      } else {
        downloadUrl(await file.url(), file.name);
      }
    }
  }

  async export(item: MediaItem, preset: Preset, opts: ConvertOptions) {
    const filename = `${safeFileName(item.exportName)}.${preset.ext}`;
    const api = nativeFor(item);
    const useCanvas = preset.group === 'image' && item.files.length === 1 && browserCanShow(item.files[0].kind);

    let dest: string | null = null;
    if (api) {
      dest = await api.saveDialog({ defaultName: filename, ext: preset.ext, sourceRoot: item.files[0].nativePath! });
      if (!dest) return;
    }

    const engine: Job['engine'] = useCanvas ? 'canvas' : api ? 'native' : 'wasm';
    const { job, signal } = this.add(item.title(), preset.label, engine);
    const programStream = isProgramStream(item);
    const parser = new ProgressParser(item.duration);

    try {
      if (useCanvas) {
        job.status = 'running';
        const blob = await convertImageCanvas(await item.files[0].getFile(), preset.mime, opts.imageQuality);
        await this.deliver(job, blob, filename, api, dest);
      } else if (api && dest) {
        job.status = 'running';
        const off = api.onFfmpegLog((id, line) => id === job.id && this.progress(job, parser.feed(line)));
        try {
          const args = [
            ...inputArgs(item.files.map((f) => f.nativePath!), programStream),
            ...outputArgs(preset, opts, { engine: 'native', programStream }),
            '-y',
            dest,
          ];
          const code = await api.runFfmpeg(job.id, args);
          if (signal.aborted) throw new AbortedError();
          if (code !== 0) throw new Error(`ffmpeg-exit-${code}`);
        } finally {
          off();
        }
        job.output = { kind: 'file', path: dest, filename };
      } else {
        job.status = isEngineLoaded() ? 'running' : 'loading';
        const files = await Promise.all(item.files.map((f) => f.getFile()));
        const data = await runWasm({
          files,
          outExt: preset.ext,
          signal,
          onLine: (line) => this.progress(job, parser.feed(line)),
          build: (inputs, out) => [
            ...inputArgs(inputs, programStream),
            ...outputArgs(preset, opts, { engine: 'wasm', programStream }),
            '-y',
            out,
          ],
        });
        await this.deliver(job, new Blob([data as BlobPart], { type: preset.mime }), filename, api, dest);
      }
      job.status = 'done';
      job.ratio = 1;
    } catch (err) {
      if (isAbort(err) || signal.aborted) {
        job.status = 'canceled';
      } else {
        job.status = 'error';
        job.error = friendlyError(err, parser);
      }
    } finally {
      this.controllers.delete(job.id);
    }
  }

  private async deliver(job: Job, blob: Blob, filename: string, api?: DiscNativeAPI, dest?: string | null) {
    if (api && dest) {
      await api.writeFile(dest, new Uint8Array(await blob.arrayBuffer()));
      job.output = { kind: 'file', path: dest, filename };
    } else {
      job.output = { kind: 'blob', url: downloadBlob(blob, filename), filename, size: blob.size };
    }
  }

  /**
   * Genera una vista previa reproducible de un formato que el navegador no soporta.
   * Devuelve una URL temporal (blob: o local).
   */
  async preview(item: MediaItem, onProgress: (ratio: number | undefined, loading: boolean) => void, signal: AbortSignal): Promise<string> {
    const programStream = isProgramStream(item);
    const { args, ext, mime } = previewArgs(item.category, programStream);
    const seek = item.category === 'video' && item.duration ? Math.min(item.duration * 0.1, 300) : 0;
    const parser = new ProgressParser(item.category === 'video' ? undefined : item.duration, item.category === 'video' ? PREVIEW_SECONDS : undefined);
    const api = nativeFor(item);

    if (api) {
      const out = await api.tempFile(ext);
      const jobId = `preview-${crypto.randomUUID()}`;
      const off = api.onFfmpegLog((id, line) => id === jobId && onProgress(parser.feed(line)?.ratio, false));
      const abort = () => api.cancelFfmpeg(jobId);
      signal.addEventListener('abort', abort, { once: true });
      try {
        const code = await api.runFfmpeg(jobId, [...inputArgs(item.files.map((f) => f.nativePath!), programStream, seek), ...args, '-y', out]);
        if (signal.aborted) throw new AbortedError();
        if (code !== 0) throw new Error(friendlyError(new Error(`ffmpeg-exit-${code}`), parser));
        return api.mediaUrl(out);
      } finally {
        off();
        signal.removeEventListener('abort', abort);
      }
    }

    onProgress(undefined, !isEngineLoaded());
    const files = await Promise.all(item.files.map((f) => f.getFile()));
    try {
      const data = await runWasm({
        files,
        outExt: ext,
        signal,
        onLine: (line) => onProgress(parser.feed(line)?.ratio, false),
        build: (inputs, out) => [...inputArgs(inputs, programStream, seek), ...args, '-y', out],
      });
      return URL.createObjectURL(new Blob([data as BlobPart], { type: mime }));
    } catch (err) {
      if (isAbort(err)) throw err;
      throw new Error(friendlyError(err, parser));
    }
  }
}

export const jobs = new JobsStore();
export { isAbort };
