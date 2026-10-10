#!/usr/bin/env bash
# Pre-push verification for artfromtheheartinitiative.org
# Run from repo root. Exit 0 = safe to push.
cd "$(dirname "$0")" || exit 1
FAIL=0
note() { printf '  %s\n' "$1"; }
bad()  { printf '  FAIL: %s\n' "$1"; FAIL=1; }

echo "== 1. referenced local assets all exist =="
for f in *.html; do
  # pull src= and href= values, keep only local paths
  grep -oE '(src|href)="[^"]+"' "$f" | sed -E 's/^(src|href)="//; s/"$//' \
  | grep -vE '^(https?:|mailto:|tel:|#|//|data:)' | sort -u \
  | while read -r ref; do
      target="${ref%%#*}"; target="${target%%\?*}"
      [ -z "$target" ] && continue
      [ -e "$target" ] || echo "MISSING|$f|$ref"
    done
done > /tmp/ah_missing.txt
if [ -s /tmp/ah_missing.txt ]; then
  while IFS='|' read -r _ page ref; do bad "$page references missing '$ref'"; done < /tmp/ah_missing.txt
else note "ok — every local src/href resolves"; fi

echo "== 2. images on disk that nothing references (dead weight) =="
ORPHAN=0
for img in img-*.jpg img-*.png; do
  [ -e "$img" ] || continue
  grep -qF "$img" *.html || { note "unreferenced: $img"; ORPHAN=1; }
done
[ $ORPHAN -eq 0 ] && note "ok — all images referenced"

echo "== 3. HTML structure =="
for f in *.html; do
  o=$(grep -o '<div' "$f" | wc -l | tr -d ' '); c=$(grep -o '</div>' "$f" | wc -l | tr -d ' ')
  [ "$o" = "$c" ] || bad "$f div mismatch: $o open / $c close"
  grep -qi '</html>' "$f" || bad "$f missing </html>"
  grep -qi '<title' "$f"  || bad "$f missing <title>"
  grep -qi 'viewport' "$f" || bad "$f missing viewport meta (mobile will break)"
done
[ $FAIL -eq 0 ] && note "ok — tags balanced, title + viewport present on all pages"

echo "== 4. nav links point at real pages =="
grep -oE 'href="[a-z0-9_-]+\.html"' *.html | sed -E 's/.*href="//; s/"//' | sort -u \
| while read -r p; do [ -f "$p" ] || echo "BADNAV|$p"; done > /tmp/ah_nav.txt
if [ -s /tmp/ah_nav.txt ]; then
  while IFS='|' read -r _ p; do bad "nav links to nonexistent page '$p'"; done < /tmp/ah_nav.txt
else note "ok — all page-to-page links valid"; fi

echo "== 5. deploy prerequisites =="
[ -f CNAME ] && [ "$(tr -d '[:space:]' < CNAME)" = "artfromtheheartinitiative.org" ] \
  && note "ok — CNAME intact (artfromtheheartinitiative.org)" \
  || bad "CNAME missing or wrong — custom domain will drop!"
[ -f .nojekyll ] && note "ok — .nojekyll present" || note "note: no .nojekyll"

echo
if [ $FAIL -eq 0 ]; then echo "PASS — safe to push"; else echo "FAILED — do not push"; fi
exit $FAIL
