#!/usr/bin/env bash
# Bootstrap a fresh Ubuntu 22.04 EC2 to host the chat-agent.
# Installs: docker, docker compose plugin, rsync. Adds ubuntu user to docker group.
#
# Usage (run from LOCAL machine):
#   export SSH_KEY=~/.ssh/<your-key>.pem
#   export EC2_HOST=<public-ip-or-dns>
#   ./scripts/bootstrap-ec2-chat-agent.sh
#
# Optional env vars:
#   REMOTE_USER (default: ubuntu)

set -euo pipefail

EC2_HOST="${EC2_HOST:?EC2_HOST env var is required}"
SSH_KEY="${SSH_KEY:?SSH_KEY env var is required (path to .pem)}"
REMOTE_USER="${REMOTE_USER:-ubuntu}"
SSH_OPTS=(-i "$SSH_KEY" -o StrictHostKeyChecking=accept-new)

echo "==> Bootstrap EC2 host: $REMOTE_USER@$EC2_HOST"

ssh "${SSH_OPTS[@]}" "$REMOTE_USER@$EC2_HOST" 'bash -s' <<'REMOTE_SCRIPT'
set -euo pipefail

echo "==> [1/5] apt update + base packages"
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg rsync ufw

echo "==> [2/5] install Docker engine + compose plugin"
if ! command -v docker >/dev/null 2>&1; then
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg

  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

  sudo apt-get update -y
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
else
  echo "    docker already installed: $(docker --version)"
fi

echo "==> [3/5] add user to docker group (no sudo needed)"
sudo usermod -aG docker "$USER" || true

echo "==> [4/5] enable + start docker"
sudo systemctl enable docker
sudo systemctl start docker

echo "==> [5/5] verify"
sudo docker --version
sudo docker compose version
echo
echo "    Disk:"
df -h / | tail -1
echo "    Memory:"
free -h | head -2
echo
echo "✅ EC2 bootstrap complete. Now run scripts/deploy-chat-agent.sh from local."
REMOTE_SCRIPT
