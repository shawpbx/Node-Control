#!/usr/bin/env bash
# ============================================================================
# MMDVM / AllStarLink / DVSwitch Control WebGUI — GitHub Bootstrap Installer
# Targets: Raspberry Pi OS (Bookworm / Trixie 64-bit) & Debian 12/13
# Usage:
#   git clone https://github.com/shawpbx/MMDVM-Control.git && cd MMDVM-Control && sudo bash install.sh
#   curl -fsSL https://raw.githubusercontent.com/shawpbx/MMDVM-Control/main/install.sh | sudo bash
# ============================================================================

set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "[ERROR] Please run this installer as root: sudo bash $0 $*"
  exit 1
fi

DEFAULT_REPO="shawpbx/MMDVM-Control"
REPO_INPUT="${ASL_WEBGUI_REPO:-}"
BRANCH="${ASL_WEBGUI_BRANCH:-main}"
INSTALL_DIR="${ASL_WEBGUI_DIR:-/opt/allstarlink-webgui}"
WEBGUI_PORT="${ASL_WEBGUI_PORT:-8080}"
ACTION="install"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      REPO_INPUT="${2:-}"
      shift 2
      ;;
    --branch)
      BRANCH="${2:-main}"
      shift 2
      ;;
    --dir)
      INSTALL_DIR="${2:-/opt/allstarlink-webgui}"
      shift 2
      ;;
    --port)
      WEBGUI_PORT="${2:-8080}"
      shift 2
      ;;
    --uninstall)
      ACTION="uninstall"
      shift
      ;;
    -h|--help)
      cat <<'USAGE'
AllStarLink Guided Install WebGUI — GitHub Installer

Options:
  --repo <owner/repo|url>   GitHub repository to clone or update
  --branch <name>           Git branch to checkout (default: main)
  --dir <path>              Target installation directory (default: /opt/allstarlink-webgui)
  --port <port>             HTTP port for the WebGUI service (default: 8080)
  --uninstall               Stop and remove the systemd service and install directory
USAGE
      exit 0
      ;;
    *)
      echo "[ERROR] Unknown argument: $1"
      exit 1
      ;;
  esac
done

if [[ "${ACTION}" == "uninstall" ]]; then
  echo "[INFO] Stopping and removing asl-webgui.service..."
  systemctl disable --now asl-webgui.service 2>/dev/null || true
  rm -f /etc/systemd/system/asl-webgui.service
  systemctl daemon-reload
  rm -rf "${INSTALL_DIR}"
  echo "[INFO] Uninstall complete."
  exit 0
fi

# Detect local git repository if executed inside a checked-out clone
SCRIPT_DIR=""
LOCAL_SOURCE=0
if [[ -n "${BASH_SOURCE[0]:-}" && -f "${BASH_SOURCE[0]:-}" ]]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  if [[ -f "${SCRIPT_DIR}/package.json" && -d "${SCRIPT_DIR}/.git" ]]; then
    LOCAL_SOURCE=1
    if [[ -z "${REPO_INPUT}" ]]; then
      REPO_INPUT="$(git -C "${SCRIPT_DIR}" remote get-url origin 2>/dev/null || true)"
    fi
  fi
fi

if [[ -z "${REPO_INPUT}" && "${LOCAL_SOURCE}" -eq 0 ]]; then
  REPO_INPUT="${DEFAULT_REPO}"
fi

