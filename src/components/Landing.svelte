<script lang="ts">
  import { onMount } from 'svelte';
  import { gsap } from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  import {
    FolderOpen,
    PlayCircle,
    Repeat,
    ShieldCheck,
    Lock,
    MonitorDown,
    ArrowRight,
    Info,
    Disc3,
    CircleCheck,
  } from '@lucide/svelte';
  import { app } from '../lib/state.svelte';
  import { t } from '../lib/i18n/index.svelte';
  import { supportsDirectoryPicker } from '../lib/sources/web';
  import { getNative } from '../lib/native';
  import DiscArt from './DiscArt.svelte';
  import NativeDrives from './NativeDrives.svelte';
  import Logo from './Logo.svelte';

  let { desktopUrl }: { desktopUrl: string } = $props();

  const isDesktop = !!getNative();
  const pickerSupported = supportsDirectoryPicker();
  let root: HTMLElement;
  let fileInput: HTMLInputElement;

  function open() {
    if (pickerSupported) app.openPicker();
    else fileInput.click();
  }

  function onFiles(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    if (input.files?.length) app.openFileList(input.files);
    input.value = '';
  }

  const weird = [
    { file: 'VIDEO_TS/VTS_01_1.VOB', key: 'vob', to: 'MP4 · MKV' },
    { file: 'Track01.cda', key: 'cda', to: '44 bytes' },
    { file: 'MPEGAV/AVSEQ01.DAT', key: 'dat', to: 'MP4' },
    { file: 'BDMV/STREAM/00001.m2ts', key: 'm2ts', to: 'MP4 · MKV' },
  ];

  const orbit = [
    { label: 'VTS_01_1.VOB', x: '-8%', y: '14%' },
    { label: 'AVSEQ01.DAT', x: '78%', y: '6%' },
    { label: '00001.m2ts', x: '86%', y: '72%' },
    { label: 'IMG_0042.JPG', x: '-4%', y: '78%' },
  ];

  onMount(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('.hero [data-in]', { y: 24, opacity: 0, duration: 0.9, stagger: 0.08 })
        .from('.hero-art', { scale: 0.86, opacity: 0, rotate: -25, duration: 1.4, ease: 'expo.out' }, 0.1)
        .from('.orbit-chip', { opacity: 0, scale: 0.8, duration: 0.6, stagger: 0.12 }, 0.7);

      gsap.utils.toArray<HTMLElement>('.orbit-chip').forEach((el, i) => {
        gsap.to(el, { y: i % 2 ? 10 : -10, x: i % 2 ? -6 : 6, duration: 3 + i * 0.6, repeat: -1, yoyo: true, ease: 'sine.inOut' });
      });

      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((section) => {
        gsap.from(section.querySelectorAll('[data-reveal-item]'), {
          y: 28,
          opacity: 0,
          duration: 0.8,
          stagger: 0.08,
          ease: 'power3.out',
          scrollTrigger: { trigger: section, start: 'top 82%' },
        });
      });
    }, root);
    return () => ctx.revert();
  });
</script>

<input bind:this={fileInput} type="file" webkitdirectory multiple hidden onchange={onFiles} />

