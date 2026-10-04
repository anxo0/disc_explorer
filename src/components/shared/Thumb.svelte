<script lang="ts">
  import { onMount } from 'svelte';
  import type { DiscFile } from '$lib/types';
  import FileIcon from './FileIcon.svelte';

  let { file }: { file: DiscFile } = $props();
  let el: HTMLDivElement;
  let src = $state<string | null>(null);
  let failed = $state(false);

  // Carga diferida: solo pedimos la imagen al disco cuando la miniatura entra en pantalla.
  onMount(() => {
    const io = new IntersectionObserver(
      async ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        src = await file.url().catch(() => null);
        failed = !src;
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  });
</script>

<div class="grid size-full place-items-center overflow-hidden" bind:this={el}>
  {#if src && !failed}
    <img {src} alt="" loading="lazy" decoding="async" class="size-full object-cover animate-in fade-in" onerror={() => (failed = true)} />
  {:else}
    <FileIcon category={file.category} class="size-11" />
  {/if}
</div>
