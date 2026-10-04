<script lang="ts">
  import { slide } from 'svelte/transition';
  import Play from '@lucide/svelte/icons/play';
  import Pause from '@lucide/svelte/icons/pause';
  import SkipBack from '@lucide/svelte/icons/skip-back';
  import SkipForward from '@lucide/svelte/icons/skip-forward';
  import X from '@lucide/svelte/icons/x';
  import Volume2 from '@lucide/svelte/icons/volume-2';
  import VolumeX from '@lucide/svelte/icons/volume-x';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Slider } from '$lib/components/ui/slider/index.js';
  import { app } from '$lib/state.svelte';
  import { formatDuration } from '$lib/format';
  import { t } from '$lib/i18n/index.svelte';
  import DiscMark from '../shared/DiscMark.svelte';

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
    document.documentElement.style.setProperty('--player-h', it ? '72px' : '0px');
    if (!it) return;
    let stale = false;
    it.files[0].url().then((u) => !stale && (src = u));
    return () => (stale = true);
  });

  function onKey(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement).tagName;
    if (!item || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(tag)) return;
    if (e.code === 'Space') {
      e.preventDefault();
      paused = !paused;
    }
  }
</script>

<svelte:window onkeydown={onKey} />

{#if item}
  <div class="grid h-[72px] shrink-0 grid-cols-[1fr_auto] items-center gap-4 border-t bg-background/90 px-4 backdrop-blur-xl md:grid-cols-[1fr_1.4fr_1fr]" transition:slide={{ duration: 220 }}>
    {#if src}
      <audio {src} autoplay bind:paused bind:currentTime={current} bind:duration bind:volume bind:muted onended={() => app.next()} onerror={() => (failed = true)}></audio>
    {/if}

    <div class="flex min-w-0 items-center gap-3">
      <DiscMark class="size-10 {paused ? '' : 'animate-[spin_5s_linear_infinite]'}" />
      <div class="grid min-w-0">
        <strong class="truncate text-sm font-medium" title={item.title()}>{item.title()}</strong>
        <span class="text-xs text-muted-foreground tabular">{failed ? t('player.failed') : `${app.queueIndex + 1} / ${app.queue.length}`}</span>
      </div>
    </div>

    <div class="grid justify-items-center gap-1">
      <div class="flex items-center gap-1">
        <Button variant="ghost" size="icon" class="size-8" onclick={() => app.prev()} disabled={app.queueIndex <= 0} aria-label={t('player.prev')}><SkipBack /></Button>
        <Button size="icon" class="size-9 rounded-full" onclick={() => (paused = !paused)} aria-label={paused ? t('action.play') : t('player.pause')}>
          {#if paused}<Play class="ml-0.5 fill-current" />{:else}<Pause class="fill-current" />{/if}
        </Button>
        <Button variant="ghost" size="icon" class="size-8" onclick={() => app.next()} disabled={app.queueIndex >= app.queue.length - 1} aria-label={t('player.next')}><SkipForward /></Button>
      </div>
      <div class="hidden w-full max-w-lg items-center gap-3 font-mono text-[11px] text-muted-foreground tabular md:flex">
        <span>{formatDuration(current)}</span>
        <Slider type="single" min={0} max={duration || 1} step={0.1} value={current} onValueChange={(v) => (current = v)} class="flex-1" aria-label={t('player.seek')} />
        <span>{formatDuration(duration)}</span>
      </div>
    </div>

    <div class="hidden items-center justify-end gap-2 md:flex">
      <Button variant="ghost" size="icon" class="size-8" onclick={() => (muted = !muted)} aria-label={t('player.mute')}>
        {#if muted || volume === 0}<VolumeX />{:else}<Volume2 />{/if}
      </Button>
      <Slider type="single" min={0} max={1} step={0.01} bind:value={volume} class="w-24" aria-label={t('player.volume')} />
      <Button variant="ghost" size="icon" class="size-8" onclick={() => app.stopAudio()} aria-label={t('action.close')}><X /></Button>
    </div>
  </div>
{/if}
