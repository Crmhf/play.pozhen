// 敌军 AI：状态机 + 战术轮盘（围拢/绕后/抢攻）+ 攻击令牌（Combat Director 发牌）
// 兵种行为：melee/tank/charger/archer/caster/bomber
import { StateMachine, KEEP, clamp, rand } from '../engine/utils.js?v=1785962621';
import { feel } from '../engine/shake.js?v=1785962621';
import { audio } from '../engine/audio.js?v=1785962621';
import { particles } from '../engine/particles.js?v=1785962621';
import { InkWarrior, shade } from '../engine/sprite.js?v=1785962621';
import { SpineActor } from '../engine/spine-actor.js?v=1785962621';
import { MOB_MANIFEST } from '../data/mobmanifest.js?v=1785962621';

export const EST = {
  SPAWN: 'SPAWN', IDLE: 'IDLE', MOVE: 'MOVE', WINDUP: 'WINDUP', ATTACK: 'ATTACK',
  RECOVER: 'RECOVER', HURT: 'HURT', LAUNCHED: 'LAUNCHED', DEAD: 'DEAD', BLOCK: 'BLOCK',
};
const HITABLE = [EST.IDLE, EST.MOVE, EST.WINDUP, EST.ATTACK, EST.RECOVER, EST.BLOCK, EST.LAUNCHED];

let enemySeq = 0;

export class Enemy {
  constructor(def, physics, game, { x, elite = false, level = 1 } = {}) {
    this.id = ++enemySeq;
    this.def = def;
    this.game = game;
    this.phys = physics;
    this.elite = elite;
    const mul = (elite ? 1.6 : 1) * (1 + (level - 1) * 0.08);
    this.maxHp = def.hp * mul; this.hp = this.maxHp;
    // 伤害随关卡爬坡：L1 只有 68%，L10 达 140%（前期宽容，后期凶残）
    const dmgScale = (0.72 + 0.08 * level) * (elite ? 1.2 : 1);
    this.atk = def.atk * dmgScale;
    this.x = x; this.y = 0; this.dir = -1;
    this.alive = true;
    this.body = physics.addCharacter(x, -60, 24 * def.bulk, 52 * def.scale, { type: 'enemy', ref: this });
    this.fsm = new StateMachine(this, EST.SPAWN);
    this.animT = rand(0, 10); this.hurtT = 0; this.flashT = 0; this.freezeT = 0;
    this.atkTimer = rand(0.3, 1.2);       // 攻击间隔
    this.tacticT = 0; this.tactic = 'engage';
    this.hasToken = false;                 // 攻击令牌
    this.blockT = 0;
    this.zOffset = rand(-8, 8);            // 站位错层
    this.palette = elite ? { ...def.palette, trim: '#e04030', cloth: shade(def.palette.cloth, -14) } : def.palette;
    this.warrior = new InkWarrior(this.palette, { weapon: def.weapon, bulk: def.bulk, hat: def.hat, scale: def.scale });
    // Q版 Spine 骨骼模型（与主角同级建模）
    this.spineActor = null;
    if (def.spineMob && MOB_MANIFEST[def.spineMob]) {
      const mm = MOB_MANIFEST[def.spineMob];
      const targetPx = (def.mobPx || 85) * (elite ? 1.15 : 1);
      this.spineActor = new SpineActor(`assets/spine-mobs/${def.spineMob}/`, targetPx / mm.h, {
        mobId: def.spineMob, minY: mm.minY, targetPx,
      });
      this.spineActor.load().catch(() => this.spineActor = null);
    }
  }

  get vx() { return this.phys.getVel(this.body).x; }
  get vy() { return this.phys.getVel(this.body).y; }
  get grounded() { return this.phys.isGrounded(this.body); }
  get player() { return this.game.player; }

