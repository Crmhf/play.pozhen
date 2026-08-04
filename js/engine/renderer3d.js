// Three.js 3D 背景层：多层视差平面 + 雾 + 天光 + 环境粒子（余烬/落英/尘埃/雨）
// 混合渲染方案：3D 背景层 + Canvas 2D 游戏层叠加
import { rand, clamp } from './utils.js';

export class Renderer3D {
  constructor(canvas) {
    this.ok = !!window.THREE;
    if (!this.ok) return;
    const T = window.THREE;
    this.T = T;
    this.renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.scene = new T.Scene();
    this.camera = new T.PerspectiveCamera(50, 1, 0.1, 400);
    this.camera.position.set(0, 2, 24);
    this.scene.fog = new T.Fog(0x1a1a22, 18, 120);
    this.layers = [];       // 视差层 {mesh, factor, baseY}
    this.ambient = null;    // 环境粒子 Points
    this.tint = new T.Color(0xffffff);
    this._setupLights();
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  _setupLights() {
    const T = this.T;
    this.sun = new T.DirectionalLight(0xffeedd, 1.1);
    this.sun.position.set(-10, 20, 10);
    this.scene.add(this.sun);
    this.scene.add(new T.AmbientLight(0x8899bb, 0.6));
  }

  resize() {
    if (!this.ok) return;
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** 程序化水墨远山纹理（AI 背景缺失时的降级） */
  _inkMountainsTexture(hue1, hue2, seed = 1) {
    const T = this.T;
    const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, hue1); g.addColorStop(1, hue2);
    x.fillStyle = g; x.fillRect(0, 0, 1024, 512);
    let s = seed;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let layer = 0; layer < 4; layer++) {
      const yBase = 200 + layer * 70, amp = 90 - layer * 16;
      x.fillStyle = `rgba(20,22,30,${0.14 + layer * 0.2})`;
      x.beginPath(); x.moveTo(0, 512);
      let px = 0;
      while (px <= 1024) {
        const peakY = yBase - rnd() * amp;
        const w = 90 + rnd() * 160;
        x.quadraticCurveTo(px + w / 2, peakY, px + w, yBase + rnd() * 26 - 13);
        px += w;
      }
      x.lineTo(1024, 512); x.closePath(); x.fill();
    }
    const tex = new T.CanvasTexture(c);
    tex.wrapS = T.RepeatWrapping;
    return tex;
  }

  /** 加载 AI 背景图，失败返回 null */
  _loadTex(url) {
    return new Promise(res => {
      new this.T.TextureLoader().load(url,
        t => { t.colorSpace = this.T.SRGBColorSpace; res(t); },
        undefined, () => res(null));
    });
  }

  /**
   * 构建关卡背景
   * cfg: {texUrl, skyTop, skyBottom, fog, sun, ambient:{type:'ember'|'petal'|'rain'|'snow'|'dust'|'leaf'|'miasma', color}, tintHex}
   */
  async buildLevel(cfg) {
    if (!this.ok) return;
    const T = this.T;
    // 清空旧层
    for (const l of this.layers) { this.scene.remove(l.mesh); l.mesh.geometry.dispose(); }
    this.layers = [];
    if (this.ambient) { this.scene.remove(this.ambient.points); this.ambient = null; }

    this.scene.fog.color.set(cfg.fog || 0x1a1a22);
    this.scene.background = new T.Color(cfg.skyTop || 0x1a1a22);
    this.sun.color.set(cfg.sun || 0xffeedd);
    this.sun.intensity = cfg.sunIntensity ?? 1.1;

    // 远景：AI 原画或程序化远山
    let farTex = cfg.texUrl ? await this._loadTex(cfg.texUrl) : null;
    if (!farTex) farTex = this._inkMountainsTexture(cfg.skyTop || '#2a3040', cfg.skyBottom || '#12141c', cfg.seed || 7);
    const far = new T.Mesh(
      new T.PlaneGeometry(240, 80),
      new T.MeshBasicMaterial({ map: farTex, fog: false })
    );
    far.position.set(0, 12, -60);
    this.scene.add(far);
    this.layers.push({ mesh: far, factor: 0.12, baseY: 12 });

    // 中景：剪影山峦（半透明深色平面）
    const midTex = this._inkMountainsTexture('#00000000', '#00000000', (cfg.seed || 7) + 31);
    const mid = new T.Mesh(
      new T.PlaneGeometry(200, 44),
      new T.MeshBasicMaterial({ map: midTex, transparent: true, opacity: 0.85 })
    );
    mid.position.set(0, 0, -32);
    this.scene.add(mid);
    this.layers.push({ mesh: mid, factor: 0.35, baseY: 0 });

    // 近景：底部雾霭带
    const mist = new T.Mesh(
      new T.PlaneGeometry(220, 10),
      new T.MeshBasicMaterial({ color: cfg.fog || 0x1a1a22, transparent: true, opacity: 0.55 })
    );
    mist.position.set(0, -13, -12);
    this.scene.add(mist);
    this.layers.push({ mesh: mist, factor: 0.6, baseY: -13 });

    this._buildAmbient(cfg.ambient || { type: 'dust', color: 0xcfc5a8 });
  }

