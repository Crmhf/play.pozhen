// 三十种敌军：6 系 × 5 种。ai: melee(近战) archer(远程) charger(冲锋) caster(施法) tank(格挡) bomber(自爆)
// elite: 精英化开关（红缨强化，数值 ×1.6）
const M = (id, name, family, ai, o) => ({
  id, name, family, ai,
  hp: o.hp, atk: o.atk, speed: o.speed || 120, range: o.range || 46, atkCd: o.atkCd || 1.6,
  windup: o.windup || 0.45, recover: o.recover || 0.5,
  palette: o.palette, weapon: o.weapon || 'sword', hat: o.hat || null, bulk: o.bulk || 0.9,
  scale: o.scale || 0.92, score: o.score || 10, projectile: o.projectile || null,
  blockChance: o.blockChance || 0, knockResist: o.knockResist || 0,
});

const C = {
  yellow: { cloth: '#8a7a28', trim: '#d8c040', skin: '#d9a877', weapon: '#b9c2cc', hair: '#141210' },
  green: { cloth: '#3e5a34', trim: '#7a9a58', skin: '#d9a877', weapon: '#b9c2cc', hair: '#1a1610' },
  blue: { cloth: '#2e4a66', trim: '#6a8aae', skin: '#d9a877', weapon: '#b9c2cc', hair: '#14161c' },
  grey: { cloth: '#4a4c52', trim: '#8a8e98', skin: '#cfa070', weapon: '#aeb6c0', hair: '#101010' },
  red: { cloth: '#7a2e24', trim: '#c86a4a', skin: '#d9a877', weapon: '#b9c2cc', hair: '#1a1210' },
  dark: { cloth: '#2c2530', trim: '#5a4a6a', skin: '#c89878', weapon: '#9aa2ae', hair: '#0e0c12' },
  south: { cloth: '#5a4a26', trim: '#a88a3a', skin: '#a8765a', weapon: '#a89a6a', hair: '#1c140c' },
  elite: { cloth: '#6e1f1f', trim: '#e0b040', skin: '#d9a877', weapon: '#d8c88a', hair: '#140f0f' },
};

