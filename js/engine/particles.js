// 2D 粒子系统（Canvas，对象池，上限自动降级）+ VFX 序列帧播放器
import { rand, Pool } from './utils.js';

const MAX_PARTICLES = 500;

class Particle {
  constructor() { this.alive = false; }
  spawn(o) {
    Object.assign(this, {
      alive: true, t: 0,
      life: 0.6, size: 4, color: '#ffd27d', gravity: 0, drag: 0.98,
      vx: 0, vy: 0, shrink: true, glow: true, shape: 'rect', rot: 0, vr: 0,
    }, o);
  }
  update(dt) {
    this.t += dt; if (this.t >= this.life) { this.alive = false; return; }
    this.vy += this.gravity * dt;
    this.vx *= this.drag; this.vy *= this.drag;
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.rot += this.vr * dt;
  }
  draw(ctx, camX, camY) {
    const k = 1 - this.t / this.life;
    const s = this.shrink ? this.size * k : this.size;
    ctx.save();
    ctx.globalAlpha = Math.min(1, k * 1.6);
    if (this.glow) { ctx.globalCompositeOperation = 'lighter'; }
    ctx.translate(this.x - camX, this.y - camY);
    ctx.rotate(this.rot);
    ctx.fillStyle = this.color;
    if (this.shape === 'rect') ctx.fillRect(-s / 2, -s / 2, s, s * 0.6);
    else { ctx.beginPath(); ctx.arc(0, 0, s / 2, 0, 7); ctx.fill(); }
    ctx.restore();
  }
}

export class Particles {
  constructor() {
    this.pool = new Pool(() => new Particle(), p => p.alive = false, 128);
  }
  emit(opts, count = 10) {
    const room = MAX_PARTICLES - this.pool.used.size;
    count = Math.min(count, Math.max(0, room));
    for (let i = 0; i < count; i++) {
      const p = this.pool.get();
      p.spawn({
        ...opts,
        x: opts.x + rand(-1, 1) * (opts.spread || 6),
        y: opts.y + rand(-1, 1) * (opts.spread || 6),
        vx: (opts.vx || 0) + rand(-1, 1) * (opts.vrand || 120),
        vy: (opts.vy || 0) + rand(-1, 1) * (opts.vrand || 120),
        life: (opts.life || 0.6) * rand(0.6, 1.3),
        size: (opts.size || 4) * rand(0.7, 1.4),
        vr: rand(-8, 8), rot: rand(0, 6),
      });
    }
  }
  // 常用预设
  hitSpark(x, y, dir = 1) {
    this.emit({ x, y, vx: dir * 80, vy: -60, vrand: 220, life: 0.35, size: 5, color: '#ffd27d', gravity: 500 }, 12);
    this.emit({ x, y, vrand: 90, life: 0.25, size: 3, color: '#fff5e0' }, 6);
  }
  bloodInk(x, y, dir = 1) { // 水墨朱砂
    this.emit({ x, y, vx: dir * 100, vy: -80, vrand: 160, life: 0.5, size: 6, color: '#a02622', gravity: 700, glow: false, shape: 'circle' }, 10);
  }
  dashTrail(x, y, color = '#9ad8ff') {
    this.emit({ x, y, vrand: 30, life: 0.3, size: 8, color, glow: true, shape: 'circle' }, 2);
  }
  deathBurst(x, y, color = '#c8c2b2') {
    this.emit({ x, y, vrand: 260, life: 0.7, size: 7, color, gravity: 300, glow: false }, 18);
    this.emit({ x, y, vrand: 120, life: 0.9, size: 4, color: '#6a655a', gravity: -40, glow: false, shape: 'circle' }, 10);
  }
  ultWave(x, y, color) {
    this.emit({ x, y, vrand: 500, life: 0.8, size: 8, color, gravity: 0 }, 40);
  }
  heal(x, y) {
    this.emit({ x, y, vy: -120, vrand: 40, life: 0.8, size: 4, color: '#7dff9a', shape: 'circle' }, 12);
  }
  update(dt) { for (const p of this.pool.used) p.update(dt); }
  draw(ctx, camX, camY) { for (const p of this.pool.used) if (p.alive) p.draw(ctx, camX, camY); }
  clear() { this.pool.releaseAll(); }
}

// ---------- VFX 序列帧（Spine 提取的刀光/火焰/雷电 flipbook）----------
export class VfxLib {
  constructor() { this.sets = new Map(); } // name -> {frames:[Image], w,h}
  async load(name, count) {
    if (this.sets.has(name)) return this.sets.get(name);
    const frames = [];
    const jobs = [];
    for (let i = 0; i < count; i++) {
      const idx = String(i).padStart(2, '0');
      jobs.push(new Promise(res => {
        const img = new Image();
        img.onload = () => { frames[i] = img; res(); };
        img.onerror = () => res();
        img.src = `assets/vfx/${name}/frame_${idx}.png`;
      }));
    }
    await Promise.all(jobs);
    const ok = frames.filter(Boolean);
    const set = { frames: ok.length === count ? frames : ok, empty: ok.length === 0 };
    this.sets.set(name, set);
    return set;
  }
  get(name) { return this.sets.get(name); }
}

// 播放中的 VFX 实例
export class VfxPlayer {
  constructor(lib) { this.lib = lib; this.active = []; }
  play(name, x, y, { scale = 1, fps = 24, flip = false, rot = 0, once = true, glow = true, anchorY = 0.5 } = {}) {
    const set = this.lib.get(name);
    if (!set || set.empty) return null;
    const v = { set, x, y, t: 0, frame: 0, scale, fps, flip, rot, once, glow, anchorY, done: false };
    this.active.push(v);
    return v;
  }
  update(dt) {
    for (const v of this.active) {
      v.t += dt;
      const f = Math.floor(v.t * v.fps);
      if (f >= v.set.frames.length) {
        if (v.once) v.done = true;
        else v.t = 0;
        v.frame = Math.min(f, v.set.frames.length - 1);
      } else v.frame = f;
    }
    this.active = this.active.filter(v => !v.done);
  }
  draw(ctx, camX, camY) {
    for (const v of this.active) {
      const img = v.set.frames[v.frame];
      if (!img) continue;
      ctx.save();
      if (v.glow) ctx.globalCompositeOperation = 'lighter';
      ctx.translate(v.x - camX, v.y - camY);
      ctx.rotate(v.rot);
      if (v.flip) ctx.scale(-1, 1);
      const w = img.width * v.scale, h = img.height * v.scale;
      ctx.drawImage(img, -w / 2, -h * v.anchorY, w, h);
      ctx.restore();
    }
  }
  clear() { this.active.length = 0; }
}

export const particles = new Particles();
export const vfxLib = new VfxLib();