  // ---------- 状态机 ----------
  getNextState(s, fsm) {
    if (this.hp <= 0 && s !== EST.DEAD) return EST.DEAD;
    const p = this.player, dist = Math.abs(p.x - this.x);
    const inRange = dist <= this.def.range && Math.abs(p.y - this.y) < 60;
    switch (s) {
      case EST.SPAWN: if (fsm.stateTime > 0.4) return EST.IDLE; break;
      case EST.IDLE: if (fsm.stateTime > 0.3) return EST.MOVE; break;
      case EST.MOVE:
        if (this.freezeT > 0) break;
        if (this._wantAttack(dist, inRange)) return EST.WINDUP;
        break;
      case EST.WINDUP: if (fsm.stateTime >= (this.def.windup || 0.4)) return EST.ATTACK; break;
      case EST.ATTACK: if (fsm.stateTime >= 0.15) return EST.RECOVER; break;
      case EST.RECOVER: if (fsm.stateTime >= this.def.recover) return EST.IDLE; break;
      case EST.HURT: if (fsm.stateTime >= 0.18) return EST.IDLE; break;
      case EST.LAUNCHED: if (this.grounded && fsm.stateTime > 0.15) return EST.IDLE; break;
      case EST.BLOCK: if (fsm.stateTime >= 0.5) return EST.IDLE; break;
    }
    return KEEP;
  }

  _wantAttack(dist, inRange) {
    if (this.freezeT > 0) return false;
    if (this.isBoss) return this.atkTimer <= 0 && inRange; // Boss 免令牌，主动进攻
    const ai = this.def.ai;
    if (ai === 'archer' || ai === 'caster') {
      return this.atkTimer <= 0 && dist <= this.def.range && Math.abs(this.player.y - this.y) < 90;
    }
    if (ai === 'bomber') return dist < 70;
    return this.hasToken && this.atkTimer <= 0 && inRange;
  }

  transitionState(from, to, fsm) {
    switch (to) {
      case EST.SPAWN:
        particles.emit({ x: this.x, y: this.y - 20, vrand: 80, life: 0.5, size: 6, color: '#5a544a', glow: false, shape: 'circle' }, 8);
        break;
      case EST.WINDUP:
        this.flashT = this.def.windup; // 出手前摇红闪提示
        break;
      case EST.ATTACK: this._doAttack(); break;
      case EST.DEAD: this._die(); break;
      case EST.BLOCK: audio.play('clang'); break;
    }
  }

  _doAttack() {
    const d = this.def, g = this.game, p = this.player;
    this.atkTimer = d.atkCd * rand(0.85, 1.25);
    switch (d.ai) {
      case 'archer': case 'caster':
        audio.play(d.projectile === 'arrow' || d.projectile === 'arrow3' ? 'bow' : 'fireball');
        g.spawnProjectile(this, d.projectile);
        if (d.projectile === 'arrow3') { // 连弩三连
          setTimeout(() => this.alive && g.spawnProjectile(this, 'arrow'), 140);
          setTimeout(() => this.alive && g.spawnProjectile(this, 'arrow'), 280);
        }
        break;
      case 'bomber': {
        audio.play('fireball');
        g.combat.explode(this.x, this.y - 20, 90, this.atk, this);
        particles.emit({ x: this.x, y: this.y - 20, vrand: 300, life: 0.6, size: 8, color: '#ff8830' }, 20);
        this.hp = 0;
        break;
      }
      case 'charger': {
        // 冲撞：向玩家突进一段
        audio.play('dash');
        this.phys.setVel(this.body, this.dir * 520, 0);
        this._charging = 0.35;
        break;
      }
      default: { // melee / tank：出刀带前冲，凶且能打到
        audio.play('swing', { pitch: 0.85, vol: 0.7 });
        g.vfx.play('slash_1', this.x + this.dir * 40, this.y - 34, { scale: 0.9, fps: 30, flip: this.dir > 0 });
        this.phys.setVel(this.body, this.dir * 240, this.vy); // 前冲步
        const reach = d.range + 20;
        if (Math.abs(p.x - this.x) <= reach && Math.abs(p.y - this.y) < 70 &&
            Math.sign(p.x - this.x) === this.dir) {
          p.takeHit(this.atk, this.x, { knock: 180 });
        }
      }
    }
    if (this.hasToken) { this.game.director.releaseToken(this); }
  }

