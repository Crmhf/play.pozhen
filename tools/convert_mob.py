#!/usr/bin/env python3
"""将 Spine 3.5 JSON（skins 为对象）转换为 3.8 兼容格式（skins 为数组），就地转换 assets/spine-mobs/*/"""
import json, os, sys

ROOT = os.path.join(os.path.dirname(__file__), "..", "assets", "spine-mobs")

def convert_file(path):
    d = json.load(open(path))
    skins = d.get("skins")
    if isinstance(skins, dict):
        d["skins"] = [{"name": name, "attachments": atts} for name, atts in skins.items()]
        json.dump(d, open(path, "w"), separators=(",", ":"))
        return True
    return False

if __name__ == "__main__":
    n = 0
    for mob in sorted(os.listdir(ROOT)):
        d = os.path.join(ROOT, mob)
        if not os.path.isdir(d):
            continue
        for fn in os.listdir(d):
            if fn.endswith(".json"):
                if convert_file(os.path.join(d, fn)):
                    n += 1
                    print(f"[converted] {mob}/{fn}")
    print(f"共转换 {n} 个 JSON")
