// 2D 幻想江湖背景层：多层视差 + 环境粒子（Canvas 2D，替代 3D 方案）
// 层序：天空渐变 → AI 幻境原画(0.12) → 中景剪影山(0.35) → 雾霭(0.55) → 环境粒子
import { rand } from './utils.js?v=1785924343';

export class Renderer2D {
  constructor() {
    this.tex = null; this.texReady = false;
    this.layers = [];
    this.ambient = null;
    this.cfg = null;
    this._midStrip = null;
  }

  /** 程序化水墨远山长条（可平铺） */
  _makeSilhouette(color1, color2, seed, alpha) {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 256;
    const x = c.getContext('2d');
    let s = seed;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, color1); g.addColorStop(1, color2);
    x.fillStyle = g; x.globalAlpha = alpha;
    x.beginPath(); x.moveTo(0, 256);
    let px = 0;
    while (px <= 1024) {
      const peakY = 40 + rnd() * 110, w = 100 + rnd() * 160;
      x.quadraticCurveTo(px + w / 2, peakY, px + w, 180 + rnd() * 50);
      px += w;
    }
    x.lineTo(1024, 256); x.closePath(); x.fill();
    return c;
  }

  _loadTex(url) {
    return new Promise(res => {
      if (!url) return res(null);
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => res(null);
      img.src = url;
    });
  }

  async buildLevel(cfg) {
    this.cfg = cfg;
    this.texReady = false;
    this.tex = await this._loadTex(cfg.texUrl);
    this.texReady = !!this.tex;
    // 中景/近景剪影（按场景色调）
    this._midStrip = this._makeSilhouette(cfg.midSil || 'rgba(30,34,48,0.5)', cfg.midSil2 || 'rgba(18,20,30,0.7)', cfg.seed || 7, 0.9);
    this._nearStrip = this._makeSilhouette(cfg.nearSil || 'rgba(16,18,26,0.75)', cfg.nearSil2 || 'rgba(10,12,18,0.9)', (cfg.seed || 7) + 13, 1);
    // 环境粒子
    const a = cfg.ambient || { type: 'dust', color: '#cfc5a8' };
    const N = 110;
    const arr = [];
    for (let i = 0; i < N; i++) {
      arr.push({
        x: rand(0, 1), y: rand(0, 1),           // 屏幕归一化
        v: this._vel(a.type), size: rand(1.5, 4), tw: rand(0, 6),
      });
    }
    this.ambient = { list: arr, type: a.type, color: a.color };
  }

  _vel(type) {
    switch (type) {
      case 'ember': return { x: rand(-0.01, 0.02), y: rand(-0.06, -0.02) };
      case 'rain': return { x: rand(-0.06, -0.04), y: rand(0.5, 0.8) };
      case 'snow': return { x: rand(-0.015, 0.015), y: rand(0.03, 0.06) };
      case 'petal': case 'leaf': return { x: rand(-0.05, -0.02), y: rand(0.01, 0.03) };
      case 'miasma': return { x: rand(-0.008, 0.008), y: rand(-0.004, 0.012) };
      default: return { x: rand(-0.01, 0.01), y: rand(-0.005, 0.012) }; // dust
    }
  }

  /**
   * 在每帧游戏渲染前调用：铺满 w×h，camX 为游戏世界镜头左缘
   */
  render(ctx, w, h, camX, shake) {
    const cfg = this.cfg || {};
    const sx = shake ? shake.x : 0, sy = shake ? shake.y : 0;
    ctx.save();
    ctx.translate(sx, sy);
    // 1. 天空渐变
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, cfg.skyTop || '#2a3040');
    sky.addColorStop(1, cfg.skyBottom || '#12141c');
    ctx.fillStyle = sky;
    ctx.fillRect(-20, -20, w + 40, h + 40);
    // 2. AI 幻境原画（cover 铺满，视差 0.12）
    if (this.texReady) {
      const img = this.tex;
      const scale = Math.max(w / img.width, h * 0.9 / img.height);
      const dw = img.width * scale, dh = img.height * scale;
      const offX = -(camX * 0.12) % dw;
      ctx.globalAlpha = 0.96;
      for (let x = offX - dw; x < w + dw; x += dw) {
        ctx.drawImage(img, x, h * 0.72 - dh + 40, dw, dh);
      }
      ctx.globalAlpha = 1;
    }
    // 3-4. 剪影层：AI 原画自带纵深时只需底部薄雾；无原画(降级)时用剪影山撑场景
    if (this.texReady) {
      const mist = ctx.createLinearGradient(0, h * 0.52, 0, h * 0.74);
      mist.addColorStop(0, 'rgba(240,238,244,0)');
      mist.addColorStop(1, cfg.mistColor || 'rgba(235,232,240,0.5)');
      ctx.fillStyle = mist;
      ctx.fillRect(0, h * 0.52, w, h * 0.22);
    } else {
      this._drawStrip(ctx, this._midStrip, h * 0.72, camX * 0.35, w);
      this._drawStrip(ctx, this._nearStrip, h * 0.72 + 10, camX * 0.55, w);
    }
    // 5. 环境粒子
    this._drawAmbient(ctx, w, h);
    ctx.restore();
  }

  _drawStrip(ctx, strip, baseY, offset, w) {
    if (!strip) return;
    const sw = strip.width, sh = strip.height;
    const off = -offset % sw;
    for (let x = off - sw; x < w + sw; x += sw) {
      ctx.drawImage(strip, x, baseY - sh + 6);
    }
  }

  _drawAmbient(ctx, w, h) {
    if (!this.ambient) return;
    const { list, type, color } = this.ambient;
    const dt = 1 / 60;
    ctx.save();
    if (type !== 'rain' && type !== 'miasma') ctx.globalCompositeOperation = 'lighter';
    if (type === 'miasma') ctx.globalAlpha = 0.3;
    const col = typeof color === 'number' ? '#' + color.toString(16).padStart(6, '0') : (color || '#ffffff');
    ctx.fillStyle = col;
    for (const p of list) {
      p.x += p.v.x * dt * 8; p.y += p.v.y * dt * 8;
      if (type === 'petal' || type === 'leaf') p.x += Math.sin(p.y * 9 + p.tw) * 0.0008;
      if (p.y > 1.05) { p.y = -0.05; p.x = Math.random(); }
      if (p.y < -0.05) { p.y = 1.05; p.x = Math.random(); }
      if (p.x > 1.05) p.x -= 1.1;
      if (p.x < -0.05) p.x += 1.1;
      const px = p.x * w, py = p.y * h * 0.75;
      if (type === 'rain') {
        ctx.strokeStyle = col; ctx.globalAlpha = 0.35; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + p.v.x * 20, py + p.v.y * 20); ctx.stroke();
      } else {
        const tw = 0.6 + Math.sin(performance.now() / 300 + p.tw) * 0.4;
        ctx.globalAlpha = (type === 'miasma' ? 0.22 : 0.75) * tw;
        ctx.beginPath(); ctx.arc(px, py, p.size, 0, 7); ctx.fill();
      }
    }
    ctx.restore();
  }
}
