---
description: Babylon.js 3D Game Architecture & Engineering Standards
globs: src/**/*
---

# 3D Game Architecture & Coding Guidelines (Babylon.js)

1. **Framework-Agnostic Core (`src/core/`)**:
   - Pure TypeScript only. No Babylon.js, WebGL, or DOM imports.
2. **Lean Scenes (Max 250 lines)**:
   - Babylon scenes in `src/scenes/` act strictly as lifecycle orchestrators.
3. **Zero Allocations in Render Loop**:
   - Never create `new Vector3()`, `new Color3()`, or closures in render/tick loops.
4. **First-Person Viewmodel & 3D Hands**:
   - Equipped tools/parts render as 3D viewmodels attached to the camera.
   - Crosshair raycasting handles 3D world interaction (pickup, bolts, car entry).
5. **3D Vehicle & Drift Physics**:
   - 4-wheel physics with steering, suspension, and handbrake drift oversteer.
6. **Art Direction**:
   - Grounded, slightly gloomy rural Japanese coastal village in the spirit of *My Summer Car*. Low-poly shapes, dirty and weathered surfaces. Not pixelated, not "retro-filtered".
   - `512x512` tileable procedural textures with mipmaps + trilinear sampling. Never `NEAREST_SAMPLINGMODE`.
   - `StandardMaterial` only (diffuse + subtle specular). No PBR, normal or parallax stacks. Soft `ShadowGenerator`, `2048x2048` map, casters limited to about `70m`. `FOGMODE_EXP2` fog, gradient sky dome, day/night cycle.
7. **Performance Budgets**:
   - Total draw calls under 200. Merge static geometry by material (`Mesh.MergeMeshes`); use `thinInstanceAdd` for repeated props.
   - Materials and textures only through `MaterialCache` / `ProceduralTextureFactory`.
   - Invisible box/convex collider proxies in `SpatialGrid` (32m cells), queried only around the player and car.
   - Every scene, entity, texture and buffer exposes `dispose()`.
