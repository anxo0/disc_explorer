<script lang="ts">
  import { onMount } from 'svelte';
  import { gsap } from 'gsap';

  let { size = 420, fast = false }: { size?: number; fast?: boolean } = $props();

  let spinner: HTMLDivElement;
  let tween: gsap.core.Tween | undefined;

  onMount(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    tween = gsap.to(spinner, { rotation: 360, duration: 16, ease: 'none', repeat: -1 });
    return () => tween?.kill();
  });

  // Acelera suavemente mientras se lee un disco.
  $effect(() => {
    if (tween) gsap.to(tween, { timeScale: fast ? 9 : 1, duration: 1.2, ease: 'power2.out' });
  });
</script>

<div class="disc" style:--size="{size}px" aria-hidden="true">
  <div class="spinner" bind:this={spinner}>
    <div class="surface"></div>
    <div class="grooves"></div>
    <div class="data-edge"></div>
  </div>
  <div class="sheen"></div>
  <div class="hub">
    <div class="hub-ring"></div>
    <div class="hole"></div>
  </div>
</div>

<style>
  .disc {
    position: relative;
    width: var(--size);
    aspect-ratio: 1;
    max-width: 100%;
    border-radius: 50%;
    filter: drop-shadow(0 40px 60px rgb(0 0 0 / 0.45));
  }
  :global([data-theme='light']) .disc {
    filter: drop-shadow(0 30px 50px rgb(30 40 90 / 0.22));
  }
  .spinner,
  .surface,
  .grooves,
  .sheen,
  .data-edge {
    position: absolute;
    inset: 0;
    border-radius: 50%;
  }
  .surface {
    background: var(--iridescent);
    opacity: 0.92;
  }
  /* Surcos concéntricos + máscara del agujero central */
  .grooves {
    background:
      repeating-radial-gradient(circle at 50% 50%, rgb(255 255 255 / 0.07) 0 1px, transparent 1px 3px),
      radial-gradient(circle at 50% 50%, rgb(10 11 14 / 0.55) 0 30%, transparent 30.5%);
    mix-blend-mode: overlay;
  }
  .data-edge {
    background: radial-gradient(circle at 50% 50%, transparent 0 96%, rgb(255 255 255 / 0.35) 96.5%, rgb(0 0 0 / 0.25) 99%, transparent 100%);
  }
  /* Reflejo fijo: el disco gira bajo la luz */
  .sheen {
    background:
      conic-gradient(from 20deg, transparent 0 12%, rgb(255 255 255 / 0.55) 16%, transparent 22% 58%, rgb(255 255 255 / 0.35) 62%, transparent 68%),
      radial-gradient(circle at 32% 26%, rgb(255 255 255 / 0.35), transparent 42%);
    mix-blend-mode: soft-light;
  }
  .hub {
    position: absolute;
    inset: 33%;
    border-radius: 50%;
    background: radial-gradient(circle, rgb(255 255 255 / 0.18), rgb(255 255 255 / 0.04) 70%);
    backdrop-filter: blur(6px);
    box-shadow:
      inset 0 0 0 1px rgb(255 255 255 / 0.25),
      0 0 0 1px rgb(0 0 0 / 0.15);
  }
  .hub-ring {
    position: absolute;
    inset: 18%;
    border-radius: 50%;
    border: 1px solid rgb(255 255 255 / 0.28);
  }
  .hole {
    position: absolute;
    inset: 36%;
    border-radius: 50%;
    background: var(--bg);
    box-shadow: inset 0 2px 6px rgb(0 0 0 / 0.45);
  }
</style>
