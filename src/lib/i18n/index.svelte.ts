import { es } from './es';
import { en } from './en';
import { kinds } from './kinds';

export type Lang = 'es' | 'en';
export type Dict = Record<string, string>;
type Params = Record<string, string | number>;

const DICTS: Record<Lang, Dict> = { es, en };
const STORAGE_KEY = 'disclens:lang';
export const LANGS: Lang[] = ['es', 'en'];

function initialLang(): Lang {
  if (typeof window === 'undefined') return 'es';
  const fromUrl = new URLSearchParams(location.search).get('lang');
  if (fromUrl === 'es' || fromUrl === 'en') return fromUrl;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'es' || saved === 'en') return saved;
  } catch {
    // almacenamiento bloqueado: usamos el idioma del navegador
  }
  return navigator.language?.toLowerCase().startsWith('es') ? 'es' : navigator.language ? 'en' : 'es';
}

class I18n {
  lang = $state<Lang>(initialLang());

  get locale() {
    return this.lang === 'es' ? 'es-ES' : 'en-US';
  }

  set(lang: Lang) {
    this.lang = lang;
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // sin persistencia
    }
  }

  t = (key: string, params?: Params): string => {
    const raw = DICTS[this.lang][key] ?? DICTS.es[key] ?? key;
    if (!params) return raw;
    return raw.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`));
  };
}

export const i18n = new I18n();
export const t = i18n.t;

/** Plural sencillo: usa `key.one` / `key.other`. */
export function tn(key: string, count: number, params?: Params): string {
  return t(`${key}.${count === 1 ? 'one' : 'other'}`, { n: count.toLocaleString(i18n.locale), ...params });
}

/** Traduce un identificador de formato producido por `detect.ts`. */
export function kindLabel(kind: string): string {
  if (kind.startsWith('ext:')) return t('kind.ext', { ext: kind.slice(4).toUpperCase() });
  if (kind === 'noext') return t('kind.noext');
  const entry = kinds[kind];
  return entry ? entry[i18n.lang === 'es' ? 0 : 1] : kind;
}

export function langName(code: string): string {
  if (!/^[a-z]{2}$/i.test(code)) return t('lang.unknown');
  try {
    const name = new Intl.DisplayNames([i18n.lang], { type: 'language' }).of(code.toLowerCase()) ?? code;
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return code.toUpperCase();
  }
}

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

export function formatBytes(bytes: number, digits = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1);
  const value = bytes / 1024 ** exp;
  return `${value.toLocaleString(i18n.locale, { maximumFractionDigits: exp === 0 ? 0 : digits, minimumFractionDigits: exp === 0 ? 0 : digits })} ${UNITS[exp]}`;
}

export function formatDate(ms: number): string {
  if (!ms) return '—';
  return new Intl.DateTimeFormat(i18n.locale, { dateStyle: 'medium', timeStyle: 'short' }).format(ms);
}

export function formatNumber(n: number): string {
  return n.toLocaleString(i18n.locale);
}
