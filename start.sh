#!/usr/bin/env bash
# Serve the built PWA on the port registered in /home/user/Projects/PORTS.md (phlant = 3510).
cd "$(dirname "$0")" && npm run build && npm run preview
