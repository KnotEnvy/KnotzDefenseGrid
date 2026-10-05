import Phaser from 'phaser';
import { POSTS, POST_ORDER, TARGET_MODE_LABEL } from '../../sim/data/posts.js';
import { LEVEL_LORE, RUSK } from '../../sim/data/lore.js';
import { GAME_W, GAME_H, FIELD, PANEL_X, FONT, COLOR, SC } from '../config.js';
import { panel, button, txt, setText, STYLE } from '../ui/kit.js';
import { statLines } from '../ui/describe.js';

const PX = PANEL_X;
const PW = GAME_W - PANEL_X;
const SPEED_LABEL = { 1: '1×', 2: '2×', 3: '3×' };

export class HudScene extends Phaser.Scene {
  constructor() {
    super('Hud');
  }

  init(data) {
    this.gs = data.game;
  }

  create() {
    const gs = this.gs;
    const sim = gs.sim;
    this.sim = sim;
    this.hoverType = null;
    this.lastSay = -99;
    this.sayQueue = [];
    this.postButtons = [];

    this.buildTopBar();
    this.buildPanel();
    this.buildBottomBar();
    this.buildBanner();
    this.buildBossBar();
    this.buildPause();

    // Rusk's opening lines
    const lore = LEVEL_LORE[gs.level.id];
    this.say(lore ? lore.tips[0] : 'Hold the Beam.', true);

    const onSay = cat => this.sayCategory(cat);
    const onWave = ({ index, wave }) => this.showBanner(index, wave);
    const onPause = p => this.pauseGroup.setVisible(p);
    gs.events.on('say', onSay);
    gs.events.on('waveStart', onWave);
    gs.events.on('paused', onPause);
    this.events.once('shutdown', () => {
      gs.events.off('say', onSay);
      gs.events.off('waveStart', onWave);
      gs.events.off('paused', onPause);
    });
  }

  // ------------------------------------------------------------------------------- top bar
  buildTopBar() {
    const gs = this.gs;
    panel(this, 0, 0, PX, 40, { radius: 0, alpha: 0.97 });
    txt(this, 14, 20, gs.level.name.toUpperCase(), { ...STYLE.title, fontSize: 15 }).setOrigin(0, 0.5);
    this.waveText = txt(this, 290, 20, '', { ...STYLE.mono, fontSize: 16 }).setOrigin(0, 0.5);
    this.timerText = txt(this, 440, 20, '', { ...STYLE.mono, fontSize: 14, color: '#a89a80' }).setOrigin(0, 0.5);
    this.callBtn = button(this, 560, 6, 130, 28, 'Call wave  ▸', () => gs.callWave(), { fontSize: 14, font: FONT.mono });
    // silver
    this.add.circle(712, 20, 8, 0xdfe6ee).setStrokeStyle(2, 0x8a95a3);
    this.add.circle(712, 20, 3.5, 0x8a95a3);
    this.silverText = txt(this, 726, 20, '', { ...STYLE.mono, fontSize: 18, color: '#e8eef6' }).setOrigin(0, 0.5);
    this.interestText = txt(this, 726, 31, '', { ...STYLE.mono, fontSize: 9, color: '#8fa0b4' }).setOrigin(0, 0.5);
    // shard row
    this.shardIcons = [];
    const n = gs.sim.shards.length;
    const x0 = 800;
    const gap = Math.min(18, 210 / n);
    for (let i = 0; i < n; i++) {
      const img = this.add.image(x0 + i * gap + 8, 20, 'shard').setScale(SC * 0.62);
      this.shardIcons.push(img);
    }
    this.add.text(PX - 8, 20, '', {}); // spacer
  }

