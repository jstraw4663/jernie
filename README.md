# Jernie

**Your personal travel guide.** Type A traveling for Type B travelers.

Jernie makes any trip feel like you have a local expert in your pocket — curated restaurants,
hikes, logistics, and itineraries, all in one place, available even when offline.

Built as a PWA (Progressive Web App) with React 19 + TypeScript + Vite. Firebase for real-time
shared state. Deployed via Netlify.

---

## Current Build

Maine Coast Trip Guide — May 22–29, 2026 (POC)

---

## Quick Start

```bash
npm install
npm run dev       # localhost:5173
npm run build     # production build
npm test          # run tests
```

Requires a `.env` file with Firebase credentials and `VITE_TRIP_ID=dev-maine-2026`.
Copy from your local Mac environment — never commit `.env` to git.

---

## Dev Docs

- **[CLAUDE.md](./CLAUDE.md)** — dev context, key files, git rules, operational principles
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — architecture principles, src map, hotspots
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** — deploy flow, pre-deploy checklist, Netlify config
- **[DESIGN-SYSTEM-PLAN.md](./DESIGN-SYSTEM-PLAN.md)** — design tokens, component library, animation system
- **[TESTING-NOTES.md](./TESTING-NOTES.md)** — test philosophy, coverage, how to add tests
- **[product.md](./product.md)** — product vision, roadmap, market context
