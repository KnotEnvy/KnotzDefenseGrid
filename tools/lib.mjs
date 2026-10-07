// Shared plumbing for the browser-driven scripts (tools/*.mjs and test/e2e.mjs): find a Chromium, launch it
// with WebGL, start (or reuse) the Vite dev server, and wait for scenes.

import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export const OUT_DIR = path.resolve('tools/out'); // gitignored

const sleep = ms => new Promise(r => setTimeout(r, ms));

/** CHROME_PATH, else Playwright's own Chromium, else any chromium-* under PLAYWRIGHT_BROWSERS_PATH. */
export function chromePath() {
  const candidates = [process.env.CHROME_PATH, chromium.executablePath()];
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (root && fs.existsSync(root)) {
    const dirs = fs.readdirSync(root).filter(d => /^chromium-\d+$/.test(d)).sort().reverse();
    for (const d of dirs) candidates.push(path.join(root, d, 'chrome-linux/chrome'), path.join(root, d, 'chrome-linux64/chrome'));
  }
  const found = candidates.find(p => p && fs.existsSync(p));
  if (!found) throw new Error('No Chromium found. Run `npx playwright-core install chromium` or set CHROME_PATH.');
  return found;
}

// Machines without a GPU (CI, containers) need software GL. Set GL=hardware to use the real GPU instead
// (also what you want when measuring frame rate on a dev machine).
const SOFTWARE_GL = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

export function launch(extraArgs = []) {
  const gl = process.env.GL === 'hardware' ? [] : SOFTWARE_GL;
  return chromium.launch({ executablePath: chromePath(), args: [...gl, '--autoplay-policy=no-user-gesture-required', ...extraArgs] });
}

const up = async url => {
  try {
    return (await fetch(url)).ok;
  } catch {
    return false;
  }
};

/** Reuse a dev server already running at BASE_URL (or E2E_URL), otherwise start one. Returns { base, stop }. */
export async function startServer(url = process.env.BASE_URL || process.env.E2E_URL || 'http://127.0.0.1:5199') {
  if (await up(url)) return { base: url, stop() {} };
  const { hostname, port } = new URL(url);
  const child = spawn('npx', ['vite', '--port', port || '5199', '--host', hostname, '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 60; i++) {
    if (await up(url)) return { base: url, stop: () => child.kill() };
    await sleep(500);
  }
  child.kill();
  throw new Error(`could not start vite on ${url}`);
}

/** Collect uncaught page errors and console.error output into `sink` (known-harmless noise is skipped). */
export function watchErrors(page, sink) {
  page.on('pageerror', e => sink.push(`pageerror: ${e.message}`));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/404|favicon|willReadFrequently/.test(t)) return;
    sink.push(`console.error: ${t}`);
  });
}

const LONG = { timeout: 180000 };

/** Wait until scene `key` is active and its fade-in has finished (+ a short pause so a few frames render). */
export async function settle(page, key, pauseMs = 800) {
  await page.waitForFunction(k => window.__beam?.game.scene.isActive(k), key, LONG);
  await page.waitForFunction(k => {
    const s = window.__beam.game.scene.getScene(k);
    return s.cameras?.main && !s.cameras.main.fadeEffect.isRunning;
  }, key, LONG);
  await page.waitForTimeout(pauseMs);
}

/** Wait until the Game scene exists with a sim and its fade-in has finished. */
export async function gameReady(page) {
  await page.waitForFunction(() => window.__beam?.scene?.sim && window.__beam.game.scene.isActive('Game'), null, LONG);
  await page.waitForFunction(() => !window.__beam.scene.cameras.main.fadeEffect.isRunning, null, { timeout: 120000 });
}

/** Load test/bot.mjs into the page as window.__Bot (the headless heuristic player). */
export function loadBot(page) {
  return page.evaluate(`import('/test/bot.mjs').then(m => { window.__Bot = m.Bot; })`);
}
