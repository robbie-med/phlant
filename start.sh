#!/usr/bin/env bash
# Build and serve the PWA on 127.0.0.1:3510 (registered in /home/user/Projects/PORTS.md).
# In production this runs as the systemd user service `phlant.service` (serve.py only); re-run `npm run build` to deploy.
cd "$(dirname "$0")" && npm run build && exec python3 serve.py
