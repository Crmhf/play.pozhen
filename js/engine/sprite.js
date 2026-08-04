// 精灵渲染：优先 AI 生成的 sprite sheet，缺省时用水墨程序化骨骼战士
// 程序化渲染器：关节化身体（躯干/头/双臂/双腿/武器），墨块+飞白风格
import { clamp, lerp } from './utils.js?v=1785885522';

export class SpriteSheet {
  constructor() { this.img = null; this.cols = 1; this.rows = 1; this.ready = false; }
  load(url, cols, rows) {
    return new Promise(res => {
      const img = new Image();
      img.onload = () => { this.img = img; this.cols = cols; this.rows = rows; this.ready = true; res(true); };
      img.onerror = () => res(false);
      img.src = url;
    });
  }
  drawFrame(ctx, idx, x, y, w, h, flip) {
    if (!this.ready) return false;
    const fw = this.img.width / this.cols, fh = this.img.height / this.rows;
    const c = idx % this.cols, r = Math.floor(idx / this.cols) % this.rows;
    ctx.save();
    if (flip) { ctx.translate(x + w, y); ctx.scale(-1, 1); ctx.drawImage(this.img, c * fw, r * fh, fw, fh, 0, 0, w, h); }
    else ctx.drawImage(this.img, c * fw, r * fh, fw, fh, x, y, w, h);
    ctx.restore();
    return true;
  }
}

/**
 * 水墨战士程序化渲染器
 * palette: {cloth, trim, skin, weapon, hair}
 * pose 由外部动画状态计算：walkT/runT/attackT(0~1)/attackKind/airT/hurtT/deadT
 */
export class InkWarrior {
  constructor(palette, opts = {}) {
    this.p = palette;
    this.scale = opts.scale || 1;
    this.weapon = opts.weapon || 'sword'; // sword|blade|dual|spear|axe|staff|club|bow|fan
    this.bulk = opts.bulk || 1;           // 体型宽度系数（小兵 0.9，Boss 1.5）
    this.hat = opts.hat || null;          // headband|helmet|hood|crown
  }

  /** state: {x,y,dir,walk,run,atk:{t,kind},air,crouch,hurt,dead,block,cast} */
  draw(ctx, s, camX, camY) {
    const P = this.p, B = this.bulk;
    const x = s.x - camX, y = s.y - camY;   // y = 脚底
    const dir = s.dir || 1;
    const sc = this.scale * (s.scaleMul || 1);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir * sc, sc);

    // 死亡倒地
    if (s.dead !== undefined) {
      const k = clamp(s.dead / 0.6, 0, 1);
      ctx.globalAlpha = 1 - k * 0.9;
      ctx.rotate(-dir * k * 1.5);
      ctx.translate(0, -k * 6);
    }
    // 受击后仰
    if (s.hurt > 0) ctx.rotate(-dir * 0.12 * clamp(s.hurt * 4, 0, 1));

    const walk = s.walk || 0, run = s.run || 0;
    const moving = Math.abs(walk) > 0.01;
    const air = s.air || 0;                 // >0 空中
    const crouch = s.crouch ? 1 : 0;
    const t = s.animT || 0;

    // ---- 腿部运动学 ----
    const legSwing = moving ? Math.sin(t * (run > 0 ? 14 : 10)) * (0.5 + run * 0.25) : 0;
    const bobY = moving ? Math.abs(Math.sin(t * (run > 0 ? 14 : 10))) * 2.2 : Math.sin(t * 2.2) * 0.8;
    const hipY = -34 - (air ? 2 : bobY) + crouch * 10;

    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const legW = 5.5 * B;
    const drawLeg = (phase, front) => {
      const sw = air ? (front ? 0.5 : -0.35) : (moving ? legSwing * phase : 0);
      const kx = Math.sin(sw) * 9 * B, ky = hipY + 16;
      const fx = Math.sin(sw * 1.4) * 13 * B + (air && !front ? -6 : 0);
      const fy = air ? -6 - (front ? 10 : 2) : 0;
      ctx.strokeStyle = front ? P.cloth : shade(P.cloth, -25);
      ctx.lineWidth = legW;
      ctx.beginPath();
      ctx.moveTo(0, hipY);
      ctx.quadraticCurveTo(kx, ky, fx, fy);
      ctx.stroke();
      // 靴
      ctx.fillStyle = '#241d18';
      ctx.fillRect(fx - 3, fy - 3, 9, 5);
    };
    drawLeg(-1, false);
    drawLeg(1, true);

