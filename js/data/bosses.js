// 十大守阵 Boss：独立 AI（阶段/技能/狂暴）
const B = (id, name, title, o) => ({
  id, name, title, isBoss: true,
  hp: o.hp, atk: o.atk, speed: o.speed || 150, range: o.range || 70, atkCd: o.atkCd || 1.8,
  palette: o.palette, weapon: o.weapon, hat: o.hat || 'helmet', bulk: o.bulk || 1.35, scale: o.scale || 1.3,
  skills: o.skills,           // [{name, kind, dmg, cd, windup, ...}]
  enrage: o.enrage,           // 狂暴描述 {at:0.3, ...}
  knockResist: o.knockResist ?? 0.7, score: o.score || 500,
  second: o.second || null,   // 双 Boss 支援（颜良文丑）
});

const P = {
  huaxiong: { cloth: '#5a2a20', trim: '#c86a3a', skin: '#c89868', weapon: '#c8d0da', hair: '#100c0a' },
  lvbu: { cloth: '#7a1a1a', trim: '#e8b040', skin: '#e0b088', weapon: '#e0d0a0', hair: '#18100c' },
  yan: { cloth: '#3a4a5e', trim: '#8aa0c0', skin: '#d0a070', weapon: '#c0c8d4', hair: '#14100c' },
  wen: { cloth: '#4e3a5e', trim: '#a080c0', skin: '#d0a070', weapon: '#c0c8d4', hair: '#14100c' },
  dun: { cloth: '#2e3e50', trim: '#6a88aa', skin: '#d8a878', weapon: '#bcc4d0', hair: '#101418' },
  liao: { cloth: '#28424e', trim: '#58a0b0', skin: '#ddb086', weapon: '#c8d8dc', hair: '#0f1518' },
  yuan: { cloth: '#503828', trim: '#b08a50', skin: '#d0a070', weapon: '#c8b898', hair: '#181008' },
  pang: { cloth: '#404650', trim: '#c0c8d0', skin: '#d8a878', weapon: '#d0d8e0', hair: '#e8e8e8' },
  meng: { cloth: '#5e4a20', trim: '#c0a040', skin: '#a8765a', weapon: '#b0a070', hair: '#1c140c' },
  sima: { cloth: '#28203a', trim: '#6858a0', skin: '#d8c0a0', weapon: '#a898c8', hair: '#c8c8d0' },
};

