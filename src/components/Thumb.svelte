<script lang="ts">
  import { onMount } from 'svelte';
  import type { DiscFile } from '../lib/types';
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
        try {
          src = await file.url();
        } catch {
          failed = true;
        }
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  });
</script>

<div class="thumb" bind:this={el}>
  {#if src && !failed}
    <img {src} alt="" loading="lazy" decoding="async" onerror={() => (failed = true)} />
  {:else}
    <FileIcon category={file.category} size={44} />
  {/if}
</div>

<style>
  .thumb {
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    animation: in 0.4s var(--ease-out);
  }
  @keyframes in {
    from {
      opacity: 0;
      scale: 1.04;
    }
  }
</style>
