#!/bin/bash
# 一键部署：版本戳 → 提交 → 推送GitHub → 部署服务器
set -e
cd "$(dirname "$0")/.."
MSG="${1:-更新}"
python3 tools/bust_version.py
git add -A
git commit -q -m "$MSG" || echo "(无变更)"
TOKEN=$(gh auth token)
git remote set-url origin "https://Crmhf:${TOKEN}@gh-proxy.com/https://github.com/Crmhf/play.pozhen.git"
git push -q origin main || echo "(GitHub 推送失败，继续部署)"
git remote set-url origin https://github.com/Crmhf/play.pozhen.git
tar czf - --exclude='.git' --exclude='.DS_Store' . 2>/dev/null | \
  sshpass -p 'Cr@cf123x56' ssh -o StrictHostKeyChecking=no root@121.41.39.129 \
  "tar xzf - -C /www/wwwroot/play.maozirui.com/webgame/play-pozhen && echo DEPLOYED"
curl -s -o /dev/null -w "online:%{http_code}\n" https://play.maozirui.com/webgame/play-pozhen/
