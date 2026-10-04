<script lang="ts">
  import { onMount } from 'svelte';
  import { gsap } from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import MonitorDown from '@lucide/svelte/icons/monitor-down';
  import Sun from '@lucide/svelte/icons/sun';
  import Moon from '@lucide/svelte/icons/moon';
  import ShieldCheck from '@lucide/svelte/icons/shield-check';
  import Lock from '@lucide/svelte/icons/lock';
  import Languages from '@lucide/svelte/icons/languages';
  import Zap from '@lucide/svelte/icons/zap';
  import Disc3 from '@lucide/svelte/icons/disc-3';
  import ScanSearch from '@lucide/svelte/icons/scan-search';
  import WandSparkles from '@lucide/svelte/icons/wand-sparkles';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { theme } from '$lib/theme.svelte';
  import { i18n, LANGS, t } from '$lib/i18n/index.svelte';
  import Logo from '../shared/Logo.svelte';
  import LensDemo from './LensDemo.svelte';

  let { desktopUrl }: { desktopUrl: string } = $props();
  let root: HTMLElement;

  const formats = ['DVD-Video', 'Audio CD', 'Blu-ray', 'AVCHD', 'Video CD', 'SVCD', 'DVD-VR', 'MP4', 'MKV', 'WebM', 'MOV', 'AVI', 'MP3', 'WAV', 'FLAC', 'OGG', 'Opus', 'PNG', 'JPEG', 'WebP'];
  const steps = [
    { icon: Disc3, key: 1 },
    { icon: ScanSearch, key: 2 },
    { icon: WandSparkles, key: 3 },
  ];

  onMount(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      // Entrada del hero
      gsap
        .timeline({ defaults: { ease: 'power3.out' } })
        .from('[data-hero]', { y: 28, opacity: 0, duration: 0.9, stagger: 0.08 })
        .from('[data-lens]', { y: 40, opacity: 0, rotateX: 12, duration: 1.1, ease: 'expo.out' }, 0.2);

      // Marquesina infinita de formatos
      gsap.to('[data-marquee]', { xPercent: -50, duration: 40, ease: 'none', repeat: -1 });

      // Disco que gira con el scroll y pasos que se iluminan
      const mm = gsap.matchMedia();
      mm.add('(min-width: 1024px)', () => {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: '[data-pin]', start: 'top top', end: '+=1600', scrub: 0.6, pin: true },
        });
        tl.to('[data-big-disc]', { rotation: 540, ease: 'none', duration: 3 }, 0);
        steps.forEach((_, i) => {
          tl.fromTo(`[data-step="${i}"]`, { opacity: 0.25, x: 0 }, { opacity: 1, x: 12, duration: 0.5 }, i)
            .to(`[data-step="${i}"]`, { opacity: i === steps.length - 1 ? 1 : 0.25, x: 0, duration: 0.5 }, i + 0.75);
        });
      });

      // Revelado de tarjetas
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
        gsap.from(el, { y: 36, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 85%' } });
      });
    }, root);
    return () => ctx.revert();
  });
</script>

