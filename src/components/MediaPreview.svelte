<script lang="ts">
  import { onDestroy } from 'svelte';
  import { Play, Sparkles, TriangleAlert, Music, LoaderCircle } from '@lucide/svelte';
  import type { MediaItem } from '../lib/types';
  import { app } from '../lib/state.svelte';
  import { browserCanShow } from '../lib/detect';
  import { jobs, isAbort } from '../lib/convert/jobs.svelte';
  import { PREVIEW_SECONDS } from '../lib/convert/presets';
  import { t } from '../lib/i18n/index.svelte';
  import FileIcon from './FileIcon.svelte';

  let { item }: { item: MediaItem } = $props();

  type Mode = 'idle' | 'native' | 'needs-preview' | 'generating' | 'ready' | 'error' | 'unsupported' | 'none';

  const file = item.files[0];
  const isMedia = ['video', 'audio', 'image'].includes(item.category);
  const nativeOk = item.files.length === 1 && browserCanShow(file.kind);

  let mode = $state<Mode>(item.unsupported ? 'unsupported' : !isMedia ? 'none' : nativeOk ? 'native' : 'needs-preview');
  let url = $state<string | null>(null);
  let ratio = $state<number | undefined>(undefined);
  let engineLoading = $state(false);
  let error = $state('');
  let controller: AbortController | null = null;
  let ownedUrl: string | null = null;

  if (mode === 'native' && item.category !== 'audio') {
    file.url().then((u) => (url = u)).catch(() => (mode = 'needs-preview'));
  }
  // Las imágenes no nativas (TIFF…) son rápidas de convertir: lo hacemos automáticamente.
  if (mode === 'needs-preview' && item.category === 'image') generate();

  async function generate() {
    controller?.abort();
    controller = new AbortController();
    mode = 'generating';
    ratio = undefined;
    try {
      const out = await jobs.preview(
        item,
        (r, loading) => {
          ratio = r;
          engineLoading = loading;
        },
        controller.signal,
      );
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

  function onMediaError() {
    // El contenedor es compatible pero el códec no (p. ej. MKV con HEVC o AC-3): ofrecemos vista previa convertida.
    if (mode === 'native') {
      url = null;
      mode = 'needs-preview';
    }
  }

  onDestroy(() => {
    controller?.abort();
    if (ownedUrl) URL.revokeObjectURL(ownedUrl);
  });
</script>

<div class="preview" class:dark-stage={item.category === 'video' || item.category === 'image'}>
  {#if (mode === 'native' || mode === 'ready') && item.category === 'audio'}
    <div class="audio-art">
      <div class="vinyl"><Music size={28} /></div>
      {#if mode === 'native'}
        <button class="btn btn-primary" onclick={() => app.playAudio(item)}><Play size={15} /> {t('action.play')}</button>
      {:else if url}
        <!-- svelte-ignore a11y_media_has_caption -->
        <audio src={url} controls autoplay></audio>
      {/if}
    </div>
  {:else if (mode === 'native' || mode === 'ready') && url}
    {#if item.category === 'video'}
      <!-- svelte-ignore a11y_media_has_caption -->
      <video src={url} controls playsinline preload="metadata" onerror={onMediaError}></video>
    {:else}
      <img src={url} alt={item.title()} onerror={onMediaError} />
    {/if}
    {#if mode === 'ready' && item.category === 'video'}
      <span class="badge">{t('preview.badge', { s: PREVIEW_SECONDS })}</span>
    {/if}
  {:else if mode === 'needs-preview'}
    <div class="state">
      <FileIcon category={item.category} size={48} />
      <p>{t(item.category === 'audio' ? 'preview.needAudio' : 'preview.needVideo')}</p>
      <button class="btn btn-primary btn-sm" onclick={generate}>
        <Sparkles size={14} />
        {item.category === 'audio' ? t('preview.makeAudio') : t('preview.makeVideo', { s: PREVIEW_SECONDS })}
      </button>
    </div>
  {:else if mode === 'generating'}
    <div class="state">
      <LoaderCircle size={30} class="spin" />
      <p>{engineLoading ? t('preview.loadingEngine') : t('preview.generating')}</p>
      <div class="bar"><span style:width="{Math.round((ratio ?? 0) * 100)}%" class:indeterminate={ratio === undefined}></span></div>
      <button class="btn btn-ghost btn-sm" onclick={() => { controller?.abort(); mode = 'needs-preview'; }}>{t('action.cancel')}</button>
    </div>
  {:else if mode === 'error'}
    <div class="state">
      <TriangleAlert size={28} class="warn" />
      <p>{t('preview.failed')}</p>
      <code class="mono err">{error}</code>
      <button class="btn btn-secondary btn-sm" onclick={generate}>{t('action.retry')}</button>
    </div>
  {:else if mode === 'unsupported'}
    <div class="state">
      <FileIcon category={item.category} size={48} />
      <p class="long">{t(item.unsupported ?? '')}</p>
    </div>
  {:else}
    <div class="state">
      <FileIcon category={item.category} size={56} />
      <p>{t('preview.none')}</p>
    </div>
  {/if}
</div>

<style>
  .preview {
    position: relative;
    display: grid;
    place-items: center;
    min-height: 220px;
    border-radius: var(--radius-lg);
    overflow: hidden;
    background: var(--surface);
    border: 1px solid var(--border);
  }
  .dark-stage {
    background:
      radial-gradient(circle at 50% 30%, rgb(255 255 255 / 0.04), transparent 60%),
      #050608;
  }
  video,
  img {
    width: 100%;
    max-height: 420px;
    object-fit: contain;
  }
  .badge {
    position: absolute;
    top: 10px;
    left: 10px;
    padding: 3px 8px;
    border-radius: 999px;
    background: rgb(0 0 0 / 0.6);
    color: #fff;
    font-size: 11px;
    backdrop-filter: blur(6px);
  }
  .state {
    display: grid;
    justify-items: center;
    gap: 12px;
    padding: 28px 20px;
    text-align: center;
    color: var(--text-2);
    font-size: 13px;
  }
  .dark-stage .state {
    color: #b9bec8;
  }
  .state p {
    max-width: 34ch;
  }
  .state .long {
    max-width: 44ch;
    line-height: 1.55;
  }
  .state :global(.spin) {
    color: var(--accent);
    animation: spin 0.9s linear infinite;
  }
  .state :global(.warn) {
    color: var(--warning);
  }
  @keyframes spin {
    to {
      rotate: 360deg;
    }
  }
  .err {
    max-width: 100%;
    max-height: 80px;
    overflow: auto;
    white-space: pre-wrap;
    font-size: 11px;
    color: var(--text-3);
  }
  .bar {
    width: 200px;
    height: 4px;
    border-radius: 99px;
    background: rgb(255 255 255 / 0.1);
    overflow: hidden;
  }
  .bar span {
    display: block;
    height: 100%;
    background: var(--accent);
    transition: width 0.3s;
  }
  .bar .indeterminate {
    width: 35% !important;
    animation: slide 1.2s ease-in-out infinite;
  }
  @keyframes slide {
    from {
      translate: -100% 0;
    }
    to {
      translate: 300% 0;
    }
  }
  .audio-art {
    display: grid;
    justify-items: center;
    gap: 18px;
    padding: 32px 20px;
    width: 100%;
  }
  .audio-art audio {
    width: 100%;
  }
  .vinyl {
    display: grid;
    place-items: center;
    width: 112px;
    height: 112px;
    border-radius: 50%;
    color: var(--c-audio);
    background:
      radial-gradient(circle, var(--surface) 0 22%, transparent 23%),
      repeating-radial-gradient(circle, color-mix(in srgb, var(--c-audio) 16%, transparent) 0 1px, transparent 1px 4px),
      color-mix(in srgb, var(--c-audio) 10%, var(--surface-2));
    box-shadow: var(--shadow-md);
  }
</style>
