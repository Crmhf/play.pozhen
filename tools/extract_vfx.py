#!/usr/bin/env python3
"""从 Spine 特效合集提取逐帧 PNG 序列到 assets/vfx/<name>/frame_XX.png"""
import os, re, shutil, sys

SRC = "/Users/diyuan/Downloads/1.Play/A872  800+套Spine特效技能合集/spine特效"
DST = os.path.join(os.path.dirname(__file__), "..", "assets", "vfx")

# 目标名 -> (特效目录, 子目录或None)
MAP = {
    "slash_1":        ("attack_daoguang1", "daoguang"),
    "slash_2":        ("attack_daoguang2", "daoguang"),
    "slash_3":        ("attack_daoguang3", "daoguang"),
    "slash_4":        ("attack_daoguang4", "daoguang"),
    "slash_5":        ("attack_daoguang5", "daoguang"),
    "fly_fire":       ("base_fly_fire", None),
    "fly_thunder":    ("base_fly_thunder", None),
    "fly_arrow":      ("base_fly_arrow", None),
    "fly_poison":     ("base_fly_poison", None),
    "lightning":      ("shandianzi1", None),
    "boss_rage":      ("lvbu_skill1", None),
    "boss_dark":      ("dongzhuo_skill1", None),
    "boss_stomp":     ("zhangfei_skill4", None),
    "die":            ("die_1", "images"),
    "boss_come":      ("ui_bosscome", None),
    "ice_spike":      ("zhenfashi_skill2", None),
    "moon_dance":     ("diaochan_skill1", "001"),
    "moon_dance_2":   ("diaochan_skill1", "002"),
    "sword_rain":     ("jiangwei_skill1", None),
    "quake":          ("menghuo_skill1", None),
    "tornado":        ("wuji_skill3", None),
    "buff_aura":      ("buff", "buff_dianran"),
    "arrow_rain":     ("xiangbing_skill2", None),
    "charge":         ("xiandengsishi_phyattack", None),
}

def frame_key(fn):
    nums = re.findall(r"(\d+)", fn)
    return int(nums[-1]) if nums else 0

def is_frame(fn, dstdir_name, sub):
    if not fn.lower().endswith(".png"):
        return False
    base = fn[:-4]
    # 排除与特效同名的大图集（atlas 贴图）
    if base == dstdir_name:
        return False
    if sub is None and not re.search(r"\d", base):
        return False
    return True

def extract():
    total = 0
    for name, (folder, sub) in MAP.items():
        src_dir = os.path.join(SRC, folder, sub) if sub else os.path.join(SRC, folder)
        out_dir = os.path.join(DST, name)
        if not os.path.isdir(src_dir):
            print(f"[skip] {name}: {src_dir} 不存在")
            continue
        files = [f for f in os.listdir(src_dir) if is_frame(f, folder, sub)]
        files.sort(key=frame_key)
        if not files:
            print(f"[skip] {name}: 无帧文件")
            continue
        os.makedirs(out_dir, exist_ok=True)
        for i, f in enumerate(files):
            shutil.copy2(os.path.join(src_dir, f), os.path.join(out_dir, f"frame_{i:02d}.png"))
        print(f"[ok] {name}: {len(files)} 帧 <- {folder}{'/' + sub if sub else ''}")
        total += len(files)
    print(f"\n共提取 {total} 帧")

if __name__ == "__main__":
    extract()
