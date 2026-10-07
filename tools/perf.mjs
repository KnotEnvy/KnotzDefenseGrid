// Frame-rate probe: loads a URL, optionally runs a setup snippet in the page, then prints one JSON line
// every 4 s with the real frame rate, sim time, entity counts and light count.
//
//   GL=hardware npm run perf -- "level=3&all&silver=9000"
//   GL=hardware npm run perf -- "level=3&all&fx=low" "window.__beam.scene.sim.nextWaveIn = 1"
//
// Without GL=hardware the numbers only measure software rendering (SwiftShader), so use it on a machine with
// a real GPU. Compare "fx=low" against the default to see what the full-screen effects cost.

import { launch, startServer, watchErrors, gameReady } from './lib.mjs';

const [query = 'level=3&all', setup] = process.argv.slice(2);
const server = await startServer();
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
watchErrors(page, errors);

await page.goto(`${server.base}/?${query.replace(/^\?/, '')}`);
await gameReady(page);
if (setup) await page.evaluate(setup);
for (let i = 0; i < 6; i++) {
  await page.waitForTimeout(4000);
  console.log(
    JSON.stringify(
      await page.evaluate(() => {
        const s = window.__beam.scene;
        const { sim } = s;
        return {
          simT: +sim.time.toFixed(1),
          enemies: sim.enemies.length,
          posts: sim.posts.length,
          fps: +window.__beam.game.loop.actualFps.toFixed(1),
          frameMs: Math.round(window.__beam.game.loop.delta),
          lights: s.lights.lights.length,
          displayObjects: s.children.length
        };
      })
    )
  );
}
await browser.close();
server.stop();
if (errors.length) console.log(errors.join('\n'));
process.exit(errors.length ? 1 : 0);
