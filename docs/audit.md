# Project Audit

Date: 2026-11-16
Scope: `src/`, `src-tauri/`, config. No code was changed. `npx tsc --noEmit` passes.
Method: every claim below was read from the source, not inferred from file names.

## 1. Status

| Item | Status | Evidence | Notes |
|---|---|---|---|
| SpatialGrid | DONE | `src/core/physics/SpatialGrid.ts:42` (`CELL_SIZE = 32` line 43, preallocated `results`/`surfaceSample` lines 54-67, zero-GC `queryAABB` line 146) | `getSurfaceSample` (lines 215-301) hardcodes bridge/river/garage regions instead of resolving inserted colliders; most inserted colliders only feed `CollisionSolver`, not ground sampling. |
| TextureCache | MISSING | no `TextureCache` file/type anywhere | Texture dedupe is private inside `MaterialCache` (`src/systems/graphics/MaterialCache.ts:13,72-80`). |
| MaterialCache | DONE | `src/systems/graphics/MaterialCache.ts:9-96` | Singleton (`getInstance`). Shared texture is cached by type only, then `getRetroMaterial` writes `tex.uScale/vScale` per material (lines 59-61), so UV scales overwrite each other. Naming still `Retro*`. |
| ProceduralTextureFactory | PARTIAL | `src/systems/graphics/ProceduralTextureFactory.ts:25-278` | 8 canvas texture types exist, but default size is 128 (line 29), `NEAREST_SAMPLINGMODE` (line 36), mipmaps disabled (line 35), and `Math.random()` makes output non-deterministic. |
| DesktopBridge + Tauri config | PARTIAL | `src/systems/platform/DesktopBridge.ts:22-131`, `src-tauri/src/lib.rs:3-13`, `src-tauri/tauri.conf.json` | Bridge + `toggle_fullscreen`/`exit_game` commands + fs save/load are done. `tauri.conf.json:33` targets only `dmg`, `app` (macOS); no Windows `nsis`/`msi` despite AGENTS targeting Windows. Product name still "Retro". |
| SaveStorage interface in core | MISSING | no `SaveStorage` type in `src/core/` | `SaveManager` depends on the concrete `DesktopBridge`. |
| world-layout.ts | DONE | `src/config/world-layout.ts:44-244` | Consumed by `TerrainAndRoads` and `PrefectureBuildings`. `Bridges.ts` does not use it (coordinates hardcoded at lines 34, 166). |
| TerrainAndRoads (roads, mizo + colliders, river, ocean) | DONE | `src/entities/world/TerrainAndRoads.ts` | 2 terrain meshes; roads merged (line 182); mizo ditches merged (line 192) with `ditch` colliders and friction 3.8 (line 172); seawalls (207-226); river (243-305); ocean (233-240); animated UV (46-51). |
| Bridges (concrete + steel truss) | DONE | `src/entities/world/Bridges.ts` | Steel truss (29-156) and municipal concrete (161-263); deck + guardrail colliders (152-155, 259-262). Coordinates hardcoded, not from `world-layout.ts`. |
| PrefectureBuildings (house, garage, shops, gas station) | DONE | `src/entities/world/PrefectureBuildings.ts` | Garage with pit/trusses/workbench/fluorescent tubes (49-186); house with engawa/kawara/tatami/bed (192-275); 5 town houses, store, gas station (280-407). Many small parts left unmerged. |
| TownProps (poles, wires, guardrails, signs, mirrors, vending, trees, tetrapods) | PARTIAL | `src/entities/world/TownProps.ts` | Poles (33-78), guardrails (83-130), mirrors (135-172), signs (177-207), vending (212-241), tetrapods (246-294), trees (299-355), all thin-instanced. **No catenary wires.** Vending machines are plain red boxes, no glow/emissive. |
| ShadowGenerator | MISSING | no `ShadowGenerator` reference in `src/` | `GarageScene.ts:98` creates a `DirectionalLight` but no shadow generator. |
| EXP2 fog | DONE | `src/scenes/GarageScene.ts:93-95` | `FOGMODE_EXP2`, density 0.0032. |
| Sky dome | PARTIAL | `src/scenes/GarageScene.ts:110-115` | Sphere exists but is a single flat emissive colour, not a gradient; material is created directly, bypassing `MaterialCache`. |
| Day/night cycle | MISSING | no time-of-day code | Lighting is a fixed "golden hour" setup. |
| Pause menu (fullscreen, exit) | PARTIAL | `DesktopBridge.ts:32-42,73-86`; `HUDOverlay.ts:136-147` | F11 / Alt+Enter hotkey and `exitGame()` exist, and the HUD lists F11. No pause/settings menu, no Esc handling, no exit button. |
| ObjectPool | DONE | `src/systems/pool/ObjectPool.ts:11-70` | Functional generic pool; currently unused (no references). |

## 2. AGENTS.md violations

### Architecture boundaries
- `src/core/state/SaveManager.ts:2` imports `../../systems/platform/DesktopBridge` — core depends on `src/systems/`. This is the violation AGENTS acknowledges; it is still present.
- `SaveManager.ts:12` uses `DesktopBridge.getInstance()` (global singleton) instead of constructor injection. `MaterialCache.getInstance()` is also a singleton.

