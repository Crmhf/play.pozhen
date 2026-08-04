// 关卡导演：波次编排 + 锁屏推进 + 镜头 + 投射物 + 掉落 + 地面渲染
import { clamp, rand } from '../engine/utils.js';
import { feel } from '../engine/shake.js';
import { audio } from '../engine/audio.js';
import { particles } from '../engine/particles.js';
import { Enemy } from './enemy.js';
import { Boss } from './boss.js';
import { MONSTER_MAP } from '../data/monsters.js';
import { BOSS_MAP } from '../data/bosses.js';
import { shade } from '../engine/sprite.js';

const VIEW_W = () => innerWidth;
const GROUND_Y = 0; // 地面像素 y（世界坐标，向下为正；物理层内部取反）

export class Level {
  constructor(game, levelData, levelIndex) {
    this.game = game;
    this.data = levelData;
    this.index = levelIndex;
    this.length = levelData.length;
    this.waveIdx = -1;
    this.phase = 'march';        // march | wave | boss_gate | boss | clear
    this.boss = null;
    this.camera = { x: 0, targetX: 0 };
    this.camL = 0;               // 镜头左缘（死区卷轴）
    this.lockLeft = 0;           // 锁屏左边界
    this.projectiles = [];
    this.pickups = [];
    this.walls = [];
    this.time = 0;
    // 波次触发点：均匀分布在关卡中段，末尾留 Boss 区
    const n = levelData.waves.length;
    const start = 900, end = this.length - 1300;
    this.waveGates = levelData.waves.map((w, i) => start + (end - start) * (n === 1 ? 0 : i / (n - 1)));
    this.bossGateX = this.length - 950;
  }

  setup() {
    const phys = this.game.phys;
    // 地面：一条长静态体（物理 y 向上为正，地面顶面在 y=0 像素 → 物理 0）
    this.groundBody = phys.addGround(this.length / 2, 30, this.length + 2000, 60);
    // 起点左墙（防止掉出世界）
    phys.addWall(-60, -300, 800);
    // 终点右墙
    phys.addWall(this.length + 60, -300, 800);
  }

  // ---------- 刷怪 ----------
  spawnWave(i) {
    const w = this.data.waves[i];
    const p = this.game.player;
    w.mobs.forEach((id, k) => {
      // 近身包夹：前方(右侧)为主 140~360px，远程兵放远端
      const def = MONSTER_MAP[id];
      const isRanged = def.ai === 'archer' || def.ai === 'caster';
      const side = k % 3 === 2 ? -1 : 1; // 2/3 从正面杀出
      const dist = isRanged ? rand(280, 420) : rand(140, 280);
      const x = clamp(p.x + side * dist + rand(-30, 30), this.camL + 60, this.camL + VIEW_W() - 80);
      this.game.spawnEnemy(id, x, w.elite);
    });
    this.game.ui.showToast(`第 ${i + 1} 波敌军杀到！`);
    audio.play('drum_roll');
  }

  spawnBoss() {
    const def = BOSS_MAP[this.data.boss];
    const bx = this.camL + VIEW_W() * 0.72;
    this.boss = new Boss(def, this.game.phys, this.game, { x: bx, level: this.index + 1 });
    this.game.enemies.push(this.boss);
    // 双 Boss（颜良文丑）
    if (def.second) {
      const d2 = { ...def, ...def.second, palette: def.second.palette, second: null, name: def.second.name };
      const b2 = new Boss(d2, this.game.phys, this.game, { x: bx + 160, level: this.index + 1 });
      b2.name = def.second.name;
      this.game.enemies.push(b2);
      this.boss.partner = b2;
    }
    audio.play('boss_roar');
    audio.playBgm('boss');
    feel.shake(0.4);
    this.game.vfx.play('boss_come', this.boss.x, this.boss.y - 60, { scale: 2, fps: 18, once: false });
    this.game.ui.showBossBanner(def.name, def.title);
    this.game.ui.showBossBar(def.name);
  }

