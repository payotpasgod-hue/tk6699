#!/bin/bash
set -e

echo "=== OroPlay Relay Setup for Ubuntu 22.04 ==="

apt-get update -y
apt-get install -y python3 python3-pip python3-venv ufw

mkdir -p /opt/oroplay-relay
cp relay_main.py /opt/oroplay-relay/relay_main.py

python3 -m venv /opt/oroplay-relay/venv
/opt/oroplay-relay/venv/bin/pip install --upgrade pip
/opt/oroplay-relay/venv/bin/pip install fastapi==0.115.* httpx==0.28.* uvicorn==0.34.*

cat > /etc/systemd/system/oroplay-relay.service << 'UNIT'
[Unit]
Description=OroPlay Relay Proxy
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/oroplay-relay
Environment=UPSTREAM_API_BASE=https://bs.sxvwlkohlv.com/api/v2
Environment=APP_CALLBACK_BASE=https://0ca3629e-36b3-432f-94e1-e30e40ad07b9-00-2hgl3w95jkn57.janeway.replit.dev
Environment=RELAY_PORT=9000
Environment=PROXY_TIMEOUT=60
ExecStart=/opt/oroplay-relay/venv/bin/python3 relay_main.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable oroplay-relay
systemctl restart oroplay-relay

ufw allow 9000/tcp
ufw --force enable

echo ""
echo "=== Setup complete ==="
echo "Relay running on port 9000"
echo "Check status: systemctl status oroplay-relay"
echo "View logs:    journalctl -u oroplay-relay -f"
