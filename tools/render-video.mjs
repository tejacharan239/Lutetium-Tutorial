// Frame-accurate, parallel renderer for the reel.
//
// Every frame is a pure function of its timestamp -- boil offsets, grain seeds,
// camera wobble and counters all derive from the pose index -- so the reel can be
// cut into contiguous frame ranges, rendered by independent browsers at once, and
// the encoded segments joined losslessly. The result is identical to a single pass.
//
//   node render-video.mjs <composition.html> <out.mp4> [workers]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const FPS = 24, W = +(process.env.RW || 1920), H = +(process.env.RH || 1080);
const FF = process.env.FFMPEG || '/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2';
const ENC = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', String(FPS)];
const args = process.argv.slice(2);

function run(cmd, a, opts = {}) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, a, { stdio: ['ignore', 'inherit', 'inherit'], ...opts });
    p.on('close', c => c === 0 ? res() : rej(new Error(cmd + ' exited ' + c)));
  });
}

async function openPage(page) {
  const b = await chromium.launch({ args: ['--hide-scrollbars', '--force-device-scale-factor=1', '--disable-lcd-text',
                                            '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await (await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })).newPage();
  p.on('pageerror', e => console.error('PAGEERR', String(e)));
  await p.goto(/^https?:/.test(page) ? page : 'file://' + path.resolve(page));
  await p.waitForFunction(() => window.seek && window.READY !== false, { timeout: 120000 });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(600);
  return { b, p };
}

async function worker(page, out, from, to, tag) {
  const { b, p } = await openPage(page);
  const ff = spawn(FF, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', ...ENC, out],
                   { stdio: ['pipe', 'ignore', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg ' + c))));
  const t0 = Date.now();
  for (let f = from; f < to; f++) {
    await p.evaluate(t => window.seek(t), f / FPS);
    const buf = await p.screenshot({ type: 'jpeg', quality: 94 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - from) % 240 === 0) {
      const n = f - from, el = (Date.now() - t0) / 1000;
      console.log(`[${tag}] ${n}/${to - from}  ${el.toFixed(0)}s  eta ${(el / (n || 1) * (to - from - n)).toFixed(0)}s`);
    }
  }
  ff.stdin.end(); await done; await b.close();
  console.log(`[${tag}] done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}

if (args[0] === '--worker') {
  const [, page, out, from, to, tag] = args;
  await worker(page, out, +from, +to, tag);
} else {
  const [page, out, nArg] = args;
  const N = +(nArg || 4);
  const { b, p } = await openPage(page);
  const total = await p.evaluate(() => window.TOTAL);
  await b.close();
  const frames = Math.round(total * FPS), per = Math.ceil(frames / N);
  const dir = path.dirname(path.resolve(out));
  const segs = [];
  console.log(`${total}s -> ${frames} frames across ${N} workers`);
  const t0 = Date.now();
  const self = fileURLToPath(import.meta.url);
  await Promise.all(Array.from({ length: N }, (_, i) => {
    const from = i * per, to = Math.min(frames, from + per);
    const seg = path.join(dir, `.seg${i}.mp4`); segs.push(seg);   // segments land beside the output
    return run(process.execPath, [self, '--worker', page, seg, String(from), String(to), 'w' + i]);
  }));
  const list = path.join(dir, '.segs.txt');
  fs.writeFileSync(list, segs.map(s => `file '${s}'`).join('\n'));
  await run(FF, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', out]);
  segs.concat([list]).forEach(f => fs.rmSync(f, { force: true }));
  console.log(`ENCODED -> ${out} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
