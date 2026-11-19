#!/usr/bin/env bash
# Set up L.U.K.E. 2 as a boot-to-kiosk appliance on Ubuntu.
#
#   sudo ./deploy/ubuntu/setup.sh           # full setup (first time)
#   sudo ./deploy/ubuntu/setup.sh refresh   # rebuild + redeploy app only
#
# The app is expected to live at APP_DIR below (hardcoded, based at the
# device user's home) — the script never depends on the directory it is
# called from, and the boot services don't depend on any cwd.
#
# What it does:
#   1. Ensures Node.js 24, cage (+ wlr-randr), and Google Chrome are present
#   2. Builds the app in APP_DIR and assembles .next/standalone in place
#   3. Installs/enables luke2-web.service (system unit, runs as DEVICE_USER)
#   4. Installs/enables luke2-kiosk.service: boots cage on tty5 (the
#      Ctrl+Alt+F5 console) with ~/kiosk.sh as its client
#   5. Creates or verifies DEVICE_USER's kiosk.sh (screen rotation + Chrome
#      kiosk mode); overwrites it if its contents drift
#   6. Disables GDM and getty TTY logins so the kiosk is the only way in
set -euo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Please run with sudo: sudo ./deploy/ubuntu/setup.sh" >&2
  exit 1
fi

if ! grep -qi ubuntu /etc/os-release; then
  echo "Warning: this does not look like Ubuntu; continuing anyway." >&2
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)" # for the unit files

# ---------------------------------------------------------------------------
# Device configuration (defaults hardcoded for the kiosk device; override
# with env vars for testing, e.g. in a container)
# ---------------------------------------------------------------------------
DEVICE_USER="${LUKE2_DEVICE_USER:-lukeuser}"
DEVICE_HOME="$(getent passwd "${DEVICE_USER}" | cut -d: -f6)"
APP_DIR="${LUKE2_APP_DIR:-${DEVICE_HOME}/Desktop/L.U.K.E./L.U.K.E/LUKE2}"
DATA_DIR="${DEVICE_HOME}/luke2-data"       # camera photos + trivia scores
KIOSK_SH="${DEVICE_HOME}/kiosk.sh"         # cage's client script

if [[ -z ${DEVICE_HOME} ]]; then
  echo "Error: user ${DEVICE_USER} does not exist. Create it first." >&2
  exit 1
fi
if [[ ! -d ${APP_DIR} ]]; then
  echo "Error: app directory ${APP_DIR} not found." >&2
  exit 1
fi

REFRESH=false
[[ ${1:-} == refresh ]] && REFRESH=true

log() { echo "==> $*"; }

# ---------------------------------------------------------------------------
# 1. Packages
# ---------------------------------------------------------------------------
need_node=true
if command -v node >/dev/null && [[ $(node -v) =~ ^v24\. ]]; then
  need_node=false
fi

if [[ ${need_node} == true ]]; then
  log "Installing Node.js 24 (NodeSource)"
  apt-get update -qq
  apt-get install -y -qq ca-certificates curl gnupg
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y -qq nodejs
fi

# cage: the Wayland kiosk compositor. wlr-randr: kiosk.sh uses it to rotate
# the display.
if ! command -v cage >/dev/null || ! command -v wlr-randr >/dev/null; then
  log "Installing cage + wlr-randr"
  apt-get update -qq
  apt-get install -y -qq cage wlr-randr
fi

if ! command -v google-chrome >/dev/null; then
  log "Installing Google Chrome"
  apt-get update -qq
  apt-get install -y -qq wget gpg
  wget -qO- https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg
  echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] https://dl.google.com/linux/chrome/deb/ stable main" \
    > /etc/apt/sources.list.d/google-chrome.list
  apt-get update -qq
  apt-get install -y -qq google-chrome-stable
fi

# ---------------------------------------------------------------------------
# 2. Build + assemble the standalone bundle (in APP_DIR, no /opt copy)
# ---------------------------------------------------------------------------
log "Building the app in ${APP_DIR}"
npm --prefix "${APP_DIR}" ci
npm --prefix "${APP_DIR}" run build

