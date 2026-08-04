// 输入系统：PC 键盘（WASD+空格+JKL+Shift）+ 移动端虚拟摇杆/按键
export class Input {
  constructor() {
    this.keys = new Set();        // 持续按住
    this.pressed = new Set();     // 本帧按下（edge）
    this.isTouch = (('ontouchstart' in window) && matchMedia('(pointer:coarse)').matches)
      || location.search.includes('touch=1'); // 调试强制触屏UI
    this.joy = { x: 0, y: 0, active: false };
    this._bindKeyboard();
    if (this.isTouch) this._bindTouch();
  }

  _bindKeyboard() {
    addEventListener('keydown', e => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (!e.repeat) { this.keys.add(e.code); this.pressed.add(e.code); }
    });
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
  }

  _bindTouch() {
    document.getElementById('touch-ui').classList.remove('hidden');
    const joy = document.getElementById('joystick'), knob = document.getElementById('joystick-knob');
    const R = 44; let pid = null;
    const setKnob = (dx, dy) => { knob.style.transform = `translate(${dx}px,${dy}px)`; };
    joy.addEventListener('touchstart', e => {
      const t = e.changedTouches[0]; pid = t.identifier; this.joy.active = true; e.preventDefault();
    }, { passive: false });
    addEventListener('touchmove', e => {
      if (pid === null) return;
      for (const t of e.changedTouches) if (t.identifier === pid) {
        const r = joy.getBoundingClientRect();
        let dx = t.clientX - (r.left + r.width / 2), dy = t.clientY - (r.top + r.height / 2);
        const len = Math.hypot(dx, dy) || 1, cl = Math.min(len, R);
        dx = dx / len * cl; dy = dy / len * cl;
        setKnob(dx, dy);
        this.joy.x = dx / R; this.joy.y = dy / R;
        if (this.joy.y < -0.55) this.pressed.add('Space'); // 上推跳跃
      }
    }, { passive: true });
    const end = e => {
      for (const t of e.changedTouches) if (t.identifier === pid) {
        pid = null; this.joy.active = false; this.joy.x = this.joy.y = 0; setKnob(0, 0);
      }
    };
    addEventListener('touchend', end); addEventListener('touchcancel', end);

    const bindBtn = (id, code) => {
      const el = document.getElementById(id);
      el.addEventListener('touchstart', e => { e.preventDefault(); this.keys.add(code); this.pressed.add(code); }, { passive: false });
      el.addEventListener('touchend', () => this.keys.delete(code));
    };
    bindBtn('tb-j', 'KeyJ'); bindBtn('tb-k', 'KeyK'); bindBtn('tb-l', 'KeyL'); bindBtn('tb-jump', 'Space');
  }

  // ---- 语义化查询 ----
  get moveX() {
    let x = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (Math.abs(this.joy.x) > 0.25) x = this.joy.x;
    return x;
  }
  get down() { return this.keys.has('KeyS') || this.keys.has('ArrowDown') || this.joy.y > 0.6; }
  get jumpHeld() { return this.keys.has('Space') || this.keys.has('KeyW') || this.keys.has('ArrowUp'); }
  get runHeld() { return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'); }
  justPressed(code) { return this.pressed.has(code); }
  get jumpPressed() { return this.pressed.has('Space') || this.pressed.has('KeyW') || this.pressed.has('ArrowUp'); }
  get atkPressed() { return this.pressed.has('KeyJ'); }
  get skillPressed() { return this.pressed.has('KeyK'); }
  get ultPressed() { return this.pressed.has('KeyL'); }
  get pausePressed() { return this.pressed.has('KeyP') || this.pressed.has('Escape'); }
  get anyPressed() { return this.pressed.size > 0; }

  endFrame() { this.pressed.clear(); }
}