  // ------------------------------------------------------------------------------- right panel
  buildPanel() {
    const gs = this.gs;
    panel(this, PX, 0, PW, GAME_H, { radius: 0 });
    txt(this, PX + PW / 2, 19, 'POSTS', { ...STYLE.title, fontSize: 17 }).setOrigin(0.5);
    const types = POST_ORDER.filter(t => gs.sim.unlocked.has(t));
    const bw = PW - 16;
    const bh = 34;
    this.postButtons = [];
    types.forEach((type, i) => {
      const x = PX + 8;
      const y = 38 + i * (bh + 4);
      const def = POSTS[type];
      const b = button(this, x, y, bw, bh, '', () => gs.selectPostType(type), {
        onHover: () => (this.hoverType = type),
        onOut: () => (this.hoverType = null)
      });
      const icon = this.add.image(x + 20, y + bh / 2, `post_${type}_base`).setScale(SC * 0.5);
      const head = this.add.image(x + 20, y + bh / 2, `post_${type}_head`).setScale(SC * 0.5);
      const name = txt(this, x + 42, y + bh / 2, def.name, { ...STYLE.body, fontSize: 15 }).setOrigin(0, 0.5);
      const cost = txt(this, x + bw - 10, y + bh / 2, `${def.levels[0].cost}`, { ...STYLE.mono, fontSize: 17, color: '#e8eef6' }).setOrigin(1, 0.5);
      const key = txt(this, x + 40, y + 3, `${i + 1}`, { ...STYLE.mono, fontSize: 9, color: '#8a7a60' }).setOrigin(1, 0);
      this.postButtons.push({ type, b, icon, head, cost, name, key, x, y, w: bw, h: bh });
    });
    this.cardTop = 38 + types.length * (bh + 4) + 2;
    this.buildCard();

    // footer controls
    const fy = GAME_H - 36;
    this.pauseBtn = button(this, PX + 8, fy, 56, 28, 'Pause', () => gs.togglePause(), { fontSize: 14, font: FONT.mono });
    this.pathBtn = button(this, PX + 68, fy, 56, 28, 'Paths', () => gs.togglePaths(), { fontSize: 14, font: FONT.mono });
    this.muteBtn = button(this, PX + 128, fy, 56, 28, 'Sound', () => this.gs.sfx?.toggleMute(), { fontSize: 14, font: FONT.mono });
    this.helpBtn = button(this, PX + 188, fy, 60, 28, 'Help', () => this.showHelp(), { fontSize: 14, font: FONT.mono });
  }

  buildCard() {
    const gs = this.gs;
    const top = this.cardTop;
    const h = GAME_H - 44 - top;
    this.cardBg = panel(this, PX + 6, top, PW - 12, h, { fill: 0x110b08, alpha: 1, edge: 0x4a3720, radius: 6 });
    const x = PX + 16;
    this.cardTitle = txt(this, x, top + 8, '', { ...STYLE.title, fontSize: 17 });
    this.cardSub = txt(this, x, top + 30, '', { ...STYLE.body, fontSize: 14, fontStyle: 'italic', color: '#b8a888' });
    this.cardStats = txt(this, x, top + 54, '', { ...STYLE.mono, fontSize: 13, color: '#d8ccb0', lineSpacing: 5 });
    this.cardBlurb = txt(this, x, top + 118, '', { ...STYLE.body, fontSize: 14, color: '#c8bca0', wordWrap: { width: PW - 36 } });
    this.cardNext = txt(this, x, top + 118, '', { ...STYLE.body, fontSize: 13, color: '#9fd0a0', wordWrap: { width: PW - 36 } });
    const by = top + h - 106;
    this.upBtn = button(this, x - 2, by, PW - 36, 32, 'Upgrade', () => gs.upgradeSelected(), { fontSize: 15, font: FONT.mono });
    this.modeBtn = button(this, x - 2, by + 38, PW - 36, 28, 'Target: Thieves first  [T]', () => gs.cycleMode(), { fontSize: 13, font: FONT.mono });
    this.sellBtn = button(this, x - 2, by + 70, PW - 36, 28, 'Sell', () => gs.sellSelected(), { fontSize: 14, font: FONT.mono, fill: 0x2a1410, edge: 0x8a3c3c });
    this.cardPips = this.add.graphics();
    this.cardH = h;
    this.cardTopY = top;
  }

  // ------------------------------------------------------------------------------- bottom bar
  buildBottomBar() {
    const gs = this.gs;
    const y = FIELD.y + FIELD.h;
    panel(this, 0, y, PX, 40, { radius: 0, alpha: 0.97 });
    // Rusk's portrait: a hat on a silhouette
    const g = this.add.graphics();
    g.fillStyle(0x2b1f15, 1).fillCircle(24, y + 20, 14).lineStyle(2, COLOR.gold, 1).strokeCircle(24, y + 20, 14);
    g.fillStyle(0x120c07, 1).fillCircle(24, y + 20, 10);
    g.fillStyle(0x4a3623, 1).fillCircle(24, y + 20, 6);
    g.fillStyle(0xd6b25e, 1).fillRect(14, y + 21, 20, 2);
    this.sayText = txt(this, 48, y + 20, '', { ...STYLE.body, fontSize: 17, fontStyle: 'italic', color: '#d8ccb0', wordWrap: { width: 700 } }).setOrigin(0, 0.5);
    this.speedBtns = [1, 2, 3].map((s, i) => button(this, PX - 118 + i * 38, y + 6, 34, 28, SPEED_LABEL[s], () => gs.setSpeed(s), { fontSize: 14, font: FONT.mono }));
  }