normalize_repo_url() {
  local raw="$1"
  if [[ -z "${raw}" ]]; then
    echo ""
  elif [[ "${raw}" =~ ^https?:// ]] || [[ "${raw}" =~ ^git@ ]]; then
    echo "${raw}"
  else
    echo "https://github.com/${raw%.git}.git"
  fi
}

REPO_URL="$(normalize_repo_url "${REPO_INPUT}")"

export DEBIAN_FRONTEND=noninteractive
echo "[INFO] Updating APT cache and installing prerequisites..."
apt-get update -y
apt-get install -y --no-install-recommends \
  git curl ca-certificates gnupg2 lsb-release python3

# Ensure Node.js >= 20 LTS is available for Vite / TypeScript build
NEED_NODE=0
if ! command -v node >/dev/null 2>&1; then
  NEED_NODE=1
else
  NODE_MAJOR="$(node -v | sed -E 's/^v([0-9]+).*/\1/')"
  if [[ "${NODE_MAJOR}" -lt 20 ]]; then
    NEED_NODE=1
  fi
fi

if [[ "${NEED_NODE}" -eq 1 ]]; then
  echo "[INFO] Installing Node.js 22 LTS from NodeSource..."
  mkdir -p /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
    | gpg --dearmor --yes -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" \
    > /etc/apt/sources.list.d/nodesource.list
  apt-get update -y
  apt-get install -y nodejs
fi

# Clone from GitHub or sync from local git checkout
if [[ -n "${REPO_URL}" ]]; then
  EXISTING_ORIGIN=""
  if [[ -d "${INSTALL_DIR}/.git" ]]; then
    EXISTING_ORIGIN="$(git -C "${INSTALL_DIR}" remote get-url origin 2>/dev/null || true)"
  fi
  if [[ -d "${INSTALL_DIR}/.git" && "${EXISTING_ORIGIN}" == "${REPO_URL}" ]]; then
    echo "[INFO] Updating existing checkout in ${INSTALL_DIR} (${BRANCH})..."
    git -C "${INSTALL_DIR}" config core.fileMode false
    git -C "${INSTALL_DIR}" fetch origin "${BRANCH}"
    git -C "${INSTALL_DIR}" checkout "${BRANCH}"
    git -C "${INSTALL_DIR}" reset --hard "origin/${BRANCH}"
  else
    echo "[INFO] Cloning ${REPO_URL} (${BRANCH}) into ${INSTALL_DIR}..."
    rm -rf "${INSTALL_DIR}"
    git clone --branch "${BRANCH}" --depth 1 "${REPO_URL}" "${INSTALL_DIR}"
    git -C "${INSTALL_DIR}" config core.fileMode false
  fi
elif [[ "${LOCAL_SOURCE}" -eq 1 ]]; then
  echo "[INFO] Installing from local repository checkout ${SCRIPT_DIR}..."
  if [[ "${SCRIPT_DIR}" != "${INSTALL_DIR}" ]]; then
    mkdir -p "${INSTALL_DIR}"
    cp -a "${SCRIPT_DIR}/." "${INSTALL_DIR}/"
  fi
else
  echo "[ERROR] No GitHub repository URL provided."
  echo "Run with: sudo bash install.sh --repo <owner>/<repo>"
  exit 1
fi

echo "[INFO] Installing npm dependencies and building WebGUI..."
cd "${INSTALL_DIR}"
if [[ -f "${INSTALL_DIR}/package-lock.json" ]]; then
  npm ci --no-audit --no-fund || npm install --no-audit --no-fund --legacy-peer-deps
else
  npm install --no-audit --no-fund || npm install --no-audit --no-fund --legacy-peer-deps
fi
npm run build

if [[ ! -f "${INSTALL_DIR}/webgui-server.py" ]]; then
  echo "[ERROR] Missing ${INSTALL_DIR}/webgui-server.py in repository."
  exit 1
fi

cat <<EOF_SVC > /etc/systemd/system/asl-webgui.service
[Unit]
Description=AllStarLink Guided Install WebGUI
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
Environment=MMDVM_WEBGUI_PORT=${WEBGUI_PORT}
Environment=ASL_WEBGUI_PORT=${WEBGUI_PORT}
WorkingDirectory=${INSTALL_DIR}
ExecStart=/usr/bin/python3 ${INSTALL_DIR}/webgui-server.py
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF_SVC

systemctl daemon-reload
systemctl enable --now asl-webgui.service
systemctl restart asl-webgui.service
sleep 2

if ! systemctl is-active --quiet asl-webgui.service; then
  echo "[ERROR] asl-webgui.service failed to stay running. Recent logs:"
  journalctl -u asl-webgui.service -n 25 --no-pager || true
  exit 1
fi

if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
  ufw allow "${WEBGUI_PORT}/tcp" comment 'AllStarLink Guided Install WebGUI' || true
fi

NODE_IP="$(hostname -I | awk '{print $1}')"
echo ""
echo "========================================================================"
echo " AllStarLink Guided Install WebGUI installed from GitHub"
echo " Repo        : ${REPO_URL:-local}"
echo " Install Dir : ${INSTALL_DIR}"
echo " Service     : systemctl status asl-webgui"
echo " WebGUI URL  : http://${NODE_IP:-localhost}:${WEBGUI_PORT}"
echo "========================================================================"
