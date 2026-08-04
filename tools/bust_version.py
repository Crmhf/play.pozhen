#!/usr/bin/env python3
"""给本地模块引用加版本戳（每次部署前运行）：驱逐浏览器旧缓存"""
import os, re, sys, time

ROOT = os.path.join(os.path.dirname(__file__), "..")
V = str(int(time.time()))

def bust_js(path):
    orig = open(path).read()
    # 静态/动态 import 的相对路径 .js
    def rep(m):
        quote, p = m.group(1), m.group(2)
        if p.startswith("http") or "?v=" in p:
            return m.group(0)
        return f"from {quote}{p}?v={V}{quote}"
    s = re.sub(r"""from\s*(['"])(\.\.?/[^'"]+?\.js)\1""", rep, orig)
    s = re.sub(r"""import\(\s*(['"])(\.\.?/[^'"]+?\.js)\1\s*\)""",
               lambda m: f"import({m.group(1)}{m.group(2)}?v={V}{m.group(1)})" if "?v=" not in m.group(2) else m.group(0), s)
    if s != orig:
        open(path, "w").write(s)
        return True
    return False

def bust_html(path):
    s = open(path).read()
    s = re.sub(r'(href="css/[^"?]+?\.css)(\?v=\d+)?"', lambda m: f'{m.group(1)}?v={V}"', s)
    s = re.sub(r'(src="js/[^"?]+?\.js)(\?v=\d+)?"', lambda m: f'{m.group(1)}?v={V}"', s)
    open(path, "w").write(s)

def strip_old(path):
    """先清掉旧版本戳再加新的"""
    s = open(path).read()
    s = re.sub(r'\.js\?v=\d+', '.js', s)
    s = re.sub(r'\.css\?v=\d+', '.css', s)
    open(path, "w").write(s)

if __name__ == "__main__":
    files = []
    for dp, _, fns in os.walk(os.path.join(ROOT, "js")):
        for fn in fns:
            if fn.endswith(".js") and "vendor" not in dp:
                files.append(os.path.join(dp, fn))
    files.append(os.path.join(ROOT, "index.html"))
    for f in files:
        strip_old(f)
    n = 0
    for f in files:
        if f.endswith("index.html"):
            bust_html(f); n += 1
        elif bust_js(f):
            n += 1
    print(f"version bump ?v={V} on {n} files")