# Make the standalone build self-contained: static assets + public files
# must be copied into .next/standalone (Next.js standalone layout).
STANDALONE_DIR="${APP_DIR}/.next/standalone"
log "Assembling standalone bundle in ${STANDALONE_DIR}"
# rm first: cp -r INTO an existing dir would nest public/public on re-runs
rm -rf "${STANDALONE_DIR}/public" "${STANDALONE_DIR}/.next/static"
cp -r "${APP_DIR}/public" "${STANDALONE_DIR}/public"
mkdir -p "${STANDALONE_DIR}/.next"
cp -r "${APP_DIR}/.next/static" "${STANDALONE_DIR}/.next/static"

# Persistent data dirs (photos + trivia scores survive rebuilds)
install -d -o "${DEVICE_USER}" -g "$(id -gn "${DEVICE_USER}")" \
  "${DATA_DIR}/camera-pics" "${DATA_DIR}/trivia-scores"

# ---------------------------------------------------------------------------
# 3. Web service (system unit)
# ---------------------------------------------------------------------------
log "Installing luke2-web.service"
cp "${SCRIPT_DIR}/luke2-web.service" /etc/systemd/system/luke2-web.service
chmod 644 /etc/systemd/system/luke2-web.service
systemctl daemon-reload
systemctl enable luke2-web.service
systemctl restart luke2-web.service

if [[ ${REFRESH} == true ]]; then
  log "Refresh done. Server restarted with the new build."
  exit 0
fi

# ---------------------------------------------------------------------------
# 4. Kiosk session service (cage on tty5)
# ---------------------------------------------------------------------------
log "Installing luke2-kiosk.service"
cp "${SCRIPT_DIR}/luke2-kiosk.service" /etc/systemd/system/luke2-kiosk.service
chmod 644 /etc/systemd/system/luke2-kiosk.service
systemctl daemon-reload
systemctl enable luke2-kiosk.service

# ---------------------------------------------------------------------------
# 5. kiosk.sh — create it, or fix it if its contents drifted
# ---------------------------------------------------------------------------
# Canonical contents: screen rotation for the kiosk display, then Chrome in
# kiosk mode. Must match the file on the device exactly.
EXPECTED_KIOSK_SH='#!/bin/bash

sleep 1
wlr-randr --output HDMI-A-1 --scale 2 --transform 90 > /tmp/rotate.log 2>&1
exec google-chrome --kiosk --ozone-platform=wayland --no-first-run --password-store=basic http://127.0.0.1:3000
'

if [[ ! -f ${KIOSK_SH} ]]; then
  log "Creating ${KIOSK_SH}"
  printf '%s' "${EXPECTED_KIOSK_SH}" > "${KIOSK_SH}"
elif [[ $(cat "${KIOSK_SH}") != "${EXPECTED_KIOSK_SH%$'\n'}" ]]; then
  log "Existing ${KIOSK_SH} differs from expected; current contents:"
  cat "${KIOSK_SH}"
  log "Overwriting ${KIOSK_SH} with the canonical version"
  printf '%s' "${EXPECTED_KIOSK_SH}" > "${KIOSK_SH}"
else
  log "${KIOSK_SH} already matches the expected contents"
fi

# Owned by the device user and executable, in every case — cage execs it
# directly, so a lost +x or wrong owner would break the session.
chown "${DEVICE_USER}:$(id -gn "${DEVICE_USER}")" "${KIOSK_SH}"
chmod 755 "${KIOSK_SH}"

# ---------------------------------------------------------------------------
# 6. Close the other ways in: disable GDM and getty TTY logins
# ---------------------------------------------------------------------------
# cage owns tty5; GDM must not grab a VT and fight it for the seat.
if systemctl list-unit-files gdm3.service gdm.service 2>/dev/null | grep -q '^gdm'; then
  log "Disabling GDM (the kiosk session replaces the desktop entirely)"
  systemctl disable gdm3.service gdm.service 2>/dev/null || true
fi

# No text login consoles: nothing on the machine should offer a shell to a
# passer-by. tty5 is freed for cage. Admin access is via SSH (or by
# re-enabling a getty from recovery mode).
log "Disabling getty TTY logins (tty1-tty6)"
systemctl mask getty-static.service 2>/dev/null || true
for tty in 1 2 3 4 5 6; do
  systemctl disable "getty@tty${tty}.service" 2>/dev/null || true
done

log "All done. Reboot to test: the machine should boot straight into cage"
log "on tty5, showing L.U.K.E. fullscreen at localhost:3000."
log "Troubleshooting: journalctl -u luke2-web -e  /  journalctl -u luke2-kiosk -e"