    // ---- 躯干 ----
    const atk = s.atk; // {t, kind} kind: slash1|slash2|slash3|thrust|smash|spin|cast
    let lean = moving ? 0.08 + run * 0.1 : 0;
    if (atk) lean += attackLean(atk);
    ctx.save();
    ctx.translate(0, hipY);
    ctx.rotate(lean * dir * 0 + lean); // dir 已含在 scale
    const torsoH = 26 * B, torsoW = 15 * B;
    // 袍摆
    ctx.fillStyle = shade(P.cloth, -12);
    ctx.beginPath();
    ctx.moveTo(-torsoW * 0.7, torsoH * 0.5);
    ctx.quadraticCurveTo(-torsoW, torsoH + 12 + legSwing * 2, -4, torsoH + 14);
    ctx.lineTo(6, torsoH + 13);
    ctx.quadraticCurveTo(torsoW, torsoH + 10 - legSwing * 2, torsoW * 0.7, torsoH * 0.5);
    ctx.closePath(); ctx.fill();
    // 主躯干（墨块）
    ctx.fillStyle = P.cloth;
    roundRect(ctx, -torsoW / 2, -torsoH * 0.62, torsoW, torsoH, 6); ctx.fill();
    // 衣缘撞色
    ctx.fillStyle = P.trim;
    ctx.fillRect(-torsoW / 2, -2, torsoW, 3.5);
    // 腰带
    ctx.fillStyle = shade(P.trim, -20);
    ctx.fillRect(-torsoW / 2 - 1, 2, torsoW + 2, 4);

