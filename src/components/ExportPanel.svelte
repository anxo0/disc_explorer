<script lang="ts">
  import { Download, Wand2, Zap, Gauge, Turtle, TriangleAlert, Cpu } from '@lucide/svelte';
  import type { MediaItem } from '../lib/types';
  import { DEFAULT_OPTIONS, isProgramStream, presetsFor, type ConvertOptions, type Preset, type PresetGroup } from '../lib/convert/presets';
  import { jobs, WASM_SAFE_BYTES } from '../lib/convert/jobs.svelte';
  import { getNative } from '../lib/native';
  import { formatBytes, t, tn } from '../lib/i18n/index.svelte';

  let { item }: { item: MediaItem } = $props();

  const presets = presetsFor(item.category);
  const groups = [...new Set(presets.map((p) => p.group))];
  const native = !!getNative() && item.files.every((f) => f.nativePath);
  const programStream = isProgramStream(item);
  const totalSize = item.files.reduce((s, f) => s + f.size, 0);

  let group = $state<PresetGroup>(groups[0] ?? 'video');
  let presetId = $state(presets.find((p) => p.group === groups[0])?.id ?? '');
  let opts = $state<ConvertOptions>({ ...DEFAULT_OPTIONS });

  const groupPresets = $derived(presets.filter((p) => p.group === group));
  const preset = $derived<Preset | undefined>(presets.find((p) => p.id === presetId));
  const lossy = $derived(preset && ['mp3', 'ogg', 'm4a', 'opus', 'mp4', 'mkv', 'mov', 'avi'].includes(preset.id));
  const reencodesVideo = $derived(preset?.group === 'video' && preset.id !== 'mkv-copy');
  const heavy = $derived(!native && preset?.group === 'video' && totalSize > WASM_SAFE_BYTES);

  const SPEED_ICON = { fast: Zap, medium: Gauge, slow: Turtle };

  function setGroup(g: PresetGroup) {
    group = g;
    presetId = presets.find((p) => p.group === g)?.id ?? '';
  }

  function run() {
    if (preset) jobs.export(item, preset, $state.snapshot(opts));
  }
</script>

