<script lang="ts">
  import { fly } from 'svelte/transition';
  import { Play, Pause, SkipBack, SkipForward, X, Volume2, VolumeX } from '@lucide/svelte';
  import { app } from '../lib/state.svelte';
  import { formatDuration } from '../lib/format';
  import { t } from '../lib/i18n/index.svelte';

  let audio: HTMLAudioElement | undefined = $state();
  let src = $state<string | null>(null);
  let paused = $state(true);
  let current = $state(0);
  let duration = $state(0);
  let volume = $state(1);
  let muted = $state(false);
  let failed = $state(false);

  const item = $derived(app.nowPlaying);

  $effect(() => {
    const it = item;
    failed = false;
    src = null;
    if (!it) return;
    let stale = false;
    it.files[0].url().then((u) => {
      if (!stale) src = u;
    });
    return () => {
      stale = true;
    };
  });

  function seek(e: Event) {
    if (audio) audio.currentTime = Number((e.currentTarget as HTMLInputElement).value);
  }

  function onKey(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement).tagName;
    if (!item || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.code === 'Space') {
      e.preventDefault();
      paused = !paused;
    }
  }
</script>

<svelte:window onkeydown={onKey} />

{#if item}
  <div class="player" transition:fly={{ y: 80, duration: 300 }}>
    {#if src}
      <audio bind:this={audio} {src} autoplay bind:paused bind:currentTime={current} bind:duration bind:volume bind:muted onended={() => app.next()} onerror={() => (failed = true)}></audio>
    {/if}

    <div class="now">
      <div class="art" class:spinning={!paused}></div>
      <div class="meta">
        <strong title={item.title()}>{item.title()}</strong>
        <span>{failed ? t('player.failed') : `${app.queueIndex + 1} / ${app.queue.length}`}</span>
      </div>
    </div>

    <div class="center">
      <div class="controls">
        <button class="icon-btn" onclick={() => app.prev()} disabled={app.queueIndex <= 0} aria-label={t('player.prev')}><SkipBack size={17} /></button>
        <button class="main" onclick={() => (paused = !paused)} aria-label={paused ? t('action.play') : t('player.pause')}>
          {#if paused}<Play size={18} />{:else}<Pause size={18} />{/if}
        </button>
        <button class="icon-btn" onclick={() => app.next()} disabled={app.queueIndex >= app.queue.length - 1} aria-label={t('player.next')}><SkipForward size={17} /></button>
      </div>
      <div class="timeline">
        <span class="mono">{formatDuration(current)}</span>
        <input type="range" min="0" max={duration || 0} step="0.1" value={current} oninput={seek} aria-label={t('player.seek')} style:--p="{duration ? (current / duration) * 100 : 0}%" />
        <span class="mono">{formatDuration(duration)}</span>
      </div>
    </div>

    <div class="right">
      <button class="icon-btn" onclick={() => (muted = !muted)} aria-label={t('player.mute')}>
        {#if muted || volume === 0}<VolumeX size={17} />{:else}<Volume2 size={17} />{/if}
      </button>
      <input class="vol" type="range" min="0" max="1" step="0.01" bind:value={volume} aria-label={t('player.volume')} style:--p="{volume * 100}%" />
      <button class="icon-btn" onclick={() => app.stopAudio()} aria-label={t('action.close')}><X size={17} /></button>
    </div>
  </div>
{/if}

<style>
  .player {
    position: fixed;
    inset: auto 0 0 0;
    z-index: 55;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr) minmax(0, 1fr);
    align-items: center;
    gap: 16px;
    height: 76px;
    padding: 0 20px;
    background: color-mix(in srgb, var(--bg-elev) 88%, transparent);
    backdrop-filter: saturate(1.4) blur(16px);
    border-top: 1px solid var(--border);
  }
  .now {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }
  .art {
    flex: none;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background:
      radial-gradient(circle, var(--bg-elev) 0 16%, transparent 17%),
      var(--iridescent);
    animation: spin 6s linear infinite;
    animation-play-state: paused;
  }
  .art.spinning {
    animation-play-state: running;
  }
  @keyframes spin {
    to {
      rotate: 360deg;
    }
  }
  .meta {
    display: grid;
    min-width: 0;
  }
  .meta strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13.5px;
    font-weight: 550;
  }
  .meta span {
    color: var(--text-3);
    font-size: 12px;
  }
  .center {
    display: grid;
    justify-items: center;
    gap: 4px;
  }
  .controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .main {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--text);
    color: var(--bg);
    transition: scale 0.15s var(--ease-out);
  }
  .main:hover {
    scale: 1.06;
  }
  .timeline {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    max-width: 520px;
    color: var(--text-3);
    font-size: 11px;
  }
  input[type='range'] {
    flex: 1;
    height: 4px;
    appearance: none;
    border-radius: 99px;
    background: linear-gradient(to right, var(--accent) var(--p), var(--surface-3) var(--p));
    cursor: pointer;
  }
  input[type='range']::-webkit-slider-thumb {
    appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--text);
    box-shadow: var(--shadow-sm);
  }
  input[type='range']::-moz-range-thumb {
    width: 12px;
    height: 12px;
    border: 0;
    border-radius: 50%;
    background: var(--text);
  }
  .right {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
  }
  .vol {
    flex: 0 1 100px !important;
  }
  @media (max-width: 760px) {
    .player {
      grid-template-columns: minmax(0, 1fr) auto;
      padding: 0 16px;
    }
    .timeline,
    .vol,
    .right .icon-btn:first-child {
      display: none;
    }
    .center {
      order: 2;
    }
    .right {
      display: none;
    }
  }
</style>
