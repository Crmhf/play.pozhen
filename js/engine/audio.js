// 音频引擎：MiniMax music-2.6 生成的 BGM + WebAudio 程序化战斗音效（零延迟、零文件）
import { rand, pick } from './utils.js?v=1785948459';

class AudioEngine {
  constructor() {
    this.ctx = null; this.master = null; this.sfxGain = null; this.bgmGain = null;
    this.bgmEl = new Audio(); this.bgmEl.loop = true;
    this.bgmName = null; this.enabled = true; this._noiseBuf = null;
    this._proceduralBgm = null;
    // 采样音效（assets/audio/sfx/）：解码缓存 + 声部限流
    this._samples = new Map();   // name -> AudioBuffer | 'loading'
    this._voices = 0;            // 当前并发声部
    this._lastPlay = new Map();  // 同名限频
  }

  // 采样名映射（值数组=随机选一）
  static SAMPLES = {
    swing: ['swing1', 'swing2'], swing2: ['swing3', 'swing1'],
    hit: ['hit1', 'hit2'], hit2: ['hit3', 'hit2'], crit: ['crit'],
    clang: ['clang1', 'clang2'], dash: ['dash'],
    bow: ['bow1'], fireball: ['fire1'], thunder: ['explo1'],
    land: ['land1'], die: ['die1'], hurt: ['punch1', 'punch2'],
    bowhit: ['bowhit'], combo3: ['combo3'],
  };

  // 懒加载采样（首次解锁后后台解码，不阻塞）
  preloadSamples() {
    if (!this.ctx || this._preloaded) return;
    this._preloaded = true;
    const names = new Set();
    for (const arr of Object.values(AudioEngine.SAMPLES)) arr.forEach(n => names.add(n));
    for (const n of names) this._loadSample(n);
  }
  async _loadSample(name) {
    if (this._samples.has(name)) return;
    this._samples.set(name, 'loading');
    try {
      const r = await fetch(`assets/audio/sfx/${name}.mp3`);
      const buf = await this.ctx.decodeAudioData(await r.arrayBuffer());
      this._samples.set(name, buf);
    } catch (e) { this._samples.delete(name); }
  }
  _playSample(name, pitch = 1, vol = 1) {
    const buf = this._samples.get(name);
    if (!buf || buf === 'loading') return false;
    if (this._voices >= 10) return true; // 声部限流：丢弃但不回退
    const now = performance.now();
    if (now - (this._lastPlay.get(name) || 0) < 40) return true; // 同名40ms限频
    this._lastPlay.set(name, now);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = pitch * (0.94 + Math.random() * 0.12); // 微随机防机械感
    const g = this.ctx.createGain();
    g.gain.value = Math.min(1, vol);
    src.connect(g).connect(this.sfxGain);
    this._voices++;
    src.onended = () => this._voices--;
    src.start();
    return true;
  }

  // 必须由用户手势触发一次；任何环境下音频失败都不阻塞游戏
  unlock() {
    try {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.9; this.master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = 0.85; this.sfxGain.connect(this.master);
      this.bgmGain = this.ctx.createGain(); this.bgmGain.gain.value = 0.5; this.bgmGain.connect(this.master);
      // 预生成噪声 buffer
      const len = this.ctx.sampleRate * 1.2, buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this._noiseBuf = buf;
      setTimeout(() => this.preloadSamples(), 100);
    } catch (e) { this.ctx = null; }
  }

  setBgmVolume(v) { this.bgmGain && (this.bgmGain.gain.value = v); this.bgmEl.volume = Math.min(1, v); }

  // ---------- BGM ----------
  playBgm(name) {
    if (this.bgmName === name) return;
    this.bgmName = name;
    this.stopProceduralBgm();
    this.bgmEl.pause();
    // 优先使用生成的音乐文件，失败回退程序化战鼓
    const url = `assets/audio/${name}.mp3`;
    fetch(url, { method: 'HEAD' }).then(r => {
      if (r.ok && this.bgmName === name) {
        this.bgmEl.src = url; this.bgmEl.volume = 0.55;
        this.bgmEl.play().catch(() => this._startProceduralBgm(name));
      } else if (this.bgmName === name) this._startProceduralBgm(name);
    }).catch(() => this._startProceduralBgm(name));
  }
  stopBgm() { this.bgmName = null; this.bgmEl.pause(); this.stopProceduralBgm(); }

