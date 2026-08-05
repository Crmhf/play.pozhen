// Boss：独立 AI —— 阶段技能循环 + 狂暴 + 登场演出
import { EST, Enemy } from './enemy.js?v=1785960849';
import { KEEP, clamp, rand } from '../engine/utils.js?v=1785960849';
import { feel } from '../engine/shake.js?v=1785960849';
import { audio } from '../engine/audio.js?v=1785960849';
import { particles } from '../engine/particles.js?v=1785960849';
import { shade } from '../engine/sprite.js?v=1785960849';

export class Boss extends Enemy {
  constructor(def, physics, game, opts) {
    super(def, physics, game, { ...opts, elite: false, level: opts.level || 1 });
    this.isBoss = true;
    this.maxHp = def.hp * (1 + ((opts.level || 1) - 1) * 0.06); this.hp = this.maxHp;
    this.atk = def.atk;
    this.skillCds = def.skills.map(() => rand(2, 4));
    this.enraged = false;
    this.armorT = 0; this.armorDr = 0;
    this.warrior.p = def.palette;
    this.warrior.bulk = def.bulk;
    this.warrior.hat = def.hat;
    this.name = def.name;
    // Boss 不拿普通令牌
    this.hasToken = false;
  }

  getNextState(s, fsm) {
    if (this.hp <= 0 && s !== EST.DEAD) return EST.DEAD;
    if (this._skillState) return this._skillNext(s, fsm);
    return super.getNextState(s, fsm);
  }

  tickPhysics(s, dt, fsm) {
    // 狂暴检测
    const en = this.def.enrage;
    if (!this.enraged && en && this.hp / this.maxHp <= en.at) {
      this.enraged = true;
      this._onEnrage();
    }
    this.armorT = Math.max(0, this.armorT - dt);
    // 技能冷却 + 释放
    if (!this._skillState && ![EST.HURT, EST.DEAD, EST.LAUNCHED].includes(s) && this.freezeT <= 0) {
      for (let i = 0; i < this.def.skills.length; i++) {
        this.skillCds[i] -= dt * (this.enraged ? 1 / (this.def.enrage.cdMul || 1) : 1);
        if (this.skillCds[i] <= 0) {
          const sk = this.def.skills[i];
          const dist = Math.abs(this.player.x - this.x);
          if (sk.kind === 'summon' ? dist < 900 : dist < 700) {
            this.skillCds[i] = sk.cd;
            this._startSkill(sk);
            break;
          }
        }
      }
    }
    if (this._skillState) { this._tickSkill(dt); return; }
    super.tickPhysics(s, dt, fsm);
    // Boss 常态也主动进攻（不受令牌限制，但保持距离感）
  }

  _onEnrage() {
    const en = this.def.enrage;
    audio.play('boss_roar');
    feel.flash('255,60,40', 300); feel.shake(0.7);
    this.game.ui.showToast(`${this.name} 狂暴了！`);
    particles.emit({ x: this.x, y: this.y - 40, vrand: 200, life: 0.8, size: 8, color: '#ff4030' }, 30);
    if (en.summon) {
      for (const id of en.summon) this.game.spawnEnemy(id, this.x + rand(-100, 100), true);
    }
    if (en.atkMul) this.atk *= en.atkMul;
    this._spdMul = en.spdMul || 1.3;
    this.def = { ...this.def, speed: this.def.speed * (en.spdMul || 1.3) };
  }

  _startSkill(sk) {
    this._skillState = { sk, phase: 'windup', t: 0 };
    this.flashT = sk.windup;
    audio.play('boss_roar', { vol: 0.5, pitch: 1.2 });
  }
  _skillNext(s, fsm) { return KEEP; } // 技能期间锁定状态（复用 MOVE 姿态）

  _tickSkill(dt) {
    const st = this._skillState, sk = st.sk, g = this.game, p = this.player;
    st.t += dt;
    this.animT += dt;
    this.phys.setVel(this.body, this.vx * 0.85, this.vy);
    this.dir = p.x >= this.x ? 1 : -1;
    if (st.phase === 'windup' && st.t >= sk.windup) {
      st.phase = 'active'; st.t = 0;
      this._execSkill(sk);
    } else if (st.phase === 'active' && st.t >= (sk.activeDur || 0.6)) {
      this._skillState = null;
    }
  }

