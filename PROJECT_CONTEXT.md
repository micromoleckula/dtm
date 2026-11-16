# Project Context: 3D First-Person Mechanic & Drift Life-Sim (Babylon.js)

## 1. Project Overview & Vision
A full 3D first-person indie game in the spirit of **My Summer Car** built with **Babylon.js** and **TypeScript**:
- **3D First-Person Life-Sim & Wrenching**:
  - FPS camera with mouse-look (PointerLock), WASD walking, jumping, and physical interaction.
  - 3D Hands Viewmodel: Carrying tools (wrenches, screwdrivers) or parts (batteries, turbochargers) visibly in hands.
  - Raycast targeting: Approaching engine bay or chassis in 3D, targeting 3D hexagonal bolt heads with matching socket sizes, holding click to tighten/loosen.
- **3D Vehicle Physics & Drifting**:
  - 3D car with chassis, 4 independent wheels, suspension travel, steering angle, engine power, and slip/drift friction.
  - Ability to seamlessly enter/exit the car from first-person into driver seat / chase camera.
  - Oversteer, handbrake, weight transfer, and smoke particle effects.
- **Life-Sim Vitals & Chaos**:
  - Digestion system, Respect meter, comedic modifiers (tremor at high digestion, nitro-burp boost).
- **Tech Stack**:
  - Engine: **Babylon.js 7+** (`@babylonjs/core`, `@babylonjs/gui`)
  - Framework: Pure modular TypeScript + Vite
  - Architecture: Framework-agnostic simulation core (`src/core/`) separated from 3D Babylon rendering (`src/entities/`, `src/scenes/`).

---

## 2. Directory Structure Blueprint

```text
src/
├── config/               # Static tuning & data constants
│   ├── balance.ts        # Speeds, reach distances, digestion rates
│   ├── car-parts.ts      # 3D Part catalog, bolt coordinates, socket specs
│   ├── events.ts         # Strictly typed global event names
│   └── physics.ts        # 3D Vehicle mass, suspension, tire friction
├── core/                 # Framework-agnostic business logic & state
│   ├── state/            # Game state store, save/load manager
│   ├── vitals/           # Vitals calculation (Respect, Digestion)
│   ├── assembly/         # Bolt integrity, part dependency tree
│   └── physics/          # Vehicle physics simulation math
├── entities/             # 3D Actors & Babylon Game Objects
│   ├── car/              # 3D Vehicle entity, wheels, chassis, headlights
│   ├── character/        # FPS Controller, viewmodel hands, item carrier
│   └── garage/           # 3D Workbench, 3D interactive bolts, parts, tools
├── scenes/               # Babylon Scene Managers
│   ├── BootScene.ts      # Asset generation / initialization
│   └── GarageScene.ts    # 3D Garage bay, yard & test track
├── systems/              # Engine-level systems
│   ├── input/            # Keyboard, pointer lock, mouse-look mapper
│   ├── audio/            # 3D Positional sound manager
│   ├── pool/             # Generic Object Pool implementation
│   └── graphics/         # Procedural 3D mesh & StandardMaterial generators
├── types/                # Pure TypeScript types, interfaces, contracts
│   ├── assembly.types.ts
│   ├── car.types.ts
│   ├── events.types.ts
│   ├── inventory.types.ts
│   └── vitals.types.ts
└── ui/                   # HTML/Canvas HUD (Crosshair, telemetry, interaction prompts)
```

---

## 3. Subsystem Contracts

### 3.1. 3D First-Person Interaction & Hands Viewmodel
- Player navigates in first-person (WASD, Mouse pointer lock).
- Center crosshair performs raycasts against 3D interactables (`WorldItem3D`, `CarDoor`, `Bolt3D`).
- Hands state:
  - When an item is picked up, it attaches to the camera as a 3D viewmodel in the player's lower-right view.
  - Item bobs gently with walking and responds to mouse swings.
  - Pressing `G` / `Q` drops/throws the 3D item back into the world.

### 3.2. 3D Assembly & Bolt System
- Parts have 3D local coordinate offsets for their bolt heads.
- Player must equip the matching tool (e.g. 10mm wrench) and raycast-click on the specific bolt head.
- Holding left mouse button tightens the bolt with rotation and audio click feedback.
- Untightened bolts cause parts to rattle and fall off during high-G drift driving.

### 3.3. 3D Vehicle Physics
- 3D Rigid body simulation: Raycast suspension springs + lateral/longitudinal tire slip friction.
- Front wheels steer with visible 3D mesh rotation.
- Handbrake decouples rear tire traction for drifting.
- Camera switches to driver cockpit or third-person chase-cam when seated.

---

## 4. Art Direction & Performance Budgets
- Visuals: grounded, slightly gloomy rural Japanese coastal village in the spirit of *My Summer Car*. Low-poly shapes, dirty and weathered surfaces. Not pixelated, not "retro-filtered".
- Procedural textures: `512x512`, tileable, mipmaps + trilinear sampling. Never `NEAREST_SAMPLINGMODE`.
- World geometry: `StandardMaterial` only (diffuse + subtle specular). No PBR, normal or parallax stacks.
- Lighting: soft `ShadowGenerator` with a `2048x2048` map, casters limited to about `70m` around the camera. `FOGMODE_EXP2` fog, gradient sky dome, day/night cycle support.
- Draw calls: total under 200. Merge static geometry by material (`Mesh.MergeMeshes`); use `thinInstanceAdd` for repeated props.
- Materials/textures only through `MaterialCache` / `ProceduralTextureFactory`.
- Colliders: invisible box/convex proxies in `SpatialGrid` (32m cells, `src/core/physics/SpatialGrid.ts`), queried only around the player and car.
- Zero allocations in render/physics ticks: no `new Vector3/Color3/Matrix`, closures or temp arrays. Every scene, entity, texture and buffer exposes `dispose()`.