  say(line, force = false) {
    const now = this.time.now;
    if (!force && now - this.lastSay < 5200) return;
    this.lastSay = now;
    setText(this.sayText, `“${line}”`);
    this.sayText.setAlpha(0);
    this.tweens.add({ targets: this.sayText, alpha: 1, duration: 350 });
  }

  sayCategory(cat) {
    const list = RUSK[cat];
    if (!list) return;
    const important = cat === 'shardLost' || cat === 'boss' || cat === 'blocked';
    this.say(Phaser.Utils.Array.GetRandom(list), important);
  }

  // ------------------------------------------------------------------------------- wave banner
  buildBanner() {
    this.bannerTitle = txt(this, FIELD.w / 2, FIELD.y + 120, '', { ...STYLE.title, fontSize: 52, color: '#f1d9a0', stroke: '#120c08', strokeThickness: 8 }).setOrigin(0.5).setAlpha(0);
    this.bannerSub = txt(this, FIELD.w / 2, FIELD.y + 168, '', { ...STYLE.body, fontSize: 24, fontStyle: 'italic', color: '#e8dcc0', stroke: '#120c08', strokeThickness: 5 }).setOrigin(0.5).setAlpha(0);
  }

  showBanner(index, wave) {
    const boss = wave.groups.some(g => ['bear', 'ashe'].includes(g.type));
    const last = index === this.sim.totalWaves - 1;
    this.bannerTitle.setText(last ? 'FINAL WAVE' : `WAVE ${index + 1}`).setColor(boss ? '#ff7a7a' : '#f1d9a0');
    this.bannerSub.setText(wave.name);
    for (const t of [this.bannerTitle, this.bannerSub]) {
      this.tweens.killTweensOf(t);
      t.setAlpha(0).setScale(1.25);
      this.tweens.add({ targets: t, alpha: 1, scale: 1, duration: 380, ease: 'Cubic.easeOut' });
      this.tweens.add({ targets: t, alpha: 0, duration: 600, delay: 2100 });
    }
    if (wave.say) {
      this.time.delayedCall(700, () => this.say(wave.say, true));
    }
    if (boss) this.sayCategory('boss');
  }

  // ------------------------------------------------------------------------------- boss bar
  buildBossBar() {
    const x = FIELD.w / 2 - 230;
    const y = FIELD.y + 8;
    this.bossBg = this.add.graphics();
    this.bossFill = this.add.graphics();
    this.bossName = txt(this, FIELD.w / 2, y + 2, '', { ...STYLE.title, fontSize: 15, color: '#ffb0b8', stroke: '#120c08', strokeThickness: 4 }).setOrigin(0.5, 0);
    this.bossBox = { x, y: y + 22, w: 460, h: 12 };
    this.bossBg.setVisible(false);
    this.bossName.setVisible(false);
  }

  updateBossBar() {
    const boss = this.sim.enemies.find(e => e.boss && !e.dead);
    const vis = !!boss;
    this.bossBg.setVisible(vis);
    this.bossFill.setVisible(vis);
    this.bossName.setVisible(vis);
    if (!boss) return;
    const { x, y, w, h } = this.bossBox;
    setText(this.bossName, boss.def.name.toUpperCase());
    this.bossBg.clear();
    this.bossBg.fillStyle(0x120c08, 0.85).fillRoundedRect(x - 3, y - 3, w + 6, h + 6, 5);
    this.bossBg.lineStyle(2, 0x8a3c3c, 1).strokeRoundedRect(x - 3, y - 3, w + 6, h + 6, 5);
    this.bossFill.clear();
    const f = Math.max(0, boss.hp / boss.maxHp);
    this.bossFill.fillStyle(boss.enraged ? 0xff4a3a : 0xc0283a, 1).fillRoundedRect(x, y, w * f, h, 3);
  }

