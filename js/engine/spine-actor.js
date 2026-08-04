// Spine 骨骼动画接入层（spine-canvas 3.8，已 vendor 到 js/vendor/spine-canvas.js）
// 将 .skel/.atlas/.png 渲染到我们的 2D 游戏画布上
const PENDING = new Map();

export class SpineActor {
  /**
   * @param basePath 形如 'assets/spine/tanjiro/'
   * @param scale 渲染缩放（角色在 spine 中通常较大）
   */
  constructor(basePath, scale = 0.45) {
    this.base = basePath;
    this.scale = scale;
    this.ready = false;
    this.anims = {};        // 语义名 -> spine 动画名
    this.current = null;
    this.time = 0;
  }

  async load() {
    if (PENDING.has(this.base)) { const a = await PENDING.get(this.base); Object.assign(this, a); return; }
    const job = this._doLoad();
    PENDING.set(this.base, job);
    const a = await job;
    Object.assign(this, a);
  }

  async _doLoad() {
    if (!window.spine) return { ready: false };
    const sp = window.spine;
    const am = new sp.canvas.AssetManager(this.base);
    am.loadTextureAtlas('skeleton.atlas');
    am.loadBinary('skeleton.skel');
    await new Promise((res, rej) => {
      const t0 = performance.now();
      const tick = () => {
        if (am.isLoadingComplete()) return res();
        if (performance.now() - t0 > 20000) return rej(new Error('spine load timeout'));
        setTimeout(tick, 60);
      };
      tick();
    });
    const atlas = am.get('skeleton.atlas'); // loadTextureAtlas 直接存 TextureAtlas 实例
    const loader = new sp.AtlasAttachmentLoader(atlas);
    const binary = new sp.SkeletonBinary(loader);
    const data = binary.readSkeletonData(am.get('skeleton.skel'));
    const skeleton = new sp.Skeleton(data);
    const stateData = new sp.AnimationStateData(data);
    const state = new sp.AnimationState(stateData);
    // 语义动画映射（素材实际动画名：idle/run/atk1-3/skill_a/skill_b/hit/die/fly/down）
    const names = data.animations.map(a => a.name);
    const find = (...keys) => {
      for (const k of keys) {
        const hit = names.find(n => n.toLowerCase() === k) || names.find(n => n.toLowerCase().includes(k));
        if (hit) return hit;
      }
      return null;
    };
    const anims = {
      idle: find('idle', 'rest') || names[0],
      walk: find('run', 'walk') || names[0],
      atk1: find('atk1', 'attack', 'zatk') || names[0],
      atk2: find('atk2') || find('atk1') || names[0],
      atk3: find('atk3') || find('atk1') || names[0],
      skill: find('skill_a', 'skill') || find('atk2') || names[0],
      ult: find('skill_b') || find('skill_a') || names[0],
      hurt: find('hit', 'hurt') || names[0],
      death: find('die', 'death', 'down') || names[0],
      jump: find('jump') || find('idle') || names[0], // fly 是击飞横躺姿势，跳跃不可用
    };
    // 调试：暴露动画清单
    (window.__spineAnims = window.__spineAnims || {})[this.base] = names;
    return { ready: true, skeleton, state, anims, data };
  }

  /** 切换动画（相同不重复设置） */
  play(semantic, { loop = true, timeScale = 1 } = {}) {
    if (!this.ready) return;
    const name = this.anims[semantic] || this.anims.idle;
    if (this.current === name && loop) { this.state.tracks[0].timeScale = timeScale; return; }
    this.current = name;
    const entry = this.state.setAnimation(0, name, loop);
    entry.timeScale = timeScale;
  }

  update(dt) {
    if (!this.ready) return;
    this.state.update(dt);
    this.state.apply(this.skeleton);
  }

  /** 渲染到游戏画布：x,y 为脚底世界坐标（y 向下正） */
  draw(ctx, x, y, dir = 1, scaleMul = 1) {
    if (!this.ready) return;
    const s = this.scale * scaleMul;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir * s, -s); // spine y 向上
    this.skeleton.updateWorldTransform();
    if (!this._renderer) {
      this._renderer = new window.spine.canvas.SkeletonRenderer(ctx);
      this._renderer.triangleRendering = true; // 网格附件角色必须开三角渲染
    }
    this._renderer.ctx = ctx;
    this._renderer.draw(this.skeleton);
    ctx.restore();
  }

  /** 静态预览（选将卡片）：渲染 idle 一帧，脚底锚定 + 固定缩放 */
  drawPreview(canvas, t = 0.6) {
    if (!this.ready) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.play('idle', { loop: true });
    this.state.update(t);
    this.state.apply(this.skeleton);
    this.skeleton.updateWorldTransform();
    const s = 0.31;
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height * 0.97);
    ctx.scale(s, -s);
    const r = new window.spine.canvas.SkeletonRenderer(ctx);
    r.triangleRendering = true;
    r.draw(this.skeleton);
    ctx.restore();
  }

  _bounds() {
    const sk = this.skeleton;
    const offset = new window.spine.Vector2(), size = new window.spine.Vector2();
    try { sk.getBounds(offset, size); } catch (e) { return { w: 100, h: 200, cx: 0 }; }
    return { w: size.x, h: size.y, cx: offset.x + size.x / 2 };
  }
}
