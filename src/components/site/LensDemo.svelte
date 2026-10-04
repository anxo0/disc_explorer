<script lang="ts">
  import { onMount } from 'svelte';
  import { gsap } from 'gsap';
  import Film from '@lucide/svelte/icons/film';
  import Music from '@lucide/svelte/icons/music';
  import Image from '@lucide/svelte/icons/image';
  import FileQuestion from '@lucide/svelte/icons/file-question';
  import { t } from '$lib/i18n/index.svelte';

  /**
   * Demostración interactiva: una "lente" que sigue al cursor y revela, bajo ella,
   * lo que realmente contienen los archivos crípticos de un disco.
   */
  const rows = [
    { raw: 'VIDEO_TS/VTS_01_1.VOB', size: '1,00 GB', real: 'lens.r1', meta: '1:47:12 · ES 5.1 · EN', icon: Film, tone: 'text-video' },
    { raw: 'VIDEO_TS/VTS_01_2.VOB', size: '1,00 GB', real: 'lens.r2', meta: 'MPEG-2 · PAL 16:9', icon: Film, tone: 'text-video' },
    { raw: 'Track01.cda', size: '44 B', real: 'lens.r3', meta: '3:42 · CD-DA', icon: Music, tone: 'text-audio' },
    { raw: 'Track02.cda', size: '44 B', real: 'lens.r4', meta: '4:05 · CD-DA', icon: Music, tone: 'text-audio' },
    { raw: 'MPEGAV/AVSEQ01.DAT', size: '612 MB', real: 'lens.r5', meta: 'MPEG-1 · 352×288', icon: Film, tone: 'text-video' },
    { raw: 'DCIM/100CANON/IMG_0042', size: '4,1 MB', real: 'lens.r6', meta: 'JPEG · 4000×3000', icon: Image, tone: 'text-image' },
    { raw: 'BDMV/STREAM/00001.m2ts', size: '23,4 GB', real: 'lens.r7', meta: 'H.264 · 1080p · DTS-HD', icon: Film, tone: 'text-video' },
  ];

  let panel: HTMLDivElement;
  let lens: HTMLDivElement;
  let reveal: HTMLDivElement;

  onMount(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pos = { x: 0, y: 0 };
    const apply = () => {
      lens.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%)`;
      reveal.style.clipPath = `circle(var(--r) at ${pos.x}px ${pos.y}px)`;
    };
    const rect = () => panel.getBoundingClientRect();

    // Recorrido automático mientras el usuario no interactúa.
    const r = rect();
    pos.x = r.width * 0.35;
    pos.y = r.height * 0.3;
    apply();
    const idle = gsap.timeline({ repeat: -1, yoyo: true, defaults: { duration: 2.4, ease: 'sine.inOut' }, onUpdate: apply });
    if (!reduce) {
      idle
        .to(pos, { x: () => rect().width * 0.68, y: () => rect().height * 0.52 })
        .to(pos, { x: () => rect().width * 0.3, y: () => rect().height * 0.78 })
        .to(pos, { x: () => rect().width * 0.6, y: () => rect().height * 0.22 });
    }

    const xTo = gsap.quickTo(pos, 'x', { duration: 0.45, ease: 'power3.out', onUpdate: apply });
    const yTo = gsap.quickTo(pos, 'y', { duration: 0.45, ease: 'power3.out', onUpdate: apply });

    const move = (e: PointerEvent) => {
      idle.pause();
      const b = rect();
      xTo(e.clientX - b.left);
      yTo(e.clientY - b.top);
    };
    const leave = () => !reduce && idle.play();
    panel.addEventListener('pointermove', move);
    panel.addEventListener('pointerleave', leave);
    return () => {
      idle.kill();
      panel.removeEventListener('pointermove', move);
      panel.removeEventListener('pointerleave', leave);
    };
  });
</script>

<div bind:this={panel} class="relative cursor-none touch-none overflow-hidden rounded-2xl border bg-card shadow-2xl select-none [--r:92px] sm:[--r:110px]">
  <!-- cabecera tipo explorador de archivos -->
  <div class="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5">
    <span class="size-2.5 rounded-full bg-[#ff5f57]"></span>
    <span class="size-2.5 rounded-full bg-[#febc2e]"></span>
    <span class="size-2.5 rounded-full bg-[#28c840]"></span>
    <span class="ml-3 font-mono text-[11px] text-muted-foreground">D:\  ·  {t('lens.window')}</span>
  </div>

  <!-- capa base: lo que enseña Windows -->
  <ul class="divide-y divide-border/60 px-2 py-1">
    {#each rows as row (row.raw)}
      <li class="flex h-12 items-center gap-3 px-2">
        <FileQuestion class="size-4 shrink-0 text-muted-foreground/60" />
        <span class="min-w-0 flex-1 truncate font-mono text-[12.5px] text-muted-foreground">{row.raw}</span>
        <span class="font-mono text-[11px] text-muted-foreground/70 tabular">{row.size}</span>
      </li>
    {/each}
  </ul>

  <!-- capa revelada: lo que ve DiscLens -->
  <div bind:this={reveal} class="pointer-events-none absolute inset-0 top-[41px] bg-card" aria-hidden="true">
    <ul class="divide-y divide-border/60 px-2 py-1">
      {#each rows as row (row.raw)}
        <li class="flex h-12 items-center gap-3 px-2">
          <row.icon class="size-4 shrink-0 {row.tone}" />
          <span class="min-w-0 flex-1 truncate text-[13.5px] font-semibold">{t(row.real)}</span>
          <span class="font-mono text-[11px] text-muted-foreground tabular">{row.meta}</span>
        </li>
      {/each}
    </ul>
  </div>

  <!-- la lente -->
  <div bind:this={lens} class="pointer-events-none absolute top-0 left-0 size-[calc(var(--r)*2)] rounded-full" aria-hidden="true">
    <div class="absolute inset-0 rounded-full ring-2 ring-primary/70 shadow-[0_0_0_6px_color-mix(in_oklch,var(--primary)_12%,transparent),0_20px_60px_-10px_color-mix(in_oklch,var(--primary)_45%,transparent)]"></div>
    <div class="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_25%,rgb(255_255_255/0.14),transparent_45%)]"></div>
    <span class="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2.5 py-0.5 font-mono text-[10px] font-semibold text-primary-foreground shadow">DiscLens</span>
  </div>
</div>
