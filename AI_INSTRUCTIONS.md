# Engineering Task: Desktop Tauri Integration, Japanese Coastal Prefecture World & MSC-Style Graphics Optimization

You are a Senior 3D Game Engine & Systems Architect working on our 3D First-Person Mechanic & Drift Life-Sim built with **Babylon.js 7+**, **TypeScript**, and **Vite**.

Preserve our core architectural rule: keep `src/core/` 100% framework-agnostic (pure TypeScript math, state, assembly, and physics) while isolating all Babylon.js rendering, scene graph, and asset generation inside `src/entities/`, `src/scenes/`, and `src/systems/`.

Implement the following four major milestones cleanly and modularly:

---

## 1. Desktop Runtime via Tauri v2 (macOS & Windows Exclusive)
Transition the project from a browser-only web app into a lightweight, native desktop application using **Tauri v2**, targeting **macOS (Apple Silicon & Intel)** and **Windows (x64)** exclusively. Do NOT include any mobile, iOS, Android, or touch-control configurations.

- **Tauri Project Setup (`src-tauri/`)**:
  - Configure `tauri.conf.json` for a desktop game window (default `1600x900` or borderless fullscreen toggle, resizable, high-DPI aware, clean title bar).
  - Optimize the Rust backend (`src-tauri/src/main.rs` / `lib.rs`) to have minimal background thread and RAM overhead.
  - Ensure WebView2 (Windows) and WKWebView (macOS) properly support HTML5 **PointerLock API** and raw keyboard capture (`WASD`, `Space`, `Shift`, `Q`, `G`, `Esc`) without OS shortcut interference.
- **Native Desktop Bridge (`src/systems/platform/`)**:
  - Create a clean platform abstraction (`DesktopBridge.ts`) that detects Tauri runtime (`window.__TAURI_INTERNALS__`) with graceful fallback in dev mode.
  - Wire `src/core/state/` save/load persistence to write JSON save files directly to the user's local AppData / Application Support directory via Tauri's filesystem plugin instead of relying solely on browser `localStorage`.
  - Add window controls (Fullscreen toggle `F11` / `Alt+Enter`, clean app exit) to the pause/settings layer in `src/ui/`.

---

## 2. World Design: Rural Japanese Coastal Prefecture (`PrefectureScene`)
Expand/refactor `src/scenes/GarageScene.ts` (and modularize into `src/entities/world/` + `src/config/world-layout.ts`) to build an atmospheric, drivable **Japanese rural coastal prefecture** inspired by *My Summer Car* and rural Showa/Heisei-era seaside towns.

Design the map around distinct, connected zones with realistic driving lines and spatial landmarks:
1. **Player's Homestead & Workshop Compound**:
   - A traditional rural Japanese house (wooden siding, tiled *kawara* roof, raised *engawa* porch, sliding doors, interior room with bed/vitals station).
   - Attached concrete driveway leading to a detached corrugated-metal & concrete **Mechanic Garage** equipped with an inspection pit or hydraulic lift/jack stands, overhead fluorescent tube lighting, a 3D workbench (`src/entities/garage/`), shelving for tools/parts, and a manual roll-up/sliding garage door.
2. **Narrow Winding Streets & Neighborhood Blocks**:
   - Tight 1.5-lane asphalt residential streets and winding backroads connecting the homestead to the town center.
   - **Functional Concrete Drainage Ditches (*Mizo*)**: Open concrete gutters running along road edges—built with real collider geometry so clipping a wheel into a ditch affects suspension and drift lines.
   - **Neighborhood Details**: Clusters of Showa-era wooden and concrete houses, walled courtyards, wooden/concrete utility poles with catenary overhead power lines, convex blind-corner traffic mirrors, Japanese road markings/signs, glowing drink vending machines, and a small local convenience store / parts shop & gas station where the player can drive to.
3. **River, Bridges & Coastal Oceanfront**:
   - A scenic river flowing down from the inland hills through the town and emptying into the open ocean.
   - **Bridges**: At least two distinct traversable bridges crossing the river—(a) a narrow concrete municipal road bridge with guardrails leading into the town center, and (b) a tight weathered steel truss/girder bridge near the coast.
   - **Ocean & Coastal Seawall**: A coastal road hugging the shoreline with concrete seawalls, wave-breaker tetrapods along the shore, a small fishing pier/harbor area, and an expansive ocean plane with subtle animated UV wave scrolling.

---

## 3. Art Direction: Grounded Rural Japanese Coastal Aesthetic
Establish a cohesive grounded, slightly gloomy rural Japanese coastal village look in the spirit of *My Summer Car*. Use low-poly shapes with dirty, weathered surfaces. Do NOT aim for an intentionally pixelated or "retro-filtered" style. Implement this inside `src/systems/graphics/`:

- **Procedural Textures (`ProceduralTextureFactory.ts`)**:
  - Generate tileable `512x512` procedural textures using offscreen 2D Canvas painting (grainy asphalt, stained concrete, weathered wood planks, corrugated rusting sheet metal, roof tiles, tatami, foliage).
  - Always generate mipmaps and sample with trilinear filtering. Never use `NEAREST_SAMPLINGMODE`.
  - Do not build PBR, normal, or parallax texture stacks.
- **Materials & Lighting**:
  - World geometry uses `StandardMaterial` only (diffuse texture, subtle specular tuning, and baked vertex colors/ambient occlusion). No PBR pipeline.
  - Soft shadows: one primary `DirectionalLight` feeding a `ShadowGenerator` with a `2048x2048` map, with casters limited to about `70m` around the camera, plus a `HemisphericLight` with warm sky and cool ground bounce.
  - Fog: `Scene.FOGMODE_EXP2` blended into a gradient sky dome. Lighting must support a day/night cycle.

---

## 4. Strict CPU, RAM & GPU Optimization Mandates
The game must run smoothly at locked 60+ FPS on mid-range Windows/macOS laptops with **minimal CPU usage and low RAM/VRAM footprint**:

1. **Draw Call Reduction (ThinInstances & Mesh Merging)**:
   - Use Babylon's **`ThinInstance`** (`mesh.thinInstanceAdd`) for all repeated props across the prefecture: utility poles, guardrails, road signs, trees/bushes, fences, concrete tetrapods, and bolts.
   - Group static non-interactive world geometry (terrain chunks, asphalt roads, sidewalks, static building shells) by shared material and combine them via **`Mesh.MergeMeshes(..., true, true)`**, keeping total scene draw calls strictly **under 200**.
2. **Material & Texture Deduplication**:
   - Implement a centralized `MaterialCache` and `ProceduralTextureFactory` in `src/systems/graphics/`. Never instantiate duplicate `StandardMaterial` or texture instances for the same surface type.
3. **Spatial Partitioning for Physics & Raycasts**:
   - Do **NOT** run mesh collisions or suspension raycasts against the entire prefecture mesh every frame.
   - Implement a lightweight 2D **Spatial Hash Grid** (`src/core/physics/SpatialGrid.ts`) that indexes static road/building/bridge colliders by world cell (`e.g., 32m x 32m`). Only enable/query colliders within the active cells surrounding the player and car.
4. **Distance Culling & LODs**:
   - Disable shadow casting on distant static meshes outside an approximately `70m` radius around the active camera.
   - Use simple box/convex proxy colliders (`isVisible = false`) for buildings, bridges, and guardrails rather than colliding against high-detail visual meshes.
5. **Zero-Garbage-Collection (Zero-GC) Hot Loops**:
   - Inside `onBeforeRenderObservable` and fixed-timestep physics ticks, **never** allocate `new Vector3()`, `new Matrix()`, or temporary arrays/objects. Pre-allocate scratch math instances (`TmpVec3`, `TmpQuat`, `TmpMat4`) and reuse object pools (`src/systems/pool/`).
   - Provide clean `dispose()` lifecycle methods for every scene, entity, texture, and buffer.

---

## 5. Implementation Structure & Deliverables
Organize all new and updated code cleanly into our blueprint:
- `src-tauri/` — Tauri v2 desktop configuration (`tauri.conf.json`, `Cargo.toml`, minimal Rust entry, FS/window permissions).
- `src/config/world-layout.ts` — Coordinates, road spline waypoints, bridge transforms, building placements, and prop scatter rules for the Japanese coastal prefecture.
- `src/core/physics/SpatialGrid.ts` — Framework-agnostic spatial hash grid for fast local collider lookup.
- `src/systems/platform/DesktopBridge.ts` — Tauri desktop window, pointer-lock support, and local disk save/load wrapper.
- `src/systems/graphics/ProceduralTextureFactory.ts` & `MaterialCache.ts` — Shared procedural texture generator and material registry.
- `src/entities/world/` — Modular builders for `TerrainAndRoads.ts` (including *mizo* gutters & ocean), `Bridges.ts`, `PrefectureBuildings.ts` (player house, garage, shops, neighbors), and `TownProps.ts` (ThinInstanced poles, wires, guardrails, vending machines, trees).
- `src/scenes/GarageScene.ts` (or `PrefectureScene.ts`) — Assembles the full prefecture, connects lighting/fog, drives the spatial grid updates, and integrates seamlessly with the existing FPS controller, bolt assembly system, and 3D vehicle physics.

Provide complete, strictly typed, production-ready TypeScript and Tauri configuration code with zero placeholder comments or omitted logic.