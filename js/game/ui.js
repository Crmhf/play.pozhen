// UI：标题/选将/剧情卷轴/结算/暂停/Boss横幅/伤害数字/HUD
import { audio } from '../engine/audio.js';
import { InkWarrior } from '../engine/sprite.js';
import { CHARACTERS } from '../data/characters.js';

const $ = id => document.getElementById(id);
const layer = () => $('screen-layer');

export class UI {
  constructor(game) {
    this.game = game;
    this.dmgPool = [];
  }

  clearScreens() { layer().innerHTML = ''; }

  // ---------- 标题 ----------
  showTitle(onStart) {
    this.clearScreens();
    const el = document.createElement('div');
    el.className = 'screen';
    el.innerHTML = `
      <div class="game-title">破陣大亂鬥</div>
      <div class="game-sub">—— 冲锋陷阵 · 一关一关突破敌阵 ——</div>
      <button class="ink-btn" id="btn-start">出 征</button>
      <div class="title-tip">
        PC：A/D 移动 · 空格/W 跳跃 · J 攻击 · K 技能 · L 绝技 · Shift 闪避<br>
        移动端：虚拟摇杆 + 攻/技/绝/跳 &nbsp;|&nbsp; 十阵三国 · 三十兵种 · 十大猛将
      </div>`;
    layer().appendChild(el);
    $('btn-start').onclick = () => { audio.unlock(); audio.play('ui_start'); onStart(); };
  }

  // ---------- 选将 ----------
  showCharSelect(onPick) {
    this.clearScreens();
    const el = document.createElement('div');
    el.className = 'screen dim';
    el.innerHTML = `<div class="select-title">选 择 侠 客</div><div class="char-row"></div>`;
    const row = el.querySelector('.char-row');
    for (const c of CHARACTERS) {
      const card = document.createElement('div');
      card.className = 'char-card';
      card.innerHTML = `
        <div class="portrait"></div>
        <h3>${c.name}</h3>
        <div class="weapon">${c.title} · ${c.weapon}</div>
        <div class="skill-line">技「${c.skill.name}」<br>绝「${c.ult.name}」</div>`;
      // 立绘：AI 原画优先，缺省画程序化小人
      const pv = card.querySelector('.portrait');
      const img = new Image();
      img.onload = () => { pv.style.backgroundImage = `url(${c.portrait})`; };
      img.onerror = () => {
        const cv = document.createElement('canvas'); cv.width = 170; cv.height = 150;
        const ctx = cv.getContext('2d');
        ctx.fillStyle = '#26202c'; ctx.fillRect(0, 0, 170, 150);
        const w = new InkWarrior(c.palette, { weapon: c.weaponType, bulk: c.bulk, hat: c.hat, scale: 1.9 });
        w.draw(ctx, { x: 85, y: 140, dir: 1, animT: 0, atk: null }, 0, 0);
        pv.appendChild(cv);
      };
      img.src = c.portrait;
      card.onclick = () => { audio.play('ui_start'); onPick(c); };
      card.onmouseenter = () => audio.play('ui');
      row.appendChild(card);
    }
    layer().appendChild(el);
  }

  // ---------- 剧情卷轴 ----------
  showStory(lv, onGo) {
    this.clearScreens();
    audio.play('drum_roll');
    const el = document.createElement('div');
    el.className = 'screen dim';
    el.innerHTML = `
      <div class="scroll-wrap">
        <div class="scroll-chapter">${lv.chapter} · ${lv.place}</div>
        <div class="scroll-title">${lv.title}</div>
        <div class="scroll-story">${lv.story}</div>
        <div class="scroll-boss">${lv.bossLine}</div>
        <div class="scroll-hint">— 按任意键 / 点击 破阵 —</div>
      </div>`;
    layer().appendChild(el);
    const go = () => { removeEventListener('keydown', go); el.remove(); audio.play('ui_start'); onGo(); };
    setTimeout(() => addEventListener('keydown', go), 600);
    el.onclick = go;
  }

  // ---------- 结算 ----------
  showLevelClear(lv, stats, onNext) {
    const el = document.createElement('div');
    el.className = 'screen dim';
    el.innerHTML = `
      <div class="result-title win">破 陣 成 功</div>
      <div class="result-stats">
        「${lv.title}」已破<br>
        斩敌 <b>${stats.kills}</b> · 最大连击 <b>${stats.maxCombo}</b> · 总伤害 <b>${Math.round(stats.dmg)}</b>
      </div>
      <button class="ink-btn" id="btn-next">下一阵</button>`;
    layer().appendChild(el);
    audio.play('gong');
    $('btn-next').onclick = () => { audio.play('ui_start'); onNext(); };
  }

