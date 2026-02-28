# AGENTS.md

## Cursor Cloud specific instructions

### Project overview
"When Things Attack" — a frontend-only browser-based spatial autobattler game built with React, Three.js (React Three Fiber), Zustand, and Vite. No backend, no database, no Docker.

### Dev server
- `npm run dev` starts the Vite dev server on port **3000** with HMR.
- The `--open` flag in `vite.config.ts` auto-opens the browser; use `--no-open` or `--host` flags as needed in headless environments.

### Available npm scripts
See `package.json` for the full list. Key scripts: `dev`, `build`, `preview`, `lint`.

### Lint / type-check
- `npm run lint` runs `tsc --noEmit`.
- There is a **pre-existing TypeScript error** in `src/stores/gameStore.ts` (line 156: `"battling"` not assignable to `CombatPhase`). This is not caused by environment setup.

### Build
- `npm run build` runs `tsc && vite build`. It currently fails due to the pre-existing TS error above. The Vite dev server works fine regardless since it doesn't require `tsc` to pass.

### Dependency installation caveat
- `npm install` fails with peer dependency conflicts between `@react-three/postprocessing` and `@react-three/fiber`. Use `npm install --legacy-peer-deps` instead.
