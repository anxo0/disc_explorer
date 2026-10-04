<script lang="ts">
  import { untrack } from 'svelte';
  import Download from '@lucide/svelte/icons/download';
  import WandSparkles from '@lucide/svelte/icons/wand-sparkles';
  import Zap from '@lucide/svelte/icons/zap';
  import Gauge from '@lucide/svelte/icons/gauge';
  import Turtle from '@lucide/svelte/icons/turtle';
  import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
  import Cpu from '@lucide/svelte/icons/cpu';
  import * as Tabs from '$lib/components/ui/tabs/index.js';
  import * as Select from '$lib/components/ui/select/index.js';
  import * as Tooltip from '$lib/components/ui/tooltip/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Switch } from '$lib/components/ui/switch/index.js';
  import { Slider } from '$lib/components/ui/slider/index.js';
  import type { MediaItem } from '$lib/types';
  import { DEFAULT_OPTIONS, isProgramStream, presetsFor, type ConvertOptions, type PresetGroup } from '$lib/convert/presets';
  import { jobs, WASM_SAFE_BYTES } from '$lib/convert/jobs.svelte';
  import { getNative } from '$lib/native';
  import { formatBytes, t, tn } from '$lib/i18n/index.svelte';
  import { cn } from '$lib/utils';

  let props: { item: MediaItem } = $props();
  // El componente se recrea con {#key} al cambiar de elemento: capturar el valor inicial es intencionado.
  const item = untrack(() => props.item);

  const presets = presetsFor(item.category);
  const groups = [...new Set(presets.map((p) => p.group))];
  const native = !!getNative() && item.files.every((f) => f.nativePath);
  const programStream = isProgramStream(item);
  const totalSize = item.files.reduce((s, f) => s + f.size, 0);

  let group = $state<PresetGroup>(groups[0] ?? 'video');
  let presetId = $state(presets.find((p) => p.group === groups[0])?.id ?? '');
  let opts = $state<ConvertOptions>({ ...DEFAULT_OPTIONS });

  const preset = $derived(presets.find((p) => p.id === presetId));
  const lossyAudio = $derived(!!preset && ['mp3', 'ogg', 'm4a', 'opus', 'mp4', 'mkv', 'mov'].includes(preset.id));
  const reencodesVideo = $derived(preset?.group === 'video' && preset.id !== 'mkv-copy');
  const heavy = $derived(!native && preset?.group === 'video' && totalSize > WASM_SAFE_BYTES);

  const SPEED = { fast: { icon: Zap, cls: 'text-success' }, medium: { icon: Gauge, cls: 'text-muted-foreground' }, slow: { icon: Turtle, cls: 'text-warning' } };
  const RESOLUTIONS = [
    { value: '0', label: () => t('export.original') },
    { value: '1080', label: () => '1080p' },
    { value: '720', label: () => '720p' },
    { value: '480', label: () => '480p' },
  ];
  const BITRATES = ['128', '192', '256', '320'];

  function setGroup(g: string) {
    group = g as PresetGroup;
    presetId = presets.find((p) => p.group === g)?.id ?? '';
  }
</script>

