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
    no: 1, name: '桃源迷津', place: '桃花幻境',
    chapter: '第一阵', title: '桃源迷津',
    story: '江湖传言，《破阵图》重现于世，得之可号令武林。桃花迷津外，群寇云集，皆欲夺图。侠客初出茅庐，于此试剑破阵——江湖路远，自此阵始。',
    bossLine: '守阵：熊阔山 · 试阵分身（铁掌震山）',
    scene: {
      seed: 11, skyTop: '#e8b96a', skyBottom: '#8a5a3a', fog: '#c89a6a', sun: '#ffddaa', sunIntensity: 1.3,
      ambient: { type: 'petal', color: 0xf0b8c8 }, texUrl: 'assets/bg2/level01/bg.jpg',
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
    no: 2, name: '黑风狂沙', place: '黑风寨',
    chapter: '第二阵', title: '黑风寨',
    story: '黑风寨沙暴终年不散，寨中刀客杀人越货，号称「过寨留命」。沙暴深处，狂刀沙通天坐镇中军——破此寨门，先破他的旋风刀阵。',
    bossLine: '守阵：沙通天（沙暴狂刀）',
    scene: {
      seed: 22, skyTop: '#d8a558', skyBottom: '#6a4a30', fog: '#b08850', sun: '#ffcc88', sunIntensity: 1.2,
      ambient: { type: 'dust', color: 0xd8b880 }, texUrl: 'assets/bg2/level02/bg.jpg',
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
    no: 3, name: '落霞残阳', place: '落霞关',
    chapter: '第三阵', title: '落霞关',
    story: '落霞关前残阳如血。烈焰刀魔炎无极以火入刀，一刀既出，焦土十里，武林正道屡剿屡败。此阵为天下刀焰之极，唯有快剑能破烈火。',
    bossLine: '守阵：炎无极（烈焰刀魔）',
    scene: {
      seed: 33, skyTop: '#c85a3a', skyBottom: '#4a2030', fog: '#8a4a40', sun: '#ff9a66', sunIntensity: 1.1,
      ambient: { type: 'ember', color: 0xff9a55 }, texUrl: 'assets/bg2/level03/bg.jpg',
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
    no: 4, name: '雾锁寒江', place: '寒江渡',
    chapter: '第四阵', title: '寒江渡',
    story: '寒江大雾，渡口封锁。黑白双煞联骑拦江，杀人无数，双煞合击之术天下无双。雾里听声辨位，破双煞者，方能东渡。',
    bossLine: '守阵：黑白双煞（双煞夹击）',
    scene: {
      seed: 44, skyTop: '#a8bcc8', skyBottom: '#5a6a70', fog: '#9aacb4', sun: '#e8e0c8', sunIntensity: 0.9,
      ambient: { type: 'dust', color: 0xc8d4da }, texUrl: 'assets/bg2/level04/bg.jpg',
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
    no: 5, name: '断魂烟尘', place: '断魂坡',
    chapter: '第五阵', title: '断魂坡',
    story: '断魂坡上烟尘蔽日，马帮、流寇、死士混杂厮杀。独目刀王独孤睚坐镇坡顶，其刀势沉如山岳，据说曾为情自剜一目，刀法自此入魔。',
    bossLine: '守阵：独孤睚（独目刀王）',
    scene: {
      seed: 55, skyTop: '#b09a6a', skyBottom: '#5a4a38', fog: '#a08a60', sun: '#f0d8a0', sunIntensity: 1.0,
      ambient: { type: 'dust', color: 0xc0a878 }, texUrl: 'assets/bg2/level05/bg.jpg',
      ground: '#665540', grass: '#7a7040',
    },
    length: 7800,
    waves: [
      { mobs: ['m11', 'm04', 'm06'] },
      { mobs: ['m12', 'm12', 'm07'] },
      { mobs: ['m15', 'm05', 'm08', 'm09'] },
      { mobs: ['m31', 'm32', 'm33', 'm04'] },
      { mobs: ['m10', 'm10', 'm04', 'm04'] },
      { mobs: ['m13', 'm13', 'm10', 'm06'], elite: true },
      { mobs: ['m26', 'm04', 'm04', 'm07'] },
    ],
    boss: 'b05', bgm: 'battle',
  },
  {
    no: 6, name: '焚江烈焰', place: '焚江楼船',
    chapter: '第六阵', title: '焚江楼船',
    story: '大江之上楼船连环，逍遥阎罗阎罗子纵火封江，火借风势，樯橹成灰。于火海楼船之间破阵登岸，江面赤红如炼狱。',
    bossLine: '守阵：阎罗子（逍遥阎罗）',
    scene: {
      seed: 66, skyTop: '#8a2a1a', skyBottom: '#2a1020', fog: '#6a2820', sun: '#ff7744', sunIntensity: 1.4,
      ambient: { type: 'ember', color: 0xff8844 }, texUrl: 'assets/bg2/level06/bg.jpg',
      ground: '#3a2a28', grass: '#5a3a30',
    },
    length: 8200,
    waves: [
      { mobs: ['m10', 'm06', 'm06', 'm04'] },
      { mobs: ['m16', 'm05', 'm05'] },
      { mobs: ['m36', 'm37', 'm38', 'm06'] },
      { mobs: ['m18', 'm18', 'm06', 'm06'] },
      { mobs: ['m14', 'm15', 'm10'], elite: true },
      { mobs: ['m16', 'm16', 'm10', 'm05'] },
      { mobs: ['m27', 'm07', 'm16', 'm06'] },
      { mobs: ['m39', 'm36', 'm38', 'm10'], elite: true },
    ],
    boss: 'b06', bgm: 'boss',
  },
  {
    no: 7, name: '枫霜血岭', place: '枫霜岭',
    chapter: '第七阵', title: '枫霜岭',
    story: '枫霜岭秋深似血，神行夜叉燕疾风来无影去无踪，杀人只在瞬息。金鼓震天处，老当益壮的侠客将于岭上与此獠一决快慢。',
    bossLine: '守阵：燕疾风（神行夜叉）',
    scene: {
      seed: 77, skyTop: '#d89858', skyBottom: '#7a4a30', fog: '#b07848', sun: '#ffc888', sunIntensity: 1.15,
      ambient: { type: 'leaf', color: 0xd88840 }, texUrl: 'assets/bg2/level07/bg.jpg',
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
      { mobs: ['m51', 'm53', 'm52', 'm06'] },
    ],
    boss: 'b07', bgm: 'battle',
  },
  {
    no: 8, name: '覆雨泽国', place: '覆雨泽',
    chapter: '第八阵', title: '覆雨泽',
    story: '秋雨倾盆，泽国汪洋。抬棺死士石敢死负棺而战，誓与此泽共存亡——棺材里装的不是尸骨，是他输不起的执念。',
    bossLine: '守阵：石敢死（抬棺死士）',
    scene: {
      seed: 88, skyTop: '#4a5a6a', skyBottom: '#1e2830', fog: '#3e4e5c', sun: '#a0b0c0', sunIntensity: 0.7,
      ambient: { type: 'rain', color: 0x8aa8c0 }, texUrl: 'assets/bg2/level08/bg.jpg',
      ground: '#3e4a44', grass: '#4a5e4e',
    },
    length: 9200,
    waves: [
      { mobs: ['m14', 'm06', 'm06', 'm08'] },
      { mobs: ['m28', 'm07', 'm07'] },
      { mobs: ['m15', 'm15', 'm09'], elite: true },
      { mobs: ['m29', 'm29', 'm14', 'm06'] },
      { mobs: ['m28', 'm29', 'm16', 'm10'] },
      { mobs: ['m37', 'm40', 'm56', 'm52'] },
      { mobs: ['m30', 'm14', 'm08'] },
    ],
    boss: 'b08', bgm: 'battle',
  },
  {
    no: 9, name: '万蛊瘴林', place: '南疆瘴林',
    chapter: '第九阵', title: '万蛊瘴林',
    story: '南疆瘴林，毒雾锁径。万蛊蛮王孟蚩驱蛊御兽，藤甲刀枪不入，巨象踏林而来。七进七出瘴林者，方能以武德服蛮心。',
    bossLine: '守阵：孟蚩（万蛊蛮王）',
    scene: {
      seed: 99, skyTop: '#3a5a3a', skyBottom: '#16241a', fog: '#2e4a34', sun: '#c0d890', sunIntensity: 0.8,
      ambient: { type: 'miasma', color: 0x88c068 }, texUrl: 'assets/bg2/level09/bg.jpg',
      ground: '#2e3e28', grass: '#3e5a34',
    },
    length: 10000,
    waves: [
      { mobs: ['m21', 'm22', 'm23', 'm41'] },
      { mobs: ['m22', 'm22', 'm23', 'm17'] },
      { mobs: ['m24', 'm21', 'm21'] },
      { mobs: ['m25', 'm23', 'm17', 'm09'], elite: true },
      { mobs: ['m24', 'm25', 'm29'] },
      { mobs: ['m41', 'm42', 'm43', 'm45'] },
      { mobs: ['m21', 'm21', 'm23', 'm23', 'm17'] },
      { mobs: ['m24', 'm24', 'm25'], elite: true },
      { mobs: ['m44', 'm45', 'm42', 'm23'], elite: true },
    ],
    boss: 'b09', bgm: 'boss',
  },
  {
    no: 10, name: '摘星落崖', place: '摘星崖',
    chapter: '最终阵', title: '摘星崖',
    story: '摘星崖顶，星垂四野。黑衣宰相冥蛇先生以《破阵图》布下最后杀局，鹰视狼顾，毒计无双。此阵一破，武林重归太平——终阵！',
    bossLine: '守阵：冥蛇先生（黑衣宰相）',
    scene: {
      seed: 110, skyTop: '#1c2240', skyBottom: '#0c0e1c', fog: '#1a2030', sun: '#8898d0', sunIntensity: 0.55,
      ambient: { type: 'snow', color: 0xb8c8e8 }, texUrl: 'assets/bg2/level10/bg.jpg',
      ground: '#2a2e3a', grass: '#3a4050',
    },
    length: 11000,
    waves: [
      { mobs: ['m26', 'm27', 'm29'] },
      { mobs: ['m56', 'm57', 'm58', 'm46'] },
      { mobs: ['m28', 'm28', 'm16', 'm20'] },
      { mobs: ['m30', 'm18', 'm18', 'm20'], elite: true },
      { mobs: ['m27', 'm27', 'm29', 'm17'] },
      { mobs: ['m26', 'm26', 'm19', 'm19', 'm16'] },
      { mobs: ['m28', 'm29', 'm29', 'm20'] },
      { mobs: ['m59', 'm57', 'm58', 'm49'], elite: true },
      { mobs: ['m30', 'm30', 'm19', 'm20'], elite: true },
      { mobs: ['m60', 'm55', 'm50', 'm59'], elite: true },
    ],
    boss: 'b10', bgm: 'boss',
  },
];