  tickPhysics(s, dt, fsm) {
    this.animT += dt;
    if (this.spineActor) this.spineActor.update(dt);
    // 精英怪：红缨气场粒子
    if (this.elite && this.alive && Math.floor(this.animT * 4) !== Math.floor((this.animT - dt) * 4)) {
      particles.emit({ x: this.x, y: this.y - 20 - Math.random() * 40, vy: -60, vrand: 20, life: 0.5, size: 3.5, color: '#ff5030' }, 2);
    }
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.flashT = Math.max(0, this.flashT - dt);
    this.atkTimer -= dt;
    this.tacticT -= dt;
    const p = this.player, g = this.game;

    // 冻结
    if (this.freezeT > 0) {
      this.freezeT -= dt;
      this.phys.setVel(this.body, 0, this.vy);
      return;
    }
    if (s === EST.DEAD || s === EST.HURT || s === EST.ATTACK || s === EST.RECOVER || s === EST.BLOCK) {
      if (s !== EST.LAUNCHED && this.grounded) this.phys.setVel(this.body, this.vx * 0.8, this.vy);
      if (this._charging > 0) {
        this._charging -= dt;
        // 冲撞命中判定
        if (Math.abs(p.x - this.x) < 46 && Math.abs(p.y - this.y) < 60) {
          p.takeHit(this.atk, this.x, { knock: 320 });
          this._charging = 0;
        }
      }
      return;
    }
    if (s === EST.WINDUP) {
      this.phys.setVel(this.body, 0, this.vy);
      this.dir = p.x >= this.x ? 1 : -1;
      return;
    }

    // ---- 战术轮盘（每 2~4s 重掷：65% 抢攻 / 25% 绕行 / 10% 环伺）----
    if (this.tacticT <= 0) {
      this.tacticT = rand(2, 4);
      const r = Math.random();
      this.tactic = r < 0.65 ? 'engage' : r < 0.9 ? 'flank' : 'hold';
    }

    const dist = Math.abs(p.x - this.x);
    this.dir = p.x >= this.x ? 1 : -1;
    const ai = this.def.ai;
    let targetVx = 0;

    if (ai === 'archer' || ai === 'caster') {
      // 保持射程：太近后撤，太远逼近，Z 错层
      const ideal = this.def.range * 0.75;
      if (dist < ideal - 60) targetVx = -this.dir * this.def.speed;
      else if (dist > this.def.range) targetVx = this.dir * this.def.speed;
      else targetVx = Math.sin(this.animT * 0.8 + this.id) * 40;
    } else if (ai === 'bomber') {
      targetVx = this.dir * this.def.speed; // 直奔玩家
    } else if (ai === 'charger' && this.atkTimer <= 0 && dist < 480 && dist > 160 && this.hasToken) {
      this.fsm.set(EST.WINDUP); return;
    } else {
      // 近战：engage 逼近 / flank 绕行 / hold 环伺
      const desired = this.def.range * 0.8;
      if (this.tactic === 'engage' || this.hasToken) {
        if (dist > desired) targetVx = this.dir * this.def.speed;
      } else if (this.tactic === 'flank') {
        const side = (this.id % 2 === 0) ? 1 : -1;
        const tx = p.x + side * (desired + 60);
        targetVx = Math.abs(tx - this.x) > 20 ? Math.sign(tx - this.x) * this.def.speed * 0.8 : 0;
      } else { // hold：保持包围距离游走
        if (dist > desired + 120) targetVx = this.dir * this.def.speed * 0.7;
        else if (dist < desired) targetVx = -this.dir * this.def.speed * 0.5;
        else targetVx = Math.sin(this.animT * 0.6 + this.id * 2) * 50;
      }
    }
    // 敌方间简单分离（防重叠）
    for (const e of this.game.enemies) {
      if (e === this || !e.alive) continue;
      const dx = this.x - e.x;
      if (Math.abs(dx) < 26 && Math.abs(this.y - e.y) < 40) targetVx += Math.sign(dx || 1) * 36;
    }
    // 与主角软性保持距离：贴身时自身退开（而不是把主角推着走）
    const pdx = this.x - p.x;
    if (Math.abs(pdx) < 40 && Math.abs(this.y - p.y) < 50 && s === EST.MOVE) {
      targetVx += Math.sign(pdx || 1) * 90;
    }
    this.phys.setVel(this.body, targetVx, this.vy);

    // 申请攻击令牌
    if (!this.hasToken && (ai === 'melee' || ai === 'tank' || ai === 'charger') && dist < 300 && this.atkTimer <= 0) {
      this.game.director.requestToken(this);
    }
    // 令牌回收：持令却游离太远超过 1.2s → 让位给近身同伴（防持令围观）
    if (this.hasToken && dist > 170) {
      this._tokenFarT = (this._tokenFarT || 0) + dt;
      if (this._tokenFarT > 1.2) { this.game.director.releaseToken(this); this._tokenFarT = 0; }
    } else this._tokenFarT = 0;
  }

