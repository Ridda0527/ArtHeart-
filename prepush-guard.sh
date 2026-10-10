#!/usr/bin/env bash
# PreToolUse/Bash guard for artfromtheheartinitiative.org
# Intercepts `git push` and blocks it unless ./check.sh passes.
# main IS the live site, so a failing push is visible to the public immediately.
REPO="$(cd "$(dirname "$0")" && pwd)"

payload=$(cat)
cmd=$(printf '%s' "$payload" | jq -r '.tool_input.command // ""' 2>/dev/null)

# Only intercept pushes; everything else passes straight through.
case "$cmd" in
  *"git push"*) ;;
  *) exit 0 ;;
esac

if out=$("$REPO/check.sh" 2>&1); then
  exit 0
fi

reason="PUSH BLOCKED — ./check.sh failed.

main is the live site (artfromtheheartinitiative.org), so this would have
published a broken page. Fix the failures below, re-run ./check.sh, then push.

$out"

jq -cn --arg r "$reason" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: $r
  }
}'
exit 0
