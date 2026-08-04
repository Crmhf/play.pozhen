// 战斗结算：命中判定 / 伤害 / 连击 / 击退（Hitbox-Hurtbox 逻辑分离）
import { feel } from '../engine/shake.js?v=1785885722';
import { audio } from '../engine/audio.js?v=1785885722';
import { particles } from '../engine/particles.js?v=1785885722';

export class Combat {
  constructor(game) { this.game = game; }

  _targets() { return this.game.enemies.filter(e => e.alive); }

  // 玩家近战：前方扇形
  playerMelee(c) {
    const p = this.game.player;
    const cx = p.x + p.dir * c.range * 0.6, cy = p.y - 34;
    let hits = 0;
    for (const e of this._targets()) {
      const dx = e.x - p.x, dy = Math.abs((e.y - 30) - cy);
      const inFront = c.arc >= 360 || Math.sign(dx || p.dir) === p.dir;
      if (Math.abs(dx) <= c.range + 14 * (e.def.bulk - 1) && dy <= c.arc && inFront) {
        hits += this._hitEnemy(e, c, p);
      }
    }
    this._afterPlayerHit(c, hits, cx, cy);
  }

  // 圆形 AoE
  playerAoE(x, y, radius, dmg, knock, opt = {}) {
    let hits = 0;
    for (const e of this._targets()) {
      if (Math.hypot(e.x - x, (e.y - 30) - y) <= radius + 14 * (e.def.bulk - 1)) {
        hits += this._hitEnemy(e, { dmg: 0, knock, ...opt, _fixedDmg: dmg }, this.game.player);
      }
    }
    if (hits > 0) { feel.shake(Math.min(0.4, 0.1 + hits * 0.04)); }
    return hits;
  }

  // 直线贯穿（冰枪/刀气）
  playerLine(dir, length, halfH, dmg, knock, opt = {}) {
    const p = this.game.player;
    let hits = 0;
    for (const e of this._targets()) {
      const dx = e.x - p.x;
      if (Math.sign(dx || dir) === dir && Math.abs(dx) <= length && Math.abs(e.y - p.y) <= halfH + 30) {
        hits += this._hitEnemy(e, { dmg: 0, knock, ...opt, _fixedDmg: dmg, unblockable: opt.unblockable }, p);
      }
    }
    return hits;
  }

  _hitEnemy(e, c, p) {
    const comboBonus = 1 + Math.min(0.5, p.combo * 0.005); // 连击增伤
    const crit = Math.random() < 0.08 + p.combo * 0.002;
    const base = c._fixedDmg !== undefined ? c._fixedDmg : p.atk * c.dmg;
    const dmg = base * comboBonus * (crit ? 1.6 : 1);
    const died = !e.takeHit(dmg, p.x, { ...c, crit });
    // 打击反馈三件套
    const heavy = (c.dmg || 1) >= 1.5 || crit;
    feel.hitStop(heavy ? 100 : 55);
    feel.shake(heavy ? 0.35 : 0.16);
    audio.play(crit ? 'crit' : (Math.random() < 0.5 ? 'hit' : 'hit2'), { pitch: 1 + Math.min(0.4, p.combo * 0.015) });
    particles.hitSpark(e.x, e.y - 36, p.dir);
    p.stats.dmg += dmg;
    p.addRage(2.5);
    this._addCombo();
    return 1;
  }

  _addCombo() {
    const p = this.game.player;
    p.combo++; p.comboT = 3;
    p.stats.maxCombo = Math.max(p.stats.maxCombo, p.combo);
    if (p.combo % 10 === 0) audio.play('combo_up', { pitch: 1 + p.combo * 0.004 });
    this.game.ui.updateCombo(p.combo);
  }

  _afterPlayerHit(c, hits, cx, cy) {
    const p = this.game.player;
    if (c.vfx) {
      // 刀光贴身：锚在角色身前半步，方向跟随朝向
      this.game.vfx.play(c.vfx, p.x + p.dir * c.range * 0.42, p.y - 36, {
        scale: 1.15 + (c.dmg || 1) * 0.22, fps: 30, flip: p.dir < 0,
        rot: (c.kind === 'slash2' ? 0.6 : c.kind === 'slash3' ? -0.2 : 0) * p.dir,
      });
    }
    if (hits === 0) return;
  }

  // 敌方爆炸（火油兵/Boss 技能用）
  explode(x, y, radius, dmg, source) {
    const p = this.game.player;
    feel.shake(0.5); audio.play('fireball');
    particles.emit({ x, y, vrand: 260, life: 0.5, size: 9, color: '#ff7a30' }, 22);
    if (Math.hypot(p.x - x, (p.y - 30) - y) <= radius) p.takeHit(dmg, x, { knock: 300 });
    // 爆炸也伤敌（友军火力）
    for (const e of this._targets()) {
      if (e !== source && Math.hypot(e.x - x, (e.y - 30) - y) <= radius) e.takeHit(dmg * 0.5, x, { knock: 200 });
    }
  }

  // Boss 范围技命中玩家判定
  bossAoE(x, y, radius, dmg, opt = {}) {
    const p = this.game.player;
    if (Math.hypot(p.x - x, (p.y - 30) - y) <= radius) {
      p.takeHit(dmg, x, opt);
      return true;
    }
    return false;
  }
}
