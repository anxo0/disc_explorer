<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import Play from '@lucide/svelte/icons/play';
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
  import Music from '@lucide/svelte/icons/music';
  import LoaderCircle from '@lucide/svelte/icons/loader-circle';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Progress } from '$lib/components/ui/progress/index.js';
  import type { MediaItem } from '$lib/types';
  import { app } from '$lib/state.svelte';
  import { browserCanShow } from '$lib/detect';
  import { jobs, isAbort } from '$lib/convert/jobs.svelte';
  import { PREVIEW_SECONDS } from '$lib/convert/presets';
  import { t } from '$lib/i18n/index.svelte';
  import { cn } from '$lib/utils';
  import FileIcon from '../shared/FileIcon.svelte';

  let props: { item: MediaItem } = $props();
  // El componente se recrea con {#key} al cambiar de elemento: capturar el valor inicial es intencionado.
  const item = untrack(() => props.item);

  type Mode = 'native' | 'needs-preview' | 'generating' | 'ready' | 'error' | 'unsupported' | 'none';

  const file = item.files[0];
  const isMedia = ['video', 'audio', 'image'].includes(item.category);
  const nativeOk = item.files.length === 1 && browserCanShow(file.kind);
  const stage = item.category === 'video' || item.category === 'image';

  const initialMode: Mode = item.unsupported ? 'unsupported' : !isMedia ? 'none' : nativeOk ? 'native' : 'needs-preview';
  let mode = $state<Mode>(initialMode);
  let url = $state<string | null>(null);
  let ratio = $state<number | undefined>(undefined);
  let engineLoading = $state(false);
  let error = $state('');
  let controller: AbortController | null = null;
  let ownedUrl: string | null = null;

  if (initialMode === 'native' && item.category !== 'audio') {
    file.url().then((u) => (url = u)).catch(() => (mode = 'needs-preview'));
  }
  // Las imágenes no nativas (TIFF…) se convierten rápido: lo hacemos automáticamente.
  if (initialMode === 'needs-preview' && item.category === 'image') generate();

  async function generate() {
    controller?.abort();
    controller = new AbortController();
    mode = 'generating';
    ratio = undefined;
    try {
      const out = await jobs.preview(item, (r, loading) => ((ratio = r), (engineLoading = loading)), controller.signal);
      if (out.startsWith('blob:')) ownedUrl = out;
      url = out;
      mode = 'ready';
    } catch (err) {
      if (isAbort(err)) return;
      error = err instanceof Error ? err.message : String(err);
      mode = 'error';
    } finally {
      engineLoading = false;
    }
  }

  function cancel() {
    controller?.abort();
    mode = 'needs-preview';
  }

  // Contenedor compatible pero códec no (p. ej. MKV con HEVC o AC-3): ofrecemos vista previa convertida.
  function onMediaError() {
    if (mode !== 'native') return;
    url = null;
    mode = 'needs-preview';
  }

  onDestroy(() => {
    controller?.abort();
    if (ownedUrl) URL.revokeObjectURL(ownedUrl);
  });
</script>

<div
  class={cn(
    'relative grid min-h-52 place-items-center overflow-hidden rounded-xl border',
    stage ? 'bg-[radial-gradient(circle_at_50%_30%,rgb(255_255_255/0.05),transparent_60%),#050608] text-zinc-300' : 'bg-card',
  )}
>
  {#if (mode === 'native' || mode === 'ready') && item.category === 'audio'}
    <div class="grid w-full justify-items-center gap-5 px-5 py-8">
      <div
        class="grid size-28 place-items-center rounded-full bg-[radial-gradient(circle,var(--card)_0_22%,transparent_23%),repeating-radial-gradient(circle,color-mix(in_oklch,var(--c-audio)_18%,transparent)_0_1px,transparent_1px_4px)] text-audio shadow-lg ring-1 ring-audio/20"
      >
        <Music class="size-7" />
      </div>
      {#if mode === 'native'}
        <Button onclick={() => app.playAudio(item)}><Play class="fill-current" />{t('action.play')}</Button>
      {:else if url}
        <!-- svelte-ignore a11y_media_has_caption -->
        <audio src={url} controls autoplay class="w-full"></audio>
      {/if}
    </div>
  {:else if (mode === 'native' || mode === 'ready') && url}
    {#if item.category === 'video'}
      <!-- svelte-ignore a11y_media_has_caption -->
      <video src={url} controls playsinline preload="metadata" class="max-h-[420px] w-full object-contain" onerror={onMediaError}></video>
    {:else}
      <img src={url} alt={item.title()} class="max-h-[420px] w-full object-contain" onerror={onMediaError} />
    {/if}
    {#if mode === 'ready' && item.category === 'video'}
      <span class="absolute top-2.5 left-2.5 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white backdrop-blur">{t('preview.badge', { s: PREVIEW_SECONDS })}</span>
    {/if}
  {:else if mode === 'needs-preview'}
    <div class="grid justify-items-center gap-3 px-6 py-8 text-center text-sm">
      <FileIcon category={item.category} class="size-12" />
      <p class="max-w-[34ch] opacity-80">{t(item.category === 'audio' ? 'preview.needAudio' : 'preview.needVideo')}</p>
      <Button size="sm" onclick={generate}>
        <Sparkles />{item.category === 'audio' ? t('preview.makeAudio') : t('preview.makeVideo', { s: PREVIEW_SECONDS })}
      </Button>
    </div>
  {:else if mode === 'generating'}
    <div class="grid w-full max-w-64 justify-items-center gap-3 px-6 py-8 text-center text-sm">
      <LoaderCircle class="size-7 animate-spin text-primary" />
      <p class="opacity-80">{engineLoading ? t('preview.loadingEngine') : t('preview.generating')}</p>
      <Progress value={ratio !== undefined ? ratio * 100 : null} class="h-1" />
      <Button variant="ghost" size="sm" onclick={cancel}>{t('action.cancel')}</Button>
    </div>
  {:else if mode === 'error'}
    <div class="grid justify-items-center gap-3 px-6 py-8 text-center text-sm">
      <TriangleAlert class="size-7 text-warning" />
      <p>{t('preview.failed')}</p>
      <code class="max-h-20 max-w-full overflow-auto font-mono text-[11px] whitespace-pre-wrap opacity-70">{error}</code>
      <Button variant="outline" size="sm" onclick={generate}>{t('action.retry')}</Button>
    </div>
  {:else if mode === 'unsupported'}
    <div class="grid justify-items-center gap-3 px-6 py-8 text-center text-sm text-muted-foreground">
      <FileIcon category={item.category} class="size-12" />
      <p class="max-w-[44ch] leading-relaxed">{t(item.unsupported ?? '')}</p>
    </div>
  {:else}
    <div class="grid justify-items-center gap-3 px-6 py-8 text-center text-sm text-muted-foreground">
      <FileIcon category={item.category} class="size-14" />
      <p>{t('preview.none')}</p>
    </div>
  {/if}
</div>
