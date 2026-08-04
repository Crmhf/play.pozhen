// 破阵大乱斗 · 主入口：启动 / 全局状态机 / 固定时间步游戏循环
import { clamp } from './engine/utils.js';
import { Input } from './engine/input.js';
import { audio } from './engine/audio.js';
import { feel } from './engine/shake.js';
import { particles, vfxLib, VfxPlayer } from './engine/particles.js';
import { Physics } from './engine/physics.js';
import { Renderer3D } from './engine/renderer3d.js';
import { CHARACTERS } from './data/characters.js';
import { LEVELS } from './data/levels.js';
import { MONSTER_MAP } from './data/monsters.js';
import { Player } from './game/player.js';
import { Enemy } from './game/enemy.js';
import { Combat } from './game/combat.js';
import { Director } from './game/director.js';
import { Level } from './game/level.js';
import { UI } from './game/ui.js';

const GSTATE = { TITLE: 'TITLE', SELECT: 'SELECT', STORY: 'STORY', PLAYING: 'PLAYING', PAUSED: 'PAUSED', CLEAR: 'CLEAR', OVER: 'OVER', VICTORY: 'VICTORY' };
const FIXED_DT = 1 / 120;

class Game {
  constructor() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.input = new Input();
    this.ui = new UI(this);
    this.bg3d = new Renderer3D(document.getElementById('bg3d'));
    this.combat = new Combat(this);
    this.director = new Director(2);
    this.vfx = new VfxPlayer(vfxLib);
    this.state = GSTATE.TITLE;
    this.phys = null; this.player = null; this.level = null;
    this.enemies = [];
    this.charData = null;
    this.levelIndex = 0;
    this.runStats = { kills: 0, dmg: 0, maxCombo: 0, levels: 0 };
    this.acc = 0; this.lastT = 0; this.elapsed = 0;
    this._resize();
    addEventListener('resize', () => this._resize());
  }

  _resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.w = innerWidth; this.h = innerHeight;
    this.canvas.width = this.w * dpr; this.canvas.height = this.h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // 世界 → 屏幕：camY 使地面(y=0)落在屏幕 72% 高度
  get camY() { return -this.h * 0.72; }

  async init() {
    this.ui.showTitle(() => this.toSelect());
    // 预加载 VFX 帧序列
    const sets = [
      ['slash_1', 5], ['slash_2', 5], ['slash_3', 5], ['slash_4', 5], ['slash_5', 5],
      ['die', 12], ['tornado', 15], ['quake', 17], ['ice_spike', 11], ['sword_rain', 19],
      ['moon_dance', 9], ['moon_dance_2', 7], ['boss_rage', 26], ['boss_stomp', 16],
      ['boss_dark', 33], ['boss_come', 16], ['charge', 11], ['buff_aura', 7],
      ['arrow_rain', 15], ['fly_fire', 5], ['fly_poison', 5],
    ];
    let done = 0;
    await Promise.all(sets.map(([n, c]) => vfxLib.load(n, c).then(() => {
      done++;
      const pct = Math.round(done / sets.length * 100);
      document.getElementById('load-pct').textContent = `${pct}%`;
      document.getElementById('load-fill').style.width = `${pct}%`;
    })));
    document.getElementById('loading').style.display = 'none';
    this.lastT = performance.now();
    requestAnimationFrame(t => this._frame(t));
    // RAF 停摆看门狗：隐身标签/激进节流环境下用定时器兜底驱动（真实浏览器 RAF 优先）
    setInterval(() => {
      if (performance.now() - (this._lastFrameAt || 0) > 250) {
        this._frame(performance.now());
      }
    }, 250);
  }

  toSelect() {
    this.state = GSTATE.SELECT;
    audio.playBgm('title');
    this.ui.showCharSelect(c => { this.charData = c; this.toStory(this.levelIndex); });
  }

  toStory(idx) {
    this.state = GSTATE.STORY;
    this.levelIndex = idx;
    const lv = LEVELS[idx];
    this.ui.showStory(lv, () => this.startLevel(idx));
  }

  async startLevel(idx) {
    this.ui.clearScreens();
    const lv = LEVELS[idx];
    // 重建物理世界
    this.phys = new Physics();
    this.enemies = [];
    this.director.reset();
    particles.clear(); this.vfx.clear();
    this.level = new Level(this, lv, idx);
    this.level.setup();
    this.level.camera.x = this.w / 2;
    // 玩家
    if (!this.player || this.player.data !== this.charData) {
      this.player = new Player(this.charData, this.phys, this);
    } else {
      // 续阵：换物理世界重建 body
      this.player.phys = this.phys;
      this.player.body = this.phys.addCharacter(200, -80, 26, 56, { type: 'player', ref: this.player });
      this.player.hp = this.player.maxHp;
      this.player.fsm.state = 'IDLE'; this.player.fsm.stateTime = 0;
    }
    this.phys.setPos(this.player.body, 200, -80);
    this.player.x = 200;
    // 3D 背景
    this.bg3d.buildLevel(lv.scene);
    // HUD（等 Spine 就绪后生成头像快照）
    if (this.player.spineActor && !this.player.spineActor.ready) {
      try { await this.player.spineActor.load(); } catch (e) {}
    }
    this.ui.showHud(this.charData, this.player.spineActor);
    this.ui.setLevelName(lv.chapter, `${lv.name} · ${lv.place}`);
    this.ui.updateCombo(0);
    audio.playBgm(lv.bgm);
    this.state = GSTATE.PLAYING;
  }

  // ---------- 关卡回调 ----------
  spawnEnemy(id, x, elite = false) {
    const def = MONSTER_MAP[id];
    const e = new Enemy(def, this.phys, this, { x, elite, level: this.levelIndex + 1 });
    this.enemies.push(e);
    return e;
  }
  spawnPickup(x, type) { this.level.spawnPickup(x, type); }
  spawnProjectile(src, kind, opt) { this.level.spawnProjectile(src, kind, opt); }

  onEnemyDead(e) {
    this.runStats.kills = this.player.stats.kills;
  }
  onBossDead(boss) {
    this.level.onBossDead();
    // 剩余小怪溃散
    for (const e of this.enemies) if (e.alive && !e.isBoss) { e.hp = 0; e.fsm.set('DEAD'); }
    setTimeout(() => this._levelCleared(), 1800);
  }
  _levelCleared() {
    if (this.state !== GSTATE.PLAYING) return;
    this.runStats.levels = this.levelIndex + 1;
    this.runStats.dmg = this.player.stats.dmg;
    this.runStats.maxCombo = this.player.stats.maxCombo;
    this.player.levelUp();
    if (this.levelIndex >= LEVELS.length - 1) {
      this.state = GSTATE.VICTORY;
      this.ui.hideHud();
      this.ui.showVictory(this.runStats, () => this._resetRun());
    } else {
      this.state = GSTATE.CLEAR;
      this.ui.showLevelClear(LEVELS[this.levelIndex], this.player.stats, () => this.toStory(this.levelIndex + 1));
    }
  }
  _gameOver() {
    if (this.state !== GSTATE.PLAYING) return;
    this.state = GSTATE.OVER;
    this.runStats.dmg = this.player.stats.dmg;
    this.runStats.maxCombo = this.player.stats.maxCombo;
    this.ui.hideBossBar();
    this.ui.showGameOver(this.runStats,
      () => this.startLevel(this.levelIndex),   // 续阵：重打本关
      () => this._resetRun());
  }
  _resetRun() {
    this.levelIndex = 0;
    this.player = null;
    this.runStats = { kills: 0, dmg: 0, maxCombo: 0, levels: 0 };
    this.ui.hideHud(); this.ui.hideBossBar();
    audio.playBgm('title');
    this.toSelect();
  }

  _togglePause() {
    if (this.state === GSTATE.PLAYING) {
      this.state = GSTATE.PAUSED;
      this.ui.showPause(() => this.state = GSTATE.PLAYING, () => this._resetRun());
    } else if (this.state === GSTATE.PAUSED) {
      this.ui.hidePause();
      this.state = GSTATE.PLAYING;
    }
  }

  // ---------- 主循环 ----------
  _frame(t) {
    cancelAnimationFrame(this._rafId); // 看门狗兜底时也保持单循环
    this._rafId = requestAnimationFrame(tt => this._frame(tt));
    this._lastFrameAt = performance.now();
    document.body.dataset.gstate = this.state; // 调试镜像
    let dt = Math.min((t - this.lastT) / 1000, 0.05); // dt clamp
    this.lastT = t;
    this.elapsed += dt;

    // 顿帧/慢镜时间缩放
    const ts = feel.timeScale();
    feel.update(dt);
    feel.consumeHitStop(dt);
    const gdt = dt * ts;

    if (this.state === GSTATE.PLAYING) {
      if (this.input.pausePressed) this._togglePause();
      // 固定时间步物理
      this.acc += gdt;
      while (this.acc >= FIXED_DT) {
        this._step(FIXED_DT);
        this.acc -= FIXED_DT;
      }
      // 玩家死亡 → 结算
      if (this.player.hp <= 0 && this.player.fsm.state === 'DEAD' && this.player.fsm.stateTime > 1.2) {
        this._gameOver();
      }
    }
    this._render(gdt);
    this.input.endFrame();
  }

  _step(dt) {
    this.phys.step(dt);
    this.player.fsm.update(dt);
    this.player.syncBody();
    for (const e of this.enemies) {
      if (e.alive || e.fsm.state === 'DEAD') { e.fsm.update(dt); e.syncBody(); }
    }
    this.enemies = this.enemies.filter(e => e.alive || e.fsm.stateTime < 1.2);
    this.level.update(dt);
    this.level.updateProjectiles(dt);
    this.level.updatePickups(dt);
    particles.update(dt);
    this.vfx.update(dt);
    // Boss 血条
    if (this.level.boss && this.level.boss.alive) {
      this.ui.updateBossBar(this.level.boss.hp / this.level.boss.maxHp);
    }
    this.ui.updateHud(this.player);
  }

  _render(dt) {
    const ctx = this.ctx, w = this.w, h = this.h;
    ctx.clearRect(0, 0, w, h);
    const playing = [GSTATE.PLAYING, GSTATE.PAUSED, GSTATE.CLEAR, GSTATE.OVER, GSTATE.VICTORY].includes(this.state) && this.level;
    const camX = playing ? this.level.camera.x - w / 2 : this.elapsed * 30; // 标题时镜头缓慢漂移
    const shake = feel.offsets(this.elapsed);

    // 3D 背景层
    if (this.bg3d.ok) {
      this.bg3d.update(dt, camX + w / 2, playing ? shake : null);
    } else {
      // Canvas 降级背景
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#2a3040'); g.addColorStop(1, '#12141c');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
    if (!playing) return;

    ctx.save();
    ctx.translate(shake.x, shake.y);
    ctx.rotate(shake.rot);
    const camY = this.camY;

    // 地面
    this.level.drawGround(ctx, camX - w / 2, camY, w, h);
    // 投射物/掉落（实体层之下）
    this.level.drawPickups(ctx, camX - w / 2, camY);
    // 实体（按 y 排序画，简单深度）
    const drawables = [...this.enemies.filter(e => e.alive || e.fsm.state === 'DEAD'), this.player]
      .sort((a, b) => (a.y + (a.zOffset || 0)) - (b.y + (b.zOffset || 0)));
    for (const d of drawables) d.draw(ctx, camX - w / 2, camY);
    this.level.drawProjectiles(ctx, camX - w / 2, camY);
    // 粒子 + VFX
    particles.draw(ctx, camX - w / 2, camY);
    this.vfx.draw(ctx, camX - w / 2, camY);
    ctx.restore();

    // 全屏闪光
    if (feel.flashT > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.5, feel.flashT * 3);
      ctx.fillStyle = `rgb(${feel.flashColor})`;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
    // 水墨暗角
    const vg = ctx.createRadialGradient(w / 2, h / 2, h * 0.5, w / 2, h / 2, h);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,8,6,0.42)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
  }
}

