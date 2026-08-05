// 玩家：通用状态机驱动，土狼时间+跳跃缓冲+可变跳高+连段+技能+绝技+闪避
import { StateMachine, KEEP, clamp } from '../engine/utils.js?v=1785961530';
import { feel } from '../engine/shake.js?v=1785961530';
import { audio } from '../engine/audio.js?v=1785961530';
import { particles, vfxLib } from '../engine/particles.js?v=1785961530';
import { InkWarrior } from '../engine/sprite.js?v=1785961530';
import { SpineActor } from '../engine/spine-actor.js?v=1785961530';

export const PSTATE = {
  IDLE: 'IDLE', RUN: 'RUN', JUMP: 'JUMP', FALL: 'FALL', LAND: 'LAND',
  ATTACK: 'ATTACK', SKILL: 'SKILL', ULT: 'ULT', DASH: 'DASH', HURT: 'HURT', DEAD: 'DEAD',
};
const CAN_ATTACK = [PSTATE.IDLE, PSTATE.RUN, PSTATE.JUMP, PSTATE.FALL, PSTATE.LAND];

export class Player {
  constructor(charData, physics, game) {
    this.data = charData;
    this.game = game;
    this.phys = physics;
    this.x = 200; this.y = 0; this.dir = 1;
    this.level = 1;
    this.maxHp = charData.hp; this.hp = this.maxHp;
    this.maxMp = charData.mp; this.mp = this.maxMp;
    this.rage = 0;                       // 怒气 0~100
    this.atk = charData.atk;
    this.body = physics.addCharacter(this.x, -80, 26, 56, { type: 'player', ref: this });
    this.fsm = new StateMachine(this, PSTATE.IDLE);
    this.comboIdx = 0; this.comboQueued = false; this.atkHitDone = false;
    this.combo = 0; this.comboT = 0;     // 连击计数
    this.jumps = 0; this.coyote = 0; this.jumpBuf = 0;
    this.iFrames = 0; this.skillCd = 0; this.dashCd = 0;
    this.animT = 0; this.hurtT = 0; this.ultT = 0; this.skillFx = null;
    this.warrior = new InkWarrior(charData.palette, { weapon: charData.weaponType, bulk: charData.bulk, hat: charData.hat });
    // Spine 骨骼动画（有素材则优先）
    this.spineActor = charData.spine ? new SpineActor(charData.spine, charData.spineScale || 0.42) : null;
    if (this.spineActor) this.spineActor.load().catch(() => this.spineActor = null);
    this.stats = { kills: 0, dmg: 0, maxCombo: 0 };
  }

  // ---------- 状态机三钩子 ----------
  getNextState(s, fsm) {
    if (this.hp <= 0 && s !== PSTATE.DEAD) return PSTATE.DEAD;
    const g = this.grounded;
    switch (s) {
      case PSTATE.IDLE: if (Math.abs(this.vx) > 10) return PSTATE.RUN; if (!g) return PSTATE.FALL; break;
      case PSTATE.RUN: if (Math.abs(this.vx) <= 10 && g) return PSTATE.IDLE; if (!g) return PSTATE.FALL; break;
      case PSTATE.JUMP: if (this.vy < 0) return PSTATE.FALL; break;
      case PSTATE.FALL: if (g) return PSTATE.LAND; break;
      case PSTATE.LAND: if (fsm.stateTime > 0.1) return PSTATE.IDLE; break;
      case PSTATE.ATTACK: {
        const c = this.data.combo[this.comboIdx];
        if (fsm.stateTime >= c.dur) {
          if (this.comboQueued && this.comboIdx < this.data.combo.length - 1) {
            this.comboIdx++; this.comboQueued = false;
            return PSTATE.ATTACK; // 连段推进
          }
          return g ? PSTATE.IDLE : PSTATE.FALL;
        }
        break;
      }
      case PSTATE.SKILL: if (fsm.stateTime >= this.data.skill.dur) return g ? PSTATE.IDLE : PSTATE.FALL; break;
      case PSTATE.ULT: if (fsm.stateTime >= this.data.ult.dur) return PSTATE.IDLE; break;
      case PSTATE.DASH: if (fsm.stateTime >= 0.22) return g ? PSTATE.IDLE : PSTATE.FALL; break;
      case PSTATE.HURT: if (fsm.stateTime >= 0.2) return g ? PSTATE.IDLE : PSTATE.FALL; break;
    }
    return KEEP;
  }

