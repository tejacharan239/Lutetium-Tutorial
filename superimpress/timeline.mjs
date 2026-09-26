// Export the composition's timeline (scene landings and sound events) as JSON:
//   node timeline.mjs build/timeline.json
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';
const out = process.argv[2] || 'build/timeline.json';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
p.on('pageerror', e => { console.error('PAGEERR', String(e)); process.exitCode = 1; });
await p.goto('file://' + path.resolve(path.dirname(new URL(import.meta.url).pathname), 'promo.html'));
await p.waitForFunction(() => window.READY === true, { timeout: 60000 });
const tl = await p.evaluate(() => ({ TOTAL: window.TOTAL, SCENES: window.SCENES, EVENTS: window.EVENTS }));
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
fs.writeFileSync(out, JSON.stringify(tl, null, 1));
console.log(out + ':', tl.EVENTS.length, 'events,', tl.SCENES.length, 'scenes,', tl.TOTAL + 's');
await b.close();
