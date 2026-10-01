# Security

Phlant is a static web app with no backend and no accounts. Everything you enter stays in your browser (localStorage and IndexedDB). The only data that leaves your device are coordinates sent to the public data services listed in `docs/DATA-SOURCES.md` when you build a site pack or load a map.

If you find a vulnerability (for example a way for a data response to execute script, or a leak of stored data), please open a private security advisory on GitHub (Security → Advisories → Report a vulnerability) rather than a public issue. Expect a reply within a week.
