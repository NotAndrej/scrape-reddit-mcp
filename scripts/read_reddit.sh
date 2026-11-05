#!/usr/bin/env bash
# read_reddit.sh - fetch and display a Reddit post despite Reddit's JS challenge
# Usage: read_reddit.sh [-c] [-N COUNT] <reddit-post-url>
#   -c        include top-level comments
#   -N COUNT  max top-level comments to include (default 10)
set -euo pipefail

COMMENTS=0
MAXCOMMENTS=10
while getopts ":cN:" opt; do
  case "$opt" in
    c) COMMENTS=1 ;;
    N) MAXCOMMENTS="$OPTARG" ;;
    \?) echo "Unknown option: -$OPTARG" >&2; exit 2 ;;
    :) echo "Option -$OPTARG requires an argument." >&2; exit 2 ;;
  esac
done
shift $((OPTIND-1))

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 [-c] [-N COUNT] <reddit-post-url>" >&2
  exit 2
fi

URL="$1"
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
JAR="$(mktemp)"
HTML1="$(mktemp)"
HTML2="$(mktemp)"
trap 'rm -f "$JAR" "$HTML1" "$HTML2"' EXIT

COMMON_HEADERS=(
  -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
  -H "Accept-Language: en-US,en;q=0.9"
  -H "Sec-Ch-Ua: \"Chromium\";v=\"124\", \"Google Chrome\";v=\"124\", \"Not-A.Brand\";v=\"99\""
  -H "Sec-Ch-Ua-Mobile: ?0"
  -H "Sec-Ch-Ua-Platform: \"Windows\""
  -H "Sec-Fetch-Dest: document"
  -H "Sec-Fetch-Mode: navigate"
  -H "Sec-Fetch-Site: none"
  -H "Sec-Fetch-User: ?1"
  -H "Upgrade-Insecure-Requests: 1"
)

# Step 1: fetch the (possibly JS-challenged) page and save cookies
curl -s -S -c "$JAR" -b "$JAR" --compressed --http2 \
  -A "$UA" "${COMMON_HEADERS[@]}" \
  -o "$HTML1" "$URL"

TOKEN=""
SEED=""
if grep -q 'jsc_token' "$HTML1"; then
  TOKEN=$(python3 - "$HTML1" <<'PY'
import re,sys
s=open(sys.argv[1],encoding='utf-8').read()
m=re.search(r'jsc_token"\s*value="([^"]+)', s)
print(m.group(1) if m else '')
PY
)
  SEED=$(python3 - "$HTML1" <<'PY'
import re,sys
s=open(sys.argv[1],encoding='utf-8').read()
m=re.search(r'\(async e=>e\+e\)\("([0-9a-f]+)"\)', s)
print(m.group(1) if m else '')
PY
)
fi

if [[ -n "$TOKEN" && -n "$SEED" ]]; then
  SOL="${SEED}${SEED}"
  if [[ "$URL" == *\?* ]]; then
    SUBMIT_URL="${URL}&solution=${SOL}&js_challenge=1&jsc_token=${TOKEN}&jsc_orig_r="
  else
    SUBMIT_URL="${URL}?solution=${SOL}&js_challenge=1&jsc_token=${TOKEN}&jsc_orig_r="
  fi
  # Switch Sec-Fetch-Site for same-origin navigation
  SUBMIT_HEADERS=(
    -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
    -H "Accept-Language: en-US,en;q=0.9"
    -H "Sec-Ch-Ua: \"Chromium\";v=\"124\", \"Google Chrome\";v=\"124\", \"Not-A.Brand\";v=\"99\""
    -H "Sec-Ch-Ua-Mobile: ?0"
    -H "Sec-Ch-Ua-Platform: \"Windows\""
    -H "Sec-Fetch-Dest: document"
    -H "Sec-Fetch-Mode: navigate"
    -H "Sec-Fetch-Site: same-origin"
    -H "Sec-Fetch-User: ?1"
    -H "Upgrade-Insecure-Requests: 1"
  )
  curl -s -S -L -b "$JAR" -c "$JAR" --compressed --http2 \
    -A "$UA" "${SUBMIT_HEADERS[@]}" \
    -o "$HTML2" "$SUBMIT_URL"
else
  cp "$HTML1" "$HTML2"
fi

# If we still don't have the post, fall back to whatever we have
if [[ ! -s "$HTML2" ]]; then
  cp "$HTML1" "$HTML2"
fi

# Render readable text
python3 - "$HTML2" "$COMMENTS" "$MAXCOMMENTS" <<'PY'
import sys, html, re
from bs4 import BeautifulSoup
path, comments, maxc = sys.argv[1], sys.argv[2]=="1", int(sys.argv[3])
src=open(path,encoding='utf-8').read()
soup=BeautifulSoup(src,'html.parser')

def text_of(el):
    if not el: return ""
    for t in el.find_all(['script','style']):
        t.decompose()
    return re.sub(r'\s+\n','\n', html.unescape(el.get_text('\n', strip=True))).strip()

post=soup.find('shreddit-post')
if post:
    print("TITLE:", post.get('post-title',''))
    print("AUTHOR:", post.get('author',''))
    print("SUBREDDIT:", post.get('subreddit-prefixed-name',''))
    print("POSTED:", post.get('created-timestamp',''))
    print("SCORE:", post.get('score',''))
    print("COMMENTS:", post.get('comment-count',''))
    print("PERMALINK: https://www.reddit.com" + post.get('permalink',''))
    print()
    body=soup.find('div', attrs={'slot':'text-body'})
    print("BODY:")
    print(text_of(body))
    print()
else:
    # fallback: print title + any article-ish text
    if soup.title: print("TITLE:", soup.title.string)
    print("BODY:")
    print(text_of(soup.body)[:5000])

if comments:
    # top-level comments only
    elems=soup.find_all('shreddit-comment')
    top=[e for e in elems if e.get('depth') in (None,'0',0)]
    print("\nTOP-LEVEL COMMENTS (up to %d):" % maxc)
    shown=0
    for c in top:
        if shown>=maxc: break
        author=c.get('author','unknown')
        score=c.get('score','?')
        content=c.find('div', attrs={'slot':'comment'})
        print(f"\n[{shown+1}] u/{author} (score {score}):")
        print(text_of(content)[:1500])
        shown+=1
    if shown==0:
        print("(none found in parsed HTML)")
PY
