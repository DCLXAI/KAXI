#!/usr/bin/env bash
#
# Create an isolated worktree ready for its own Claude session.
#
#   bash scripts/worktree-new.sh <slug> [<branch>] [--isolated-db]
#
# Branch defaults to slice/<slug>. Base ref is always origin/main, because the
# primary checkout carries uncommitted work that must not leak into new work.
#
# The important part is the env rewrite. .env.local declares DATABASE_URL three
# times and the last one wins, which today resolves to the remote Supabase
# pooler. Copying it verbatim would point every parallel session at production,
# so we append a localhost override block and then refuse to continue unless the
# effective value really is local.

set -euo pipefail

usage() {
  echo "usage: bash scripts/worktree-new.sh <slug> [<branch>] [--isolated-db]" >&2
  exit 2
}

SLUG=""
BRANCH=""
ISOLATED_DB=0

for arg in "$@"; do
  case "$arg" in
    --isolated-db) ISOLATED_DB=1 ;;
    -h|--help) usage ;;
    -*) echo "unknown flag: $arg" >&2; usage ;;
    *)
      if [ -z "$SLUG" ]; then SLUG="$arg"
      elif [ -z "$BRANCH" ]; then BRANCH="$arg"
      else usage
      fi
      ;;
  esac
done

[ -n "$SLUG" ] || usage
[[ "$SLUG" =~ ^[a-z0-9][a-z0-9_-]*$ ]] || {
  echo "slug must be lowercase alphanumeric with - or _ (got: $SLUG)" >&2
  exit 2
}
BRANCH="${BRANCH:-slice/$SLUG}"

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

[ -f .env.local ] || { echo "no .env.local at $ROOT — nothing to copy from" >&2; exit 1; }

WT="$ROOT/.worktrees/$SLUG"
[ -e "$WT" ] && { echo "already exists: $WT" >&2; exit 1; }
git show-ref --verify --quiet "refs/heads/$BRANCH" && {
  echo "branch already exists: $BRANCH" >&2; exit 1
}