### Art direction
- `ProceduralTextureFactory.ts:29` defaults to `size = 128`; `MaterialCache.ts:76` calls `createTexture` without a size, so **every** texture is 128px.
- `ProceduralTextureFactory.ts:36` uses `Texture.NEAREST_SAMPLINGMODE`; line 35 passes `generateMipMaps = false`. Required: 512x512, mipmaps + trilinear, never NEAREST.
- No `ShadowGenerator` at all (soft shadows requirement unmet).
- Sky is a flat emissive sphere (`GarageScene.ts:110-115`), not a gradient dome; no day/night cycle.
- `Car3DEntity.ts:81` creates a raw `BABYLON.Texture` from a data URI, bypassing `MaterialCache`/`ProceduralTextureFactory`.
- `GarageScene.ts:111` creates a `StandardMaterial` directly, bypassing `MaterialCache`.

### Performance budgets
- `src/scenes/GarageScene.ts` is **317 lines**, over the 250-line scene limit.
- Per-frame allocation in the render loop:
  - `GarageScene.ts:199` calls `FPSCharacter.getInteractionTarget()`, which returns a **new object literal every frame** (`FPSCharacter.ts:185-229`).
  - `HUDOverlay.update()` rewrites `innerHTML` every frame (`HUDOverlay.ts:177,182,188,190`).
  - Physics (`Car3DPhysics`, `CollisionSolver`, `SpatialGrid`) is genuinely zero-allocation; the violations are in the scene/HUD/interaction path.
- Car geometry is largely unmerged: `MeshBuilder3D.createCarRig` produces ~57 draw calls (`MeshBuilder3D.ts:30-470`). Wheels must stay separate, but body panels could merge by material.
- Adding a 2048 shadow pass without caster limiting would likely push the scene over 200 draw calls (see section 3).
- `MaterialCache.ts:59-61` writes `uScale`/`vScale` onto a texture shared by all materials of that type, so scale settings conflict (correctness bug and hidden duplicate-texture risk).

### Conventions
- `src/systems/events/EventBus.ts:9` uses `EventCallback<any>>` (`any`).
- Missing `dispose()`:
  - `FPSCharacter` (camera, viewmodel anchor, listeners) — no `dispose`.
  - `Car3DEntity` (rig, 2 spotlights, particle system) — no `dispose`.
  - `InputManager` (window listeners) — no `dispose`/removal.
  - `DesktopBridge` (window keydown listener, line 35) — no `dispose`.
  - `EventBus` has `clear()` but no `dispose()`; `ObjectPool` has no `dispose()`.
  - `GarageScene.dispose()` (309-316) never disposes `car`, `player`, `inputManager`, `eventBus`, or `saveManager`.

## 3. Draw calls (estimate)

Counted from mesh creation plus loop iteration counts; merged meshes and thin-instanced meshes count as one draw each.

| Group | Draw calls | Basis |
|---|---|---|
| TerrainAndRoads | 10 | 2 terrain + merged roads + merged ditches + 2 seawalls + ocean + river + 2 banks |
| Bridges | 7 | steel deck + merged truss + 2 piers + merged concrete + road top + merged railings |
| PrefectureBuildings | 47 | garage 12, house 14, town 21 (5 merged houses + 5 windows + 5 walls + store 3 + gas 6) |
| TownProps | 8 | poles, guardrails, mirrors, signs, vending, tetrapods, trunk, foliage (all thin-instanced) |
| Car | 57 | `createCarRig`: 37 body/interior/merged + 4 wheels x 5 parts |
| Ground items | 17 | 6 items x 2-3 child meshes (wrenches 3 each, screwdriver 2, turbo 3, battery 3) |
| Sky dome | 1 | `GarageScene.ts:110` |
| **Total** | **~147** | under the 200 budget, but with little headroom |

Notes: an added shadow pass re-renders casters, so ~147 could become ~250+ if every mesh is a caster. The car alone is the largest single consumer (57).

## 4. Prioritized fix list

1. **Fix the procedural texture pipeline** — `ProceduralTextureFactory.ts`, `MaterialCache.ts`: default 512x512, `generateMipMaps = true`, `TRILINEAR_SAMPLINGMODE`, delete NEAREST; keep one shared texture per type.
2. **Add shadows** — `GarageScene.ts`: `ShadowGenerator` with a 2048 map on the existing `DirectionalLight`, add only casters within ~70m of the camera; re-count draw calls afterward.
3. **Gradient sky dome + day/night cycle** — replace the flat emissive sphere with a gradient material and drive sun/hemisphere intensity and fog colour from a time-of-day value.
4. **Extract `SaveStorage` into core** — new interface in `src/core/state/`, make `DesktopBridge` implement it, inject it into `SaveManager`; delete the `core -> systems` import at `SaveManager.ts:2`.
5. **Add the pause menu** — Esc/pause overlay with fullscreen and exit actions wired to `DesktopBridge`, plus listener cleanup; this also completes the "fullscreen, exit" requirement.
6. **Slim `GarageScene` under 250 lines** — move quicksave/quickload, notifications and interaction handling into a system or helper so the scene is only orchestration.
7. **Remove `any`** — `EventBus.ts:9`: type the callback set with `unknown`/generic event payloads.
8. **Add missing `dispose()`** — `FPSCharacter`, `Car3DEntity`, `InputManager`, `DesktopBridge`; call them from `GarageScene.dispose()`.
9. **Remove per-frame allocations** — reuse a single `IRaycastInteraction` result object in `FPSCharacter.getInteractionTarget`, and update the HUD only when values change (or at a throttled rate) instead of every frame.
10. **Finish TownProps** — add thin-instanced catenary wires between poles and make vending machines emissive/glowing; while there, fix the shared-texture UV-scale conflict in `MaterialCache`.

Also worth doing (not in the top 10): add Windows `nsis`/`msi` bundle targets to `tauri.conf.json`, and delete dead code (`MeshBuilder3D.createEnvironment`, `CarPhysicsModel`, `CharacterModel`).