// ---------- 启动 ----------
const game = new Game();
// 首次交互解锁音频
const unlock = () => { audio.unlock(); removeEventListener('pointerdown', unlock); removeEventListener('keydown', unlock); };
addEventListener('pointerdown', unlock);
addEventListener('keydown', unlock);
game.init();
window.__game = game; // 调试入口

// ---------- 自动驾驶（?auto=1 冒烟测试/平衡性分析）----------
if (location.search.includes('auto=1')) {
  const keys = game.input.keys, pressed = game.input.pressed;
  const AUTO_KEY = 'KeyD';
  let lastAtk = 0, lastSkill = 0, fpsAcc = 0, fpsN = 0, fpsT = 0;
  setTimeout(() => { game.charData = CHARACTERS[0]; game.startLevel(0); }, 1200);
  setInterval(() => {
    const b = document.body;
    // 自动连闯：CLEAR→下一阵；STORY→自动进阵
    if (game.state === 'CLEAR') { game.toStory(game.levelIndex + 1); return; }
    if (game.state === 'STORY') { game.startLevel(game.levelIndex); return; }
    if (game.state === 'OVER') { game.startLevel(game.levelIndex); return; }
    if (game.state === 'VICTORY') { b.dataset.auto = 'VICTORY'; return; }
    if (game.state !== 'PLAYING' || !game.player) { b.dataset.auto = game.state; return; }
    const now = performance.now();
    const p = game.player;
    const alive = game.enemies.filter(e => e.alive);
    keys.delete('KeyD'); keys.delete('KeyA');
    if (alive.length) {
      // 找最近敌人并朝向他作战
      const nearest = alive.reduce((a, c) => Math.abs(c.x - p.x) < Math.abs(a.x - p.x) ? c : a);
      const dx = nearest.x - p.x;
      if (Math.abs(dx) > 80) keys.add(dx > 0 ? 'KeyD' : 'KeyA');
      else {
        keys.add(dx > 0 ? 'KeyD' : 'KeyA'); // 保持朝向
        if (now - lastAtk > 260) { pressed.add('KeyJ'); lastAtk = now; }
      }
    } else {
      keys.add('KeyD'); // 无敌人时向右推进
    }
    if (now - lastSkill > 6000 && p.mp >= 30) { pressed.add('KeyK'); lastSkill = now; }
    if (p.rage >= 100) pressed.add('KeyL');
    // 指标
    fpsAcc++; 
    b.dataset.auto = JSON.stringify({
      state: game.state, lv: game.levelIndex + 1, px: Math.round(game.player.x), hp: Math.round(game.player.hp),
      pstate: game.player.fsm.state,
      enemies: game.enemies.filter(e => e.alive).length,
      ed: game.enemies.filter(e => e.alive).slice(0, 4).map(e =>
        `${Math.round(e.x)},${Math.round(e.y)}|hp${Math.round(e.hp)}|${e.fsm.state}${e.fsm.stateTime.toFixed(1)}|${e.hasToken ? 'T' : '-'}`),
      py: Math.round(game.player.y),
      wave: game.level.waveIdx, phase: game.level.phase,
      kills: game.player.stats.kills, combo: game.player.stats.maxCombo,
    });
  }, 100);
  setInterval(() => { // FPS 统计
    const b = document.body;
    b.dataset.fps = fpsAcc * 10; fpsAcc = 0;
  }, 1000);
}
