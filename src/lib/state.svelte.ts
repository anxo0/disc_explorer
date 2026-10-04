import type { Category, DiscAnalysis, DiscFile, DiscSource, MediaItem } from './types';
import { analyzeDisc, itemForFile } from './analyze';
import { refineBySignature } from './sources/common';
import { pickDirectory, sourceFromDrop, sourceFromFileList, type ScanProgress } from './sources/web';
import { nativeSource } from './sources/native';
import { getNative } from './native';
import { browserCanShow } from './detect';
import { t } from './i18n/index.svelte';

export type Filter = 'all' | Category;
export type ViewMode = 'list' | 'grid';

class AppState {
  source = $state.raw<DiscSource | null>(null);
  analysis = $state.raw<DiscAnalysis | null>(null);
  scanning = $state<{ count: number; current: string } | null>(null);
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

  private async load(open: (progress: ScanProgress) => Promise<DiscSource | null>) {
    this.error = null;
    this.scanning = { count: 0, current: '' };
    let lastPaint = 0;
    try {
      const source = await open((count, current) => {
        // Limitamos las actualizaciones de la UI durante el escaneo.
        const now = performance.now();
        if (now - lastPaint > 60) {
          lastPaint = now;
          this.scanning = { count, current };
        }
      });
      if (!source) return;
      if (!source.files.length) throw new Error(t('error.empty'));
      this.scanning = { count: source.files.length, current: t('scan.analyzing') };
      await refineBySignature(source);
      const analysis = await analyzeDisc(source);
      this.close();
      this.source = source;
      this.analysis = analysis;
    } catch (err) {
      this.error = err instanceof Error && err.message !== 'picker-unsupported' ? err.message : t('error.open');
    } finally {
      this.scanning = null;
    }
  }

  openPicker() {
    return this.load((p) => pickDirectory(p));
  }

  openFileList(list: FileList) {
    return this.load(() => Promise.resolve(sourceFromFileList(list)));
  }

  openDrop(dt: DataTransfer) {
    // sourceFromDrop debe llamarse de forma síncrona dentro del evento drop.
    const pending = sourceFromDrop(dt, (count, current) => (this.scanning = { count, current }));
    return this.load(() => pending);
  }

  openNative(root: string) {
    const api = getNative();
    if (!api) return;
    return this.load(() => nativeSource(api, root));
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
