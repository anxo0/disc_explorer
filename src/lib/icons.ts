import type { Component } from 'svelte';
import { Archive, Disc3, File, FileText, Film, Image as ImageIcon, Music } from '@lucide/svelte';
import type { Category } from './types';

export const CATEGORY_ICONS: Record<Category, Component<{ size?: number; strokeWidth?: number }>> = {
  video: Film,
  audio: Music,
  image: ImageIcon,
  document: FileText,
  archive: Archive,
  disc: Disc3,
  other: File,
};
