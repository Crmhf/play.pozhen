// Spine 骨骼动画接入层（spine-canvas 3.8，已 vendor 到 js/vendor/spine-canvas.js）
// 支持两类素材：
//  A) 鬼灭角色：skeleton.skel 二进制 + skeleton.atlas
//  B) Q版怪物：<id>.json(3.5已转3.8) + <id>.atlas + <id>.png
const PENDING = new Map();

export class SpineActor {
  /**
   * @param basePath 形如 'assets/spine/tanjiro/' 或 'assets/spine-mobs/guaiA1a/'
   * @param scale 渲染缩放
   * @param opts { mobId?: string, minY?: number } mobId 用于推断文件名；minY 脚底偏移
   */
  constructor(basePath, scale = 0.45, opts = {}) {
    this.base = basePath;
    this.scale = scale;
    this.mobId = opts.mobId || null;
    this.targetPx = opts.targetPx || 0; // 怪物目标像素高（加载后按实测包围盒反算 scale）
    this.minY = opts.minY || 0;   // 怪物模型中心原点 → 脚底偏移
    this.ready = false;
    this.anims = {};
    this.current = null;
    this.time = 0;
  }

  async load() {
    if (!window.spine) return;
    // 缓存只存 SkeletonData + 动画映射（不可变，可共享）；每实例独立 Skeleton/AnimationState
    if (!PENDING.has(this.base)) PENDING.set(this.base, this._loadData());
    const { data, anims } = await PENDING.get(this.base);
    const sp = window.spine;
    this.data = data;
    this.anims = anims;
    this.skeleton = new sp.Skeleton(data);
    this.skeleton.setToSetupPose();
    this.skeleton.updateWorldTransform();
    // 运行时实测包围盒（mesh 附件在离线清单里量不准）：怪物按目标像素高反算缩放
    if (this.mobId && this.targetPx) {
      try {
        const off = new sp.Vector2(), size = new sp.Vector2();
        this.skeleton.getBounds(off, size);
        if (size.y > 10) {
          this.scale = this.targetPx / size.y;
          this.minY = off.y;
        }
      } catch (e) { /* 用 manifest 预估值 */ }
    }
    this.state = new sp.AnimationState(new sp.AnimationStateData(data));
    this.ready = true;
  }

  async _loadData() {
    const sp = window.spine;
    const am = new sp.canvas.AssetManager(this.base);
    let atlasPath, dataPath, isJson;
    if (this.mobId) {
      // 部分素材只有 <id>Texture.atlas 命名：先探测
      const plain = `${this.mobId}.atlas`;
      const texed = `${this.mobId}Texture.atlas`;
      atlasPath = await fetch(this.base + plain, { method: 'HEAD' }).then(r => r.ok ? plain : texed).catch(() => texed);
      dataPath = `${this.mobId}.json`;
      isJson = true;
    } else {
      atlasPath = 'skeleton.atlas';
      dataPath = 'skeleton.skel';
      isJson = false;
    }
    am.loadTextureAtlas(atlasPath);
    if (isJson) am.loadText(dataPath); else am.loadBinary(dataPath);
    await new Promise((res, rej) => {
      const t0 = performance.now();
      const tick = () => {
        if (am.isLoadingComplete()) return res();
        if (performance.now() - t0 > 20000) return rej(new Error('spine load timeout'));
        setTimeout(tick, 60);
      };
      tick();
    });
    const atlas = am.get(atlasPath); // loadTextureAtlas 直接存 TextureAtlas 实例
    const loader = new sp.AtlasAttachmentLoader(atlas);
    const data = isJson
      ? new sp.SkeletonJson(loader).readSkeletonData(am.get(dataPath))
      : new sp.SkeletonBinary(loader).readSkeletonData(am.get(dataPath));
    // 语义动画映射（素材实际动画名：idle/run/atk1-3/skill_a/skill_b/hit/die/fly/down）
    const names = data.animations.map(a => a.name);
    const find = (...keys) => {
      for (const k of keys) {
        const hit = names.find(n => n.toLowerCase() === k) || names.find(n => n.toLowerCase().includes(k));
        if (hit) return hit;
      }
      return null;
    };
    const isMob = !!this.mobId;
    const anims = isMob ? {
      // 怪物语义：std/walk/atk/jifei
      idle: find('std', 'idle') || names[0],
      walk: find('walk', 'run') || names[0],
      atk1: find('atk', 'attack') || names[0],
      atk2: find('atk') || names[0],
      atk3: find('atk') || names[0],
      skill: find('atk') || names[0],
      ult: find('atk') || names[0],
      hurt: find('jifei', 'hit') || names[0],
      death: find('jifei', 'die') || names[0],
      jump: find('std') || names[0],
    } : {
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
    return { data, anims };
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
  draw(ctx, x, y, dir = 1, scaleMul = 1, alpha = 1) {
    if (!this.ready) return;
    const s = this.scale * scaleMul;
    ctx.save();
    if (alpha < 1) ctx.globalAlpha = alpha;
    // 怪物模型原点在中心：把 minY（脚底，负值）锚到 y
    ctx.translate(x, y + this.minY * s);
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
    ctx.translate(canvas.width / 2, canvas.height * 0.97 + this.minY * s);
    ctx.scale(s, -s);
    const r = new window.spine.canvas.SkeletonRenderer(ctx);
    r.triangleRendering = true;
    r.draw(this.skeleton);
    ctx.restore();
  }
}
