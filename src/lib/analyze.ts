import type { Category, DiscAnalysis, DiscFile, DiscSource, DiscType, MediaItem } from './types';
import { parseCda, parseVtsIfo, type DvdAudioTrack } from './disc-formats';
import { baseName } from './format';
import { formatBytes, formatDate, kindLabel, langName, t, tn } from './i18n/index.svelte';

export const CATEGORIES: Category[] = ['video', 'audio', 'image', 'document', 'archive', 'disc', 'other'];

export function itemForFile(file: DiscFile): MediaItem {
  return {
    id: file.path,
    title: () => file.name,
    subtitle: () => (file.dir ? `/${file.dir}` : t('meta.root')),
    category: file.category,
    files: [file],
    exportName: baseName(file.name),
    meta: () => [
      [t('meta.format'), kindLabel(file.kind)],
      [t('meta.size'), formatBytes(file.size)],
      [t('meta.location'), `/${file.path}`],
      [t('meta.modified'), formatDate(file.lastModified)],
    ],
    unsupported: file.ext === 'cda' ? 'cda.unsupported' : undefined,
  };
}

const sum = (files: DiscFile[]) => files.reduce((acc, f) => acc + f.size, 0);

function channelsLabel(n: number): string {
  if (n === 1) return t('audio.mono');
  if (n === 2) return t('audio.stereo');
  if (n === 6) return '5.1';
  return t('audio.channels', { n });
}

const audioLabel = (a: DvdAudioTrack) => `${langName(a.lang)} · ${a.codec} ${channelsLabel(a.channels)}`;

async function dvdTitles(files: DiscFile[], discLabel: string): Promise<MediaItem[]> {
  const groups = new Map<string, DiscFile[]>();
  for (const f of files) {
    const m = /^VTS_(\d{2})_([1-9])\.VOB$/i.exec(f.name);
    if (m) groups.set(m[1], [...(groups.get(m[1]) ?? []), f]);
  }

  const entries = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  const mainNum = entries.reduce((best, [num, parts]) => (sum(parts) > sum(groups.get(best) ?? []) ? num : best), entries[0]?.[0]);

  return Promise.all(
    entries.map(async ([num, parts]) => {
      parts.sort((a, b) => a.name.localeCompare(b.name));
      const ifo = files.find((f) => f.name.toUpperCase() === `VTS_${num}_0.IFO`);
      const info = ifo ? await ifo.readRange(0, Math.min(ifo.size, 512 * 1024)).then(parseVtsIfo).catch(() => null) : null;
      const isMain = num === mainNum && entries.length > 1;
      const n = Number(num);
      return {
        id: `dvd-title-${num}`,
        title: () => t('dvd.title', { n }),
        subtitle: () => (isMain ? `${t('dvd.main')} · ` : '') + parts.map((p) => p.name).join(' + '),
        category: 'video',
        files: parts,
        duration: info?.duration,
        exportName: `${discLabel} - ${t('dvd.title', { n })}`,
        meta: () => {
          const rows: [string, string][] = [
            [t('meta.parts'), tn('dvd.vobParts', parts.length)],
            [t('meta.size'), formatBytes(sum(parts))],
          ];
          if (info?.video) rows.push([t('meta.video'), info.video]);
          if (info?.chapters) rows.push([t('meta.chapters'), String(info.chapters)]);
          info?.audio.forEach((a, i) => rows.push([i === 0 ? t('meta.audio') : '', audioLabel(a)]));
          if (info?.subtitles.length) rows.push([t('meta.subtitles'), info.subtitles.map(langName).join(', ')]);
          return rows;
        },
      } satisfies MediaItem;
    }),
  );
}

async function cdTracks(files: DiscFile[]): Promise<MediaItem[]> {
  const cdas = files
    .filter((f) => f.ext === 'cda')
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  return Promise.all(
    cdas.map(async (f, i) => {
      const info = await f.readRange(0, 44).then(parseCda).catch(() => null);
      const track = info?.track ?? i + 1;
      return {
        ...itemForFile(f),
        title: () => t('cd.track', { n: String(track).padStart(2, '0') }),
        subtitle: () => f.name,
        duration: info?.duration,
        meta: () => [
          [t('meta.format'), 'CD-DA (Red Book) · 44,1 kHz · 16 bit'],
          [t('meta.track'), String(track)],
          [t('meta.startSector'), info ? String(info.startSector) : '—'],
        ],
      } satisfies MediaItem;
    }),
  );
}

function clipItems(files: DiscFile[]): MediaItem[] {
  return [...files]
    .sort((a, b) => b.size - a.size)
    .map((f, i) => {
      const item = itemForFile(f);
      return i === 0 ? { ...item, subtitle: () => t('clip.main') } : item;
    });
}

function detectType(files: DiscFile[]): DiscType {
  const dirs = new Set(files.map((f) => f.dir.toUpperCase()));
  const has = (d: string) => [...dirs].some((x) => x === d || x.endsWith(`/${d}`));
  if (files.some((f) => f.ext === 'cda')) return 'audio-cd';
  if (has('PRIVATE/AVCHD/BDMV/STREAM') || (has('BDMV/STREAM') && files.some((f) => f.ext === 'mts'))) return 'avchd';
  if (has('BDMV/STREAM')) return 'bluray';
  if (files.some((f) => /(^|\/)VIDEO_TS$/i.test(f.dir) && f.ext === 'vob')) return 'dvd-video';
  if (files.some((f) => f.ext === 'vro')) return 'dvd-vr';
  if (has('MPEGAV')) return 'vcd';
  if (has('MPEG2') && files.some((f) => f.ext === 'mpg')) return 'svcd';
  if (has('DCIM')) return 'camera';
  return 'data';
}

export async function analyzeDisc(source: DiscSource): Promise<DiscAnalysis> {
  const { files } = source;
  const type = detectType(files);
  const totals = Object.fromEntries(CATEGORIES.map((c) => [c, { count: 0, size: 0 }])) as DiscAnalysis['totals'];
  for (const f of files) {
    totals[f.category].count++;
    totals[f.category].size += f.size;
  }

  let featured: MediaItem[] = [];
  let featuredLabel = '';
  switch (type) {
    case 'dvd-video':
      featured = await dvdTitles(files.filter((f) => /(^|\/)VIDEO_TS$/i.test(f.dir)), source.label);
      featuredLabel = 'featured.dvd';
      break;
    case 'audio-cd':
      featured = await cdTracks(files);
      featuredLabel = 'featured.cd';
      break;
    case 'bluray':
      featured = clipItems(files.filter((f) => /BDMV\/STREAM$/i.test(f.dir) && f.ext === 'm2ts'));
      featuredLabel = 'featured.bluray';
      break;
    case 'avchd':
      featured = clipItems(files.filter((f) => f.ext === 'mts' || f.ext === 'm2ts'));
      featuredLabel = 'featured.avchd';
      break;
    case 'vcd':
    case 'svcd':
    case 'dvd-vr':
      featured = files.filter((f) => f.category === 'video').map(itemForFile);
      featuredLabel = 'featured.videos';
      break;
  }

  return { type, featured, featuredLabel, totals, totalSize: sum(files) };
}