  // ---------- 主更新 ----------
  update(dt) {
    this.time += dt;
    const g = this.game, p = g.player;
    const viewW = VIEW_W();
    if (this.phase === 'march') {
      // 经典横版卷轴（死区）：主角越过屏幕 55% 才向前卷轴，锚定 40%；回退过 25% 才向后
      const fwdLine = this.camL + viewW * 0.55;
      const backLine = this.camL + viewW * 0.25;
      if (p.x > fwdLine) this.camL = p.x - viewW * 0.4;
      else if (p.x < backLine) this.camL = p.x - viewW * 0.25;
      this.camL = clamp(this.camL, 0, Math.max(0, this.length - viewW + 200));
      this.camera.targetX = this.camL + viewW / 2;
      // 触发波次
      if (this.waveIdx + 1 < this.waveGates.length && p.x >= this.waveGates[this.waveIdx + 1]) {
        this.waveIdx++;
        this.phase = 'wave';
        this.lockLeft = this.camL + viewW * 0.08;
        this.spawnWave(this.waveIdx);
      } else if (p.x >= this.bossGateX && this.waveIdx === this.waveGates.length - 1) {
        this.phase = 'boss';
        this.lockLeft = this.camL + viewW * 0.08;
        this.spawnBoss();
      }
    } else if (this.phase === 'wave' || this.phase === 'boss') {
      // 锁屏：玩家不得离开 [lockLeft, lockLeft+viewW]
      const minX = this.lockLeft + 30, maxX = this.lockLeft + viewW - 30;
      if (p.x < minX) { g.phys.setPos(p.body, minX, g.phys.getPos(p.body).y); }
      if (p.x > maxX) { g.phys.setPos(p.body, maxX, g.phys.getPos(p.body).y); }
      // 敌军同样限制在交战区内；被击飞出场外的散兵 2.5s 后拉回，防卡关
      for (const e of g.enemies) {
        if (!e.alive) continue;
        const out = e.x < minX - 80 || e.x > maxX + 80;
        if (out) {
          e._outT = (e._outT || 0) + dt;
          if (e._outT > 2.5) {
            const tx = clamp(e.x, minX + 60, maxX - 60);
            g.phys.setPos(e.body, tx, g.phys.getPos(e.body).y);
            e.x = tx; e._outT = 0;
          }
        } else {
          e._outT = 0;
          if (e.x < minX) g.phys.setPos(e.body, minX, g.phys.getPos(e.body).y);
          if (e.x > maxX) g.phys.setPos(e.body, maxX, g.phys.getPos(e.body).y);
        }
      }
      this.camera.targetX = this.lockLeft + viewW / 2;
      // 清波判定
      const aliveMobs = g.enemies.filter(e => e.alive && !e.isBoss);
      if (this.phase === 'wave' && aliveMobs.length === 0) {
        this.phase = 'march';
        g.ui.showToast(this.waveIdx + 1 >= this.waveGates.length ? '敌阵已破，直取主将！' : '通路已开，继续前进！');
        audio.play('gong');
        p.heal(p.maxHp * 0.08);
      }
    } else if (this.phase === 'clear') {
      // 破阵后自由卷轴（同死区逻辑）
      const fwdLine = this.camL + viewW * 0.55;
      const backLine = this.camL + viewW * 0.25;
      if (p.x > fwdLine) this.camL = p.x - viewW * 0.4;
      else if (p.x < backLine) this.camL = p.x - viewW * 0.25;
      this.camL = clamp(this.camL, 0, Math.max(0, this.length - viewW + 200));
      this.camera.targetX = this.camL + viewW / 2;
    }
    this.camera.targetX = clamp(this.camera.targetX, viewW / 2, this.length - viewW / 2 + 200);
    // 平滑跟随（阻尼弹簧）
    this.camera.x += (this.camera.targetX - this.camera.x) * Math.min(1, dt * 4);
  }

  onBossDead() {
    this.phase = 'clear';
    audio.playBgm('victory');
    this.game.ui.hideBossBar();
  }

  // ---------- 投射物 ----------
  spawnProjectile(src, kind, opt = {}) {
    const p = this.game.player;
    const dir = src.x !== undefined ? Math.sign(p.x - src.x || 1) : 1;
    const defs = {
      arrow: { speed: 460, dmg: src.atk, color: '#d8c8a0', size: 3, grav: 0 },
      stone: { speed: 340, dmg: src.atk, color: '#9a9088', size: 7, grav: 500 },
      poison: { speed: 380, dmg: src.atk, color: '#7ac84a', size: 4, grav: 0, vfx: 'fly_poison' },
      fireball: { speed: 320, dmg: src.atk, color: '#ff8830', size: 8, grav: 0, vfx: 'fly_fire' },
      curse: { speed: 280, dmg: src.atk, color: '#a86ad8', size: 6, grav: 0 },
      firepot: { speed: 300, dmg: src.atk, color: '#ff6820', size: 6, grav: 600, explode: 80 },
      puppet: { speed: 260, dmg: src.atk, color: '#c8a8e8', size: 6, grav: 0 },
      crow: { speed: 380, dmg: src.atk, color: '#4a3a6a', size: 7, grav: 0, homing: 1.5 },
      arrow_fall: { speed: 0, dmg: src.atk, color: '#d8c8a0', size: 3, grav: 900, vy: 0 },
    };
    const d = defs[kind] || defs.arrow;
    this.projectiles.push({
      ...d, kind,
      x: opt.tx ?? src.x + dir * 20, y: src.y - 36,
      vx: opt.tx !== undefined ? 0 : dir * d.speed,
      vy: d.vy ?? (kind === 'arrow' ? rand(-20, 20) : 0),
      homing: opt.homing || d.homing || 0,
      life: 4, src,
    });
  }