# ---------------------------------------------------------------- port slot
# Lowest free slot, so removing a worktree frees its ports for reuse.
# 5433 is what .env.local and playwright.config.ts already assume. Override with
# KAXI_PG_PORT if the local cluster moves.
PG_PORT="${KAXI_PG_PORT:-5433}"
PG_USER="${PGUSER:-$(whoami)}"
for n in 1 2 3 4 5 6 7 8 9; do
  DEV_PORT=$((3400 + n * 10))   # 3410, 3420, ...  clear of 3000/3100/3210/3003/81
  E2E_PORT=$((DEV_PORT + 1))
  if ! grep -rqs "\"port\": $DEV_PORT" "$ROOT/.worktrees"/*/.claude/launch.json 2>/dev/null; then
    SLOT=$n
    break
  fi
done
[ -n "${SLOT:-}" ] || { echo "no free port slot (9 worktrees already)" >&2; exit 1; }

# ---------------------------------------------------------------- worktree
echo "==> fetching origin/main"
git fetch origin main --quiet

echo "==> git worktree add .worktrees/$SLUG -b $BRANCH origin/main"
git worktree add "$WT" -b "$BRANCH" origin/main

# Postgres identifiers: hyphens would need quoting everywhere downstream.
DB_SLUG="${SLUG//-/_}"
TEST_DB="kaxi_wt_${DB_SLUG}_test"
if [ "$ISOLATED_DB" -eq 1 ]; then
  DEV_DB="kaxi_wt_${DB_SLUG}"
else
  DEV_DB="kaxi_phase0"
fi

# ---------------------------------------------------------------- env
echo "==> writing .env.local (localhost:$PG_PORT, dev=$DEV_DB test=$TEST_DB)"
cp .env.local "$WT/.env.local"
cat >> "$WT/.env.local" <<EOF

# --- worktree: $SLUG (appended by scripts/worktree-new.sh; last assignment wins) ---
# Overrides the remote Supabase pooler declared earlier in this file. Do not
# reorder: these must stay last.
DATABASE_URL="postgresql://${PG_USER}@localhost:${PG_PORT}/${DEV_DB}?schema=public"
SUPABASE_DIRECT_URL="postgresql://${PG_USER}@localhost:${PG_PORT}/${DEV_DB}?schema=public"
TEST_DATABASE_URL="postgresql://${PG_USER}@localhost:${PG_PORT}/${TEST_DB}?schema=public"
E2E_PORT=${E2E_PORT}
EOF

# Fail loudly rather than hand back a worktree aimed at production.
eff() { ( set -a; . "$WT/.env.local"; set +a; eval "echo \"\$$1\"" ); }
for var in DATABASE_URL SUPABASE_DIRECT_URL TEST_DATABASE_URL; do
  value="$(eff "$var")"
  case "$value" in
    *localhost:${PG_PORT}*) ;;
    *)
      echo "REFUSING: effective $var is not localhost:${PG_PORT}" >&2
      echo "  host: $(echo "$value" | sed -E 's#.*@([^/?]*).*#\1#')" >&2
      git worktree remove --force "$WT" && git branch -D "$BRANCH"
      exit 1
      ;;
  esac
done
echo "    verified: DATABASE_URL / SUPABASE_DIRECT_URL / TEST_DATABASE_URL all local"

# Non-fatal: UI-only work needs no database, and refusing here would block it.
if ! pg_isready -h localhost -p "$PG_PORT" -t 2 >/dev/null 2>&1; then
  echo "    WARNING: nothing listening on localhost:$PG_PORT — anything touching the"
  echo "             database will fail in this worktree until a local cluster is up."
  echo "             (set KAXI_PG_PORT if your cluster runs elsewhere)"
fi

# ---------------------------------------------------------------- launch.json
# .claude is gitignored, so a fresh worktree has no dev-server config.
mkdir -p "$WT/.claude"
cat > "$WT/.claude/launch.json" <<EOF
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "kaxi-dev-$SLUG",
      "runtimeExecutable": "bun",
      "runtimeArgs": ["x", "next", "dev", "-p", "$DEV_PORT"],
      "port": $DEV_PORT,
      "autoPort": false
    }
  ]
}
EOF

# ---------------------------------------------------------------- deps
echo "==> bun install (postinstall generates the Prisma client and restores runtime artifacts)"
( cd "$WT" && bun install )

# ---------------------------------------------------------------- test DB
# prepare-e2e-db.ts cannot bootstrap this itself: it never creates the database,
# and its migrate step shells out to scripts/prepare-test-db.ts, which only
# *exports* prepareTestDb() and so exits without doing anything. That no-op goes
# unnoticed on the default kaxi_phase0_test because it is already populated; a
# fresh per-worktree database would just fail at the first seed. Schema is
# applied here instead so test:e2e works on a new worktree.
if pg_isready -h localhost -p "$PG_PORT" -t 2 >/dev/null 2>&1; then
  if ! psql -h localhost -p "$PG_PORT" -U "$PG_USER" -d postgres -tAc \
      "select 1 from pg_database where datname='$TEST_DB'" | grep -q 1; then
    echo "==> createdb $TEST_DB"
    createdb -h localhost -p "$PG_PORT" -U "$PG_USER" "$TEST_DB"
  fi
  psql -h localhost -p "$PG_PORT" -U "$PG_USER" -d "$TEST_DB" -qc \
    "create extension if not exists vector" >/dev/null
  echo "==> applying schema to $TEST_DB"
  ( cd "$WT" && DATABASE_URL="postgresql://${PG_USER}@localhost:${PG_PORT}/${TEST_DB}?schema=public" \
      bun run db:migrate:deploy >/dev/null )
fi

# ---------------------------------------------------------------- optional DB
if [ "$ISOLATED_DB" -eq 1 ]; then
  echo "==> createdb $DEV_DB"
  createdb -h localhost -p "$PG_PORT" -U "$PG_USER" "$DEV_DB"
  echo "==> migrate + seed (same chain as .github/workflows/ci.yml)"
  ( cd "$WT" \
    && bun run db:migrate:deploy \
    && bun run db:seed:schools \
    && bun run db:seed:synonyms \
    && bun run db:seed:rules \
    && bun run knowledge:pgvector )
fi

# ---------------------------------------------------------------- summary
cat <<EOF

  worktree  $WT
  branch    $BRANCH  (from origin/main)
  dev port  $DEV_PORT       bunx next dev -p $DEV_PORT
  e2e port  $E2E_PORT       bun run test:e2e   (E2E_PORT is in .env.local)
  dev db    $DEV_DB$([ "$ISOLATED_DB" -eq 1 ] && echo "  (isolated)" || echo "  (shared — do NOT run db:migrate here)")
  test db   $TEST_DB

  start a session:
    cd $WT && claude

  tear down:
    git worktree remove .worktrees/$SLUG && git branch -D $BRANCH
    dropdb -h localhost -p $PG_PORT $TEST_DB$([ "$ISOLATED_DB" -eq 1 ] && echo " $DEV_DB")

EOF