    // ---- 头 ----
    const headY = -torsoH * 0.62 - 9 * B;
    ctx.fillStyle = P.skin;
    ctx.beginPath(); ctx.arc(1.5, headY, 7.2 * B, 0, 7); ctx.fill();
    // 发
    ctx.fillStyle = P.hair;
    ctx.beginPath(); ctx.arc(0.5, headY - 2.5, 7.4 * B, Math.PI * 0.95, Math.PI * 2.05); ctx.fill();
    if (this.hat === 'headband') {
      ctx.fillStyle = P.trim; ctx.fillRect(-6.5 * B, headY - 4, 14 * B, 3);
      ctx.strokeStyle = P.trim; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-6 * B, headY - 3);
      ctx.quadraticCurveTo(-12 * B, headY + (moving ? Math.sin(t * 8) * 3 : 2), -16 * B, headY + 4); ctx.stroke();
    } else if (this.hat === 'helmet') {
      ctx.fillStyle = '#3a3f4a';
      ctx.beginPath(); ctx.arc(1, headY - 2, 8 * B, Math.PI, 0); ctx.fill();
      ctx.fillRect(-7 * B, headY - 3, 16 * B, 2.5);
    } else if (this.hat === 'hood') {
      ctx.fillStyle = shade(P.cloth, -30);
      ctx.beginPath(); ctx.arc(0.5, headY - 1, 8.6 * B, Math.PI * 0.8, Math.PI * 2.15); ctx.fill();
    } else if (this.hat === 'crown') {
      ctx.fillStyle = '#d4a017'; ctx.fillRect(-5, headY - 11, 10, 5);
    }
    // 怒目（战斗气质）
    ctx.strokeStyle = '#1a1410'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(3.5, headY - 1.5); ctx.lineTo(7, headY - 0.5); ctx.stroke();

    // ---- 手臂 + 武器 ----
    const shY = -torsoH * 0.45;
    const armPose = computeArmPose(s, t, moving, legSwing);
    // 后臂（深色）
    this._drawArm(ctx, P, B, shY, armPose.back, true);
    // 前臂 + 武器
    this._drawArm(ctx, P, B, shY, armPose.front, false);
    this._drawWeapon(ctx, P, B, shY, armPose.front, s);

    ctx.restore(); // torso
    ctx.restore(); // root
  }

  _drawArm(ctx, P, B, shY, pose, back) {
    ctx.strokeStyle = back ? shade(P.cloth, -35) : shade(P.cloth, 10);
    ctx.lineWidth = 5 * B;
    ctx.beginPath();
    ctx.moveTo(0, shY);
    ctx.quadraticCurveTo(pose.ex * 0.6, shY + pose.ey * 0.6, pose.hx, shY + pose.hy);
    ctx.stroke();
    // 手
    ctx.fillStyle = P.skin;
    ctx.beginPath(); ctx.arc(pose.hx, shY + pose.hy, 2.6 * B, 0, 7); ctx.fill();
  }

  _drawWeapon(ctx, P, B, shY, pose, s) {
    const hx = pose.hx, hy = shY + pose.hy;
    const ang = Math.atan2(pose.wy, pose.wx);
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(ang);
    const W = P.weapon || '#cfd6dd';
    switch (this.weapon) {
      case 'sword': case 'blade': {
        const L = this.weapon === 'blade' ? 34 : 30;
        ctx.strokeStyle = W; ctx.lineWidth = this.weapon === 'blade' ? 4.5 : 3;
        ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(L * B, 0); ctx.stroke();
        ctx.strokeStyle = '#8a6a2a'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-1, -3); ctx.lineTo(-1, 3); ctx.stroke();
        break;
      }
      case 'dual': {
        ctx.strokeStyle = W; ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.moveTo(2, -1); ctx.lineTo(20 * B, -1); ctx.stroke();
        break;
      }
      case 'spear': {
        ctx.strokeStyle = '#7a5a34'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(38 * B, 0); ctx.stroke();
        ctx.fillStyle = W;
        ctx.beginPath(); ctx.moveTo(38 * B, 0); ctx.lineTo(30 * B, -3.5); ctx.lineTo(30 * B, 3.5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#c2352b';
        ctx.beginPath(); ctx.arc(29 * B, 0, 3, 0, 7); ctx.fill();
        break;
      }
      case 'axe': {
        ctx.strokeStyle = '#6a4a28'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(30 * B, 0); ctx.stroke();
        ctx.fillStyle = W;
        ctx.beginPath(); ctx.arc(28 * B, -2, 9 * B, -1.9, 1.2); ctx.lineTo(28 * B, 0); ctx.closePath(); ctx.fill();
        break;
      }
      case 'club': {
        ctx.strokeStyle = '#4a3a52'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(26 * B, 0); ctx.stroke();
        ctx.fillStyle = '#5a6a72';
        ctx.beginPath(); ctx.arc(28 * B, 0, 6 * B, 0, 7); ctx.fill();
        break;
      }
      case 'staff': {
        ctx.strokeStyle = '#5a4a6a'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(24 * B, 0); ctx.stroke();
        ctx.fillStyle = P.trim;
        ctx.beginPath(); ctx.arc(24 * B, 0, 4.5, 0, 7); ctx.fill();
        break;
      }
      case 'bow': {
        ctx.strokeStyle = '#7a5a34'; ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.arc(4, 0, 12 * B, -1.25, 1.25); ctx.stroke();
        ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(4 + Math.cos(-1.25) * 12 * B, Math.sin(-1.25) * 12 * B);
        ctx.lineTo(4 + Math.cos(1.25) * 12 * B, Math.sin(1.25) * 12 * B); ctx.stroke();
        break;
      }
      case 'fan': {
        ctx.fillStyle = P.trim;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 14 * B, -0.5, 0.35); ctx.closePath(); ctx.fill();
        break;
      }
    }
    ctx.restore();
  }
}