  _execSkill(sk) {
    const g = this.game, p = this.player, cx = this.x, cy = this.y - 40;
    if (sk.sfx) audio.play(sk.sfx);
    switch (sk.kind) {
      case 'smash_wave': {
        g.vfx.play(sk.vfx, cx + this.dir * 70, this.y - 20, { scale: 2, fps: 26 });
        feel.shake(0.6); feel.hitStop(80);
        const waves = sk.waves || 1;
        for (let w = 0; w < waves; w++) {
          setTimeout(() => {
            if (!this.alive) return;
            g.combat.bossAoE(cx + this.dir * (70 + w * 90), this.y - 20, 110, this.atk * sk.dmg, { knock: 380 });
            particles.emit({ x: cx + this.dir * (70 + w * 90), y: this.y, vrand: 240, vy: -180, life: 0.5, size: 6, color: '#a89060', glow: false, gravity: 700 }, 16);
          }, w * 220);
        }
        break;
      }
      case 'charge_slash': {
        audio.play('dash');
        this.phys.setVel(this.body, this.dir * 900, 0);
        this._charging = (sk.dist || 380) / 900;
        g.vfx.play(sk.vfx, cx + this.dir * 60, cy, { scale: 1.6, fps: 24, flip: this.dir < 0 });
        break;
      }
      case 'spin_aoe': {
        g.vfx.play(sk.vfx, cx, cy, { scale: 1.8, fps: 24, once: false });
        g.combat.bossAoE(cx, cy, sk.radius || 180, this.atk * sk.dmg, { knock: 420 });
        feel.shake(0.5);
        break;
      }
      case 'summon': {
        for (const id of sk.units) g.spawnEnemy(id, cx + rand(-120, 120), false);
        g.ui.showToast(`${this.name} 召唤了援军！`);
        break;
      }
      case 'burst': {
        g.vfx.play(sk.vfx, cx, cy, { scale: 2.2, fps: 26 });
        g.combat.bossAoE(cx, cy, sk.radius, this.atk * sk.dmg, { knock: 500, launch: 200 });
        feel.shake(0.8); feel.flash('255,120,80', 150);
        break;
      }
      case 'blink_strike': {
        const pos = this.phys.getPos(this.body);
        const nx = p.x - p.dir * 50;
        particles.emit({ x: cx, y: cy, vrand: 60, life: 0.3, size: 7, color: '#c0a8e0' }, 10);
        this.phys.setPos(this.body, nx, pos.y); this.x = nx;
        g.vfx.play(sk.vfx, p.x, p.y - 34, { scale: 1.3, fps: 24 });
        g.combat.bossAoE(p.x, p.y - 34, 90, this.atk * sk.dmg, { knock: 300 });
        break;
      }
      case 'leap_slam': {
        this.phys.setVel(this.body, this.dir * 240, 620);
        setTimeout(() => {
          if (!this.alive) return;
          g.vfx.play(sk.vfx, this.x, this.y - 16, { scale: 2, fps: 26 });
          g.combat.bossAoE(this.x, this.y - 16, sk.radius || 180, this.atk * sk.dmg, { knock: 400, launch: 240 });
          feel.shake(0.7);
        }, 450);
        break;
      }
      case 'armor_up': {
        this.armorT = sk.dur; this.armorDr = sk.dr;
        g.vfx.play(sk.vfx, cx, cy, { scale: 1.5, fps: 20, once: false });
        g.ui.showToast(`${this.name} 进入霸体！伤害减免 ${Math.round(sk.dr * 100)}%`);
        break;
      }
      case 'arrow_rain': {
        for (let i = 0; i < sk.count; i++) {
          setTimeout(() => {
            if (!this.alive) return;
            const tx = p.x + rand(-200, 200);
            g.spawnProjectile(this, 'arrow_fall', { tx });
          }, i * 120);
        }
        g.vfx.play(sk.vfx, cx, 40, { scale: 2, fps: 24 });
        break;
      }
      case 'shadow_clone': {
        for (let i = 0; i < sk.clones; i++) {
          setTimeout(() => {
            if (!this.alive) return;
            g.vfx.play(sk.vfx, cx + this.dir * (120 + i * 100), cy, { scale: 1.4, fps: 22 });
            g.combat.bossAoE(cx + this.dir * (120 + i * 100), cy, 100, this.atk * sk.dmg, { knock: 260 });
          }, i * 180);
        }
        break;
      }
      case 'dark_crows': {
        for (let i = 0; i < sk.count; i++) {
          setTimeout(() => {
            if (!this.alive) return;
            g.spawnProjectile(this, 'crow', { homing: 1.5 });
          }, i * 150);
        }
        g.vfx.play(sk.vfx, cx, cy - 20, { scale: 1.6, fps: 24 });
        break;
      }
      case 'drain': {
        g.vfx.play(sk.vfx, cx, cy, { scale: 2.4, fps: 22, once: false });
        if (g.combat.bossAoE(cx, cy, sk.radius, this.atk * sk.dmg, { knock: 200 })) {
          this.hp = Math.min(this.maxHp, this.hp + this.atk * sk.dmg * sk.drain);
          particles.heal(cx, cy);
        }
        feel.slowMotion(0.5, 400);
        break;
      }
      case 'combo_strike': {
        for (let i = 0; i < 3; i++) {
          setTimeout(() => {
            if (!this.alive) return;
            audio.play('swing', { pitch: 0.8 });
            g.vfx.play(sk.vfx, cx + this.dir * 60, cy, { scale: 1.5, fps: 28, flip: this.dir < 0 });
            g.combat.bossAoE(cx + this.dir * 80, cy, 110, this.atk * sk.dmg / 1.8, { knock: 240 });
          }, i * 260);
        }
        break;
      }
    }
  }