  transitionState(from, to, fsm) {
    const phys = this.phys;
    switch (to) {
      case PSTATE.JUMP: audio.play('jump'); break;
      case PSTATE.LAND:
        audio.play('land');
        particles.emit({ x: this.x, y: this.y, vrand: 60, vy: -20, life: 0.4, size: 4, color: '#b8a888', glow: false }, 6);
        break;
      case PSTATE.ATTACK: {
        const c = this.data.combo[this.comboIdx];
        this.atkHitDone = false;
        audio.play(c.sfx, { pitch: 1 + this.comboIdx * 0.12 });
        break;
      }
      case PSTATE.SKILL: this._castSkill(); break;
      case PSTATE.ULT: this._castUlt(); break;
      case PSTATE.DASH:
        this.iFrames = Math.max(this.iFrames, 0.26);
        audio.play('dash');
        phys.setVel(this.body, this.dir * 720, 0);
        break;
      case PSTATE.HURT: audio.play('hurt'); break;
      case PSTATE.DEAD:
        phys.setVel(this.body, -this.dir * 120, 200);
        audio.play('die', { pitch: 0.8 });
        break;
    }
  }

  tickPhysics(s, dt, fsm) {
    const phys = this.phys, input = this.game.input, d = this.data;
    this.animT += dt;
    if (this.spineActor) this.spineActor.update(dt);
    // 计时器
    this.coyote = Math.max(0, this.coyote - dt);
    this.jumpBuf = Math.max(0, this.jumpBuf - dt);
    this.iFrames = Math.max(0, this.iFrames - dt);
    this.skillCd = Math.max(0, this.skillCd - dt);
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }
    this.mp = Math.min(this.maxMp, this.mp + dt * 4); // 内力缓回
    // 绝技就绪提示（一次）
    if (this.rage >= 100 && !this._ultReady) {
      this._ultReady = true;
      this.game.ui.showToast('怒气已满 · 按 L 释放绝技！', 1800);
      audio.play('combo_up', { pitch: 1.5 });
    } else if (this.rage < 100) this._ultReady = false;

    // 输入缓冲（YONGZHE 跳跃缓冲）
    if (input.jumpPressed) this.jumpBuf = 0.12;

    const dead = s === PSTATE.DEAD;
    const busy = [PSTATE.ATTACK, PSTATE.SKILL, PSTATE.ULT, PSTATE.HURT].includes(s);

    // ---- 移动 ----
    const mx = dead || s === PSTATE.ULT ? 0 : input.moveX;
    const speed = d.speed * (input.runHeld ? 1.5 : 1);
    if (!busy && s !== PSTATE.DASH) {
      if (mx !== 0) {
        this.dir = mx > 0 ? 1 : -1;
        phys.setVel(this.body, mx * speed, this.vy);
      } else if (this.grounded) {
        phys.setVel(this.body, this.vx * 0.3, this.vy); // 地面急停（干爽手感）
      }
    }
    // 空中攻击时下坠减缓
    if (busy && !this.grounded) phys.setVel(this.body, this.vx * 0.98, this.vy * 0.9);

    // ---- 跳跃（可变跳高 + 土狼 + 二段跳）----
    if (!dead && !busy && this.jumpBuf > 0) {
      const canGroundJump = this.grounded || this.coyote > 0;
      const canDouble = !canGroundJump && this.jumps < 2;
      if (canGroundJump || canDouble) {
        const v = d.jump * (canDouble ? 0.85 : 1) * (1 + Math.min(0.2, Math.abs(this.vx) / 2500)); // 跑得快跳得高
        phys.setVel(this.body, this.vx, v);
        this.jumps = canGroundJump ? 1 : 2;
        this.jumpBuf = 0; this.coyote = 0;
        this.fsm.set(PSTATE.JUMP);
      }
    }
    // 可变跳高：松键切速度（MarioMagic/YONGZHE）
    if (!input.jumpHeld && this.vy > 0 && [PSTATE.JUMP].includes(s)) {
      phys.setVel(this.body, this.vx, this.vy * 0.45);
    }
    // 空中按 S 速降
    if (!this.grounded && input.down && this.vy < 0) phys.setVel(this.body, this.vx, this.vy - 1400 * dt);
    // 最大落速钳制
    if (this.vy < -1500) phys.setVel(this.body, this.vx, -1500);

