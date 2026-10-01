# Deployment

## GitHub Pages — https://phlant.robbiemed.org

`.github/workflows/pages.yml` builds, lints, tests and deploys `dist/` on every push to `main`. `public/CNAME` sets the custom domain; DNS is a Cloudflare CNAME `phlant → robbie-med.github.io`. One-time: repository Settings → Pages → Source = **GitHub Actions**.

HTTPS: either DNS-only (grey cloud) and GitHub-issued certificate with "Enforce HTTPS", or proxied with Cloudflare SSL mode **Full**.

## Self-hosted mirror — https://field.bo-bob.com

On the author's machine, `serve.py` serves `dist/` on `127.0.0.1:3510` as the systemd user service `phlant.service`, behind the `diet-loggers` Cloudflare tunnel. Redeploy = `npm run build` (the service reads `dist/` live).

## Android APK (Capacitor)

```bash
npm run build
npm run cap:init        # once
npm run cap:android     # adds android/ and syncs dist/
# open android/ in Android Studio → Build → APK
```

The app needs no native plugins; geolocation and storage use the WebView APIs.

## PWA update behaviour

The service worker precaches the shell. After a deploy, the first load serves the old version and installs the new one; the next load uses it.
