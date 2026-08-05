// 三十种敌军：6 系 × 5 种。ai: melee(近战) archer(远程) charger(冲锋) caster(施法) tank(格挡) bomber(自爆)
// elite: 精英化开关（红缨强化，数值 ×1.6）
const M = (id, name, family, ai, o) => ({
  id, name, family, ai,
  spineMob: o.spineMob || null, mobPx: o.mobPx || 0,
  hp: o.hp, atk: o.atk, speed: o.speed || 120, range: o.range || 76, atkCd: o.atkCd || 1.2,
  windup: o.windup || 0.35, recover: o.recover || 0.55,
  palette: o.palette, weapon: o.weapon || 'sword', hat: o.hat || null, bulk: o.bulk || 0.9,
  scale: o.scale || 1.55, score: o.score || 10, projectile: o.projectile || null,
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
  M('m01', '草寇喽啰', '步卒', 'melee', { spineMob: 'guaiA1a', mobPx: 85, hp: 30, atk: 6, palette: C.yellow, hat: 'headband', weapon: 'club', speed: 110 }),
  M('m02', '刀盾庄丁', '步卒', 'tank', { spineMob: 'guaiA1b', mobPx: 85, hp: 46, atk: 8, palette: C.green, weapon: 'sword', blockChance: 0.35, speed: 95 }),
  M('m03', '长枪武师', '步卒', 'melee', { spineMob: 'guaiA1c', mobPx: 85, hp: 36, atk: 9, palette: C.blue, weapon: 'spear', range: 78, speed: 105 }),
  M('m04', '朴刀好手', '步卒', 'melee', { spineMob: 'guaiA1d', mobPx: 85, hp: 40, atk: 10, palette: C.grey, weapon: 'blade', speed: 125 }),
  M('m05', '铁甲武师', '步卒', 'tank', { spineMob: 'guaiA1e', mobPx: 95, hp: 70, atk: 11, palette: C.grey, hat: 'helmet', weapon: 'blade', bulk: 1.05, blockChance: 0.45, knockResist: 0.5, speed: 80 }),
  // ---- 远程系 ----
  M('m06', '猎户弓手', '远程', 'archer', { spineMob: 'guaiA4a', mobPx: 85, hp: 26, atk: 7, palette: C.green, weapon: 'bow', range: 320, atkCd: 2.2, projectile: 'arrow' }),
  M('m07', '连弩射手', '远程', 'archer', { spineMob: 'guaiA4b', mobPx: 85, hp: 30, atk: 5, palette: C.blue, weapon: 'bow', range: 300, atkCd: 2.6, projectile: 'arrow3' }),
  M('m08', '投石力士', '远程', 'archer', { spineMob: 'guaiA4c', mobPx: 85, hp: 34, atk: 12, palette: C.grey, weapon: 'staff', range: 340, atkCd: 3.0, projectile: 'stone' }),
  M('m09', '毒镖客', '远程', 'archer', { spineMob: 'guaiA4d', mobPx: 85, hp: 26, atk: 6, palette: C.dark, hat: 'hood', weapon: 'fan', range: 260, atkCd: 2.0, projectile: 'poison' }),
  M('m10', '火油狂徒', '远程', 'bomber', { spineMob: 'guaiA4e', mobPx: 85, hp: 30, atk: 18, palette: C.red, weapon: 'staff', speed: 150, projectile: 'firepot' }),
  // ---- 骑兵系 ----
  M('m11', '马帮轻骑', '骑兵', 'charger', { spineMob: 'guaiA3a', mobPx: 110, hp: 44, atk: 12, palette: C.blue, weapon: 'spear', speed: 260, range: 70, bulk: 1.05, scale: 1.7 }),
  M('m12', '重甲铁骑', '骑兵', 'charger', { spineMob: 'guaiA3b', mobPx: 115, hp: 66, atk: 15, palette: C.grey, hat: 'helmet', weapon: 'spear', speed: 230, bulk: 1.15, scale: 1.75, knockResist: 0.4 }),
  M('m13', '塞北狼骑', '骑兵', 'charger', { spineMob: 'guaiA3c', mobPx: 110, hp: 58, atk: 14, palette: C.red, weapon: 'blade', speed: 280, bulk: 1.1, scale: 1.7 }),
  M('m14', '白马游骑', '骑兵', 'archer', { spineMob: 'guaiA3d', mobPx: 110, hp: 42, atk: 10, palette: C.blue, weapon: 'bow', speed: 240, range: 300, atkCd: 2.4, projectile: 'arrow', scale: 1.7 }),
  M('m15', '黑甲骁骑', '骑兵', 'charger', { spineMob: 'guaiA3e', mobPx: 120, hp: 84, atk: 17, palette: C.dark, hat: 'helmet', weapon: 'spear', speed: 300, bulk: 1.2, scale: 1.8, knockResist: 0.5 }),
  // ---- 奇士系 ----
  M('m16', '江湖方士', '奇士', 'caster', { spineMob: 'guaiA6a', mobPx: 85, hp: 30, atk: 9, palette: C.dark, hat: 'hood', weapon: 'staff', range: 300, atkCd: 3.2, projectile: 'fireball' }),
  M('m17', '苗疆蛊巫', '奇士', 'caster', { spineMob: 'guaiA6b', mobPx: 85, hp: 34, atk: 7, palette: C.south, hat: 'hood', weapon: 'staff', range: 280, atkCd: 3.6, projectile: 'curse' }),
  M('m18', '剑舞姬', '奇士', 'melee', { spineMob: 'guaiA6c', mobPx: 85, hp: 32, atk: 12, palette: C.dark, weapon: 'dual', speed: 200, windup: 0.3 }),
  M('m19', '独行剑客', '奇士', 'melee', { spineMob: 'guaiA6d', mobPx: 85, hp: 52, atk: 14, palette: C.grey, hat: 'hood', weapon: 'sword', speed: 170, windup: 0.32, blockChance: 0.2 }),
  M('m20', '傀儡戏师', '奇士', 'caster', { spineMob: 'guaiA6e', mobPx: 85, hp: 36, atk: 8, palette: C.dark, weapon: 'fan', range: 280, atkCd: 4.0, projectile: 'puppet' }),
  // ---- 南蛮系 ----
  M('m21', '藤甲蛮兵', '南蛮', 'tank', { spineMob: 'guaiA5a', mobPx: 85, hp: 60, atk: 10, palette: C.south, weapon: 'sword', blockChance: 0.5, knockResist: 0.3, speed: 90 }),
  M('m22', '蛮刀悍卒', '南蛮', 'melee', { spineMob: 'guaiA5b', mobPx: 85, hp: 46, atk: 12, palette: C.south, weapon: 'blade', speed: 135, bulk: 1.0 }),
  M('m23', '毒蜂猎手', '南蛮', 'archer', { spineMob: 'guaiA5c', mobPx: 85, hp: 30, atk: 8, palette: C.south, weapon: 'fan', range: 260, atkCd: 2.2, projectile: 'poison' }),
  M('m24', '巨象武士', '南蛮', 'charger', { spineMob: 'guaiA5d', mobPx: 150, hp: 110, atk: 18, palette: C.south, weapon: 'club', speed: 190, bulk: 1.5, scale: 2.25, knockResist: 0.7 }),
  M('m25', '洞主亲卫', '南蛮', 'melee', { spineMob: 'guaiA5e', mobPx: 85, hp: 56, atk: 13, palette: C.south, weapon: 'axe', speed: 150, bulk: 1.05 }),
  // ---- 精锐系 ----
  M('m26', '陷阵死士', '精锐', 'melee', { spineMob: 'guaiA7a', mobPx: 95, hp: 70, atk: 15, palette: C.elite, hat: 'helmet', weapon: 'blade', speed: 140, blockChance: 0.25, bulk: 1.05 }),
  M('m27', '先登锐客', '精锐', 'melee', { spineMob: 'guaiA7b', mobPx: 95, hp: 60, atk: 17, palette: C.elite, weapon: 'dual', speed: 185, windup: 0.28 }),
  M('m28', '白羽卫', '精锐', 'tank', { spineMob: 'guaiA7c', mobPx: 100, hp: 90, atk: 13, palette: C.elite, hat: 'helmet', weapon: 'spear', range: 80, blockChance: 0.5, knockResist: 0.4, speed: 100 }),
  M('m29', '飞鹞子', '精锐', 'archer', { spineMob: 'guaiA7d', mobPx: 95, hp: 50, atk: 12, palette: C.elite, weapon: 'bow', range: 330, atkCd: 2.0, projectile: 'arrow3', speed: 160 }),
  M('m30', '金刀卫', '精锐', 'melee', { spineMob: 'guaiA7e', mobPx: 100, hp: 100, atk: 18, palette: C.elite, hat: 'helmet', weapon: 'axe', speed: 130, bulk: 1.15, blockChance: 0.3, knockResist: 0.5 }),
  // ---- 山贼系（A2）----
  M('m31', '山贼喽啰', '山贼', 'melee', { spineMob: 'guaiA2a', mobPx: 85, hp: 44, atk: 10, palette: C.green, weapon: 'club', speed: 130 }),
  M('m32', '山贼刀客', '山贼', 'melee', { spineMob: 'guaiA2b', mobPx: 88, hp: 56, atk: 13, palette: C.grey, weapon: 'blade', speed: 145 }),
  M('m33', '山贼弓手', '山贼', 'archer', { spineMob: 'guaiA2c', mobPx: 82, hp: 38, atk: 9, palette: C.yellow, weapon: 'bow', range: 310, atkCd: 2.1, projectile: 'arrow' }),
  M('m34', '黑风骑手', '山贼', 'charger', { spineMob: 'guaiA2d', mobPx: 108, hp: 72, atk: 15, palette: C.dark, weapon: 'blade', speed: 270, bulk: 1.1 }),
  M('m35', '寨主亲卫', '山贼', 'tank', { spineMob: 'guaiA2e', mobPx: 98, hp: 96, atk: 15, palette: C.elite, hat: 'helmet', weapon: 'axe', blockChance: 0.4, knockResist: 0.4, speed: 110 }),
  // ---- 水鬼系（A8）----
  M('m36', '水鬼卒', '水鬼', 'melee', { spineMob: 'guaiA8a', mobPx: 85, hp: 50, atk: 11, palette: C.blue, weapon: 'sword', speed: 135 }),
  M('m37', '浪里刀', '水鬼', 'melee', { spineMob: 'guaiA8b', mobPx: 88, hp: 60, atk: 14, palette: C.blue, weapon: 'blade', speed: 165, windup: 0.3 }),
  M('m38', '水瘴术士', '水鬼', 'caster', { spineMob: 'guaiA8c', mobPx: 85, hp: 44, atk: 10, palette: C.dark, hat: 'hood', weapon: 'staff', range: 290, atkCd: 3.2, projectile: 'curse' }),
  M('m39', '巨鳌骑', '水鬼', 'charger', { spineMob: 'guaiA8d', mobPx: 112, hp: 90, atk: 16, palette: C.blue, weapon: 'spear', speed: 240, bulk: 1.15, knockResist: 0.4 }),
  M('m40', '水军督卫', '水鬼', 'tank', { spineMob: 'guaiA8e', mobPx: 100, hp: 100, atk: 14, palette: C.grey, hat: 'helmet', weapon: 'spear', range: 80, blockChance: 0.45, knockResist: 0.5, speed: 105 }),
  // ---- 巫蛊系（A9）----
  M('m41', '蛊童', '巫蛊', 'melee', { spineMob: 'guaiA9a', mobPx: 78, hp: 36, atk: 8, palette: C.south, weapon: 'dual', speed: 190, windup: 0.28 }),
  M('m42', '毒巫', '巫蛊', 'archer', { spineMob: 'guaiA9b', mobPx: 82, hp: 40, atk: 9, palette: C.dark, hat: 'hood', weapon: 'fan', range: 270, atkCd: 2.0, projectile: 'poison' }),
  M('m43', '蜈奴', '巫蛊', 'melee', { spineMob: 'guaiA9c', mobPx: 88, hp: 58, atk: 12, palette: C.south, weapon: 'club', speed: 150 }),
  M('m44', '蛊母卫', '巫蛊', 'tank', { spineMob: 'guaiA9d', mobPx: 95, hp: 88, atk: 13, palette: C.south, weapon: 'sword', blockChance: 0.4, knockResist: 0.35, speed: 100 }),
  M('m45', '万蛊祭司', '巫蛊', 'caster', { spineMob: 'guaiA9e', mobPx: 92, hp: 64, atk: 13, palette: C.dark, hat: 'hood', weapon: 'staff', range: 310, atkCd: 3.0, projectile: 'fireball' }),
  // ---- 机关系（A10）----
  M('m46', '木甲兵', '机关', 'melee', { spineMob: 'guaiA10a', mobPx: 88, hp: 62, atk: 12, palette: C.grey, weapon: 'club', speed: 115 }),
  M('m47', '铜偶士', '机关', 'melee', { spineMob: 'guaiA10b', mobPx: 90, hp: 74, atk: 14, palette: C.grey, hat: 'helmet', weapon: 'blade', speed: 120 }),
  M('m48', '机关弩车', '机关', 'archer', { spineMob: 'guaiA10c', mobPx: 92, hp: 66, atk: 8, palette: C.grey, weapon: 'bow', range: 330, atkCd: 2.4, projectile: 'arrow3' }),
  M('m49', '铁傀儡', '机关', 'tank', { spineMob: 'guaiA10d', mobPx: 105, hp: 120, atk: 16, palette: C.grey, hat: 'helmet', weapon: 'club', blockChance: 0.5, knockResist: 0.6, speed: 85 }),
  M('m50', '霹雳机', '机关', 'bomber', { spineMob: 'guaiA10e', mobPx: 90, hp: 46, atk: 20, palette: C.red, weapon: 'staff', speed: 145, projectile: 'firepot' }),
  // ---- 妖兽系（A11）----
  M('m51', '狼妖', '妖兽', 'melee', { spineMob: 'guaiA11a', mobPx: 85, hp: 52, atk: 12, palette: C.dark, weapon: 'dual', speed: 185, windup: 0.28 }),
  M('m52', '蝠妖', '妖兽', 'archer', { spineMob: 'guaiA11b', mobPx: 80, hp: 40, atk: 9, palette: C.dark, weapon: 'fan', range: 260, atkCd: 1.9, projectile: 'poison' }),
  M('m53', '山魈', '妖兽', 'melee', { spineMob: 'guaiA11c', mobPx: 95, hp: 78, atk: 15, palette: C.south, weapon: 'club', speed: 140, bulk: 1.05 }),
  M('m54', '赤豹骑', '妖兽', 'charger', { spineMob: 'guaiA11d', mobPx: 115, hp: 86, atk: 17, palette: C.red, weapon: 'spear', speed: 290, bulk: 1.15 }),
  M('m55', '千年妖将', '妖兽', 'melee', { spineMob: 'guaiA11e', mobPx: 100, hp: 110, atk: 19, palette: C.dark, hat: 'crown', weapon: 'blade', speed: 150, bulk: 1.1, knockResist: 0.4 }),
  // ---- 阴兵系（A12）----
  M('m56', '阴兵卒', '阴兵', 'melee', { spineMob: 'guaiA12a', mobPx: 85, hp: 60, atk: 13, palette: C.dark, weapon: 'sword', speed: 130 }),
  M('m57', '幽影刺', '阴兵', 'melee', { spineMob: 'guaiA12b', mobPx: 82, hp: 52, atk: 16, palette: C.dark, hat: 'hood', weapon: 'dual', speed: 200, windup: 0.26 }),
  M('m58', '招魂幡手', '阴兵', 'caster', { spineMob: 'guaiA12c', mobPx: 85, hp: 56, atk: 12, palette: C.dark, hat: 'hood', weapon: 'staff', range: 300, atkCd: 3.0, projectile: 'curse' }),
  M('m59', '铁面阴将', '阴兵', 'tank', { spineMob: 'guaiA12d', mobPx: 100, hp: 115, atk: 16, palette: C.dark, hat: 'helmet', weapon: 'blade', blockChance: 0.5, knockResist: 0.55, speed: 95 }),
  M('m60', '黄泉骑', '阴兵', 'charger', { spineMob: 'guaiA12e', mobPx: 115, hp: 95, atk: 18, palette: C.dark, hat: 'helmet', weapon: 'spear', speed: 300, bulk: 1.15, knockResist: 0.4 }),
];

export const MONSTER_MAP = Object.fromEntries(MONSTERS.map(m => [m.id, m]));