<section class="grid gap-4">
  <h3 class="text-sm font-semibold">{t('export.title')}</h3>

  {#if presets.length && !item.unsupported}
    <Tabs.Root value={group} onValueChange={setGroup}>
      {#if groups.length > 1}
        <Tabs.List class="w-full">
          {#each groups as g (g)}
            <Tabs.Trigger value={g} class="flex-1">{t(`export.group.${g}`)}</Tabs.Trigger>
          {/each}
        </Tabs.List>
      {/if}
      {#each groups as g (g)}
        <Tabs.Content value={g} class="mt-3">
          <div class="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t('export.format')}>
            {#each presets.filter((p) => p.group === g) as p (p.id)}
              {@const speed = SPEED[p.speed]}
              <Tooltip.Root>
                <Tooltip.Trigger>
                  {#snippet child({ props })}
                    <button
                      {...props}
                      role="radio"
                      aria-checked={presetId === p.id}
                      class={cn(
                        'relative flex h-11 items-center justify-center rounded-lg border bg-card text-[12.5px] font-semibold transition-all hover:border-foreground/20',
                        presetId === p.id && 'border-primary bg-primary/10 ring-3 ring-primary/15',
                      )}
                      onclick={() => (presetId = p.id)}
                    >
                      {p.label}
                      <speed.icon class={cn('absolute top-1 right-1 size-3', speed.cls)} />
                    </button>
                  {/snippet}
                </Tooltip.Trigger>
                <Tooltip.Content>{t(`speed.${p.speed}`)}</Tooltip.Content>
              </Tooltip.Root>
            {/each}
          </div>
        </Tabs.Content>
      {/each}
    </Tabs.Root>

    {#if preset}
      <p class="text-[12.5px] leading-relaxed text-muted-foreground">{t(preset.desc)}</p>

      <div class="grid gap-2">
        {#if reencodesVideo}
          <div class="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-1.5">
            <span class="text-[13px] text-muted-foreground">{t('export.resolution')}</span>
            <Select.Root type="single" value={String(opts.height)} onValueChange={(v) => (opts.height = Number(v))}>
              <Select.Trigger size="sm" class="h-8 min-w-28">{RESOLUTIONS.find((r) => r.value === String(opts.height))?.label()}</Select.Trigger>
              <Select.Content>
                {#each RESOLUTIONS as r (r.value)}
                  <Select.Item value={r.value}>{r.label()}</Select.Item>
                {/each}
              </Select.Content>
            </Select.Root>
          </div>
          {#if programStream}
            <label class="flex cursor-pointer items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2.5">
              <span class="text-[13px] text-muted-foreground">{t('export.deinterlace')}</span>
              <Switch bind:checked={opts.deinterlace} />
            </label>
          {/if}
        {/if}
        {#if lossyAudio}
          <div class="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-1.5">
            <span class="text-[13px] text-muted-foreground">{t('export.audioQuality')}</span>
            <Select.Root type="single" value={String(opts.audioBitrate)} onValueChange={(v) => (opts.audioBitrate = Number(v))}>
              <Select.Trigger size="sm" class="h-8 min-w-28 font-mono">{opts.audioBitrate} kbps</Select.Trigger>
              <Select.Content>
                {#each BITRATES as br (br)}
                  <Select.Item value={br} class="font-mono">{br} kbps</Select.Item>
                {/each}
              </Select.Content>
            </Select.Root>
          </div>
        {/if}
        {#if preset.id === 'jpeg' || preset.id === 'webp'}
          <div class="grid gap-3 rounded-lg border bg-card px-3 py-3">
            <div class="flex items-center justify-between text-[13px]">
              <span class="text-muted-foreground">{t('export.imageQuality')}</span>
              <span class="font-mono tabular">{Math.round(opts.imageQuality * 100)}</span>
            </div>
            <Slider type="single" min={0.5} max={1} step={0.01} bind:value={opts.imageQuality} />
          </div>
        {/if}
      </div>

      {#if heavy}
        <div class="flex gap-2.5 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs leading-relaxed text-muted-foreground">
          <TriangleAlert class="mt-0.5 size-4 shrink-0 text-warning" />
          <span>{t('export.heavy', { size: formatBytes(totalSize) })}</span>
        </div>
      {/if}

      <Button class="w-full" onclick={() => jobs.export(item, preset, $state.snapshot(opts))}>
        <WandSparkles />{t('export.run', { format: preset.label })}
      </Button>
    {/if}
  {:else}
    <p class="text-[12.5px] text-muted-foreground">{item.unsupported ? t('export.unsupported') : t('export.noConversion')}</p>
  {/if}

  {#if !item.unsupported}
    <Button variant="outline" class="w-full" onclick={() => jobs.downloadOriginal(item)}>
      <Download />{item.files.length > 1 ? tn('export.originalParts', item.files.length) : t('export.originalFile')}
    </Button>
  {/if}

  <p class="flex items-start gap-2 text-[11.5px] text-muted-foreground">
    <Cpu class="mt-px size-3.5 shrink-0" />
    <span>{native ? t('export.engine.native') : t('export.engine.wasm')}</span>
  </p>
</section>
