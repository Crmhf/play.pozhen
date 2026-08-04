// 通用工具 + 通用状态机（借鉴 YONGZHE 三钩子模式）
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, t) => a + (b - a) * t;
// 阻尼弹簧插值（operation-ironhold 手感核心）
export const damp = (cur, tgt, lambda, dt) => lerp(cur, tgt, 1 - Math.exp(-lambda * dt));
export const rand = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
export const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
export const easeOutBack = t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

export const KEEP = Symbol('KEEP_CURRENT');

/**
 * 通用状态机：owner 需实现
 *  getNextState(state)   —— 纯转移逻辑，返回下一状态或 KEEP
 *  transitionState(from, to) —— 入场副作用（播动画、给初速度）
 *  tickPhysics(state, dt) —— 每帧物理/逻辑
 */
export class StateMachine {
  constructor(owner, initial) {
    this.owner = owner; this.state = initial; this.stateTime = 0;
    owner.transitionState(null, initial, this);
  }
  set(s) { const f = this.state; this.state = s; this.stateTime = 0; this.owner.transitionState(f, s, this); }
  update(dt) {
    let guard = 8, next;
    while (guard-- > 0 && (next = this.owner.getNextState(this.state, this)) !== KEEP) this.set(next);
    this.owner.tickPhysics(this.state, dt, this);
    this.stateTime += dt;
  }
}

// 对象池
export class Pool {
  constructor(create, reset, size = 64) {
    this.create = create; this.reset = reset; this.free = []; this.used = new Set();
    for (let i = 0; i < size; i++) this.free.push(create());
  }
  get() {
    const o = this.free.pop() || this.create();
    this.used.add(o); return o;
  }
  release(o) { if (this.used.delete(o)) { this.reset && this.reset(o); this.free.push(o); } }
  releaseAll() { for (const o of [...this.used]) this.release(o); }
}

// 简单事件总线
export class Bus {
  constructor() { this.map = new Map(); }
  on(ev, fn) { (this.map.get(ev) || this.map.set(ev, []).get(ev)).push(fn); return fn; }
  emit(ev, ...args) { const l = this.map.get(ev); if (l) for (const fn of l) fn(...args); }
}
