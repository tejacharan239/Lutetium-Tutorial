import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'child_process';
const FPS = 24, W = 1920, H = 1080;
const FF = '/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2';
const OUT = '/home/user/Lutetium-Tutorial/lutetium-177-reel.mp4';

const b = await chromium.launch({args:['--hide-scrollbars','--force-device-scale-factor=1','--disable-lcd-text']});
const ctx = await b.newContext({viewport:{width:W,height:H}, colorScheme:'light', deviceScaleFactor:1});
const p = await ctx.newPage();
p.on('pageerror', e => console.error('PAGEERR', String(e)));
await p.goto('file:///tmp/claude-0/-home-user-Lutetium-Tutorial/ec8e111a-0b11-52ff-b49f-1cf8f0e6ddb0/scratchpad/video.html');
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(600);
const total = await p.evaluate(() => window.TOTAL);
const frames = Math.round(total * FPS);
console.log('total', total, 's ->', frames, 'frames @', FPS, 'fps');

const ff = spawn(FF, [
  '-y','-f','image2pipe','-framerate',String(FPS),'-i','-',
  '-c:v','libx264','-preset','medium','-crf','20','-pix_fmt','yuv420p',
  '-r',String(FPS),'-movflags','+faststart', OUT
], {stdio:['pipe','ignore','pipe']});
let ffErr = '';
ff.stderr.on('data', d => { ffErr += d.toString(); if (ffErr.length > 20000) ffErr = ffErr.slice(-8000); });
const done = new Promise((res, rej) => { ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg exit ' + c + '\n' + ffErr.slice(-3000)))); });

const t0 = Date.now();
for (let f = 0; f < frames; f++) {
  await p.evaluate(t => window.seek(t), f / FPS);
  const buf = await p.screenshot({type:'jpeg', quality:94});
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (f % 240 === 0) {
    const el = (Date.now()-t0)/1000;
    console.log(`frame ${f}/${frames}  ${(100*f/frames).toFixed(1)}%  ${el.toFixed(0)}s elapsed  eta ${(el/(f||1)*(frames-f)).toFixed(0)}s`);
  }
}
ff.stdin.end();
await done;
await b.close();
console.log('ENCODED ->', OUT, 'in', ((Date.now()-t0)/1000).toFixed(0), 's');
