<script lang="ts">
  let { size = 28 }: { size?: number } = $props();
</script>

<span class="logo">
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
    <defs>
      <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#8d9cff" />
        <stop offset=".4" stop-color="#6be4f5" />
        <stop offset=".7" stop-color="#fde68a" />
        <stop offset="1" stop-color="#f9a8d4" />
      </linearGradient>
    </defs>
    <circle cx="16" cy="16" r="14" fill="url(#logo-g)" />
    <circle cx="16" cy="16" r="9.5" fill="none" stroke="var(--bg)" stroke-opacity=".22" stroke-width="1" />
    <circle cx="16" cy="16" r="5" fill="var(--bg)" />
    <circle cx="16" cy="16" r="2" fill="var(--accent)" />
  </svg>
  <span class="word">Disc<b>Lens</b></span>
</span>

<style>
  .logo {
    display: inline-flex;
    align-items: center;
    gap: 10px;
  }
  .word {
    font-size: 16px;
    font-weight: 500;
    letter-spacing: -0.02em;
    color: var(--text);
  }
  .word b {
    font-weight: 700;
  }
</style>
