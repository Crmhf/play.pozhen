// 屏幕震动 + 顿帧（打击感双板斧）
import { rand } from './utils.js?v=1785961530';

export class Feel {
  constructor() {
    this.trauma = 0;        // 0~1 震动强度
    this.hitStopT = 0;      // 顿帧剩余
    this.slowMo = 1;        // 时间缩放（慢镜）
    this.slowMoT = 0;
    this.flashT = 0; this.flashColor = '255,255,255';
  }
  shake(amount) { this.trauma = Math.min(1, this.trauma + amount); }
  hitStop(ms) { this.hitStopT = Math.max(this.hitStopT, ms / 1000); }
  slowMotion(scale, ms) { this.slowMo = scale; this.slowMoT = ms / 1000; }
  flash(color, ms = 80) { this.flashColor = color; this.flashT = ms / 1000; }

  update(dt) {
    this.trauma = Math.max(0, this.trauma - dt * 1.8);
    if (this.slowMoT > 0) { this.slowMoT -= dt; if (this.slowMoT <= 0) this.slowMo = 1; }
    if (this.flashT > 0) this.flashT -= dt;
  }
  // 返回本帧时间缩放（顿帧优先于慢镜）
  timeScale() {
    if (this.hitStopT > 0) return 0;
    return this.slowMo;
  }
  consumeHitStop(dt) { if (this.hitStopT > 0) this.hitStopT -= dt; }
  // 位移+旋转双通道噪声震动
  offsets(t) {
    const s = this.trauma * this.trauma;
    return {
      x: s * 14 * (Math.sin(t * 91.7) * 0.6 + Math.sin(t * 47.3) * 0.4),
      y: s * 11 * (Math.sin(t * 83.1 + 2) * 0.6 + Math.sin(t * 59.9) * 0.4),
      rot: s * 0.012 * Math.sin(t * 71.3 + 4),
    };
  }
}

export const feel = new Feel();
