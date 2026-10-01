#!/bin/bash
# Refresh the USCIS-sourced data (uscis.gov blocks GitHub Actions) and push it.
# Runs daily from a macOS LaunchAgent in a dedicated clone, so it never touches
# a working copy with uncommitted edits.
#   SYNC_DIR  clone to use (default: ~/Library/Application Support/visa-bulletin-sync)
set -euo pipefail
export PATH="/opt/homebrew/bin:$HOME/.local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
REPO="https://github.com/mwdacw/visa-bulletin.git"
DIR="${SYNC_DIR:-$HOME/Library/Application Support/visa-bulletin-sync}"
echo "== $(date '+%Y-%m-%d %H:%M:%S') visa-bulletin USCIS sync"

if [ ! -d "$DIR/.git" ]; then
  git clone -q "$REPO" "$DIR"
  git -C "$DIR" config user.name "Caleb Weng"
  git -C "$DIR" config user.email "caleb.c.weng@gmail.com"
fi
cd "$DIR"

for attempt in 1 2 3; do
  git fetch -q origin main
  git reset -q --hard origin/main      # this clone only ever holds the job's own commits
  status=0
  uv run -q python aos_charts.py || status=1
  uv run -q --with openpyxl --with pypdf python stats.py || status=1
  uv run -q python build.py
  git add docs
  if git diff --cached --quiet; then
    echo "No changes."
    exit $status
  fi
  git commit -q -m "Update USCIS data (Chart B status, I-140/I-485 statistics)"
  if git push -q origin main; then
    echo "Pushed."
    exit $status
  fi
  echo "Push rejected (remote moved); retrying from the new main."
  sleep 10
done
echo "Gave up after 3 attempts." >&2
exit 1
