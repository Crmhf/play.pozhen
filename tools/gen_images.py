#!/usr/bin/env python3
"""三通道 AI 图像批量生成：A=gpt-image-2(复杂背景) B=minimax image-01(简单图) C=Qwen-image(补充)"""
import json, os, sys, time, base64, urllib.request, concurrent.futures as cf

CH_A_URL = "http://cf.douzimi.com:58728/v1/images/generations"
CH_A_KEY = "sk-LevqgoSsx0T8uoARC17zTQjvkfJO9MFfv8X4Kk5R7Sd9RKxe"
CH_B_URL = "https://api.minimaxi.com/v1/image_generation"
CH_B_KEY = "sk-cp-g2B6sEzavQ5nKqPszn6aqBE9ictkmXkWGYvYU6DjWYL9CxGzwkNSy3hwqrgjBlM54TL5nMPB13-W88kEb76-IavaQHysXVtNN-zogFFcANoiew-aXMYkl9Y"
ROOT = os.path.join(os.path.dirname(__file__), "..")

# (输出路径, 通道, 提示词, 尺寸/比例)
JOBS = [
    ("assets/bg/level01/bg.png", "A", "中国传统水墨画风格游戏背景，春日桃园郊野，粉色桃花盛开，远山如黛，晨雾缭绕，温暖晨光，横版游戏宽幅构图，无人无字，层叠远山", "1536x1024"),
    ("assets/bg/level02/bg.png", "A", "中国传统水墨画游戏背景，边塞雄关汜水关，风沙漫天，黄土城墙与关门，苍凉萧瑟，黄昏光，横版宽幅构图，无人无字", "1536x1024"),
    ("assets/bg/level03/bg.png", "A", "中国传统水墨画游戏背景，虎牢关黄昏，残阳如血，险峻关门剪影，战旗猎猎，战场肃杀之气，横版宽幅构图，无人无字", "1536x1024"),
    ("assets/bg/level04/bg.png", "A", "中国传统水墨画游戏背景，黄河渡口清晨，晨雾弥漫江面，渡口木船，芦苇摇曳，灰蓝色调，横版宽幅构图，无人无字", "1536x1024"),
    ("assets/bg/level05/bg.png", "A", "中国传统水墨画游戏背景，长坂坡古战场，烟尘滚滚，断壁残垣，古桥远山，土黄色调苍凉，横版宽幅构图，无人无字", "1536x1024"),
    ("assets/bg/level06/bg.png", "A", "中国传统水墨画游戏背景，赤壁之战火烧连船，江面战船烈焰冲天，火光映红夜空与江水，浓烟滚滚，横版宽幅构图，无人无字", "1536x1024"),
    ("assets/bg/level07/bg.png", "A", "中国传统水墨画游戏背景，定军山秋色，漫山红叶与金黄秋叶，层峦叠嶂，午后暖阳，战鼓台远眺，横版宽幅构图，无人无字", "1536x1024"),
    ("assets/bg/level08/bg.png", "A", "中国传统水墨画游戏背景，暴雨中的樊城泽国，洪水泛滥淹没城墙，雨幕如注，乌云压城，冷灰蓝色调，横版宽幅构图，无人无字", "1536x1024"),
    ("assets/bg/level09/bg.png", "A", "中国传统水墨画游戏背景，南中密林瘴气，热带雨林古树藤蔓，绿色瘴气弥漫，神秘幽深，斑驳光影，横版宽幅构图，无人无字", "1536x1024"),
    ("assets/bg/level10/bg.png", "A", "中国传统水墨画游戏背景，五丈原星夜，秋夜星空璀璨，将星孤悬，萧瑟原野军营灯火点点，深蓝夜色，横版宽幅构图，无人无字", "1536x1024"),
    ("assets/ui/title_bg.png", "A", "中国传统水墨画，乱世战场全景，千军万马剪影，烽火连天，残阳如血，大气磅礴史诗感，游戏标题背景，无人特写无字", "1536x1024"),
]

def gen_a(prompt, size, out):
    body = json.dumps({"model": "gpt-image-2", "prompt": prompt, "size": size, "n": 1}).encode()
    req = urllib.request.Request(CH_A_URL, data=body, headers={"Authorization": f"Bearer {CH_A_KEY}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=180) as r:
        data = json.loads(r.read())
    item = data["data"][0]
    if item.get("b64_json"):
        return base64.b64decode(item["b64_json"])
    if item.get("url"):
        with urllib.request.urlopen(item["url"], timeout=120) as r:
            return r.read()
    raise RuntimeError("no image in response: " + json.dumps(data)[:200])

def gen_b(prompt, size, out):
    w, h = size.split("x")
    body = json.dumps({"model": "image-01", "prompt": prompt, "aspect_ratio": f"{w}:{h}", "response_format": "base64"}).encode()
    req = urllib.request.Request(CH_B_URL, data=body, headers={"Authorization": f"Bearer {CH_B_KEY}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=180) as r:
        data = json.loads(r.read())
    imgs = data.get("data", {}).get("image_base64") or data.get("image_base64")
    if isinstance(imgs, list):
        return base64.b64decode(imgs[0])
    raise RuntimeError("no image: " + json.dumps(data)[:200])

def gen_c(prompt, size, out):
    body = json.dumps({"model": "Qwen/Qwen-image", "prompt": prompt, "size": size, "n": 1}).encode()
    req = urllib.request.Request(CH_A_URL, data=body, headers={"Authorization": f"Bearer {CH_A_KEY}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=180) as r:
        data = json.loads(r.read())
    item = data["data"][0]
    if item.get("b64_json"):
        return base64.b64decode(item["b64_json"])
    if item.get("url"):
        with urllib.request.urlopen(item["url"], timeout=120) as r:
            return r.read()
    raise RuntimeError("no image: " + json.dumps(data)[:200])

GENS = {"A": gen_a, "B": gen_b, "C": gen_c}
FALLBACK = {"A": ["A", "C", "B"], "B": ["B", "C", "A"], "C": ["C", "A", "B"]}

def run_job(job):
    out, ch, prompt, size = job
    out_path = os.path.join(ROOT, out)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    if os.path.exists(out_path) and os.path.getsize(out_path) > 30000:
        return f"[skip] {out}"
    last = None
    for c in FALLBACK[ch]:
        try:
            raw = GENS[c](prompt, size, out_path)
            with open(out_path, "wb") as f:
                f.write(raw)
            return f"[ok:{c}] {out} ({len(raw)//1024}KB)"
        except Exception as e:
            last = e
            time.sleep(2)
    return f"[FAIL] {out}: {last}"

if __name__ == "__main__":
    with cf.ThreadPoolExecutor(max_workers=3) as ex:
        for msg in ex.map(run_job, JOBS):
            print(msg, flush=True)
    print("ALL DONE")
