/**
 * Motor de conversión en el navegador (ffmpeg.wasm, un solo hilo: no requiere cabeceras COOP/COEP).
 * Los archivos del disco se montan con WORKERFS: ffmpeg los lee directamente sin copiarlos a memoria
 * y, por supuesto, sin escribir nunca en ellos.
 */
import { FFmpeg, FFFSType } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

const CORE_BASE = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm';

let instance: FFmpeg | null = null;
let loading: Promise<FFmpeg> | null = null;
let coreUrls: { coreURL: string; wasmURL: string } | null = null;
let logHandler: ((line: string) => void) | null = null;
let queue: Promise<unknown> = Promise.resolve();
let seq = 0;

export class AbortedError extends Error {
  constructor() {
    super('aborted');
    this.name = 'AbortError';
  }
}

export function isEngineLoaded(): boolean {
  return instance !== null;
}

async function load(): Promise<FFmpeg> {
  coreUrls ??= {
    coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
  };
  const ff = new FFmpeg();
  ff.on('log', ({ message }) => logHandler?.(message));
  await ff.load(coreUrls);
  instance = ff;
  return ff;
}

export function loadEngine(): Promise<FFmpeg> {
  if (instance) return Promise.resolve(instance);
  loading ??= load().catch((err) => {
    loading = null;
    coreUrls = null;
    throw err;
  });
  return loading;
}

function reset() {
  instance?.terminate();
  instance = null;
  loading = null;
}

export interface WasmRunRequest {
  files: File[];
  /** Construye los argumentos a partir de las rutas internas de entrada y salida. */
  build: (inputs: string[], output: string) => string[];
  outExt: string;
  onLine: (line: string) => void;
  signal?: AbortSignal;
}

async function runNow(req: WasmRunRequest): Promise<Uint8Array> {
  if (req.signal?.aborted) throw new AbortedError();
  const ff = await loadEngine();
  const id = ++seq;
  const dir = `/in${id}`;
  const out = `/out${id}.${req.outExt}`;

  const onAbort = () => reset();
  req.signal?.addEventListener('abort', onAbort, { once: true });
  logHandler = req.onLine;
  let mounted = false;
  try {
    await ff.createDir(dir);
    await ff.mount(FFFSType.WORKERFS, { files: req.files }, dir);
    mounted = true;
    const code = await ff.exec(req.build(req.files.map((f) => `${dir}/${f.name}`), out));
    if (req.signal?.aborted) throw new AbortedError();
    if (code !== 0) throw new Error(`ffmpeg-exit-${code}`);
    const data = await ff.readFile(out);
    if (typeof data === 'string') throw new Error('unexpected-output');
    return data;
  } catch (err) {
    if (req.signal?.aborted) throw new AbortedError();
    throw err;
  } finally {
    req.signal?.removeEventListener('abort', onAbort);
    logHandler = null;
    if (instance === ff) {
      await ff.deleteFile(out).catch(() => {});
      if (mounted) await ff.unmount(dir).catch(() => {});
      await ff.deleteDir(dir).catch(() => {});
    }
  }
}

/** Las ejecuciones se encolan: ffmpeg.wasm solo procesa un trabajo a la vez. */
export function runWasm(req: WasmRunRequest): Promise<Uint8Array> {
  const result = queue.then(() => runNow(req));
  queue = result.catch(() => {});
  return result;
}
