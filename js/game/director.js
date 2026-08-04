// 攻击令牌导演（operation-ironhold Combat Director）：同时只允许少数敌人真正出手
export class Director {
  constructor(maxAttackers = 3) {
    this.max = maxAttackers;
    this.holders = new Set();
  }
  requestToken(enemy) {
    if (this.holders.size >= this.max) return false;
    this.holders.add(enemy); enemy.hasToken = true;
    return true;
  }
  releaseToken(enemy) { this.holders.delete(enemy); enemy.hasToken = false; }
  reset() { for (const e of this.holders) e.hasToken = false; this.holders.clear(); }
}