  // ---------- 受击 ----------
  takeHit(dmg, fromX, opt = {}) {
    if (!this.alive || this.hp <= 0) return false;
    // 格挡
    if (this.def.blockChance > 0 && !opt.unblockable && Math.random() < this.def.blockChance &&
        Math.sign(fromX - this.x) === this.dir && ![EST.HURT, EST.DEAD].includes(this.fsm.state)) {
      this.fsm.set(EST.BLOCK);
      dmg *= 0.25;
      audio.play('clang');
      particles.emit({ x: this.x + this.dir * 14, y: this.y - 34, vrand: 120, life: 0.2, size: 4, color: '#ffe9a8' }, 6);
    }
    this.hp -= dmg;
    this.hurtT = 0.24; this.flashT = 0.08;
    const dir = this.x >= fromX ? 1 : -1;
    const knock = (opt.knock || 160) * (1 - this.def.knockResist);
    const launch = (opt.launch || 0) * (1 - this.def.knockResist);
    this.phys.setVel(this.body, dir * knock, this.grounded ? Math.max(0, launch) : this.vy * 0.5 + launch * 0.5);
    if (opt.freeze) this.freezeT = Math.max(this.freezeT, opt.freeze);
    particles.bloodInk(this.x, this.y - 34, dir);
    this.game.ui.damageNumber(this.x, this.y - 66, Math.round(dmg), opt.crit ? 'crit' : '');
    if (this.hp <= 0) { this.fsm.set(EST.DEAD); return true; }
    // 出招霸体：前摇/出刀期间吃伤害但不被打断（小怪才能还手）；Boss 免击飞
    const poised = [EST.WINDUP, EST.ATTACK].includes(this.fsm.state) || this.isBoss;
    if (opt.launch > 0 && this.grounded && !this.isBoss && !poised) this.fsm.set(EST.LAUNCHED);
    else if (!poised && ![EST.LAUNCHED, EST.BLOCK].includes(this.fsm.state)) this.fsm.set(EST.HURT);
    return true;
  }

  _die() {
    const g = this.game;
    this.alive = false;
    if (this.hasToken) g.director.releaseToken(this);
    audio.play('die', { pitch: rand(0.9, 1.15) });
    particles.deathBurst(this.x, this.y - 30, this.elite ? '#ff6840' : '#c8c2b2');
    if (this.elite) particles.emit({ x: this.x, y: this.y - 30, vrand: 320, life: 0.8, size: 6, color: '#ff8830' }, 16);
    g.vfx.play('die', this.x, this.y - 30, { scale: this.def.scale * (this.elite ? 1.6 : 1.2), fps: 20 });
    g.player.stats.kills++;
    g.player.addRage(4);
    g.onEnemyDead(this);
    // 掉落
    const r = Math.random();
    if (r < 0.12) g.spawnPickup(this.x, 'rice');
    else if (r < 0.3) g.spawnPickup(this.x, 'rage');
    setTimeout(() => this.phys.remove(this.body), 400);
  }

