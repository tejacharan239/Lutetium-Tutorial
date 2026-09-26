// Render stills for review:  node snap.mjs <outdir> <scale> t1 t2 ...
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import path from 'path';
const [out, scale, ...ts] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--hide-scrollbars', '--disable-lcd-text', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: +scale || .5 })).newPage();
p.on('pageerror', e => console.error('PAGEERR', String(e)));
p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('CONSOLE', m.text()); });
await p.goto('file://' + path.resolve(path.dirname(new URL(import.meta.url).pathname), 'promo.html'));
await p.waitForFunction(() => window.READY === true, { timeout: 60000 });
for (const t of ts) {
  const t0 = Date.now();
  await p.evaluate(t => window.seek(t), +t);
  await p.screenshot({ path: path.join(out, 't' + (+t).toFixed(2).padStart(6, '0') + '.jpg'), type: 'jpeg', quality: 85 });
  process.stdout.write(t + ':' + (Date.now() - t0) + 'ms ');
}
console.log('\nTOTAL', await p.evaluate(() => window.TOTAL), 'EVENTS', await p.evaluate(() => window.EVENTS.length));
await b.close();
