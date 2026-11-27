# MMDVM / AllStarLink 3 / DVSwitch Control WebGUI

Authenticated WebGUI installer, live status dashboard, and post-install configurator for **MMDVMHost / DMRGateway**, **AllStarLink 3 (ASL3)**, and **DVSwitch** (`Analog_Bridge`, `MMDVM_Bridge`, `md380-emu`) on **Raspberry Pi OS** (Bookworm / Trixie 64-bit) and **Debian 12/13**.

## GitHub Installation (Raspberry Pi / Debian)

### Option 1: Git Clone & Install

```bash
git clone https://github.com/shawpbx/MMDVM-Control.git
cd MMDVM-Control
sudo bash install.sh
```

If port `8080` is already in use on your Pi (for example by DVSwitch `webproxy`), pass `--port 8081`:

```bash
sudo bash install.sh --port 8081
```

### Option 2: One-Line GitHub Install

```bash
curl -fsSL https://raw.githubusercontent.com/shawpbx/MMDVM-Control/main/install.sh | sudo bash
```

Once installed, open the WebGUI in your browser at:

```text
http://<node-ip>:8080
```

## Updating from GitHub

```bash
cd /opt/allstarlink-webgui
sudo git pull
sudo bash install.sh
```

## Uninstalling the WebGUI Service

```bash
sudo bash /opt/allstarlink-webgui/install.sh --uninstall
```

## Key Features

- **Authenticated Login**: First-run administrator setup with salted scrypt password hashing (`/etc/mmdvm-webgui/admin.json`) and rate-limited sessions.
- **Separate Configuration Tabs**: Dedicated tabs for **MMDVM** (Station, Modem & Pi-HAT presets, Digital Networks), **AllStarLink 3** (Nodes, Radio & AMI), **DVSwitch Bridge** (USRP & Digital Bridge), and **System & Firewall**.
- **Pre-Install & Fast Post-Install Apply**: Run the full 6-step on-node installer once, then apply configuration edits directly to config files and reload services without reinstalling packages.
- **Raspberry Pi MMDVM Pi-HAT Support**: Automatically enables hardware UART (`enable_uart=1`, `dtoverlay=disable-bt` on Pi 3/4/Zero 2 W or `dtparam=uart0=on` on Pi 5), disables serial console, and adds a GPIO 20/21 STM32 reset `ExecStartPre` hook in `mmdvmhost.service`.
- **Persistent Logs in `/var/log/mmdvm/`**: Writes `MMDVMHost.log`, `DMRGateway.log`, and `MMDVM_Bridge-*.log` under `/var/log/mmdvm/` with daily logrotate retention (`/etc/logrotate.d/mmdvm`).
- **Live Status Dashboard**: Shows live AllStarLink connected nodes (with quick connect/monitor/disconnect & DVSwitch bridge linking), active & recent MMDVM users, service controls, and live logs.

## Local Development

```bash
npm install
npm run dev
```
