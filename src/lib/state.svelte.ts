import type { Category, DiscAnalysis, DiscFile, DiscSource, MediaItem } from './types';
import { analyzeDisc, itemForFile } from './analyze';
import { refineBySignature } from './sources/common';
import {
  requestDirectory,
  sourceFromDrop,
  sourceFromFileList,
  sourceFromHandle,
  ScanAbortedError,
  type ScanContext,
} from './sources/web';
import { nativeSource } from './sources/native';
import { getNative } from './native';
import { browserCanShow } from './detect';
import { t } from './i18n/index.svelte';

export type Filter = 'all' | Category;
export type ViewMode = 'list' | 'grid';

class AppState {
  source = $state.raw<DiscSource | null>(null);
  analysis = $state.raw<DiscAnalysis | null>(null);
  scanning = $state<{ count: number; current: string; startedAt: number } | null>(null);
  error = $state<string | null>(null);

  filter = $state<Filter>('all');
  query = $state('');
  view = $state<ViewMode>('list');
  dir = $state('');
  selected = $state.raw<MediaItem | null>(null);

  /** Cola del reproductor de audio inferior. */
  queue = $state.raw<MediaItem[]>([]);
  queueIndex = $state(-1);

  /** Archivos visibles: navegación por carpetas, o búsqueda plana si hay filtro/consulta. */
  visible = $derived.by<DiscFile[]>(() => {
    const src = this.source;
    if (!src) return [];
    const q = this.query.trim().toLowerCase();
    if (q || this.filter !== 'all') {
      return src.files.filter(
        (f) => (this.filter === 'all' || f.category === this.filter) && (!q || f.path.toLowerCase().includes(q)),
      );
    }
    return src.files.filter((f) => f.dir === this.dir);
  });

  /** Subcarpetas directas de la carpeta actual (solo en modo navegación). */
  subdirs = $derived.by<string[]>(() => {
    const src = this.source;
    if (!src || this.query.trim() || this.filter !== 'all') return [];
    const prefix = this.dir ? `${this.dir}/` : '';
    return src.dirs.filter((d) => d.startsWith(prefix) && d !== this.dir && !d.slice(prefix.length).includes('/'));
  });

  get flatMode() {
    return !!this.query.trim() || this.filter !== 'all';
  }

  private scanController: AbortController | null = null;

  private async load(open: (ctx: ScanContext) => Promise<DiscSource | null>) {
    this.scanController?.abort();
    const controller = new AbortController();
    this.scanController = controller;
    const startedAt = Date.now();
    this.error = null;
    this.scanning = { count: 0, current: '', startedAt };
    let lastPaint = 0;
    try {
      const source = await open({
        signal: controller.signal,
        onProgress: (count, current) => {
          // Limitamos las actualizaciones de la UI durante el escaneo.
          const now = performance.now();
          if (now - lastPaint > 60) {
            lastPaint = now;
            this.scanning = { count, current, startedAt };
          }
        },
      });
      if (controller.signal.aborted || !source) return;
      if (!source.files.length) throw new Error(t('error.empty'));
      this.scanning = { count: source.files.length, current: t('scan.analyzing'), startedAt };
      await refineBySignature(source);
      const analysis = await analyzeDisc(source);
      if (controller.signal.aborted) return;
      this.close();
      this.source = source;
      this.analysis = analysis;
    } catch (err) {
      if (err instanceof ScanAbortedError || controller.signal.aborted) return;
      this.error = err instanceof Error && err.message !== 'picker-unsupported' ? err.message : t('error.open');
    } finally {
      if (this.scanController === controller) {
        this.scanning = null;
        this.scanController = null;
      }
    }
  }

  /** Cancela la lectura en curso (p. ej. una unidad bloqueada). */
  cancelScan() {
    this.scanController?.abort();
    this.scanController = null;
    this.scanning = null;
  }

  async openPicker() {
    this.error = null;
    try {
      const handle = await requestDirectory();
      if (handle) await this.load((ctx) => sourceFromHandle(handle, ctx));
    } catch (err) {
      this.error = err instanceof Error && err.message !== 'picker-unsupported' ? err.message : t('error.open');
    }
  }

  openFileList(list: FileList | File[]) {
    return this.load(() => Promise.resolve(sourceFromFileList(list)));
  }

  openDrop(dt: DataTransfer) {
    // Los handles deben pedirse de forma síncrona dentro del evento drop.
    let ctxRef: ScanContext = {};
    const pending = sourceFromDrop(dt, {
      get signal() {
        return ctxRef.signal;
      },
      onProgress: (count, current) => ctxRef.onProgress?.(count, current),
    });
    return this.load((ctx) => {
      ctxRef = ctx;
      return pending;
    });
  }

  openNative(root: string) {
    const api = getNative();
    if (!api) return;
    return this.load(({ signal }) =>
      Promise.race([
        nativeSource(api, root),
        new Promise<never>((_, reject) => signal?.addEventListener('abort', () => reject(new ScanAbortedError()), { once: true })),
      ]),
    );
  }

  close() {
    this.source?.dispose();
    this.source = null;
    this.analysis = null;
    this.selected = null;
    this.queue = [];
    this.queueIndex = -1;
    this.dir = '';
    this.query = '';
    this.filter = 'all';
  }

  select(item: MediaItem | null) {
    this.selected = item;
  }

  selectFile(file: DiscFile) {
    this.selected = this.featuredFor(file) ?? itemForFile(file);
  }

  /** Si el archivo pertenece a un elemento destacado (pista de CD…), usamos ese. */
  private featuredFor(file: DiscFile): MediaItem | undefined {
    return this.analysis?.featured.find((it) => it.files.length === 1 && it.files[0] === file);
  }

  /** Reproduce un audio en la barra inferior, encolando el resto de audios de la vista actual. */
  playAudio(item: MediaItem) {
    const playable = this.visible.filter((f) => f.category === 'audio' && browserCanShow(f.kind)).map(itemForFile);
    const idx = playable.findIndex((it) => it.id === item.id);
    if (idx === -1) {
      this.queue = [item];
      this.queueIndex = 0;
    } else {
      this.queue = playable;
      this.queueIndex = idx;
    }
  }

  get nowPlaying(): MediaItem | null {
    return this.queue[this.queueIndex] ?? null;
  }

  next() {
    if (this.queueIndex < this.queue.length - 1) this.queueIndex++;
  }

  prev() {
    if (this.queueIndex > 0) this.queueIndex--;
  }

  stopAudio() {
    this.queue = [];
    this.queueIndex = -1;
  }
}

export const app = new AppState();

if (import.meta.env.DEV && typeof window !== 'undefined') {
  // Acceso para depuración manual desde la consola (solo en desarrollo).
  (window as unknown as { __disclens: AppState }).__disclens = app;
}