  showGameOver(stats, onRetry, onTitle) {
    const el = document.createElement('div');
    el.className = 'screen dim';
    el.innerHTML = `
      <div class="result-title lose">兵 败 如 山</div>
      <div class="result-stats">斩敌 <b>${stats.kills}</b> · 破阵 <b>${stats.levels}</b> 座</div>
      <button class="ink-btn" id="btn-retry">续阵再战</button>
      <button class="ink-btn ghost" id="btn-title">返回大营</button>`;
    layer().appendChild(el);
    $('btn-retry').onclick = () => { audio.play('ui_start'); onRetry(); };
    $('btn-title').onclick = () => { audio.play('ui'); onTitle(); };
  }

  showVictory(stats, onTitle) {
    const el = document.createElement('div');
    el.className = 'screen dim';
    el.innerHTML = `
      <div class="result-title win">天 下 歸 一</div>
      <div class="result-stats">
        十阵皆破，三国烽烟尽散。<br>
        总斩敌 <b>${stats.kills}</b> · 总伤害 <b>${Math.round(stats.dmg)}</b> · 最大连击 <b>${stats.maxCombo}</b>
      </div>
      <button class="ink-btn" id="btn-title">功成身退</button>`;
    layer().appendChild(el);
    audio.play('gong');
    $('btn-title').onclick = () => { audio.play('ui_start'); onTitle(); };
  }

  showPause(onResume, onTitle) {
    const el = document.createElement('div');
    el.className = 'screen dim'; el.id = 'pause-screen';
    el.innerHTML = `
      <div class="pause-tip">暂 停</div>
      <div class="keys-help">
        <b>A/D</b> 移动 · <b>空格/W</b> 跳跃（二段跳）· <b>S</b> 速降<br>
        <b>J</b> 连击 · <b>K</b> 技能 · <b>L</b> 绝技 · <b>Shift</b> 闪避
      </div>
      <button class="ink-btn" id="btn-resume">继续破阵</button>
      <button class="ink-btn ghost" id="btn-quit">返回大营</button>`;
    layer().appendChild(el);
    $('btn-resume').onclick = () => { this.hidePause(); onResume(); };
    $('btn-quit').onclick = () => { this.hidePause(); onTitle(); };
  }
  hidePause() { const el = $('pause-screen'); el && el.remove(); }

  // ---------- HUD ----------
  showHud(charData) {
    $('hud').classList.remove('hidden');
    const pv = $('hud-portrait');
    pv.style.backgroundImage = `url(${charData.portrait})`;
    pv.style.backgroundColor = charData.palette.cloth;
  }
  hideHud() { $('hud').classList.add('hidden'); }
  updateHud(p) {
    $('bar-hp').style.width = `${p.hp / p.maxHp * 100}%`;
    $('hp-text').textContent = `${Math.ceil(p.hp)}/${Math.round(p.maxHp)}`;
    $('bar-mp').style.width = `${p.mp / p.maxMp * 100}%`;
    $('bar-rage').style.width = `${p.rage}%`;
  }
  setLevelName(chapter, name) {
    $('level-name').textContent = name;
    $('level-sub').textContent = chapter;
  }
  updateCombo(n) {
    const el = $('hud-combo');
    if (n >= 2) {
      el.classList.remove('hidden');
      $('combo-num').textContent = n;
      el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    } else el.classList.add('hidden');
  }

  showBossBar(name) {
    $('hud-boss').classList.remove('hidden');
    $('boss-name').textContent = name;
  }
  hideBossBar() { $('hud-boss').classList.add('hidden'); }
  updateBossBar(pct) { $('bar-boss').style.width = `${Math.max(0, pct * 100)}%`; }

  showBossBanner(name, title) {
    const old = $('boss-banner'); old && old.remove();
    const el = document.createElement('div');
    el.id = 'boss-banner';
    el.innerHTML = `<div class="bn">${name}</div><div class="bt">${title}</div>`;
    $('app').appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }

  showUltBanner(charData) {
    this.showToast(`${charData.name} · ${charData.ult.name}！`, 1600);
  }

  showToast(text, ms = 2200) {
    const el = $('stage-toast');
    el.textContent = text;
    el.style.opacity = 1;
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => el.style.opacity = 0, ms);
  }

  // ---------- 伤害数字 ----------
  damageNumber(x, y, val, cls = '') {
    const layerEl = $('dmg-layer');
    const el = document.createElement('div');
    el.className = `dmg ${cls}`;
    el.textContent = cls === 'player' ? `-${val}` : val;
    const cam = this.game.level ? this.game.level.camera.x : 0;
    el.style.left = `${x - cam + innerWidth / 2 + (Math.random() * 24 - 12)}px`;
    el.style.top = `${y + innerHeight * 0.72 - 20}px`;
    layerEl.appendChild(el);
    setTimeout(() => el.remove(), 750);
  }
}