  draw(ctx, camX, camY) {
    const s = this.fsm.state;
    if (s === EST.DEAD && this.fsm.stateTime > 0.5) return;
    // ---- Spine 骨骼模型渲染 ----
    if (this.spineActor && this.spineActor.ready) {
      let anim = 'idle', loop = true, ts = 1;
      if (s === EST.MOVE) anim = 'walk';
      else if (s === EST.WINDUP) { anim = 'atk1'; loop = false; ts = 0.6; }
      else if (s === EST.ATTACK) { anim = 'atk1'; loop = false; ts = 1.6; }
      else if (s === EST.HURT || s === EST.LAUNCHED) { anim = 'hurt'; loop = false; }
      else if (s === EST.DEAD) { anim = 'death'; loop = false; }
      this.spineActor.play(anim, { loop, timeScale: ts });
      const alpha = s === EST.DEAD ? Math.max(0, 1 - this.fsm.stateTime * 2.2) : 1;
      this.spineActor.draw(ctx, this.x - camX, this.y - camY, this.dir, 1, alpha);
      this._drawOverlays(ctx, camX, camY, s);
      return;
    }
    const atkKinds = { melee: 'slash1', tank: 'slash1', charger: 'thrust', archer: 'shoot', caster: 'cast', bomber: 'cast' };
    const atk = (s === EST.WINDUP || s === EST.ATTACK) ? {
      t: s === EST.WINDUP ? 0.2 : 0.6 + this.fsm.stateTime * 2,
      kind: atkKinds[this.def.ai] || 'slash1',
    } : null;
    this._drawOverlays(ctx, camX, camY, s);
    // 冻结冰壳
    this.warrior.draw(ctx, {
      x: this.x, y: this.y + this.zOffset * 0, dir: this.dir,
      walk: Math.abs(this.vx) > 15 ? 1 : 0, run: Math.abs(this.vx) > 200 ? 1 : 0,
      atk, air: this.grounded ? 0 : 1, animT: this.animT, hurt: this.hurtT,
      dead: s === EST.DEAD ? this.fsm.stateTime : undefined,
      block: s === EST.BLOCK, cast: s === EST.WINDUP && this.def.ai === 'caster',
      scaleMul: this.def.scale,
    }, camX, camY);
  }

  // 通用覆盖层：前摇红闪 / 受击白闪 / 血条（Spine 与水墨渲染共用）
  _drawOverlays(ctx, camX, camY, s) {
    const h = 62 * this.def.scale; // 身体高度基准
    // 出手前摇：泛红警示
    if (s === EST.WINDUP && Math.floor(this.animT * 12) % 2 === 0) {
      ctx.save(); ctx.globalAlpha = 0.4; ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = '#ff4030';
      ctx.beginPath(); ctx.arc(this.x - camX, this.y - h * 0.55 - camY, 26 * this.def.scale, 0, 7); ctx.fill();
      ctx.restore();
    }
    // 冻结冰壳
    if (this.freezeT > 0) {
      ctx.save(); ctx.globalAlpha = 0.45; ctx.fillStyle = '#9ad8f0';
      ctx.beginPath(); ctx.ellipse(this.x - camX, this.y - h * 0.5 - camY, 22 * this.def.bulk, h * 0.6, 0, 0, 7); ctx.fill();
      ctx.restore();
    }
    // 受击白闪
    if (this.flashT > 0 && s !== EST.WINDUP) {
      ctx.save(); ctx.globalAlpha = 0.6; ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(this.x - camX, this.y - h * 0.5 - camY, 18 * this.def.bulk, h * 0.55, 0, 0, 7); ctx.fill();
      ctx.restore();
    }
    // 血条（受伤后显示）
    if (this.hp < this.maxHp && s !== EST.DEAD) {
      const w = 34 * this.def.bulk, pct = clamp(this.hp / this.maxHp, 0, 1);
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      ctx.fillRect(this.x - camX - w / 2, this.y - h - 16 - camY, w, 4);
      ctx.fillStyle = this.elite ? '#e04030' : '#c8b040';
      ctx.fillRect(this.x - camX - w / 2, this.y - h - 16 - camY, w * pct, 4);
    }
  }

  syncBody() { const p = this.phys.getPos(this.body); this.x = p.x; this.y = p.y + 26 * this.def.scale; } // 中心→脚底
}
