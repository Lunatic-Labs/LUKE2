# L.U.K.E. 2 on Ubuntu — boot-to-kiosk setup

Turns an Ubuntu 24.04 machine into a locked-down L.U.K.E. appliance: on boot
it starts the Next.js server as a systemd service, then launches the **cage**
Wayland kiosk compositor directly on a virtual terminal with Chromium
fullscreen inside it. There is no desktop environment, no login screen, and
no way for a visitor to reach anything outside the app.

The server binds to **127.0.0.1 only** — same as `npm run dev` and the
docker-compose setup — so `/api/photos` and `/api/scores` (which have no
auth) stay unreachable from the network. The camera scene works because
`localhost` is a secure context for `getUserMedia`.

## Files

| File | What it is |
|---|---|
| `setup.sh` | One-shot installer. `sudo ./setup.sh` for first setup, `sudo ./setup.sh refresh` to redeploy after code changes. |
| `luke2-web.service` | System systemd unit: runs the standalone Next.js server as the `luke` user. |
| `luke2-kiosk.service` | System systemd unit: runs **cage** (`-d`, so Escape can't close it) with Chromium `--kiosk` as its single app, on `/dev/tty7`, as the `kiosk` user. Waits for the web service first, restarts always. |

## Why cage

Cage is a minimal Wayland compositor that shows exactly one maximized
application — nothing else can ever appear on screen. Combined with the
setup below, the ways in are closed one by one:

- **No desktop / no GDM** — GDM is disabled; cage boots straight to the app.
- **Escape can't exit** — cage runs with `-d`; killing the session requires root.
- **No TTY logins** — getty is disabled on tty1–tty6; cage owns tty7.
- **Browser has no chrome** — Chromium `--kiosk` shows only the page: no
  address bar, no new tabs, no settings.
- **Session always comes back** — `Restart=always` on the kiosk unit and
  `Restart=on-failure` on the web service.
- **No network exposure** — the server listens on 127.0.0.1 only.

Out of scope (a determined attacker with physical access and time can still,
e.g., boot from a live USB). If that matters, add full-disk encryption + a
BIOS/UEFI boot password and disable USB boot.

## Prerequisites

- Ubuntu 24.04 with network access during setup (apt, npm, NodeSource)
- A display and (for the camera scene) a webcam the OS sees
- Desktop edition *or* Server — no desktop environment is required, cage
  provides the display itself

## First setup

From a checkout of this repo (the LUKE2 folder):

```bash
cd LUKE2
sudo ./deploy/ubuntu/setup.sh
sudo reboot
```

After reboot, with no interaction, the machine should:

1. Have `luke2-web.service` serving `127.0.0.1:3000`
2. Have `luke2-kiosk.service` launch cage on tty7 once the server answers
3. Show L.U.K.E. fullscreen in Chromium — nothing else

Note: running `setup.sh` on a machine that currently has a desktop session
will not kill that session; it takes effect on reboot (after GDM is
disabled).

### What setup.sh creates on the machine

- `/opt/luke2/standalone/` — the built app (assembled from `.next/standalone`
  plus `public/` and `.next/static`, per Next.js standalone layout)
- `/opt/luke2/camera-pics/` — camera-scene photos (persists across redeploys;
  equivalent of the `camera-pics` docker volume)
- `/opt/luke2/trivia-scores/` — trivia leaderboard CSV (persists across
  redeploys; equivalent of the `trivia-scores` docker volume)
- `luke` — system user (no shell) that runs the server
- `kiosk` — user (no admin rights) that runs the cage graphical session
- systemd services `luke2-web` and `luke2-kiosk`, enabled at boot
- Disabled: GDM, getty TTY logins

## Deploying updates

```bash
cd LUKE2
git pull
sudo ./deploy/ubuntu/setup.sh refresh
```

`refresh` rebuilds, swaps in the new standalone bundle, and restarts the web
service. It skips package/user/service setup. Chromium will show a
connection error while the server restarts; bounce the browser:

```bash
sudo systemctl restart luke2-kiosk
```

## Troubleshooting

| Symptom | Check |
|---|---|
| Server not running | `systemctl status luke2-web` and `journalctl -u luke2-web -e` |
| Black screen, nothing launched | `journalctl -u luke2-kiosk -e` — look for cage seat/DRM errors |
| Chromium crashed / wrong flags | `systemctl status luke2-kiosk` (it auto-restarts after 5s) |
| Camera shows no preview | Check `--use-fake-ui-for-media-stream` is in the kiosk unit's `ExecStart`; verify the camera works outside Chromium; see "Camera permission" below |
| Need admin access on the machine | SSH in, or reboot and hold Shift/Esc at GRUB to get single-user/recovery mode; re-enable a getty with `sudo systemctl unmask getty@tty1.service && sudo systemctl start getty@tty1` |
| Undo the kiosk entirely | `sudo systemctl disable --now luke2-kiosk && sudo systemctl enable gdm3` (if GDM was installed) |

## Camera permission

The kiosk launches Chromium with `--use-fake-ui-for-media-stream`, which
auto-accepts `getUserMedia` permission prompts. Some Chromium versions
still require a user gesture for the camera to start streaming; if the
camera scene shows the prompt UI but no frames, test once manually (run
Chromium without the flag from an SSH session with a display, click Allow,
then re-enable the flag) — grants persist per-origin in the `kiosk` user's
Chromium profile.

## Chromium under cage

Chromium (snap) runs via XWayland inside cage by default, which is the
most compatible path. If you want native Wayland, add
`--ozone-platform=wayland` to `ExecStart` in `luke2-kiosk.service` — test
it on real hardware first; snap confinement under a non-GNOME compositor
occasionally misbehaves.

## Known limits

- Single-screen only: cage fullscreens on the primary display.
- `refresh` does not update Chromium, Node, or cage; run full `setup.sh`
  occasionally to pick up package updates.
- Ctrl+Alt+Del still reboots (which just boots back into the kiosk —
  harmless); BIOS-level hardening is a separate concern (see above).