// ---------- 姿态计算 ----------
function attackLean(atk) {
  const { t, kind } = atk;
  switch (kind) {
    case 'slash1': return Math.sin(t * Math.PI) * 0.18;
    case 'slash2': return -Math.sin(t * Math.PI) * 0.14;
    case 'slash3': return Math.sin(t * Math.PI) * 0.3;
    case 'thrust': return Math.sin(t * Math.PI) * 0.22;
    case 'smash': return Math.sin(t * Math.PI) * 0.34;
    case 'spin': return 0.1;
    case 'cast': return -0.08;
    default: return 0;
  }
}

function computeArmPose(s, t, moving, legSwing) {
  const idle = { front: { hx: 8, hy: 12, ex: 6, ey: 8, wx: 12, wy: -14 }, back: { hx: -6, hy: 12, ex: -4, ey: 8, wx: 0, wy: 0 } };
  let front = { ...idle.front }, back = { ...idle.back };
  if (moving && !s.atk) {
    front.hx += legSwing * 4; back.hx -= legSwing * 4;
  }
  if (s.air) { front.hy -= 4; front.wy -= 6; back.hy -= 6; }
  if (s.block) { front = { hx: 10, hy: -2, ex: 8, ey: 2, wx: 6, wy: -4 }; }
  const atk = s.atk;
  if (atk) {
    const { t: k, kind } = atk; // k: 0~1
    const sw = Math.sin(k * Math.PI);
    switch (kind) {
      case 'slash1': // 右上到左下
        front = { hx: 10 + sw * 6, hy: -14 + k * 26, ex: 8, ey: -6 + k * 10, wx: 18, wy: -18 + k * 34 }; break;
      case 'slash2': // 反挑
        front = { hx: 12, hy: 12 - sw * 24, ex: 9, ey: 6 - sw * 8, wx: 20, wy: 10 - k * 32 }; break;
      case 'slash3': // 大力横扫
        front = { hx: 14 + sw * 4, hy: -6 + sw * 4, ex: 10, ey: -2, wx: 24 - k * 8, wy: -8 + sw * 6 };
        back = { hx: 6 + sw * 4, hy: -4 + sw * 4, ex: 5, ey: 0, wx: 0, wy: 0 }; break;
      case 'thrust':
        front = { hx: 8 + sw * 12, hy: -4, ex: 6 + sw * 8, ey: -2, wx: 26, wy: 0 }; break;
      case 'smash': // 高举下劈
        front = { hx: 8 + sw * 2, hy: -18 + k * 30, ex: 6, ey: -10 + k * 16, wx: 14, wy: -26 + k * 44 };
        back = { hx: 4 + sw * 2, hy: -16 + k * 26, ex: 3, ey: -8 + k * 12, wx: 0, wy: 0 }; break;
      case 'spin': {
        const a = k * Math.PI * 2;
        front = { hx: Math.cos(a) * 12, hy: Math.sin(a) * 10 - 4, ex: Math.cos(a) * 8, ey: Math.sin(a) * 6, wx: Math.cos(a) * 26, wy: Math.sin(a) * 20 };
        break;
      }
      case 'shoot':
        front = { hx: 12, hy: -6, ex: 10, ey: -4, wx: 14, wy: 0 };
        back = { hx: 4, hy: -6, ex: 3, ey: -4, wx: 0, wy: 0 }; break;
      case 'cast':
        front = { hx: 10, hy: -16 - sw * 4, ex: 8, ey: -10, wx: 8, wy: -22 };
        back = { hx: -2, hy: -14 - sw * 4, ex: -1, ey: -8, wx: 0, wy: 0 }; break;
    }
  }
  return { front, back };
}

// ---------- 颜色工具 ----------
export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
  r = clamp(r, 0, 255); g = clamp(g, 0, 255); b = clamp(b, 0, 255);
  return `rgb(${r},${g},${b})`;
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
