#!/bin/bash
# MiniMax music-2.6 生成动感打斗纯音乐 BGM
KEY="sk-cp-g2B6sEzavQ5nKqPszn6aqBE9ictkmXkWGYvYU6DjWYL9CxGzwkNSy3hwqrgjBlM54TL5nMPB13-W88kEb76-IavaQHysXVtNN-zogFFcANoiew-aXMYkl9Y"
URL="https://api.minimaxi.com/v1/music_generation"
OUT="$(dirname "$0")/../assets/audio"
mkdir -p "$OUT"

gen() {
  local name="$1" prompt="$2"
  if [ -s "$OUT/$name.mp3" ]; then echo "[skip] $name"; return; fi
  echo "[gen] $name ..."
  resp=$(curl -s -m 300 -X POST "$URL" \
    -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
    -d "{\"model\":\"music-2.6\",\"prompt\":\"$prompt\",\"instrumental\":true,\"audio_format\":\"mp3\"}")
  echo "$resp" > "/tmp/music_$name.json"
  audio_url=$(echo "$resp" | python3 -c "
import json,sys
try:
    d = json.load(sys.stdin)
    data = d.get('data', {})
    url = data.get('audio_url') or data.get('url') or (data.get('audios') or [{}])[0].get('url')
    print(url or '')
except Exception as e:
    print('')" 2>/dev/null)
  if [ -n "$audio_url" ]; then
    curl -s -m 300 -o "$OUT/$name.mp3" "$audio_url" && echo "[ok] $name ($(du -h $OUT/$name.mp3 | cut -f1))"
  else
    # 尝试 hex/base64 内嵌
    python3 -c "
import json, base64
d = json.load(open('/tmp/music_$name.json'))
data = d.get('data', {})
h = data.get('audio_hex') or data.get('hex') or ''
b = data.get('audio_base64') or data.get('base64') or ''
if h: open('$OUT/$name.mp3','wb').write(bytes.fromhex(h)); print('[ok-hex] $name')
elif b: open('$OUT/$name.mp3','wb').write(base64.b64decode(b)); print('[ok-b64] $name')
else: print('[FAIL] $name:', json.dumps(d)[:300])
"
  fi
}

gen "title"  "Epic traditional Chinese battle theme, taiko drums, erhu and dizi flute, heroic wuxia atmosphere, slow building tension, instrumental, 90 BPM"
gen "battle" "Intense fast-paced fighting game music, driving taiko drum rhythm, aggressive Chinese guzheng riffs, dynamic action energy, instrumental, 140 BPM"
gen "boss"   "Dark epic boss battle music, thunderous war drums, dramatic brass and Chinese strings, menacing and powerful, climactic showdown, instrumental, 150 BPM"
gen "victory" "Triumphant Chinese victory fanfare, bright dizi flute melody, celebratory drums and gongs, heroic resolution, instrumental, 110 BPM"
echo "MUSIC ALL DONE"; ls -la "$OUT"