export const MONSTERS = [
  // ---- 步卒系 ----
  M('m01', '黄巾贼', '步卒', 'melee', { hp: 30, atk: 6, palette: C.yellow, hat: 'headband', weapon: 'club', speed: 110 }),
  M('m02', '刀盾兵', '步卒', 'tank', { hp: 46, atk: 8, palette: C.green, weapon: 'sword', blockChance: 0.35, speed: 95 }),
  M('m03', '长枪兵', '步卒', 'melee', { hp: 36, atk: 9, palette: C.blue, weapon: 'spear', range: 78, speed: 105 }),
  M('m04', '朴刀手', '步卒', 'melee', { hp: 40, atk: 10, palette: C.grey, weapon: 'blade', speed: 125 }),
  M('m05', '铁甲卒', '步卒', 'tank', { hp: 70, atk: 11, palette: C.grey, hat: 'helmet', weapon: 'blade', bulk: 1.05, blockChance: 0.45, knockResist: 0.5, speed: 80 }),
  // ---- 远程系 ----
  M('m06', '弓箭手', '远程', 'archer', { hp: 26, atk: 7, palette: C.green, weapon: 'bow', range: 320, atkCd: 2.2, projectile: 'arrow' }),
  M('m07', '连弩手', '远程', 'archer', { hp: 30, atk: 5, palette: C.blue, weapon: 'bow', range: 300, atkCd: 2.6, projectile: 'arrow3' }),
  M('m08', '投石兵', '远程', 'archer', { hp: 34, atk: 12, palette: C.grey, weapon: 'staff', range: 340, atkCd: 3.0, projectile: 'stone' }),
  M('m09', '毒镖客', '远程', 'archer', { hp: 26, atk: 6, palette: C.dark, hat: 'hood', weapon: 'fan', range: 260, atkCd: 2.0, projectile: 'poison' }),
  M('m10', '火油兵', '远程', 'bomber', { hp: 30, atk: 18, palette: C.red, weapon: 'staff', speed: 150, projectile: 'firepot' }),
  // ---- 骑兵系 ----
  M('m11', '轻骑兵', '骑兵', 'charger', { hp: 44, atk: 12, palette: C.blue, weapon: 'spear', speed: 260, range: 70, bulk: 1.05, scale: 1.0 }),
  M('m12', '重骑兵', '骑兵', 'charger', { hp: 66, atk: 15, palette: C.grey, hat: 'helmet', weapon: 'spear', speed: 230, bulk: 1.15, scale: 1.05, knockResist: 0.4 }),
  M('m13', '西凉铁骑', '骑兵', 'charger', { hp: 58, atk: 14, palette: C.red, weapon: 'blade', speed: 280, bulk: 1.1, scale: 1.02 }),
  M('m14', '白马义从', '骑兵', 'archer', { hp: 42, atk: 10, palette: C.blue, weapon: 'bow', speed: 240, range: 300, atkCd: 2.4, projectile: 'arrow', scale: 1.0 }),
  M('m15', '虎豹骑', '骑兵', 'charger', { hp: 84, atk: 17, palette: C.dark, hat: 'helmet', weapon: 'spear', speed: 300, bulk: 1.2, scale: 1.08, knockResist: 0.5 }),
  // ---- 奇士系 ----
  M('m16', '方术士', '奇士', 'caster', { hp: 30, atk: 9, palette: C.dark, hat: 'hood', weapon: 'staff', range: 300, atkCd: 3.2, projectile: 'fireball' }),
  M('m17', '巫蛊师', '奇士', 'caster', { hp: 34, atk: 7, palette: C.south, hat: 'hood', weapon: 'staff', range: 280, atkCd: 3.6, projectile: 'curse' }),
  M('m18', '舞刺客', '奇士', 'melee', { hp: 32, atk: 12, palette: C.dark, weapon: 'dual', speed: 200, windup: 0.3 }),
  M('m19', '隐士剑客', '奇士', 'melee', { hp: 52, atk: 14, palette: C.grey, hat: 'hood', weapon: 'sword', speed: 170, windup: 0.32, blockChance: 0.2 }),
  M('m20', '傀儡师', '奇士', 'caster', { hp: 36, atk: 8, palette: C.dark, weapon: 'fan', range: 280, atkCd: 4.0, projectile: 'puppet' }),
  // ---- 南蛮系 ----
  M('m21', '藤甲兵', '南蛮', 'tank', { hp: 60, atk: 10, palette: C.south, weapon: 'sword', blockChance: 0.5, knockResist: 0.3, speed: 90 }),
  M('m22', '蛮刀兵', '南蛮', 'melee', { hp: 46, atk: 12, palette: C.south, weapon: 'blade', speed: 135, bulk: 1.0 }),
  M('m23', '毒蜂手', '南蛮', 'archer', { hp: 30, atk: 8, palette: C.south, weapon: 'fan', range: 260, atkCd: 2.2, projectile: 'poison' }),
  M('m24', '象兵', '南蛮', 'charger', { hp: 110, atk: 18, palette: C.south, weapon: 'club', speed: 190, bulk: 1.5, scale: 1.3, knockResist: 0.7 }),
  M('m25', '洞主悍卒', '南蛮', 'melee', { hp: 56, atk: 13, palette: C.south, weapon: 'axe', speed: 150, bulk: 1.05 }),
  // ---- 精锐系 ----
  M('m26', '陷阵营', '精锐', 'melee', { hp: 70, atk: 15, palette: C.elite, hat: 'helmet', weapon: 'blade', speed: 140, blockChance: 0.25, bulk: 1.05 }),
  M('m27', '先登死士', '精锐', 'melee', { hp: 60, atk: 17, palette: C.elite, weapon: 'dual', speed: 185, windup: 0.28 }),
  M('m28', '白毦兵', '精锐', 'tank', { hp: 90, atk: 13, palette: C.elite, hat: 'helmet', weapon: 'spear', range: 80, blockChance: 0.5, knockResist: 0.4, speed: 100 }),
  M('m29', '无当飞军', '精锐', 'archer', { hp: 50, atk: 12, palette: C.elite, weapon: 'bow', range: 330, atkCd: 2.0, projectile: 'arrow3', speed: 160 }),
  M('m30', '虎卫军', '精锐', 'melee', { hp: 100, atk: 18, palette: C.elite, hat: 'helmet', weapon: 'axe', speed: 130, bulk: 1.15, blockChance: 0.3, knockResist: 0.5 }),
];

export const MONSTER_MAP = Object.fromEntries(MONSTERS.map(m => [m.id, m]));
