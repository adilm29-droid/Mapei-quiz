"""
MAPEI QUIZ - AUTO UPDATER
Run this script whenever Claude gives you updated files.
It automatically downloads, places and deploys everything.

Usage: python update.py
"""

import os
import subprocess
import urllib.request
import json

PROJECT = r"C:\Users\adilm\mapei_quiz\mapei-quiz"

# ── FILE MAP ─────────────────────────────────────────────────────────────────
# Add any file URL here and it will be auto-downloaded and placed correctly.
# Claude will give you updated URLs when changes are needed.
FILES = {
    # "URL_HERE": r"src\app\page.js",
}

# ── HELPER ───────────────────────────────────────────────────────────────────
def run(cmd, cwd=PROJECT):
    result = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)
    if result.stdout: print(result.stdout.strip())
    if result.stderr and 'warning' not in result.stderr.lower(): print(result.stderr.strip())
    return result.returncode

def download(url, dest):
    full_dest = os.path.join(PROJECT, dest)
    os.makedirs(os.path.dirname(full_dest), exist_ok=True)
    print(f"  Downloading → {dest}")
    urllib.request.urlretrieve(url, full_dest)

# ── MAIN ─────────────────────────────────────────────────────────────────────
print("\n🚀 MAPEI QUIZ AUTO UPDATER")
print("=" * 40)

# 1. Download all files
if FILES:
    print("\n📥 Downloading updated files...")
    for url, dest in FILES.items():
        try:
            download(url, dest)
            print(f"  ✅ {dest}")
        except Exception as e:
            print(f"  ❌ Failed: {dest} — {e}")
else:
    print("\n📝 No files to download — pushing current changes...")

# 2. Git add, commit, push
print("\n📤 Pushing to GitHub...")
run("git add .")
run('git commit -m "auto update"')
code = run("git push")

if code == 0:
    print("\n✅ DONE! Vercel is deploying...")
    print("🌐 Your app: https://mapei-quiz.vercel.app")
    print("\nVercel usually takes 1-2 minutes to go live.")
else:
    print("\n⚠️  Push failed. Check your internet connection.")

print("=" * 40)
input("\nPress Enter to close...")