<div bind:this={root} class="relative overflow-x-clip">
  <!-- fondo: rejilla + halo -->
  <div class="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[900px] bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_40%,transparent_100%)] bg-[size:56px_56px]"></div>
  <div class="pointer-events-none absolute top-[-200px] left-1/2 -z-10 size-[900px] -translate-x-1/2 rounded-full bg-primary/15 blur-[140px]"></div>

  <!-- navegación -->
  <header class="sticky top-0 z-40 border-b border-transparent bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/50">
    <nav class="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 md:px-6">
      <a href="./" aria-label="DiscLens"><Logo /></a>
      <div class="hidden items-center gap-5 text-sm text-muted-foreground md:flex">
        <a href="#how" class="transition-colors hover:text-foreground">{t('l.nav.how')}</a>
        <a href="#features" class="transition-colors hover:text-foreground">{t('l.nav.features')}</a>
        <a href="#desktop" class="transition-colors hover:text-foreground">{t('l.nav.desktop')}</a>
      </div>
      <div class="ml-auto flex items-center gap-1">
        <div class="mr-1 hidden rounded-lg border p-0.5 sm:flex">
          {#each LANGS as lang (lang)}
            <button
              class="h-7 rounded-md px-2 font-mono text-[11px] font-semibold transition-colors {i18n.lang === lang ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}"
              onclick={() => i18n.set(lang)}
              aria-pressed={i18n.lang === lang}>{lang.toUpperCase()}</button
            >
          {/each}
        </div>
        <Button variant="ghost" size="icon" onclick={() => theme.toggle()} aria-label={theme.current === 'dark' ? t('nav.lightMode') : t('nav.darkMode')}>
          {#if theme.current === 'dark'}<Sun />{:else}<Moon />{/if}
        </Button>
        <Button href="app" size="sm" class="ml-1">{t('l.cta.open')}<ArrowRight /></Button>
      </div>
    </nav>
  </header>

  <!-- hero -->
  <section class="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-20 md:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-24">
    <div class="grid justify-items-start gap-6">
      <Badge variant="outline" class="gap-1.5 rounded-full px-3 py-1 font-mono text-[11px]" data-hero>
        <span class="size-1.5 animate-pulse rounded-full bg-success"></span>{t('l.badge')}
      </Badge>
      <h1 class="text-[clamp(2.6rem,6.2vw,4.6rem)] leading-[0.98] font-semibold tracking-[-0.045em] text-balance" data-hero>
        {t('l.title.a')}
        <span class="bg-[linear-gradient(100deg,var(--primary),#38c9e0_40%,#f472b6_80%)] bg-clip-text text-transparent">{t('l.title.b')}</span>
      </h1>
      <p class="max-w-[52ch] text-lg leading-relaxed text-pretty text-muted-foreground" data-hero>{t('l.lead')}</p>
      <div class="flex flex-wrap items-center gap-3" data-hero>
        <Button href="app" size="lg" class="h-12 px-6 text-[15px] shadow-[0_10px_30px_-10px_var(--primary)]">{t('l.cta.open')}<ArrowRight /></Button>
        <Button href={desktopUrl} target="_blank" rel="noopener" variant="outline" size="lg" class="h-12 px-5 text-[15px]"><MonitorDown />{t('l.cta.desktop')}</Button>
      </div>
      <ul class="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-muted-foreground" data-hero>
        <li class="flex items-center gap-1.5"><Lock class="size-3.5 text-success" />{t('hero.trust.local')}</li>
        <li class="flex items-center gap-1.5"><ShieldCheck class="size-3.5 text-success" />{t('hero.trust.readonly')}</li>
      </ul>
    </div>
    <div class="grid gap-3 [perspective:1200px]" data-lens>
      <LensDemo />
      <p class="text-center font-mono text-[11px] text-muted-foreground">{t('lens.hint')}</p>
    </div>
  </section>

  <!-- marquesina -->
  <div class="relative border-y bg-muted/30 py-4 [mask-image:linear-gradient(to_right,transparent,#000_10%,#000_90%,transparent)]">
    <div class="flex w-max gap-3" data-marquee>
      {#each [...formats, ...formats] as f, i (i)}
        <span class="rounded-full border bg-background px-3.5 py-1 font-mono text-xs whitespace-nowrap text-muted-foreground">{f}</span>
      {/each}
    </div>
  </div>

  <!-- cómo funciona: disco que gira con el scroll -->
  <section id="how" class="relative" data-pin>
    <div class="mx-auto grid min-h-svh max-w-6xl items-center gap-12 px-4 py-24 md:px-6 lg:grid-cols-2">
      <div class="relative mx-auto aspect-square w-full max-w-md">
        <div class="absolute inset-0 rounded-full bg-primary/20 blur-3xl"></div>
        <div data-big-disc class="iridescent relative size-full rounded-full shadow-2xl">
          <span class="absolute inset-0 rounded-full bg-[repeating-radial-gradient(circle,rgb(255_255_255/0.07)_0_1px,transparent_1px_3px)] mix-blend-overlay"></span>
          <span class="absolute inset-0 rounded-full bg-[conic-gradient(from_20deg,transparent_0_12%,rgb(255_255_255/0.5)_16%,transparent_22%_58%,rgb(255_255_255/0.3)_62%,transparent_68%)] mix-blend-soft-light"></span>
          <span class="absolute inset-[33%] rounded-full bg-white/15 ring-1 ring-white/30 backdrop-blur"></span>
          <span class="absolute inset-[44%] rounded-full bg-background shadow-inner"></span>
        </div>
      </div>
      <div class="grid gap-8">
        <div class="grid gap-3">
          <span class="font-mono text-xs tracking-widest text-primary uppercase">{t('steps.eyebrow')}</span>
          <h2 class="text-4xl font-semibold tracking-tight text-balance md:text-5xl">{t('steps.title')}</h2>
        </div>
        <ol class="grid gap-3">
          {#each steps as s, i (s.key)}
            <li data-step={i} class="flex gap-4 rounded-2xl border bg-card/60 p-5 backdrop-blur">
              <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary"><s.icon class="size-5" /></span>
              <div class="grid gap-1">
                <h3 class="font-semibold"><span class="mr-2 font-mono text-xs text-muted-foreground">0{s.key}</span>{t(`steps.${s.key}.title`)}</h3>
                <p class="text-sm text-muted-foreground">{t(`steps.${s.key}.body`)}</p>
              </div>
            </li>
          {/each}
        </ol>
      </div>
    </div>
  </section>

  <!-- bento -->
  <section id="features" class="mx-auto max-w-6xl px-4 py-24 md:px-6">
    <div class="mb-12 grid max-w-2xl gap-3" data-reveal>
      <span class="font-mono text-xs tracking-widest text-primary uppercase">{t('weird.eyebrow')}</span>
      <h2 class="text-4xl font-semibold tracking-tight text-balance md:text-5xl">{t('weird.title')}</h2>
      <p class="text-lg text-muted-foreground">{t('weird.lead')}</p>
    </div>

    <div class="grid auto-rows-[minmax(220px,auto)] gap-4 md:grid-cols-6">
      <!-- DVD -->
      <article class="group relative overflow-hidden rounded-3xl border bg-card p-7 md:col-span-4" data-reveal>
        <div class="relative z-10 grid max-w-md gap-2">
          <h3 class="text-xl font-semibold">{t('weird.vob.title')}</h3>
          <p class="text-muted-foreground">{t('weird.vob.body')}</p>
        </div>
        <div class="mt-8 flex flex-wrap items-center gap-2 font-mono text-xs">
          {#each ['VTS_01_1.VOB', 'VTS_01_2.VOB', 'VTS_01_3.VOB'] as v (v)}
            <span class="rounded-lg border bg-muted/60 px-2.5 py-1.5 text-muted-foreground">{v}</span>
          {/each}
          <ArrowRight class="size-4 text-muted-foreground" />
          <span class="rounded-lg bg-video/15 px-3 py-1.5 font-semibold text-video ring-1 ring-video/30">{t('lens.r1')} · 1:47:12</span>
        </div>
        <div class="absolute -right-16 -bottom-24 size-72 rounded-full bg-video/15 blur-3xl transition-transform duration-700 group-hover:scale-125"></div>
      </article>

      <!-- privado -->
      <article class="relative overflow-hidden rounded-3xl border bg-card p-7 md:col-span-2" data-reveal>
        <Lock class="mb-5 size-7 text-success" />
        <h3 class="text-xl font-semibold">{t('feat.private.title')}</h3>
        <p class="mt-2 text-muted-foreground">{t('feat.private.body')}</p>
      </article>

      <!-- CD audio -->
      <article class="relative overflow-hidden rounded-3xl border bg-card p-7 md:col-span-2" data-reveal>
        <h3 class="text-xl font-semibold">{t('weird.cda.title')}</h3>
        <p class="mt-2 text-muted-foreground">{t('weird.cda.body')}</p>
        <div class="mt-6 flex h-12 items-end gap-[3px]">
          {#each Array.from({ length: 36 }) as _, i (i)}
            <span class="w-full origin-bottom animate-[pulse_1.6s_ease-in-out_infinite] rounded-full bg-audio/70" style="height:{20 + Math.abs(Math.sin(i * 1.7)) * 80}%; animation-delay:{i * 45}ms"></span>
          {/each}
        </div>
      </article>

      <!-- conversión -->
      <article class="relative overflow-hidden rounded-3xl border bg-card p-7 md:col-span-4" data-reveal>
        <Zap class="mb-5 size-7 text-image" />
        <h3 class="text-xl font-semibold">{t('feat.convert.title')}</h3>
        <p class="mt-2 max-w-lg text-muted-foreground">{t('feat.convert.body')}</p>
      </article>

      <!-- idiomas -->
      <article class="relative overflow-hidden rounded-3xl border bg-card p-7 md:col-span-3" data-reveal>
        <Languages class="mb-5 size-7 text-disc" />
        <h3 class="text-xl font-semibold">{t('l.langs.title')}</h3>
        <p class="mt-2 text-muted-foreground">{t('l.langs.body')}</p>
        <div class="mt-5 flex flex-wrap gap-2">
          {#each ['Español · Dolby 5.1', 'English · Stereo', 'Français · DTS', 'Subs: ES, EN, PT'] as l (l)}
            <Badge variant="secondary" class="font-mono text-[11px]">{l}</Badge>
          {/each}
        </div>
      </article>

      <!-- solo lectura -->
      <article class="relative overflow-hidden rounded-3xl border bg-card p-7 md:col-span-3" data-reveal>
        <ShieldCheck class="mb-5 size-7 text-success" />
        <h3 class="text-xl font-semibold">{t('feat.readonly.title')}</h3>
        <p class="mt-2 text-muted-foreground">{t('feat.readonly.body')}</p>
      </article>
    </div>
  </section>

  <!-- escritorio -->
  <section id="desktop" class="mx-auto max-w-6xl px-4 pb-24 md:px-6">
    <div class="relative overflow-hidden rounded-[2rem] border bg-card p-8 md:p-14" data-reveal>
      <div class="pointer-events-none absolute -top-40 -right-40 size-[520px] rounded-full bg-primary/20 blur-[120px]"></div>
      <div class="relative grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-center">
        <div class="grid justify-items-start gap-5">
          <span class="font-mono text-xs tracking-widest text-primary uppercase">{t('desktop.eyebrow')}</span>
          <h2 class="text-4xl font-semibold tracking-tight text-balance md:text-5xl">{t('desktop.title')}</h2>
          <p class="max-w-xl text-lg text-muted-foreground">{t('desktop.body')}</p>
          <div class="flex flex-wrap gap-3">
            <Button href={desktopUrl} target="_blank" rel="noopener" size="lg" class="h-12 px-6"><MonitorDown />{t('desktop.cta')}</Button>
            <Button href="app" variant="outline" size="lg" class="h-12 px-6">{t('l.cta.web')}<ArrowRight /></Button>
          </div>
        </div>
        <dl class="grid gap-px overflow-hidden rounded-2xl border bg-border text-sm">
          {#each [['Chrome · Edge · Opera', 'compat.full', 'text-success'], ['Firefox · Safari', 'compat.partial', 'text-warning'], ['Windows (portable)', 'compat.native', 'text-success']] as [name, key, tone] (name)}
            <div class="flex items-center justify-between gap-4 bg-background/80 px-5 py-4">
              <dt class="text-muted-foreground">{name}</dt>
              <dd class="font-medium {tone}">{t(key)}</dd>
            </div>
          {/each}
        </dl>
      </div>
    </div>
  </section>

  <footer class="border-t">
    <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground md:px-6">
      <Logo />
      <p>{t('footer.note')}</p>
    </div>
  </footer>
</div>