    // 土狼时间刷新
    if (this.grounded) { this.jumps = 0; this.coyote = 0.11; }

    // ---- 攻击 / 技能 / 绝技 ----
    if (!dead && !busy && input.atkPressed && CAN_ATTACK.includes(this.fsm.state)) {
      this.comboIdx = 0; this.fsm.set(PSTATE.ATTACK);
    } else if (s === PSTATE.ATTACK && input.atkPressed) {
      this.comboQueued = true; // 命中续连段
    }
    if (!dead && !busy && input.skillPressed && this.skillCd <= 0 && this.mp >= d.skill.cost) {
      this.fsm.set(PSTATE.SKILL);
    }
    if (!dead && !busy && input.ultPressed && this.rage >= 100) {
      this.fsm.set(PSTATE.ULT);
    }
    // 闪避：Shift 按下瞬间
    if (!dead && !busy && this.dashCd <= 0 && (input.justPressed('ShiftLeft') || input.justPressed('ShiftRight'))) {
      this.dashCd = 0.9; this.fsm.set(PSTATE.DASH);
    }

    // ---- 攻击判定帧 ----
    if (s === PSTATE.ATTACK && !this.atkHitDone) {
      const c = d.combo[this.comboIdx];
      if (fsm.stateTime >= c.dur * 0.36) {
        this.atkHitDone = true;
        this.game.combat.playerMelee(c);
      }
    }
    // 技能判定（瞬发型在 _castSkill，持续型在这里）
    if (s === PSTATE.SKILL) this._tickSkill(dt, fsm.stateTime);
    if (s === PSTATE.ULT) this._tickUlt(dt, fsm.stateTime);