  updateProjectiles(dt) {
    const p = this.game.player;
    for (const pr of this.projectiles) {
      pr.life -= dt;
      pr.vy += pr.grav * dt;
      if (pr.homing > 0) { // 追踪
        const dx = p.x - pr.x, dy = (p.y - 34) - pr.y;
        const l = Math.hypot(dx, dy) || 1;
        pr.vx += dx / l * pr.homing * 300 * dt;
        pr.vy += dy / l * pr.homing * 300 * dt;
        const sp = Math.hypot(pr.vx, pr.vy), max = pr.speed;
        if (sp > max) { pr.vx *= max / sp; pr.vy *= max / sp; }
      }
      pr.x += pr.vx * dt; pr.y += pr.vy * dt;
      // 命中玩家
      if (Math.abs(p.x - pr.x) < 26 && Math.abs((p.y - 30) - pr.y) < 40) {
        p.takeHit(pr.dmg, pr.src.x, { knock: 140 });
        pr.life = 0;
        if (pr.explode) this.game.combat.explode(pr.x, pr.y, pr.explode, pr.dmg, pr.src);
      }
      // 落地
      if (pr.y >= GROUND_Y - 2) {
        if (pr.explode) this.game.combat.explode(pr.x, pr.y, pr.explode, pr.dmg, pr.src);
        else particles.emit({ x: pr.x, y: pr.y, vrand: 40, life: 0.3, size: 3, color: pr.color, glow: false }, 4);
        pr.life = 0;
      }
    }
    this.projectiles = this.projectiles.filter(pr => pr.life > 0 && pr.x > -200 && pr.x < this.length + 400);
  }

  drawProjectiles(ctx, camX, camY) {
    for (const pr of this.projectiles) {
      ctx.save();
      ctx.translate(pr.x - camX, pr.y - camY);
      if (pr.kind === 'arrow' || pr.kind === 'arrow_fall') {
        ctx.rotate(Math.atan2(pr.vy, pr.vx || 0.01));
        ctx.strokeStyle = pr.color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(6, 0); ctx.stroke();
        ctx.fillStyle = '#eee'; ctx.fillRect(5, -1.5, 4, 3);
      } else {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = pr.color;
        ctx.beginPath(); ctx.arc(0, 0, pr.size, 0, 7); ctx.fill();
        ctx.globalAlpha = 0.4;
        ctx.beginPath(); ctx.arc(0, 0, pr.size * 2, 0, 7); ctx.fill();
      }
      ctx.restore();
    }
  }

  // ---------- 掉落 ----------
  spawnPickup(x, type) {
    this.pickups.push({ x, y: -30, vy: -200, type, t: 0 });
  }
  updatePickups(dt) {
    const p = this.game.player;
    for (const pk of this.pickups) {
      pk.t += dt; pk.vy += 700 * dt;
      pk.y += pk.vy * dt;
      if (pk.y > -14) { pk.y = -14; pk.vy = 0; }
      if (Math.abs(p.x - pk.x) < 30 && Math.abs(p.y - pk.y) < 50) {
        if (pk.type === 'rice') p.heal(p.maxHp * 0.15);
        else { p.addRage(20); audio.play('pickup'); }
        pk.t = 99;
      }
    }
    this.pickups = this.pickups.filter(pk => pk.t < 20);
  }
  drawPickups(ctx, camX, camY) {
    for (const pk of this.pickups) {
      const x = pk.x - camX, y = pk.y - camY + Math.sin(pk.t * 4) * 3;
      ctx.save();
      ctx.translate(x, y);
      if (pk.type === 'rice') { // 军粮
        ctx.fillStyle = '#e8d8a8';
        ctx.beginPath(); ctx.arc(0, -4, 7, 0, 7); ctx.fill();
        ctx.fillStyle = '#8a6a30'; ctx.fillRect(-5, 2, 10, 4);
      } else { // 战意
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = '#e8890c';
        ctx.beginPath(); ctx.arc(0, 0, 6 + Math.sin(pk.t * 8) * 1.5, 0, 7); ctx.fill();
      }
      ctx.restore();
    }
  }

  // ---------- 地面/前景渲染 ----------
  drawGround(ctx, camX, camY, w, h) {
    const sc = this.data.scene;
    const gy = GROUND_Y - camY;
    // 主地面
    ctx.fillStyle = sc.ground;
    ctx.fillRect(0, gy, w, h - gy);
    // 地表草色带
    ctx.fillStyle = sc.grass;
    ctx.fillRect(0, gy, w, 8);
    // 水墨笔触地表纹理（滚动）
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = shade(sc.ground, -18);
    const off = -(camX * 0.98) % 160;
    for (let x = off - 160; x < w + 160; x += 160) {
      ctx.beginPath();
      ctx.ellipse(x + 80, gy + 26, 60, 8, 0, 0, 7);
      ctx.fill();
    }
    ctx.restore();
    // 远景界碑/旗杆点缀（视差 0.7）
    ctx.save();
    ctx.globalAlpha = 0.7;
    const off2 = -(camX * 0.7) % 480;
    for (let x = off2 - 480; x < w + 480; x += 480) {
      ctx.strokeStyle = shade(sc.ground, -30);
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(x + 60, gy); ctx.lineTo(x + 60, gy - 70); ctx.stroke();
      ctx.fillStyle = '#a03028';
      ctx.beginPath(); ctx.moveTo(x + 60, gy - 70); ctx.lineTo(x + 96, gy - 62); ctx.lineTo(x + 60, gy - 52); ctx.fill();
    }
    ctx.restore();
  }
}