  takeHit(dmg, fromX, opt = {}) {
    // 狂暴反弹（司马懿狼顾之相）
    if (this.enraged && this.def.enrage.kind === 'reflect' && !opt.isReflect) {
      this.game.player.takeHit(dmg * this.def.enrage.reflect, this.x, { knock: 100, iFrames: 0.3, isReflect: true });
    }
    if (this.armorT > 0) dmg *= (1 - this.armorDr);
    // Boss 硬直抵抗：Windup 期间不打断
    if (this._skillState && this._skillState.phase === 'windup') opt = { ...opt, launch: 0, knock: (opt.knock || 0) * 0.2 };
    return super.takeHit(dmg, fromX, opt);
  }

  _die() {
    const g = this.game;
    this.alive = false;
    audio.play('boss_die');
    feel.slowMotion(0.25, 900);
    feel.flash('255,240,200', 400);
    feel.shake(1);
    particles.deathBurst(this.x, this.y - 40, '#e8d8a8');
    particles.emit({ x: this.x, y: this.y - 40, vrand: 400, life: 1.2, size: 10, color: '#ffd27d' }, 40);
    g.vfx.play('die', this.x, this.y - 40, { scale: 2, fps: 18 });
    g.player.stats.kills++;
    g.onBossDead(this);
    setTimeout(() => this.phys.remove(this.body), 1200);
  }

  draw(ctx, camX, camY) {
    super.draw(ctx, camX, camY);
    // 狂暴气场
    if (this.enraged && this.alive) {
      ctx.save(); ctx.globalAlpha = 0.25 + Math.sin(this.animT * 6) * 0.1;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = '#ff3020';
      ctx.beginPath(); ctx.ellipse(this.x - camX, this.y - 40 - camY, 40, 52, 0, 0, 7); ctx.fill();
      ctx.restore();
    }
    // 霸体金身
    if (this.armorT > 0 && this.alive) {
      ctx.save(); ctx.globalAlpha = 0.3; ctx.strokeStyle = '#ffd27d'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(this.x - camX, this.y - 36 - camY, 30 * this.def.bulk, 44, 0, 0, 7); ctx.stroke();
      ctx.restore();
    }
  }
}
