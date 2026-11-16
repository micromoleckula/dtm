# AGENTS.md

3D First-Person Mechanic & Drift Life-Sim. Babylon.js 7, TypeScript (strict), Vite, Tauri v2 (macOS and Windows desktop only, no mobile/touch).

## Commands
- `npm run dev` : Vite dev server on http://localhost:5173 (browser mode: localStorage + DOM fullscreen fallback).
- `npx tsc --noEmit` : typecheck (strict, noImplicitAny).
- `npm run build` : `tsc && vite build` (outputs to `dist/`).
- `npm run tauri:dev` : desktop app (starts `npm run dev` via `src-tauri/tauri.conf.json`).
- `npm run tauri:build` : desktop bundle (nsis, msi, dmg, app).
- `cargo check --manifest-path src-tauri/Cargo.toml` : verify Rust backend.
- No test runner, ESLint or Prettier is configured. Do not add them unless asked.

## Architecture & Boundaries
- Entrypoint: `index.html` -> `src/main.ts` -> `GarageScene` (`src/scenes/GarageScene.ts`).
- `src/core/`: pure TypeScript. NO `@babylonjs/*`, NO DOM, NO imports from `src/systems/`.
  Persistence is declared as a `SaveStorage` interface in core; `DesktopBridge` implements it
  and is injected from outside. (Known violation: `SaveManager` imports `DesktopBridge`. Fix it, never extend it.)
- `src/scenes/`: lifecycle orchestrators only, under 250 lines each. World building goes to
  `src/entities/world/`, layout data to `src/config/world-layout.ts`.
- `src/entities/`, `src/systems/`: Babylon entities, `InputManager` (PointerLock), `EventBus`,
  graphics (`MaterialCache`, `ProceduralTextureFactory`, `MeshBuilder3D`), `ObjectPool`.
- `DesktopBridge` (`src/systems/platform/`): detects `window.__TAURI_INTERNALS__` / `__TAURI__`,
  uses Tauri commands (`toggle_fullscreen`, `exit_game`) and `tauri-plugin-fs`
  (`BaseDirectory.AppData`, `saves/`). Falls back to localStorage and DOM Fullscreen in browser.
- Dependency injection: pass `Scene`, `InputManager`, `EventBus` via constructors. No new global singletons.

## Art Direction (this section overrides any older wording in other files)
Grounded, slightly gloomy rural Japanese coastal village in the spirit of My Summer Car.
Low-poly shapes, dirty and weathered surfaces. NOT intentionally pixelated or "retro-filtered".
- Procedural textures: 512x512, tileable, mipmaps + trilinear sampling. Never use NEAREST.
- World geometry uses `StandardMaterial` only (diffuse + subtle specular). No PBR, normal or parallax stacks.
- Soft shadows: `ShadowGenerator`, 2048 map, casters limited to about 70m around the camera.
- Fog: `FOGMODE_EXP2`. Gradient sky dome. Lighting must support a day/night cycle.

## Performance Budgets
- Total draw calls < 200. Report the count after any world-building change.
- Static geometry: merge by material (`Mesh.MergeMeshes`). Repeated props: `thinInstanceAdd`.
- Materials and textures only through `MaterialCache` / `ProceduralTextureFactory`. No duplicates.
- Colliders: invisible box/convex proxies registered in `SpatialGrid` (32m cells,
  `src/core/physics/SpatialGrid.ts`). Query only cells around the player and car.
- Zero allocations in `onBeforeRenderObservable` and physics ticks: no `new Vector3/Color3/Matrix`,
  no closures, no temp arrays. Reuse scratch objects and pools.
- Every scene, entity, texture and buffer exposes `dispose()`.

## Conventions
- Relative imports only. `@/*` is in tsconfig but there is no vite alias, so it breaks at runtime.
- No `any`, no TODO/placeholder comments, no omitted logic.

## Agent Workflow
1. Read the files you will touch first. State a short plan before coding.
2. Extend what exists. Never recreate an existing module.
3. After each task run `npx tsc --noEmit` and fix all errors before reporting done.
4. Keep changes small: one subsystem per task.
5. If another instruction file contradicts this one, this file wins.

## Related Context
- `.cursorrules`, `.gemini/rules/game-architecture.md`, `AI_INSTRUCTIONS.md`, `PROJECT_CONTEXT.md`.
  Where they mention retro, low-res or NEAREST textures, ignore that and follow Art Direction above.