export const BOSSES = [
  B('b01', '华雄 · 影', '汜水先锋', {
    hp: 260, atk: 14, palette: P.huaxiong, weapon: 'blade', bulk: 1.3,
    skills: [
      { name: '力劈华山', kind: 'smash_wave', dmg: 1.8, cd: 6, windup: 0.7, vfx: 'boss_stomp', sfx: 'skill_quake' },
      { name: '连环拖刀', kind: 'charge_slash', dmg: 1.5, cd: 8, windup: 0.5, vfx: 'charge', sfx: 'dash' },
    ],
    enrage: { at: 0.3, spdMul: 1.5, cdMul: 0.7 },
  }),
  B('b02', '华雄', '汜水关镇将', {
    hp: 380, atk: 17, palette: P.huaxiong, weapon: 'blade', bulk: 1.35, scale: 1.34,
    skills: [
      { name: '力劈华山·改', kind: 'smash_wave', dmg: 2.0, cd: 5, windup: 0.6, vfx: 'boss_stomp', sfx: 'skill_quake', waves: 2 },
      { name: '沙场旋斩', kind: 'spin_aoe', dmg: 1.6, cd: 9, windup: 0.6, vfx: 'tornado', sfx: 'skill_wind', radius: 170 },
      { name: '召唤刀盾', kind: 'summon', cd: 14, windup: 0.8, units: ['m02', 'm02'], sfx: 'boss_roar' },
    ],
    enrage: { at: 0.3, summon: ['m02', 'm04'] },
  }),
  B('b03', '吕布', '人中吕布 · 马中赤兔', {
    hp: 520, atk: 22, palette: P.lvbu, weapon: 'spear', hat: 'crown', bulk: 1.4, scale: 1.38, range: 95,
    skills: [
      { name: '辕门突刺', kind: 'charge_slash', dmg: 2.2, cd: 6, windup: 0.55, vfx: 'charge', sfx: 'dash', dist: 420 },
      { name: '无双乱舞', kind: 'spin_aoe', dmg: 2.0, cd: 10, windup: 0.7, vfx: 'boss_rage', sfx: 'ult', radius: 220 },
    ],
    enrage: { at: 0.3, kind: 'red_hare', spdMul: 1.4, cdMul: 0.6 },
  }),
  B('b04', '颜良 & 文丑', '河北双雄', {
    hp: 300, atk: 16, palette: P.yan, weapon: 'blade', bulk: 1.3, scale: 1.3,
    second: { name: '文丑', hp: 300, atk: 16, palette: P.wen, weapon: 'spear' },
    skills: [
      { name: '双戟合璧', kind: 'combo_strike', dmg: 1.8, cd: 7, windup: 0.6, vfx: 'slash_5', sfx: 'swing' },
      { name: '河北杀阵', kind: 'spin_aoe', dmg: 1.5, cd: 9, windup: 0.6, vfx: 'tornado', sfx: 'skill_wind', radius: 160 },
    ],
    enrage: { at: 0.3, alternateInvuln: true },
  }),
  B('b05', '夏侯惇', '独目苍狼', {
    hp: 460, atk: 20, palette: P.dun, weapon: 'club', bulk: 1.38, scale: 1.34,
    skills: [
      { name: '独目怒斩', kind: 'smash_wave', dmg: 2.2, cd: 6, windup: 0.65, vfx: 'boss_stomp', sfx: 'skill_quake' },
      { name: '拔矢啖睛', kind: 'burst', dmg: 2.6, cd: 12, windup: 0.9, vfx: 'boss_rage', sfx: 'boss_roar', radius: 200 },
    ],
    enrage: { at: 0.3, summon: ['m11', 'm11'] },
  }),
  B('b06', '张辽', '威震逍遥津', {
    hp: 480, atk: 21, palette: P.liao, weapon: 'blade', speed: 190, bulk: 1.32,
    skills: [
      { name: '威震逍遥津', kind: 'charge_slash', dmg: 2.2, cd: 6, windup: 0.5, vfx: 'charge', sfx: 'dash', dist: 460 },
      { name: '八百突袭', kind: 'shadow_clone', dmg: 1.4, cd: 11, windup: 0.6, vfx: 'moon_dance_2', sfx: 'skill_blink', clones: 2 },
    ],
    enrage: { at: 0.3, kind: 'multi_charge', cdMul: 0.55 },
  }),
  B('b07', '夏侯渊', '虎步关右', {
    hp: 500, atk: 22, palette: P.yuan, weapon: 'dual', speed: 200, bulk: 1.3,
    skills: [
      { name: '妙才疾袭', kind: 'blink_strike', dmg: 2.0, cd: 5.5, windup: 0.4, vfx: 'moon_dance_2', sfx: 'skill_blink' },
      { name: '虎步关右', kind: 'leap_slam', dmg: 2.4, cd: 9, windup: 0.6, vfx: 'boss_stomp', sfx: 'skill_quake', radius: 190 },
    ],
    enrage: { at: 0.3, kind: 'blink', cdMul: 0.6 },
  }),
  B('b08', '庞德', '抬棺死战', {
    hp: 540, atk: 23, palette: P.pang, weapon: 'blade', bulk: 1.36, knockResist: 0.85,
    skills: [
      { name: '抬棺决意', kind: 'armor_up', cd: 12, windup: 0.7, vfx: 'buff_aura', sfx: 'boss_roar', dr: 0.5, dur: 5 },
      { name: '白马乱射', kind: 'arrow_rain', dmg: 1.2, cd: 8, windup: 0.7, vfx: 'arrow_rain', sfx: 'bow', count: 10 },
    ],
    enrage: { at: 0.3, kind: 'last_stand', atkMul: 1.4 },
  }),
  B('b09', '孟获', '南中蛮王', {
    hp: 620, atk: 24, palette: P.meng, weapon: 'axe', hat: null, bulk: 1.5, scale: 1.42, knockResist: 0.8,
    skills: [
      { name: '蛮力践踏', kind: 'leap_slam', dmg: 2.4, cd: 7, windup: 0.65, vfx: 'quake', sfx: 'skill_quake', radius: 210 },
      { name: '藤甲护身', kind: 'armor_up', cd: 14, windup: 0.7, vfx: 'buff_aura', sfx: 'boss_roar', dr: 0.6, dur: 6 },
    ],
    enrage: { at: 0.3, summon: ['m24'] },
  }),
  B('b10', '司马懿', '鹰视狼顾 · 冢虎', {
    hp: 700, atk: 26, palette: P.sima, weapon: 'staff', hat: 'hood', speed: 170, bulk: 1.34, range: 90,
    skills: [
      { name: '鬼谋·黑鸦', kind: 'dark_crows', dmg: 1.6, cd: 6, windup: 0.6, vfx: 'boss_dark', sfx: 'thunder', count: 6 },
      { name: '冢虎噬天', kind: 'drain', dmg: 2.0, cd: 12, windup: 0.9, vfx: 'boss_dark', sfx: 'ult', radius: 260, drain: 0.4 },
    ],
    enrage: { at: 0.3, kind: 'reflect', reflect: 0.3 },
  }),
];

export const BOSS_MAP = Object.fromEntries(BOSSES.map(b => [b.id, b]));