<section class="export">
  <h3 class="eyebrow">{t('export.title')}</h3>

  {#if presets.length && !item.unsupported}
    {#if groups.length > 1}
      <div class="tabs" role="tablist">
        {#each groups as g (g)}
          <button role="tab" class:on={group === g} aria-selected={group === g} onclick={() => setGroup(g)}>{t(`export.group.${g}`)}</button>
        {/each}
      </div>
    {/if}

    <div class="formats" role="radiogroup" aria-label={t('export.format')}>
      {#each groupPresets as p (p.id)}
        {@const SpeedIcon = SPEED_ICON[p.speed]}
        <button class="fmt" class:on={presetId === p.id} role="radio" aria-checked={presetId === p.id} onclick={() => (presetId = p.id)}>
          <span class="fmt-label">{p.label}</span>
          <span class="speed speed-{p.speed}" title={t(`speed.${p.speed}`)}><SpeedIcon size={11} /></span>
        </button>
      {/each}
    </div>

    {#if preset}
      <p class="desc">{t(preset.desc)}</p>

      <div class="options">
        {#if reencodesVideo}
          <label class="opt">
            <span>{t('export.resolution')}</span>
            <select bind:value={opts.height}>
              <option value={0}>{t('export.original')}</option>
              <option value={1080}>1080p</option>
              <option value={720}>720p</option>
              <option value={480}>480p</option>
            </select>
          </label>
          {#if programStream}
            <label class="opt switch">
              <span>{t('export.deinterlace')}</span>
              <input type="checkbox" bind:checked={opts.deinterlace} />
            </label>
          {/if}
        {/if}
        {#if lossy && preset.id !== 'avi' && preset.group !== 'image'}
          <label class="opt">
            <span>{t('export.audioQuality')}</span>
            <select bind:value={opts.audioBitrate}>
              {#each [128, 192, 256, 320] as br (br)}
                <option value={br}>{br} kbps</option>
              {/each}
            </select>
          </label>
        {/if}
        {#if preset.id === 'jpeg' || preset.id === 'webp'}
          <label class="opt">
            <span>{t('export.imageQuality')} <b class="mono">{Math.round(opts.imageQuality * 100)}</b></span>
            <input type="range" min="0.5" max="1" step="0.01" bind:value={opts.imageQuality} />
          </label>
        {/if}
      </div>

      {#if heavy}
        <p class="warn"><TriangleAlert size={14} /> <span>{t('export.heavy', { size: formatBytes(totalSize) })}</span></p>
      {/if}

      <button class="btn btn-primary run" onclick={run}>
        <Wand2 size={16} />
        {t('export.run', { format: preset.label })}
      </button>
    {/if}
  {:else}
    <p class="desc">{item.unsupported ? t('export.unsupported') : t('export.noConversion')}</p>
  {/if}

  {#if !item.unsupported}
    <button class="btn btn-secondary run" onclick={() => jobs.downloadOriginal(item)}>
      <Download size={15} />
      {item.files.length > 1 ? tn('export.originalParts', item.files.length) : t('export.originalFile')}
    </button>
  {/if}

  <p class="engine">
    <Cpu size={13} />
    <span>{native ? t('export.engine.native') : t('export.engine.wasm')}</span>
  </p>
</section>

<style>
  .export {
    display: grid;
    gap: 12px;
  }
  .tabs {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    padding: 3px;
    border-radius: 10px;
    background: var(--surface-2);
    border: 1px solid var(--border);
  }
  .tabs button {
    height: 30px;
    border-radius: 7px;
    color: var(--text-3);
    font-size: 13px;
    font-weight: 500;
  }
  .tabs button.on {
    background: var(--surface);
    color: var(--text);
    box-shadow: var(--shadow-sm);
  }
  :global([data-theme='dark']) .tabs button.on {
    background: var(--surface-3);
  }
  .formats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
  }
  .fmt {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 40px;
    border-radius: 10px;
    background: var(--surface);
    border: 1px solid var(--border);
    font-size: 13px;
    font-weight: 600;
    transition: border-color 0.15s, background-color 0.15s, box-shadow 0.15s;
  }
  .fmt:hover {
    border-color: var(--border-strong);
  }
  .fmt.on {
    border-color: var(--accent);
    background: var(--accent-soft);
    box-shadow: 0 0 0 3px var(--accent-soft);
  }
  .fmt-label {
    font-size: 12.5px;
  }
  .speed {
    position: absolute;
    top: 4px;
    right: 5px;
    display: grid;
  }
  .speed-fast {
    color: var(--success);
  }
  .speed-medium {
    color: var(--text-3);
  }
  .speed-slow {
    color: var(--warning);
  }
  .desc {
    color: var(--text-2);
    font-size: 12.5px;
    line-height: 1.5;
  }
  .options {
    display: grid;
    gap: 8px;
  }
  .opt {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 36px;
    padding: 0 4px 0 12px;
    border-radius: 9px;
    background: var(--surface);
    border: 1px solid var(--border);
    font-size: 13px;
    color: var(--text-2);
  }
  .opt b {
    color: var(--text);
    font-weight: 500;
  }
  .opt select {
    height: 28px;
    padding: 0 8px;
    border-radius: 7px;
    border: 1px solid var(--border);
    background: var(--surface-2);
    color: var(--text);
    font-size: 12.5px;
  }
  .opt input[type='range'] {
    width: 120px;
    margin-right: 8px;
    accent-color: var(--accent);
  }
  .opt.switch input {
    width: 16px;
    height: 16px;
    margin-right: 8px;
    accent-color: var(--accent);
  }
  .warn {
    display: flex;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 9px;
    background: color-mix(in srgb, var(--warning) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--warning) 28%, transparent);
    color: var(--text-2);
    font-size: 12px;
  }
  .warn :global(svg) {
    flex: none;
    margin-top: 2px;
    color: var(--warning);
  }
  .run {
    width: 100%;
    height: 40px;
  }
  .engine {
    display: flex;
    align-items: center;
    gap: 7px;
    color: var(--text-3);
    font-size: 11.5px;
  }
  .engine :global(svg) {
    flex: none;
  }
</style>