  // 程序化战鼓 BGM 降级：太鼓 + 低音脉冲 + 铜锣点缀
  _startProceduralBgm(mode) {
    if (!this.ctx || this._proceduralBgm) return;
    const ctx = this.ctx, bpm = mode === 'boss' ? 150 : 132, beat = 60 / bpm;
    let step = 0, timer = null;
    const drum = (freq, decay, vol, type = 'sine') => {
      const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * 0.4), t + decay);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + decay);
      o.connect(g).connect(this.bgmGain); o.start(t); o.stop(t + decay + 0.02);
    };
    const hat = () => {
      const t = ctx.currentTime, s = ctx.createBufferSource(), g = this.ctx.createGain(), f = ctx.createBiquadFilter();
      s.buffer = this._noiseBuf; f.type = 'highpass'; f.frequency.value = 8000;
      g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      s.connect(f).connect(g).connect(this.bgmGain); s.start(t); s.stop(t + 0.06);
    };
    const pattern = () => { // 16 步：太鼓战阵节奏
      const s = step % 16;
      if ([0, 3, 6, 8, 11, 14].includes(s)) drum(120, 0.28, 0.5);
      if ([4, 12].includes(s)) drum(70, 0.4, 0.65);          // 重鼓
      if (s === 15 && Math.random() < 0.5) drum(90, 0.2, 0.4);
      if (s % 2 === 0) hat();
      if (s === 0 && Math.random() < 0.25) drum(900, 0.9, 0.1, 'triangle'); // 远锣
      step++;
    };
    timer = setInterval(pattern, beat * 250); // 16 分音符
    this._proceduralBgm = { stop: () => clearInterval(timer) };
  }
  stopProceduralBgm() { this._proceduralBgm && this._proceduralBgm.stop(); this._proceduralBgm = null; }

  // ---------- SFX 基元 ----------
  _env(gainNode, t, vol, a, d) {
    const g = gainNode.gain;
    g.setValueAtTime(0, t); g.linearRampToValueAtTime(vol, t + a);
    g.exponentialRampToValueAtTime(0.001, t + a + d);
  }
  _osc(type, f0, f1, dur, vol, bendT) {
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + (bendT || dur));
    this._env(g, t, vol, 0.005, dur);
    o.connect(g).connect(this.sfxGain); o.start(t); o.stop(t + dur + 0.05);
  }
  _noise(dur, vol, filterType = 'bandpass', freq = 2000, q = 1, sweepTo) {
    const ctx = this.ctx, t = ctx.currentTime;
    const s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    s.buffer = this._noiseBuf; s.loop = true;
    f.type = filterType; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    this._env(g, t, vol, 0.004, dur);
    s.connect(f).connect(g).connect(this.sfxGain); s.start(t); s.stop(t + dur + 0.05);
  }

  // ---------- 战斗音效 ----------
  play(name, opt = {}) {
    if (!this.ctx || !this.enabled) return;
    const p = opt.pitch || 1, v = opt.vol || 1;
    // 采样优先：命中映射且已解码则用真实音效
    const smp = AudioEngine.SAMPLES[name];
    if (smp && this._playSample(smp[Math.floor(Math.random() * smp.length)], p, v)) return;
    switch (name) {
      case 'swing':   // 挥砍破空
        this._noise(0.12, 0.25 * v, 'bandpass', 1200 * p, 2, 3500 * p); break;
      case 'swing2':
        this._noise(0.1, 0.22 * v, 'bandpass', 1800 * p, 2, 5000 * p); break;
      case 'hit':     // 命中：低频冲击 + 高频金属
        this._osc('sine', 160 * p, 45, 0.14, 0.55 * v);
        this._noise(0.08, 0.3 * v, 'highpass', 3000, 1); break;
      case 'hit2':
        this._osc('sine', 200 * p, 50, 0.12, 0.5 * v);
        this._noise(0.06, 0.25 * v, 'highpass', 4200, 1); break;
      case 'crit':    // 暴击
        this._osc('sine', 220, 40, 0.22, 0.7 * v);
        this._osc('square', 1800, 900, 0.08, 0.15 * v);
        this._noise(0.15, 0.4 * v, 'highpass', 2500, 1); break;
      case 'clang':   // 格挡金属
        this._osc('square', 2400 * p, 1600, 0.09, 0.12 * v);
        this._noise(0.1, 0.2 * v, 'bandpass', 5200, 4); break;
      case 'jump':
        this._noise(0.1, 0.12 * v, 'bandpass', 600, 1.5, 1600); break;
      case 'land':
        this._osc('sine', 130, 55, 0.09, 0.3 * v); break;
      case 'dash':
        this._noise(0.18, 0.2 * v, 'bandpass', 900, 1, 2600); break;
      case 'hurt':    // 玩家受击
        this._osc('sawtooth', 300, 90, 0.18, 0.35 * v);
        this._noise(0.1, 0.2 * v, 'lowpass', 800, 1); break;
      case 'die':     // 敌亡
        this._osc('sawtooth', 240 * p, 40, 0.35, 0.3 * v);
        this._noise(0.25, 0.2 * v, 'lowpass', 1200, 1, 200); break;
      case 'skill_wind':   // 风卷残云
        this._noise(0.5, 0.3 * v, 'bandpass', 800, 1.2, 3200);
        this._osc('sine', 300, 900, 0.4, 0.15 * v); break;
      case 'skill_quake':  // 裂地斩
        this._osc('sine', 90, 28, 0.5, 0.8 * v);
        this._noise(0.4, 0.45 * v, 'lowpass', 500, 1); break;
      case 'skill_blink':  // 瞬身
        this._noise(0.15, 0.25 * v, 'highpass', 4000, 1, 8000);
        this._osc('sine', 1200, 2400, 0.12, 0.1 * v); break;
      case 'skill_ice':    // 冰霜突刺
        this._osc('triangle', 2200, 3400, 0.25, 0.15 * v);
        this._noise(0.3, 0.2 * v, 'highpass', 6000, 2); break;
      case 'ult':     // 绝技：太鼓 + 编钟 + 爆发
        this._osc('sine', 65, 25, 0.9, 1.0 * v);
        this._osc('triangle', 1568, 1568, 0.6, 0.12 * v);
        this._osc('triangle', 2093, 2093, 0.7, 0.09 * v);
        this._noise(0.7, 0.4 * v, 'lowpass', 2000, 1, 150); break;
      case 'bow':     // 弓箭
        this._noise(0.06, 0.18 * v, 'bandpass', 2600, 3, 5200); break;
      case 'fireball':
        this._noise(0.35, 0.25 * v, 'bandpass', 500, 1, 1400); break;
      case 'thunder':
        this._noise(0.3, 0.5 * v, 'lowpass', 3000, 1, 200);
        this._osc('sawtooth', 800, 100, 0.25, 0.2 * v); break;
      case 'boss_roar':   // Boss 登场
        this._osc('sawtooth', 90, 45, 0.9, 0.6 * v);
        this._osc('sine', 55, 30, 1.1, 0.7 * v);
        this._noise(0.8, 0.3 * v, 'lowpass', 400, 1); break;
      case 'boss_die':
        this._osc('sine', 70, 22, 1.4, 0.9 * v);
        this._noise(1.2, 0.5 * v, 'lowpass', 2500, 1, 100);
        this._osc('triangle', 1046, 1046, 1.0, 0.1 * v); break;
      case 'heal':
        this._osc('sine', 520, 1040, 0.3, 0.15 * v);
        this._osc('sine', 780, 1560, 0.4, 0.1 * v); break;
      case 'pickup':
        this._osc('square', 880, 1320, 0.08, 0.1 * v); break;
      case 'combo_up':  // 连击升阶
        this._osc('triangle', 660 * p, 1320 * p, 0.1, 0.14 * v); break;
      case 'ui':
        this._osc('triangle', 700, 900, 0.06, 0.1 * v); break;
      case 'ui_start':
        this._osc('triangle', 523, 523, 0.12, 0.14 * v);
        setTimeout(() => this._osc('triangle', 784, 784, 0.18, 0.14 * v), 90); break;
      case 'gong':    // 过关铜锣
        this._osc('triangle', 392, 380, 1.6, 0.4 * v);
        this._osc('sine', 588, 570, 1.4, 0.2 * v);
        this._noise(0.4, 0.15 * v, 'bandpass', 1200, 2); break;
      case 'drum_roll':   // 剧情鼓点
        for (let i = 0; i < 5; i++) setTimeout(() =>
          this._osc('sine', 110, 50, 0.15, 0.35), i * 110); break;
    }
  }
}

export const audio = new AudioEngine();
