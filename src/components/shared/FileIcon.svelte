<script lang="ts">
  import type { Category } from '$lib/types';
  import { CATEGORY_ICONS } from '$lib/icons';
  import { cn } from '$lib/utils';

  let { category, class: className = 'size-9' }: { category: Category; class?: string } = $props();

  // Clases completas para que Tailwind las detecte.
  const TONES: Record<Category, string> = {
    video: 'text-video bg-video/12 ring-video/20',
    audio: 'text-audio bg-audio/12 ring-audio/20',
    image: 'text-image bg-image/12 ring-image/20',
    document: 'text-document bg-document/12 ring-document/20',
    archive: 'text-archive bg-archive/12 ring-archive/20',
    disc: 'text-disc bg-disc/12 ring-disc/20',
    other: 'text-other bg-other/12 ring-other/20',
  };
  const Icon = $derived(CATEGORY_ICONS[category]);
</script>

<span class={cn('grid shrink-0 place-items-center rounded-[28%] ring-1 ring-inset [&_svg]:size-[46%]', TONES[category], className)}>
  <Icon strokeWidth={1.75} />
</span>
