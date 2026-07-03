#!/usr/bin/env bash
# Deploy chat-agent + Qdrant to AWS EC2 (single host).
# Only ships the chat-agent source — does NOT push venvs, models, or data.
#
# Usage:
#   export SSH_KEY=~/.ssh/<your-key>.pem
#   export EC2_HOST=<public-ip-or-dns>
#   export OPENAI_API_KEY=sk-...
#   ./scripts/deploy-chat-agent.sh
#
# Optional env vars:
#   REMOTE_USER    (default: ubuntu)
#   REMOTE_PATH    (default: /home/ubuntu/e-shop)
#   BACKEND_BASE_URL (default: empty -> chat-agent will only handle FAQ/handoff)
#   RECOMMENDER_BASE_URL (default: http://18.143.45.118:8000)
#   LLM_MODEL (default: gpt-4o-mini)

set -euo pipefail

EC2_HOST="${EC2_HOST:?EC2_HOST env var is required (public IP or DNS of the chat-agent host)}"
SSH_KEY="${SSH_KEY:?SSH_KEY env var is required (path to .pem)}"
REMOTE_USER="${REMOTE_USER:-ubuntu}"
REMOTE_PATH="${REMOTE_PATH:-/home/ubuntu/e-shop}"

LOCAL_REPO="$(cd "$(dirname "$0")/.." && pwd)"
SSH_OPTS=(-i "$SSH_KEY" -o StrictHostKeyChecking=accept-new)

OPENAI_API_KEY="${OPENAI_API_KEY:?OPENAI_API_KEY env var is required}"
LLM_MODEL="${LLM_MODEL:-gpt-4o-mini}"
BACKEND_BASE_URL_ENV="${BACKEND_BASE_URL:-}"
RECOMMENDER_BASE_URL_ENV="${RECOMMENDER_BASE_URL:-http://18.143.45.118:8000}"

# Pick up LangSmith config from local chat-agent/.env (gitignored) if present,
# unless overridden by the caller. Tracing stays opt-in: if no API key, leave
# LANGSMITH_TRACING=false so the agent never tries to ship traces.
LOCAL_AGENT_ENV="$LOCAL_REPO/chat-agent/.env"
if [ -z "${LANGSMITH_API_KEY:-}" ] && [ -f "$LOCAL_AGENT_ENV" ]; then
  LANGSMITH_API_KEY="$(grep -E '^LANGSMITH_API_KEY=' "$LOCAL_AGENT_ENV" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
fi
if [ -z "${LANGSMITH_PROJECT:-}" ] && [ -f "$LOCAL_AGENT_ENV" ]; then
  LANGSMITH_PROJECT="$(grep -E '^LANGSMITH_PROJECT=' "$LOCAL_AGENT_ENV" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
fi
LANGSMITH_PROJECT="${LANGSMITH_PROJECT:-e-shop-chat-agent}"
if [ -n "${LANGSMITH_API_KEY:-}" ]; then
  LANGSMITH_TRACING="${LANGSMITH_TRACING:-true}"
else
  LANGSMITH_TRACING="false"
fi

GRAFANA_ADMIN_USER="${GRAFANA_ADMIN_USER:-admin}"
GRAFANA_ADMIN_PASSWORD="${GRAFANA_ADMIN_PASSWORD:-changeme}"
if [ "$GRAFANA_ADMIN_PASSWORD" = "changeme" ]; then
  echo "==> WARNING: GRAFANA_ADMIN_PASSWORD is the default 'changeme'. Export a real password before deploying to a real prod."
fi

echo "==> Local repo:        $LOCAL_REPO"
echo "==> Remote host:       $REMOTE_USER@$EC2_HOST"
echo "==> Remote path:       $REMOTE_PATH"
echo "==> SSH key:           $SSH_KEY"
echo "==> LLM model:         $LLM_MODEL"
echo "==> Recommender URL:   $RECOMMENDER_BASE_URL_ENV"
echo "==> Backend URL:       ${BACKEND_BASE_URL_ENV:-<not set — FAQ/handoff only>}"
echo "==> LangSmith:         tracing=$LANGSMITH_TRACING project=$LANGSMITH_PROJECT"
echo "==> Grafana admin:     $GRAFANA_ADMIN_USER"
echo

# ---- 1. Sync chat-agent source to EC2 ---------------------------------------
echo "==> [1/5] rsync chat-agent/ (code only) to EC2..."
rsync -avz \
  -e "ssh ${SSH_OPTS[*]}" \
  --exclude '__pycache__' \
  --exclude '*.pyc' \
  --exclude '.venv/' \
  --exclude 'venv/' \
  --exclude '.pytest_cache/' \
  --exclude '.codegraph/' \
  --exclude 'tests/' \
  "$LOCAL_REPO/chat-agent/" \
  "$REMOTE_USER@$EC2_HOST:$REMOTE_PATH/chat-agent/"

# ---- 2. Write a remote .env on EC2 ------------------------------------------
echo "==> [2/5] writing remote .env..."
ssh "${SSH_OPTS[@]}" "$REMOTE_USER@$EC2_HOST" "cat > $REMOTE_PATH/chat-agent/.env <<EOF
OPENAI_API_KEY=$OPENAI_API_KEY
LLM_MODEL=$LLM_MODEL
LLM_ENABLED=true
BACKEND_BASE_URL=$BACKEND_BASE_URL_ENV
RECOMMENDER_BASE_URL=$RECOMMENDER_BASE_URL_ENV
KNOWLEDGE_RETRIEVAL_MODE=qdrant
LANGSMITH_TRACING=$LANGSMITH_TRACING
LANGSMITH_API_KEY=$LANGSMITH_API_KEY
LANGSMITH_PROJECT=$LANGSMITH_PROJECT
GRAFANA_ADMIN_USER=$GRAFANA_ADMIN_USER
GRAFANA_ADMIN_PASSWORD=$GRAFANA_ADMIN_PASSWORD
EOF
chmod 600 $REMOTE_PATH/chat-agent/.env"

# ---- 3. Build + start the stack on EC2 --------------------------------------
echo "==> [3/5] docker compose build + up..."
ssh "${SSH_OPTS[@]}" "$REMOTE_USER@$EC2_HOST" "set -e
  cd $REMOTE_PATH/chat-agent
  set -a; . ./.env; set +a
  docker compose -f docker-compose.aws.yml build chat-agent
  docker compose -f docker-compose.aws.yml up -d
"

# ---- 4. Wait for chat-agent /health -----------------------------------------
echo "==> [4/5] waiting for chat-agent /agent/health..."
until curl -fs --max-time 3 "http://$EC2_HOST:8010/agent/health" >/dev/null; do
  echo "    ... still warming up"
  sleep 3
done

# ---- 5. Ingest knowledge documents into the new Qdrant ----------------------
echo "==> [5/5] running knowledge ingestion inside the chat-agent container..."
ssh "${SSH_OPTS[@]}" "$REMOTE_USER@$EC2_HOST" "set -e
  cd $REMOTE_PATH/chat-agent
  docker compose -f docker-compose.aws.yml exec -T chat-agent python -m app.knowledge.ingest_to_qdrant
"

echo
echo "✅ Deploy complete"
echo
echo "Health response:"
curl -s "http://$EC2_HOST:8010/agent/health" | python3 -m json.tool || true

echo
echo "Smoke test /agent/chat:"
curl -s -X POST "http://$EC2_HOST:8010/agent/chat" \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"smoke-deploy","message":"what is your return policy"}' \
  | python3 -m json.tool || true