    // 冲刺拖尾
    if (s === PSTATE.DASH) particles.dashTrail(this.x - this.dir * 10, this.y - 30, this.data.palette.trim);
  }

  // ---------- 技能 ----------
  _castSkill() {
    const sk = this.data.skill;
    this.mp -= sk.cost; this.skillCd = sk.cd;
    audio.play(sk.sfx);
    this.rage = Math.min(100, this.rage + 6);
    const g = this.game, cx = this.x, cy = this.y - 30;
    // 出招文字标识（大招）+ 元素色粒子爆发
    g.ui.showSkillCallout(sk.name, this.data, false);
    const ec = this.data.element || '#ffd27d';
    particles.emit({ x: cx, y: cy, vrand: 260, life: 0.55, size: 6, color: ec, glow: true }, 26);
    particles.emit({ x: cx, y: cy, vrand: 120, life: 0.4, size: 3, color: '#ffffff' }, 10);
    feel.flash(this._rgb(ec), 90);
    // 元素追加特效
    if (sk.extra) {
      const ex = sk.kind === 'blink' ? this.x + this.dir * (sk.dist || 200)
               : sk.kind === 'ice_lance' ? this.x + this.dir * 160
               : cx;
      g.vfx.play(sk.extra, ex, cy, { scale: 1.5, fps: 26, flip: this.dir > 0 });
    }
    switch (sk.kind) {
      case 'spin':
        g.vfx.play(sk.vfx, cx, cy, { scale: 1.6, fps: 24, once: false });
        g.combat.playerAoE(cx, cy, sk.radius, this.atk * sk.dmg, 300, { stun: 0.5 });
        feel.shake(0.35); feel.hitStop(70);
        break;
      case 'quake': {
        this.phys.setVel(this.body, this.dir * 200, 500); // 跳起砸地感
        setTimeout(() => {
          g.vfx.play(sk.vfx, cx + this.dir * 60, this.y - 20, { scale: 1.8, fps: 28 });
          g.combat.playerAoE(this.x + this.dir * 60, this.y, sk.radius, this.atk * sk.dmg, 500, { stun: 0.6, launch: 300 });
          feel.shake(0.6); feel.hitStop(100);
          particles.emit({ x: this.x + this.dir * 60, y: this.y, vrand: 300, vy: -200, life: 0.6, size: 7, color: '#a89060', glow: false, gravity: 800 }, 24);
        }, 260);
        break;
      }
      case 'blink': {
        particles.emit({ x: cx, y: cy, vrand: 80, life: 0.3, size: 8, color: '#d8a8e8' }, 12);
        const nx = this.x + this.dir * sk.dist;
        const pos = this.phys.getPos(this.body);
        this.phys.setPos(this.body, clamp(nx, 40, g.level.length - 40), pos.y);
        this.x = clamp(nx, 40, g.level.length - 40);
        g.vfx.play(sk.vfx, this.x, cy, { scale: 1.4, fps: 22 });
        g.combat.playerMelee({ dmg: sk.dmg, range: 110, arc: 360, knock: 260, stun: 0.45, kind: 'slash2', vfx: null, sfx: null });
        feel.hitStop(60);
        break;
      }
      case 'ice_lance': {
        g.vfx.play(sk.vfx, this.x + this.dir * 120, cy, { scale: 1.5, fps: 26, flip: this.dir > 0 });
        g.combat.playerLine(this.dir, sk.range, 60, this.atk * sk.dmg, 200, { freeze: sk.freeze, stun: 0.3 });
        feel.shake(0.25);
        break;
      }
    }
  }
  _tickSkill(dt, t) { /* 持续型技能帧逻辑（spin 已瞬时结算） */ }

  _castUlt() {
    const ult = this.data.ult;
    this.rage = 0; this.ultT = 0; this._ultWave = 0; this._ultTick = 0;
    audio.play('ult');
    audio.play('gong');
    feel.flash(this._rgb(this.data.element || '#ffd27d'), 260);
    feel.slowMotion(0.35, 500);
    feel.shake(0.5);
    this.iFrames = Math.max(this.iFrames, ult.dur + 0.3);
    this.game.ui.showUltBanner(this.data);
  }
  _tickUlt(dt, t) {
    const ult = this.data.ult, g = this.game;
    this._ultTick -= dt;
    if (this._ultTick > 0) return;
    switch (ult.kind) {
      case 'sword_rain': { // 全屏剑雨波次
        this._ultTick = ult.dur / ult.waves;
        this._ultWave++;
        const camL = g.camera.x - innerWidth / 2, camR = g.camera.x + innerWidth / 2;
        for (let i = 0; i < 3; i++) {
          const tx = camL + Math.random() * (camR - camL);
          g.vfx.play('sword_rain', tx, 60 + Math.random() * 120, { scale: 1.3, fps: 26 });
          g.combat.playerAoE(tx, 120, 130, this.atk * ult.dmg, 180, { stun: 0.3 });
        }
        feel.shake(0.15);
        break;
      }
      case 'mega_slash': { // 巨型刀光横贯
        this._ultTick = 999;
        const y = this.y - 34;
        g.vfx.play('boss_rage', this.x + this.dir * 200, y, { scale: 2.4, fps: 30, flip: this.dir > 0 });
        g.combat.playerLine(this.dir, ult.width, 120, this.atk * ult.dmg, 600, { stun: 0.8, launch: 260 });
        feel.shake(0.8); feel.hitStop(140);
        audio.play('thunder');
        break;
      }
      case 'moon_dance': { // 穿梭全场
        this._ultTick = ult.dur / ult.hits;
        const g2 = this.game, enemies = g2.enemies.filter(e => e.alive);
        if (enemies.length) {
          const e = enemies[Math.floor(Math.random() * enemies.length)];
          const pos = this.phys.getPos(this.body);
          this.phys.setPos(this.body, e.x - e.dir * 40, pos.y);
          this.dir = e.x > this.x ? 1 : -1; this.x = e.x - e.dir * 40;
          g2.vfx.play('moon_dance', e.x, e.y - 30, { scale: 1.4, fps: 26 });
          g2.combat.playerAoE(e.x, e.y - 30, 100, this.atk * ult.dmg, 200, { stun: 0.35 });
          particles.dashTrail(e.x, e.y - 30, '#e8c8f0');
        }
        break;
      }
      case 'blizzard': { // 暴风雪结界
        this._ultTick = ult.dur / ult.ticks;
        const cx = this.x, cy = this.y - 40;
        g.vfx.play('ice_spike', cx + (Math.random() - 0.5) * ult.radius, cy + (Math.random() - 0.5) * 80, { scale: 1.6, fps: 24 });
        g.combat.playerAoE(cx, cy, ult.radius, this.atk * ult.dmg, 100, { freeze: 0.8, stun: 0.2 });
        particles.emit({ x: cx, y: cy, vrand: ult.radius, vy: -60, life: 0.8, size: 5, color: '#bfe8f0', shape: 'circle' }, 14);
        feel.shake(0.1);
        break;
      }
    }
  }

  // ---------- 受击 ----------
  takeHit(dmg, fromX, opt = {}) {
    if (this.iFrames > 0 || this.hp <= 0) return false;
    const kResist = 0;
    this.hp = Math.max(0, this.hp - dmg);
    this.iFrames = opt.iFrames ?? 1.0; // 受击保护拉长，防连续硬直
    this.hurtT = 0.3;
    const dir = this.x >= fromX ? 1 : -1;
    this.phys.setVel(this.body, dir * (opt.knock || 200), this.grounded ? 120 : this.vy);
    this.rage = Math.min(100, this.rage + dmg * 0.4); // 挨打攒怒
    this.combo = 0;
    feel.shake(0.3); feel.hitStop(50);
    particles.bloodInk(this.x, this.y - 36, dir);
    if (this.fsm.state !== PSTATE.DEAD && this.hp > 0) this.fsm.set(PSTATE.HURT);
    this.game.ui.damageNumber(this.x, this.y - 70, Math.round(dmg), 'player');
    if (this.hp <= 0) this.fsm.set(PSTATE.DEAD);
    return true;
  }

  _rgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return `${n >> 16},${(n >> 8) & 255},${n & 255}`;
  }

  heal(v) { this.hp = Math.min(this.maxHp, this.hp + v); particles.heal(this.x, this.y - 40); audio.play('heal'); }
  addRage(v) { this.rage = Math.min(100, this.rage + v); }
  levelUp() {
    this.level++; this.maxHp *= 1.08; this.atk *= 1.08;
    this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.3);
  }

  // ---------- 便捷属性 ----------
  get pos() { return this.phys.getPos(this.body); }
  get vx() { return this.phys.getVel(this.body).x; }
  get vy() { return this.phys.getVel(this.body).y; }
  get grounded() { return this.phys.isGrounded(this.body); }

  syncBody() { const p = this.pos; this.x = p.x; this.y = p.y + 28; } // 身体中心→脚底

  draw(ctx, camX, camY) {
    // 无敌帧闪烁
    if (this.iFrames > 0 && this.fsm.state !== PSTATE.DEAD && Math.floor(this.animT * 20) % 2 === 0) return;
    const s = this.fsm.state;
    // ---- Spine 骨骼动画渲染 ----
    if (this.spineActor && this.spineActor.ready) {
      let anim = 'idle', loop = true, ts = 1;
      if (s === PSTATE.RUN) { anim = 'walk'; ts = Math.abs(this.vx) > this.data.speed * 1.2 ? 1.4 : 1; }
      else if (s === PSTATE.JUMP || s === PSTATE.FALL) anim = 'jump';
      else if (s === PSTATE.ATTACK) { anim = ['atk1', 'atk2', 'atk3'][this.comboIdx % 3]; loop = false; ts = 1.3; }
      else if (s === PSTATE.SKILL || s === PSTATE.ULT) { anim = 'skill'; loop = false; }
      else if (s === PSTATE.DASH) { anim = 'walk'; ts = 1.8; }
      else if (s === PSTATE.HURT) { anim = 'hurt'; loop = false; }
      else if (s === PSTATE.DEAD) { anim = 'death'; loop = false; }
      this.spineActor.play(anim, { loop, timeScale: ts });
      this.spineActor.draw(ctx, this.x - camX, this.y - camY, this.dir);
      return;
    }
    // ---- 水墨程序化渲染（降级） ----
    const atkState = s === PSTATE.ATTACK ? {
      t: clamp(this.fsm.stateTime / this.data.combo[this.comboIdx].dur, 0, 1),
      kind: this.data.combo[this.comboIdx].kind,
    } : (s === PSTATE.SKILL ? {
      t: clamp(this.fsm.stateTime / this.data.skill.dur, 0, 1),
      kind: this.data.skill.kind === 'spin' ? 'spin' : this.data.skill.kind === 'ice_lance' ? 'thrust' : 'smash',
    } : null);
    this.warrior.draw(ctx, {
      x: this.x, y: this.y, dir: this.dir,
      walk: Math.abs(this.vx) > 10 ? 1 : 0, run: Math.abs(this.vx) > this.data.speed * 1.2 ? 1 : 0,
      atk: atkState, air: this.grounded ? 0 : 1, animT: this.animT,
      hurt: this.hurtT, dead: s === PSTATE.DEAD ? this.fsm.stateTime : undefined,
    }, camX, camY);
  }
}
