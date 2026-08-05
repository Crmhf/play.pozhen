#!/usr/bin/env python3
"""幻想江湖风关卡背景（Qwen-Image 通道）→ assets/bg2/levelXX/bg.jpg"""
import json, os, time, base64, urllib.request, concurrent.futures as cf

URL = "http://cf.douzimi.com:58728/v1/images/generations"
KEY = "sk-LevqgoSsx0T8uoARC17zTQjvkfJO9MFfv8X4Kk5R7Sd9RKxe"
ROOT = os.path.join(os.path.dirname(__file__), "..")

STYLE = "仙侠幻想水墨风格游戏背景，幻想江湖，云雾缭绕的浮空仙山，灵光仙气，唯美梦幻光影，横版宽幅构图，层叠景深，无人无字，高质量游戏原画"
JOBS = [
    ("level01", f"{STYLE}，春日桃花幻境，粉色花瓣飘飞于云海，晨曦金光洒落山谷"),
    ("level02", f"{STYLE}，风沙漫天的塞外雄关幻境，黄沙旋舞中有仙鹤掠过，苍凉黄昏"),
    ("level03", f"{STYLE}，残阳如血的险峻关隘幻境，紫红晚霞与灵气流光交织"),
    ("level04", f"{STYLE}，晨雾弥漫的大河渡口幻境，雾气中有灵光闪烁，灰蓝仙境"),
    ("level05", f"{STYLE}，烟尘滚滚的古战场幻境，断壁上藤蔓发光，战魂气息弥漫"),
    ("level06", f"{STYLE}，火烧连船的江面幻境，火焰与灵气交织成赤红光幕，夜空绚烂"),
    ("level07", f"{STYLE}，金秋红叶仙山幻境，枫红与金黄灵叶旋舞，午后圣光"),
    ("level08", f"{STYLE}，暴雨洪流幻境，雨幕中闪电灵光，水雾弥漫的泽国仙境"),
    ("level09", f"{STYLE}，南中密林瘴气幻境，萤光瘴气与发光藤蔓，神秘幽绿仙境"),
    ("level10", f"{STYLE}，星夜原野幻境，流星划过深蓝夜空，将星灵光坠落，萧圣壮美"),
    ("title",   f"{STYLE}，群雄逐鹿的史诗幻境全景，千军万马剪影与灵气洪流，残阳如血"),
]

def gen(prompt, out):
    body = json.dumps({"model": "Qwen/Qwen-Image", "prompt": prompt, "size": "1536x1024", "n": 1}).encode()
    req = urllib.request.Request(URL, data=body, headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=240) as r:
        data = json.loads(r.read())
    url = None
    if data.get("images"):
        url = data["images"][0].get("url")
    elif data.get("data"):
        item = data["data"][0]
        if item.get("b64_json"):
            return base64.b64decode(item["b64_json"])
        url = item.get("url")
    if url:
        with urllib.request.urlopen(url, timeout=120) as r:
            return r.read()
    raise RuntimeError("no image: " + json.dumps(data)[:200])

def run(job):
    name, prompt = job
    out_dir = os.path.join(ROOT, "assets", "bg2", name)
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "bg.png")
    if os.path.exists(out_path) and os.path.getsize(out_path) > 30000:
        return f"[skip] {name}"
    for attempt in range(3):
        try:
            raw = gen(prompt, out_path)
            open(out_path, "wb").write(raw)
            return f"[ok] {name} ({len(raw)//1024}KB)"
        except Exception as e:
            time.sleep(3)
            last = e
    return f"[FAIL] {name}: {last}"

if __name__ == "__main__":
    with cf.ThreadPoolExecutor(max_workers=3) as ex:
        for msg in ex.map(run, JOBS):
            print(msg, flush=True)
    print("FANTASY BG ALL DONE")
