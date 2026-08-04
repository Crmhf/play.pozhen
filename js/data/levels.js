// 十关战役：三国剧情 + 场景氛围 + 波次编排 + Boss
// waves: 每波 {mobs:[id...], elite:bool}；清完一波镜头解锁右移
//
// ============ 关卡特色与阵长设计（难度递进分析） ============
// 关  特色                              难度  波次  阵长(px)  设计意图
// 1   教学阵：纯步卒+零星弓手            ★    4+1   4200   熟悉连击/跳跃/技能，节奏宽松
// 2   风沙关隘：刀盾格挡+投石初见        ★★   5+1   5600   引入格挡兵与远程压制，学会绕后
// 3   虎牢：骑兵冲锋初见+精英混编        ★★☆  5+1   6400   骑兵冲撞逼迫跳跃/闪避走位
// 4   渡口晨雾：骑射游击+双Boss          ★★★  5+1   7000   白马义从风筝战术，首遇双Boss夹击
// 5   长坂坡：五波车轮战+自爆火油        ★★★  6+1   7800   高密度混战，火油兵逼迫优先击杀
// 6   赤壁火海：术士火球+刺客切入        ★★★☆ 6+1   8200   地形短兵相接，法术弹幕密集
// 7   定军山：剑客格挡+重骑连环          ★★★★ 6+1   8800   精锐格挡链，考验破防与挑空
// 8   樊城暴雨：远程洪流+虎卫压轴        ★★★★ 6+1   9200   雨中视野受限，箭雨连弩立体压制
// 9   南中瘴林：藤甲减伤+象兵巨兽        ★★★★☆ 7+1  10000   高血量消耗战，瘴气中持久战
// 10  五丈原星夜：全精锐混编终阵         ★★★★★ 7+1  11000   全员精锐+双施法，终局试炼
// 注：阵长含波次交战区(锁屏) + 行军过渡区 + 阵前Boss区；行军区占 ~35%
export const LEVELS = [
  {
    no: 1, name: '黄巾之乱', place: '涿郡桃园',
    chapter: '第一阵', title: '黄巾之乱',
    story: '巨鹿张角揭竿，百万黄巾席卷州郡。涿郡城外，桃花正艳，贼兵前锋已至。四位侠客仗剑出乡关——乱世破阵，自此阵始。',
    bossLine: '守阵：华雄 · 影（先锋试刀）',
    scene: {
      seed: 11, skyTop: '#e8b96a', skyBottom: '#8a5a3a', fog: '#c89a6a', sun: '#ffddaa', sunIntensity: 1.3,
      ambient: { type: 'petal', color: 0xf0b8c8 }, texUrl: 'assets/bg/level01/bg.png',
      ground: '#5a4a32', grass: '#7a8a4a',
    },
    length: 4200,
    waves: [
      { mobs: ['m01', 'm01', 'm01'] },
      { mobs: ['m01', 'm01', 'm03'] },
      { mobs: ['m01', 'm03', 'm06'] },
      { mobs: ['m02', 'm03', 'm01', 'm06'] },
    ],
    boss: 'b01', bgm: 'battle',
  },
  {
    no: 2, name: '温酒斩将', place: '汜水关',
    chapter: '第二阵', title: '温酒斩将',
    story: '十八路诸侯会盟讨董，汜水关前华雄连斩数将，诸侯失色。关云长请战，酒尚温，斩将而还。此阵风沙蔽日，须破关隘重兵。',
    bossLine: '守阵：华雄（真身）',
    scene: {
      seed: 22, skyTop: '#d8a558', skyBottom: '#6a4a30', fog: '#b08850', sun: '#ffcc88', sunIntensity: 1.2,
      ambient: { type: 'dust', color: 0xd8b880 }, texUrl: 'assets/bg/level02/bg.png',
      ground: '#6a5638', grass: '#8a7a48',
    },
    length: 5600,
    waves: [
      { mobs: ['m02', 'm03', 'm04'] },
      { mobs: ['m03', 'm03', 'm06', 'm01'] },
      { mobs: ['m05', 'm06', 'm06', 'm01'] },
      { mobs: ['m04', 'm04', 'm07', 'm02'] },
      { mobs: ['m05', 'm03', 'm03', 'm08'] },
    ],
    boss: 'b02', bgm: 'battle',
  },
  {
    no: 3, name: '虎牢三英', place: '虎牢关',
    chapter: '第三阵', title: '虎牢三英',
    story: '虎牢关下，吕布头戴三叉束发紫金冠，手持方天画戟，独战群雄无败绩。刘关张三英齐上，酣战五十回合。黄昏如血，此阵为天下武勇之极。',
    bossLine: '守阵：吕布',
    scene: {
      seed: 33, skyTop: '#c85a3a', skyBottom: '#4a2030', fog: '#8a4a40', sun: '#ff9a66', sunIntensity: 1.1,
      ambient: { type: 'ember', color: 0xff9a55 }, texUrl: 'assets/bg/level03/bg.png',
      ground: '#4a3630', grass: '#6a4a3a',
    },
    length: 6400,
    waves: [
      { mobs: ['m04', 'm05', 'm06'] },
      { mobs: ['m11', 'm03', 'm03'] },
      { mobs: ['m13', 'm05', 'm07'], elite: true },
      { mobs: ['m11', 'm11', 'm04', 'm06'] },
      { mobs: ['m13', 'm04', 'm04', 'm08', 'm06'] },
    ],
    boss: 'b03', bgm: 'boss',
  },
  {
    no: 4, name: '千里单骑', place: '黄河渡口',
    chapter: '第四阵', title: '千里单骑',
    story: '云长封金挂印，护二嫂千里寻兄。过五关，斩六将，黄河渡口晨雾弥漫，河北名将颜良、文丑联骑拦江。单骑破阵，义薄云天。',
    bossLine: '守阵：颜良 & 文丑（双将夹击）',
    scene: {
      seed: 44, skyTop: '#a8bcc8', skyBottom: '#5a6a70', fog: '#9aacb4', sun: '#e8e0c8', sunIntensity: 0.9,
      ambient: { type: 'dust', color: 0xc8d4da }, texUrl: 'assets/bg/level04/bg.png',
      ground: '#5a5a48', grass: '#6a7a52',
    },
    length: 7000,
    waves: [
      { mobs: ['m03', 'm06', 'm06', 'm02'] },
      { mobs: ['m14', 'm04', 'm05'] },
      { mobs: ['m12', 'm07', 'm07', 'm03'] },
      { mobs: ['m14', 'm12', 'm09'], elite: true },
      { mobs: ['m14', 'm14', 'm12', 'm06', 'm06'] },
    ],
    boss: 'b04', bgm: 'battle',
  },
  {
    no: 5, name: '长坂血战', place: '当阳长坂坡',
    chapter: '第五阵', title: '长坂血战',
    story: '曹军百万压境，玄德携民渡江。赵子龙单骑闯阵，七进七出，怀抱阿斗血染征袍；张翼德立马当阳桥，一声怒喝水倒流。烟尘蔽野，杀声震天。',
    bossLine: '守阵：夏侯惇',
    scene: {
      seed: 55, skyTop: '#b09a6a', skyBottom: '#5a4a38', fog: '#a08a60', sun: '#f0d8a0', sunIntensity: 1.0,
      ambient: { type: 'dust', color: 0xc0a878 }, texUrl: 'assets/bg/level05/bg.png',
      ground: '#665540', grass: '#7a7040',
    },
    length: 7800,
    waves: [
      { mobs: ['m11', 'm04', 'm06'] },
      { mobs: ['m12', 'm12', 'm07'] },
      { mobs: ['m15', 'm05', 'm08', 'm09'] },
      { mobs: ['m10', 'm10', 'm04', 'm04'] },
      { mobs: ['m13', 'm13', 'm10', 'm06'], elite: true },
      { mobs: ['m26', 'm04', 'm04', 'm07'] },
    ],
    boss: 'b05', bgm: 'battle',
  },
  {
    no: 6, name: '赤壁鏖兵', place: '赤壁江面',
    chapter: '第六阵', title: '赤壁鏖兵',
    story: '东风一夜，火船千艘。连环战船烈焰腾空，樯橹灰飞烟灭。曹军溃于水火，江面赤红如昼。张辽率残部死战断后——于火海之中破阵登岸。',
    bossLine: '守阵：张辽',
    scene: {
      seed: 66, skyTop: '#8a2a1a', skyBottom: '#2a1020', fog: '#6a2820', sun: '#ff7744', sunIntensity: 1.4,
      ambient: { type: 'ember', color: 0xff8844 }, texUrl: 'assets/bg/level06/bg.png',
      ground: '#3a2a28', grass: '#5a3a30',
    },
    length: 8200,
    waves: [
      { mobs: ['m10', 'm06', 'm06', 'm04'] },
      { mobs: ['m16', 'm05', 'm05'] },
      { mobs: ['m18', 'm18', 'm06', 'm06'] },
      { mobs: ['m14', 'm15', 'm10'], elite: true },
      { mobs: ['m16', 'm16', 'm10', 'm05'] },
      { mobs: ['m27', 'm07', 'm16', 'm06'] },
    ],
    boss: 'b06', bgm: 'boss',
  },
  {
    no: 7, name: '定军山下', place: '定军山',
    chapter: '第七阵', title: '定军山下',
    story: '汉中争锋，老黄忠据高鼓噪而进，金鼓震天，一刀劈夏侯渊于定军山下。老当益壮，宁移白首之心？秋色漫山，霜叶如旗。',
    bossLine: '守阵：夏侯渊',
    scene: {
      seed: 77, skyTop: '#d89858', skyBottom: '#7a4a30', fog: '#b07848', sun: '#ffc888', sunIntensity: 1.15,
      ambient: { type: 'leaf', color: 0xd88840 }, texUrl: 'assets/bg/level07/bg.png',
      ground: '#5e4a34', grass: '#8a6a38',
    },
    length: 8800,
    waves: [
      { mobs: ['m12', 'm08', 'm08', 'm04'] },
      { mobs: ['m19', 'm06', 'm06', 'm05'] },
      { mobs: ['m15', 'm19', 'm09'], elite: true },
      { mobs: ['m19', 'm19', 'm12', 'm08'] },
      { mobs: ['m26', 'm26', 'm08', 'm07'] },
      { mobs: ['m27', 'm12', 'm16'] },
    ],
    boss: 'b07', bgm: 'battle',
  },
  {
    no: 8, name: '水淹七军', place: '樊城泽国',
    chapter: '第八阵', title: '水淹七军',
    story: '秋雨暴涨，汉水决堤。关云长乘大船急攻，水淹七军，擒于禁、斩庞德，威震华夏。泽国滔滔，暴雨如注，于洪流之上破阵擒将。',
    bossLine: '守阵：庞德',
    scene: {
      seed: 88, skyTop: '#4a5a6a', skyBottom: '#1e2830', fog: '#3e4e5c', sun: '#a0b0c0', sunIntensity: 0.7,
      ambient: { type: 'rain', color: 0x8aa8c0 }, texUrl: 'assets/bg/level08/bg.png',
      ground: '#3e4a44', grass: '#4a5e4e',
    },
    length: 9200,
    waves: [
      { mobs: ['m14', 'm06', 'm06', 'm08'] },
      { mobs: ['m28', 'm07', 'm07'] },
      { mobs: ['m15', 'm15', 'm09'], elite: true },
      { mobs: ['m29', 'm29', 'm14', 'm06'] },
      { mobs: ['m28', 'm29', 'm16', 'm10'] },
      { mobs: ['m30', 'm14', 'm08'] },
    ],
    boss: 'b08', bgm: 'battle',
  },
  {
    no: 9, name: '七擒七纵', place: '南中密林',
    chapter: '第九阵', title: '七擒七纵',
    story: '南中孟获作乱，诸葛丞相南征，攻心为上。泸水瘴起，藤甲如铁，巨象踏林。七擒七纵，南人自此不复反。密林深处，蛮王亲率象阵候驾。',
    bossLine: '守阵：孟获',
    scene: {
      seed: 99, skyTop: '#3a5a3a', skyBottom: '#16241a', fog: '#2e4a34', sun: '#c0d890', sunIntensity: 0.8,
      ambient: { type: 'miasma', color: 0x88c068 }, texUrl: 'assets/bg/level09/bg.png',
      ground: '#2e3e28', grass: '#3e5a34',
    },
    length: 10000,
    waves: [
      { mobs: ['m21', 'm22', 'm23'] },
      { mobs: ['m22', 'm22', 'm23', 'm17'] },
      { mobs: ['m24', 'm21', 'm21'] },
      { mobs: ['m25', 'm23', 'm17', 'm09'], elite: true },
      { mobs: ['m24', 'm25', 'm29'] },
      { mobs: ['m21', 'm21', 'm23', 'm23', 'm17'] },
      { mobs: ['m24', 'm24', 'm25'], elite: true },
    ],
    boss: 'b09', bgm: 'boss',
  },
  {
    no: 10, name: '五丈原', place: '五丈原',
    chapter: '最终阵', title: '五丈原',
    story: '出师未捷身先死，长使英雄泪满襟。秋风五丈原，将星欲坠，司马仲达坚壁不出，鹰视狼顾。此阵既破，天下归一——终阵！',
    bossLine: '守阵：司马懿',
    scene: {
      seed: 110, skyTop: '#1c2240', skyBottom: '#0c0e1c', fog: '#1a2030', sun: '#8898d0', sunIntensity: 0.55,
      ambient: { type: 'snow', color: 0xb8c8e8 }, texUrl: 'assets/bg/level10/bg.png',
      ground: '#2a2e3a', grass: '#3a4050',
    },
    length: 11000,
    waves: [
      { mobs: ['m26', 'm27', 'm29'] },
      { mobs: ['m28', 'm28', 'm16', 'm20'] },
      { mobs: ['m30', 'm18', 'm18', 'm20'], elite: true },
      { mobs: ['m27', 'm27', 'm29', 'm17'] },
      { mobs: ['m26', 'm26', 'm19', 'm19', 'm16'] },
      { mobs: ['m28', 'm29', 'm29', 'm20'] },
      { mobs: ['m30', 'm30', 'm19', 'm20'], elite: true },
    ],
    boss: 'b10', bgm: 'boss',
  },
];