  // ------------------------------------------------------------------------------- pause / help
  buildPause() {
    const gs = this.gs;
    const g = this.add.group();
    const dim = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.62).setOrigin(0).setInteractive();
    const box = panel(this, GAME_W / 2 - 170, 190, 340, 320);
    const t = txt(this, GAME_W / 2, 232, 'PAUSED', { ...STYLE.title, fontSize: 38 }).setOrigin(0.5);
    const sub = txt(this, GAME_W / 2, 270, '“Wait for the wheel to turn.”', { ...STYLE.body, fontSize: 16, fontStyle: 'italic', color: '#a89a80' }).setOrigin(0.5);
    const b1 = button(this, GAME_W / 2 - 110, 300, 220, 38, 'Resume', () => gs.togglePause(), { fontSize: 20 });
    const b2 = button(this, GAME_W / 2 - 110, 348, 220, 38, 'Restart Level', () => this.restart(), { fontSize: 20 });
    const b3 = button(this, GAME_W / 2 - 110, 396, 220, 38, 'Level Map', () => this.quit(), { fontSize: 20 });
    const b4 = button(this, GAME_W / 2 - 110, 444, 220, 38, 'Mute / Unmute', () => gs.sfx?.toggleMute(), { fontSize: 18 });
    [dim, box, t, sub, b1.bg, b1.label, b1.zone, b2.bg, b2.label, b2.zone, b3.bg, b3.label, b3.zone, b4.bg, b4.label, b4.zone].forEach(o => g.add(o));
    g.setVisible(false);
    g.setDepth?.(500);
    this.pauseGroup = g;
    this.pauseGroup.getChildren().forEach(o => o.setDepth?.(500));
  }

  showHelp() {
    this.gs.togglePause();
    this.say('Click a post, then click the ground. Right-click cancels. Space calls the next wave. Keep a road open.', true);
  }

  restart() {
    const gs = this.gs;
    gs.tweens.timeScale = 1;
    this.scene.stop('Hud');
    gs.scene.restart({ level: gs.levelIndex, difficulty: gs.difficulty });
  }

  quit() {
    const gs = this.gs;
    gs.tweens.timeScale = 1;
    this.scene.stop('Hud');
    gs.scene.start('Select');
  }

  // ------------------------------------------------------------------------------- per-frame
  update() {
    const gs = this.gs;
    const sim = this.sim;
    if (!gs.sim || gs.sim !== sim) return;
    const levelCfg = sim.level.interest ?? {};

    // top bar
    setText(this.waveText, `WAVE ${Math.min(sim.waveIndex, sim.totalWaves)} / ${sim.totalWaves}`);
    if (sim.nextWaveIn !== null && sim.waveIndex < sim.totalWaves) setText(this.timerText, `next in ${Math.ceil(sim.nextWaveIn)}s`);
    else setText(this.timerText, sim.waveIndex >= sim.totalWaves ? 'final wave unleashed' : 'in progress');
    this.callBtn.setEnabled(sim.canCallWave);
    this.callBtn.setVisible(sim.canCallWave);
    setText(this.silverText, `${Math.floor(sim.silver)}`);
    const ir = Math.min(levelCfg.cap ?? 0, sim.silver * (levelCfg.rate ?? 0));
    setText(this.interestText, ir > 0.05 ? `+${ir.toFixed(1)}/s interest` : '');

    const t = this.time.now / 1000;
    sim.shards.forEach((s, i) => {
      const icon = this.shardIcons[i];
      if (s.state === 'home') icon.setTint(0xffffff).setAlpha(1);
      else if (s.state === 'carried') icon.setTint(0xff5060).setAlpha(0.6 + 0.4 * Math.sin(t * 14));
      else if (s.state === 'dropped' || s.state === 'returning') icon.setTint(0x8ff3ff).setAlpha(0.5 + 0.5 * Math.sin(t * 10));
      else icon.setTint(0x222222).setAlpha(0.45);
    });

    // post buttons
    for (const pb of this.postButtons) {
      const cost = POSTS[pb.type].levels[0].cost;
      const afford = sim.silver >= cost;
      pb.b.setEnabled(afford || gs.buildType === pb.type);
      pb.cost.setColor(afford ? '#e8eef6' : '#a05050');
      pb.icon.setAlpha(afford ? 1 : 0.5);
      pb.head.setAlpha(afford ? 1 : 0.5);
      const active = gs.buildType === pb.type;
      if (active !== pb.active) {
        pb.active = active;
        pb.b.bg.clear();
        pb.b.bg.fillStyle(active ? 0x4a3418 : 0x2b1d12, 1).fillRoundedRect(pb.x, pb.y, pb.w, pb.h, 7);
        pb.b.bg.lineStyle(2, active ? 0xffe08a : 0x8a6a3c, 1).strokeRoundedRect(pb.x, pb.y, pb.w, pb.h, 7);
      }
    }

    this.updateCard();

    // bottom
    this.speedBtns.forEach((b, i) => b.bg.setAlpha(gs.speed === i + 1 ? 1 : 0.55));
    this.pathBtn.bg.setAlpha(gs.world.pathVisible ? 1 : 0.6);
    this.updateBossBar();
  }

  updateCard() {
    const gs = this.gs;
    const sim = this.sim;
    const p = gs.selected;
    const type = p?.type ?? gs.buildType ?? this.hoverType;
    const g = this.cardPips;
    g.clear();
    const show = !!type;
    for (const o of [this.cardTitle, this.cardSub, this.cardStats]) o.setVisible(show);
    this.cardBlurb.setVisible(false);
    this.cardNext.setVisible(false);
    this.upBtn.setVisible(!!p);
    this.modeBtn.setVisible(!!p);
    this.sellBtn.setVisible(!!p);
    if (!show) {
      this.cardTitle.setVisible(true);
      setText(this.cardTitle, 'The Road');
      this.cardSub.setVisible(true);
      setText(this.cardSub, 'Click a post, then the ground');
      this.cardStats.setVisible(false);
      this.cardBlurb.setVisible(true);
      setText(this.cardBlurb, 'Kill the thief carrying a shard and it drops. Leave it a moment and it drifts home.\n\nDo not seal the road: lengthen it.');
      this.cardBlurb.setY(this.cardTopY + 62);
      return;
    }
    const def = POSTS[type];
    if (p) {
      const s = sim.statsOf(p);
      setText(this.cardTitle, def.tiers[p.level]);
      setText(this.cardSub, def.epithet);
      setText(this.cardStats, statLines(type, p.level, s).join('\n') + (p.buff.dmg > 1 ? `\nKa-Tet bonus active` : ''));
      // tier pips
      for (let i = 0; i < 3; i++) {
        g.fillStyle(i <= p.level ? 0xffd77a : 0x3a2c1c, 1).fillTriangle(PX + PW - 22 - i * 16, this.cardTopY + 20, PX + PW - 14 - i * 16, this.cardTopY + 28, PX + PW - 22 - i * 16, this.cardTopY + 36);
        g.fillTriangle(PX + PW - 22 - i * 16, this.cardTopY + 20, PX + PW - 30 - i * 16, this.cardTopY + 28, PX + PW - 22 - i * 16, this.cardTopY + 36);
      }
      const up = sim.upgradeCost(p);
      this.upBtn.setVisible(true);
      if (up == null) {
        this.upBtn.setLabel('Fully upgraded');
        this.upBtn.setEnabled(false);
        this.cardNext.setVisible(false);
      } else {
        this.upBtn.setLabel(`Upgrade → ${def.tiers[p.level + 1]}  ·  ${up}`);
        this.upBtn.setEnabled(sim.silver >= up);
        this.cardNext.setVisible(true);
        setText(this.cardNext, '▲ ' + statLines(type, p.level + 1).join(' · '));
        this.cardNext.setY(this.cardTopY + 108);
      }
      this.sellBtn.setLabel(`Sell  +${sim.sellValue(p)}  [S]`);
      const canTarget = ['hitscan', 'cone', 'beam', 'mortar', 'chain'].includes(def.behavior);
      this.modeBtn.setVisible(canTarget);
      if (canTarget) this.modeBtn.setLabel(`Target: ${TARGET_MODE_LABEL[p.mode]}  [T]`);
    } else {
      setText(this.cardTitle, def.name);
      setText(this.cardSub, def.epithet);
      setText(this.cardStats, statLines(type, 0).join('\n'));
      this.cardBlurb.setVisible(true);
      this.cardBlurb.setY(this.cardTopY + 108);
      setText(this.cardBlurb, def.blurb);
    }
  }
}