<main class="landing" bind:this={root}>
  <section class="hero">
    <div class="hero-glow" aria-hidden="true"></div>
    <div class="hero-copy">
      <span class="eyebrow" data-in>{t('hero.eyebrow')}</span>
      <h1 data-in>{t('hero.title.a')} <span class="grad">{t('hero.title.b')}</span></h1>
      <p class="lead" data-in>{t('hero.lead')}</p>

      {#if isDesktop}
        <div data-in><NativeDrives /></div>
      {:else}
        <div class="cta" data-in>
          <button class="btn btn-primary btn-lg" onclick={open}>
            <FolderOpen size={18} />
            {t('hero.open')}
          </button>
          <span class="cta-hint">{t('hero.dragHint')}</span>
        </div>
        {#if !pickerSupported}
          <p class="notice" data-in>
            <Info size={15} />
            <span>{t('hero.fallback')}</span>
          </p>
        {/if}
      {/if}

      <ul class="trust" data-in>
        <li><Lock size={14} /> {t('hero.trust.local')}</li>
        <li><ShieldCheck size={14} /> {t('hero.trust.readonly')}</li>
        <li><CircleCheck size={14} /> {t('hero.trust.free')}</li>
      </ul>
    </div>

    <div class="hero-art">
      <DiscArt size={460} fast={!!app.scanning} />
      {#each orbit as chip (chip.label)}
        <span class="orbit-chip mono" style:left={chip.x} style:top={chip.y}>
          <Disc3 size={12} />
          {chip.label}
        </span>
      {/each}
    </div>
  </section>

  <section class="section" data-reveal>
    <header class="section-head" data-reveal-item>
      <span class="eyebrow">{t('weird.eyebrow')}</span>
      <h2>{t('weird.title')}</h2>
      <p>{t('weird.lead')}</p>
    </header>
    <div class="weird-grid">
      {#each weird as w (w.key)}
        <article class="weird card" data-reveal-item>
          <code class="mono path">{w.file}</code>
          <ArrowRight size={16} class="arrow" />
          <div>
            <h3>{t(`weird.${w.key}.title`)}</h3>
            <p>{t(`weird.${w.key}.body`)}</p>
          </div>
          <span class="chip mono">{w.to}</span>
        </article>
      {/each}
    </div>
  </section>

  <section class="section" data-reveal>
    <div class="features">
      <article class="feature" data-reveal-item>
        <span class="f-icon" style:--c="var(--c-video)"><PlayCircle size={20} /></span>
        <h3>{t('feat.play.title')}</h3>
        <p>{t('feat.play.body')}</p>
      </article>
      <article class="feature" data-reveal-item>
        <span class="f-icon" style:--c="var(--c-audio)"><Repeat size={20} /></span>
        <h3>{t('feat.convert.title')}</h3>
        <p>{t('feat.convert.body')}</p>
      </article>
      <article class="feature" data-reveal-item>
        <span class="f-icon" style:--c="var(--c-image)"><Lock size={20} /></span>
        <h3>{t('feat.private.title')}</h3>
        <p>{t('feat.private.body')}</p>
      </article>
      <article class="feature" data-reveal-item>
        <span class="f-icon" style:--c="var(--c-disc)"><ShieldCheck size={20} /></span>
        <h3>{t('feat.readonly.title')}</h3>
        <p>{t('feat.readonly.body')}</p>
      </article>
    </div>
  </section>

  <section class="section" data-reveal>
    <header class="section-head" data-reveal-item>
      <span class="eyebrow">{t('steps.eyebrow')}</span>
      <h2>{t('steps.title')}</h2>
    </header>
    <ol class="steps">
      {#each [1, 2, 3] as n (n)}
        <li data-reveal-item>
          <span class="step-n mono">0{n}</span>
          <h3>{t(`steps.${n}.title`)}</h3>
          <p>{t(`steps.${n}.body`)}</p>
        </li>
      {/each}
    </ol>
  </section>

  {#if !isDesktop}
    <section class="section" data-reveal>
      <div class="desktop card" data-reveal-item>
        <div class="desktop-copy">
          <span class="eyebrow">{t('desktop.eyebrow')}</span>
          <h2>{t('desktop.title')}</h2>
          <p>{t('desktop.body')}</p>
          <ul>
            <li><CircleCheck size={15} /> {t('desktop.point.1')}</li>
            <li><CircleCheck size={15} /> {t('desktop.point.2')}</li>
            <li><CircleCheck size={15} /> {t('desktop.point.3')}</li>
          </ul>
          <a class="btn btn-primary" href={desktopUrl} target="_blank" rel="noopener">
            <MonitorDown size={16} />
            {t('desktop.cta')}
          </a>
        </div>
        <div class="compat">
          <h3>{t('compat.title')}</h3>
          <dl>
            <div><dt>Chrome · Edge · Opera · Brave</dt><dd class="ok">{t('compat.full')}</dd></div>
            <div><dt>Firefox · Safari</dt><dd class="partial">{t('compat.partial')}</dd></div>
            <div><dt>{t('compat.desktopApp')}</dt><dd class="ok">{t('compat.native')}</dd></div>
          </dl>
        </div>
      </div>
    </section>
  {/if}

  <footer class="footer">
    <Logo size={22} />
    <p>{t('footer.note')}</p>
  </footer>
</main>

<style>
  .landing {
    flex: 1;
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 24px 40px;
  }

  /* ---------- hero ---------- */
  .hero {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
    align-items: center;
    gap: 48px;
    min-height: calc(100dvh - var(--topbar-h) - 40px);
    padding: 48px 0;
  }
  .hero-glow {
    position: absolute;
    inset: -10% -20% auto 30%;
    height: 90%;
    background: var(--glow);
    pointer-events: none;
    z-index: -1;
  }
  .hero-copy {
    display: grid;
    gap: 22px;
    justify-items: start;
  }
  h1 {
    font-size: clamp(38px, 5.6vw, 66px);
    font-weight: 650;
    letter-spacing: -0.035em;
    line-height: 1.02;
    text-wrap: balance;
  }
  .grad {
    background: linear-gradient(100deg, var(--accent) 0%, #6be4f5 35%, #f9a8d4 70%, var(--accent) 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    animation: shimmer 8s linear infinite;
  }
  :global([data-theme='light']) .grad {
    background-image: linear-gradient(100deg, #4a5ae6 0%, #0e9fbf 40%, #c0368f 75%, #4a5ae6 100%);
  }
  @keyframes shimmer {
    to {
      background-position: 200% center;
    }
  }
  .lead {
    max-width: 52ch;
    font-size: 17px;
    line-height: 1.6;
    color: var(--text-2);
    text-wrap: pretty;
  }
  .cta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
    margin-top: 6px;
  }
  .cta-hint {
    color: var(--text-3);
    font-size: 13px;
  }
  .notice {
    display: flex;
    gap: 10px;
    max-width: 52ch;
    padding: 12px 14px;
    border-radius: var(--radius);
    background: color-mix(in srgb, var(--warning) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--warning) 30%, transparent);
    color: var(--text-2);
    font-size: 13px;
  }
  .notice :global(svg) {
    flex: none;
    margin-top: 2px;
    color: var(--warning);
  }
  .trust {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 20px;
    margin: 6px 0 0;
    padding: 0;
    list-style: none;
    color: var(--text-3);
    font-size: 13px;
  }
  .trust li {
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .trust :global(svg) {
    color: var(--success);
  }
  .hero-art {
    position: relative;
    display: grid;
    place-items: center;
    padding: 6%;
  }
  .orbit-chip {
    position: absolute;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface) 80%, transparent);
    border: 1px solid var(--border-strong);
    backdrop-filter: blur(10px);
    box-shadow: var(--shadow-md);
    color: var(--text-2);
    font-size: 11.5px;
    white-space: nowrap;
  }
  .orbit-chip :global(svg) {
    color: var(--accent);
  }

  /* ---------- secciones ---------- */
  .section {
    padding: 72px 0;
    border-top: 1px solid var(--border);
  }
  .section-head {
    display: grid;
    gap: 12px;
    max-width: 640px;
    margin-bottom: 36px;
  }
  .section-head h2,
  .desktop h2 {
    font-size: clamp(26px, 3.2vw, 36px);
    letter-spacing: -0.03em;
    text-wrap: balance;
  }
  .section-head p,
  .desktop-copy > p {
    color: var(--text-2);
    font-size: 15.5px;
    text-wrap: pretty;
  }

  .weird-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }
  .weird {
    position: relative;
    display: grid;
    grid-template-columns: auto auto minmax(0, 1fr);
    align-items: start;
    gap: 14px;
    padding: 20px;
    transition: border-color 0.2s, transform 0.25s var(--ease-out);
  }
  .weird:hover {
    border-color: var(--border-strong);
    transform: translateY(-2px);
  }
  .weird .path {
    padding: 4px 8px;
    border-radius: 6px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    font-size: 12px;
    color: var(--text);
    white-space: nowrap;
  }
  .weird :global(.arrow) {
    margin-top: 5px;
    color: var(--text-3);
  }
  .weird h3 {
    font-size: 15px;
    margin-bottom: 4px;
  }
  .weird p {
    color: var(--text-2);
    font-size: 13.5px;
  }
  .weird .chip {
    position: absolute;
    right: 16px;
    bottom: 16px;
    font-size: 11px;
  }
  .weird > div {
    padding-bottom: 22px;
  }

  .features {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 28px;
  }
  .feature {
    display: grid;
    gap: 10px;
    align-content: start;
  }
  .feature h3 {
    font-size: 16px;
  }
  .feature p {
    color: var(--text-2);
    font-size: 13.5px;
  }
  .f-icon {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    margin-bottom: 4px;
    border-radius: 11px;
    color: var(--c);
    background: color-mix(in srgb, var(--c) 13%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c) 20%, transparent);
  }

  .steps {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .steps li {
    display: grid;
    gap: 8px;
    padding: 24px;
    border-radius: var(--radius-lg);
    background: linear-gradient(180deg, var(--surface), transparent);
    border: 1px solid var(--border);
  }
  .step-n {
    font-size: 12px;
    color: var(--accent);
  }
  .steps h3 {
    font-size: 16px;
  }
  .steps p {
    color: var(--text-2);
    font-size: 13.5px;
  }

  .desktop {
    display: grid;
    grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
    gap: 40px;
    padding: 36px;
    background:
      radial-gradient(80% 120% at 0% 0%, var(--accent-soft), transparent 60%),
      var(--surface);
  }
  .desktop-copy {
    display: grid;
    gap: 16px;
    justify-items: start;
  }
  .desktop-copy ul {
    display: grid;
    gap: 8px;
    margin: 0 0 6px;
    padding: 0;
    list-style: none;
    color: var(--text-2);
    font-size: 14px;
  }
  .desktop-copy li {
    display: flex;
    align-items: center;
    gap: 9px;
  }
  .desktop-copy li :global(svg) {
    color: var(--success);
    flex: none;
  }
  .compat {
    align-self: center;
    padding: 22px;
    border-radius: var(--radius-lg);
    background: var(--bg-elev);
    border: 1px solid var(--border);
  }
  .compat h3 {
    font-size: 14px;
    margin-bottom: 12px;
  }
  .compat dl {
    display: grid;
    margin: 0;
  }
  .compat dl > div {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 0;
    border-top: 1px solid var(--border);
    font-size: 13px;
  }
  .compat dt {
    color: var(--text-2);
  }
  .compat dd {
    margin: 0;
    font-weight: 500;
    text-align: right;
  }
  .compat .ok {
    color: var(--success);
  }
  .compat .partial {
    color: var(--warning);
  }

  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
    padding: 28px 0 8px;
    border-top: 1px solid var(--border);
    color: var(--text-3);
    font-size: 12.5px;
  }

  @media (max-width: 980px) {
    .hero {
      grid-template-columns: 1fr;
      gap: 24px;
      min-height: 0;
      padding-top: 32px;
    }
    .hero-art {
      order: -1;
      max-width: 340px;
      margin: 0 auto;
    }
    .features {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .desktop {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width: 680px) {
    .landing {
      padding: 0 16px 32px;
    }
    .weird-grid,
    .steps,
    .features {
      grid-template-columns: 1fr;
    }
    .weird {
      grid-template-columns: 1fr;
    }
    .weird :global(.arrow) {
      display: none;
    }
    .orbit-chip {
      display: none;
    }
    .desktop {
      padding: 24px;
    }
  }
</style>
