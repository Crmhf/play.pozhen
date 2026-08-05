// Planck.js 物理封装（Box2D 官方 JS 移植）
// PTM: 像素/米 比例。世界：y 向上为正（物理），渲染层做翻转。
export const PTM = 30;

export class Physics {
  constructor() {
    const pl = window.planck;
    this.pl = pl;
    this.world = new pl.World({ gravity: new pl.Vec2(0, -33) });
    this.groundContacts = new Map(); // body -> count
    this._bindContacts();
  }

  px(v) { return v / PTM; }   // 像素 -> 米
  m(v) { return v * PTM; }    // 米 -> 像素

  _bindContacts() {
    const pl = this.pl;
    this.world.on('begin-contact', c => {
      const a = c.getFixtureA(), b = c.getFixtureB();
      this._ground(a, b, +1); this._ground(b, a, +1);
      const ua = a.getBody().getUserData(), ub = b.getBody().getUserData();
      if (ua && ua.onContact) ua.onContact(ub, true);
      if (ub && ub.onContact) ub.onContact(ua, true);
    });
    this.world.on('end-contact', c => {
      const a = c.getFixtureA(), b = c.getFixtureB();
      this._ground(a, b, -1); this._ground(b, a, -1);
    });
  }
  _ground(fA, fB, d) {
    // 脚底 sensor 碰到非 sensor → 落地计数
    if (fA.getUserData() === 'foot' && !fB.isSensor()) {
      const body = fA.getBody();
      this.groundContacts.set(body, Math.max(0, (this.groundContacts.get(body) || 0) + d));
    }
  }
  isGrounded(body) { return (this.groundContacts.get(body) || 0) > 0; }

  // 地面（静态条）：y 为屏幕像素（向下正），物理层取反
  addGround(x, y, w, h) {
    const pl = this.pl;
    const body = this.world.createBody({ position: new pl.Vec2(this.px(x), this.px(-y)) });
    body.createFixture({ shape: new pl.Box(this.px(w / 2), this.px(h / 2)), friction: 0.6 });
    return body;
  }
  // 平台（单向板用静态盒即可，简化）
  addPlatform(x, y, w, h) { return this.addGround(x, y, w, h); }
  // 隐形墙（锁屏边界）
  addWall(x, y, h) {
    const pl = this.pl;
    const body = this.world.createBody({ position: new pl.Vec2(this.px(x), this.px(-y)) });
    body.createFixture({ shape: new pl.Box(this.px(4), this.px(h / 2)) });
    return body;
  }

  /**
   * 角色刚体：动态、固定旋转、低摩擦；附带脚底 sensor
   * 返回 body；userData 存逻辑引用
   */
  addCharacter(x, y, w, h, userData) {
    const pl = this.pl;
    const body = this.world.createBody({
      type: 'dynamic', position: new pl.Vec2(this.px(x), this.px(-y)),
      fixedRotation: true, bullet: true, allowSleep: false,
    });
    body.createFixture({
      shape: new pl.Box(this.px(w / 2), this.px(h / 2)),
      density: 1.2, friction: 0.0, restitution: 0,
    });
    // 脚底 sensor
    const foot = body.createFixture({
      shape: new pl.Box(this.px(w / 2 - 2), this.px(3), new pl.Vec2(0, this.px(-h / 2 - 1)), 0),
      isSensor: true,
    });
    foot.setUserData('foot');
    body.setUserData(userData);
    return body;
  }

  remove(body) { if (body) this.world.destroyBody(body); }

  step(dt) { this.world.step(dt); }

  // 便捷读写：位置为屏幕像素（y 向下正，地面 0，空中为负）；
  // 速度为 y 向上正（正值=上升，负值=下落），与游戏逻辑层约定一致
  getPos(body) { const p = body.getPosition(); return { x: this.m(p.x), y: -this.m(p.y) }; }
  setPos(body, x, y) { body.setPosition(new this.pl.Vec2(this.px(x), this.px(-y))); }
  getVel(body) { const v = body.getLinearVelocity(); return { x: this.m(v.x), y: this.m(v.y) }; }
  setVel(body, x, y) { body.setLinearVelocity(new this.pl.Vec2(this.px(x), this.px(y))); }
  impulse(body, x, y) {
    body.applyLinearImpulse(new this.pl.Vec2(this.px(x), this.px(y)), body.getWorldCenter(), true);
  }
}