  _buildAmbient(a) {
    const T = this.T, N = 260;
    const pos = new Float32Array(N * 3), vel = [];
    for (let i = 0; i < N; i++) {
      pos[i * 3] = rand(-70, 70); pos[i * 3 + 1] = rand(-14, 26); pos[i * 3 + 2] = rand(-30, 6);
      vel.push(this._ambientVel(a.type));
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    const sprite = this._dotTexture(a.color);
    const mat = new T.PointsMaterial({
      size: a.type === 'rain' ? 0.5 : 0.9, map: sprite, transparent: true,
      opacity: a.type === 'miasma' ? 0.35 : 0.75, depthWrite: false,
      blending: a.type === 'rain' ? T.NormalBlending : T.AdditiveBlending,
      color: a.color || 0xffffff,
    });
    const points = new T.Points(geo, mat);
    this.scene.add(points);
    this.ambient = { points, vel, type: a.type, N };
  }
  _ambientVel(type) {
    switch (type) {
      case 'ember': return { x: rand(-0.4, 0.9), y: rand(0.6, 1.8) };
      case 'rain': return { x: rand(-2.5, -1.5), y: rand(-26, -20) };
      case 'snow': return { x: rand(-0.6, 0.6), y: rand(-1.6, -0.8) };
      case 'petal': case 'leaf': return { x: rand(-1.6, -0.6), y: rand(-0.7, -0.2) };
      case 'miasma': return { x: rand(-0.25, 0.25), y: rand(-0.1, 0.25) };
      default: return { x: rand(-0.3, 0.3), y: rand(-0.15, 0.3) }; // dust
    }
  }
  _dotTexture() {
    const T = this.T;
    if (this._dot) return this._dot;
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 32, 32);
    this._dot = new T.CanvasTexture(c);
    return this._dot;
  }

  /** camX: 游戏镜头像素位置 -> 视差 */
  update(dt, camX, shake) {
    if (!this.ok) return;
    const wx = camX / 30;
    this.camera.position.x = wx * 0.85 + (shake ? shake.x * 0.03 : 0);
    this.camera.position.y = 2 + (shake ? shake.y * 0.02 : 0);
    if (shake) this.camera.rotation.z = shake.rot * 0.5;
    for (const l of this.layers) {
      l.mesh.position.x = this.camera.position.x * (1 - l.factor) + wx * l.factor * 0.2;
    }
    const amb = this.ambient;
    if (amb) {
      const p = amb.points.geometry.attributes.position.array;
      for (let i = 0; i < amb.N; i++) {
        const v = amb.vel[i];
        p[i * 3] += v.x * dt; p[i * 3 + 1] += v.y * dt;
        if (amb.type === 'petal' || amb.type === 'leaf') p[i * 3] += Math.sin(p[i * 3 + 1] * 0.8 + i) * dt * 1.2;
        if (p[i * 3 + 1] < -16) { p[i * 3 + 1] = 26; p[i * 3] = this.camera.position.x + rand(-70, 70); }
        if (p[i * 3 + 1] > 28) p[i * 3 + 1] = -15;
        if (p[i * 3] < this.camera.position.x - 75) p[i * 3] += 150;
        if (p[i * 3] > this.camera.position.x + 75) p[i * 3] -= 150;
      }
      amb.points.geometry.attributes.position.needsUpdate = true;
    }
    this.renderer.render(this.scene, this.camera);
  }
}
