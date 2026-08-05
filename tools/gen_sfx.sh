#!/bin/bash
# 从1700款音效包精选转码游戏音效 → assets/audio/sfx/*.mp3（单声道48k，性能友好）
set -e
AP="/Users/diyuan/Downloads/1.Play/1700款音频素材武器刀剑棍棒打斗挥动弓弩发射重兵器武术枪声音效素材"
OUT="$(dirname "$0")/../assets/audio/sfx"
mkdir -p "$OUT"

conv() { # conv <输出名> <源文件相对路径>
  local name="$1" src="$2"
  [ -s "$OUT/$name.mp3" ] && { echo "[skip] $name"; return; }
  if [ -f "$AP/$src" ]; then
    ffmpeg -y -loglevel error -i "$AP/$src" -ac 1 -ar 44100 -b:a 48k "$OUT/$name.mp3" && echo "[ok] $name"
  else
    echo "[MISS] $src"
  fi
}

# 挥砍破空
conv swing1 "004-113款挥动武器音效/大力挥动-武器1-mcx20070511.wav"
conv swing2 "004-113款挥动武器音效/大力挥动-武器2-mcx20070511.wav"
conv swing3 "004-113款挥动武器音效/使劲抡武器－xh20070517.wav"
conv dash   "004-113款挥动武器音效/带链子武器飞－xh20070518.wav"
# 命中/暴击（重兵器）
conv hit1   "016-28款重兵器类音效/兵器重击1-LTT20070523.wav"
conv hit2   "016-28款重兵器类音效/兵器重击2-LTT20070523.wav"
conv hit3   "016-28款重兵器类音效/兵器重击3-LTT20070523.wav"
conv crit   "016-28款重兵器类音效/2下重击－xh20070518.wav"
# 格挡碰撞（刀剑）
conv clang1 "001-449款刀剑类音效/两把剑碰撞声1-LTT20070524.mp3"
conv clang2 "001-449款刀剑类音效/两把剑碰撞声3-LTT20070524.mp3"
conv combo3 "001-449款刀剑类音效/一整套剑法连击－xh20070509.wav"
# 拳脚命中
conv punch1 "017-32款拳头音效/出拳打中人 打架 01.wav"
conv punch2 "017-32款拳头音效/出拳打人 打架 09.wav"
# 弓弩
conv bow1   "007-49款弓弩类音效/嗖  .mp3"
conv bow3   "007-49款弓弩类音效/多重箭嗖 .mp3"
conv bowhit "007-49款弓弩类音效/射中人.mp3"
# 爆炸/喷火（火油兵、Boss技能）
conv explo1 "015-21款炸弹爆炸音效/(1).mp3"
conv fire1  "010-3款喷火音效/(1).wav"
# 倒地/落地
conv land1  "008-107款打架打斗类音效/倒地 01.wav"
conv die1   "008-107款打架打斗类音效/倒在地面上挣扎.wav"
echo "---"; ls -la "$OUT" | head -25; du -sh "$OUT"
