import * as BABYLON from '@babylonjs/core';
import { HoldableMeshType } from '../../types/inventory.types';
import { CAR_PARTS_CATALOG_3D } from '../../config/car-parts';
import { MaterialCache } from './MaterialCache';

/**
 * High-performance procedural 3D mesh and material builder for Babylon.js.
 * Centralizes geometry creation and material sharing through MaterialCache.
 */
export class MeshBuilder3D {
  /**
   * Retrieves or instantiates a cached material with specified color and properties.
   */
  public static getMaterial(
    scene: BABYLON.Scene,
    _id: string,
    diffuseHex: string,
    specularHex = '#ffffff',
    alpha = 1.0
  ): BABYLON.StandardMaterial {
    return MaterialCache.getInstance().getColorMaterial(scene, diffuseHex, specularHex, alpha);
  }

  /**
   * Constructs a detailed 1980s/90s Japanese RWD drift coupe (inspired by AE86 Trueno / S13 Silvia).
   * Features sculpted multi-station unibody, flared wheel arches, recessed engine bay with radiator,
   * detailed first-person cockpit with dashboard, rotating 3-spoke sports steering wheel, shifter,
   * bolstered bucket seats, and multi-part deep-dish alloy wheels with brake discs and calipers.
   */
  public static createCarRig(scene: BABYLON.Scene): {
    root: BABYLON.TransformNode;
    chassis: BABYLON.Mesh;
    wheelFL: BABYLON.Mesh;
    wheelFR: BABYLON.Mesh;
    wheelRL: BABYLON.Mesh;
    wheelRR: BABYLON.Mesh;
    steeringWheel: BABYLON.Mesh;
  } {
    const root = new BABYLON.TransformNode('car_root', scene);
    const matCache = MaterialCache.getInstance();

    // 1. Dedicated Materials for Japanese Coupe
    const matBodyPaint = matCache.getColorMaterial(scene, '#d9383a', '#ffffff'); // Crimson Red / Panda
    const matBlackTrim = matCache.getColorMaterial(scene, '#18181b', '#333333'); // Lower skirts, A-pillars
    const matRoof = matCache.getColorMaterial(scene, '#18181b', '#333333'); // Black two-tone roof
    const matGlass = matCache.getColorMaterial(scene, '#121f2d', '#93c5fd', 0.62);
    const matTire = matCache.getColorMaterial(scene, '#1a1a1e', '#27272a');
    const matDeepRim = matCache.getColorMaterial(scene, '#e4e4e7', '#ffffff');
    const matBrakeRotor = matCache.getColorMaterial(scene, '#71717a', '#a1a1aa');
    const matBrakeCaliper = matCache.getColorMaterial(scene, '#ef4444', '#ffffff');
    const matInterior = matCache.getColorMaterial(scene, '#18181b', '#27272a');
    const matCluster = matCache.getColorMaterial(scene, '#22c55e', '#ffffff');
    const matHeadlight = matCache.getColorMaterial(scene, '#fef08a', '#ffffff');
    const matTaillight = matCache.getColorMaterial(scene, '#dc2626', '#fca5a5');
    const matTurnSignal = matCache.getColorMaterial(scene, '#f97316', '#fed7aa');
    const matChrome = matCache.getColorMaterial(scene, '#f1f5f9', '#ffffff');
    const matEngineBlock = matCache.getColorMaterial(scene, '#475569', '#94a3b8');

    // 2. Sculpted Lower Unibody & Floor Pan
    const chassis = BABYLON.MeshBuilder.CreateBox(
      'car_chassis',
      { width: 1.74, height: 0.32, depth: 4.18 },
      scene
    );
    chassis.position.y = 0.34;
    chassis.material = matBodyPaint;
    chassis.parent = root;

    // Front Chin Spoiler & Aerodynamic Air Dam
    const frontLip = BABYLON.MeshBuilder.CreateBox(
      'car_front_lip',
      { width: 1.76, height: 0.16, depth: 0.32 },
      scene
    );
    frontLip.position.set(0, 0.22, 2.08);
    frontLip.material = matBlackTrim;
    frontLip.parent = root;

    // Rear Bumper
    const rearBumper = BABYLON.MeshBuilder.CreateBox(
      'car_rear_bumper',
      { width: 1.76, height: 0.28, depth: 0.28 },
      scene
    );
    rearBumper.position.set(0, 0.34, -2.12);
    rearBumper.material = matBlackTrim;
    rearBumper.parent = root;

    // Side Skirts (Black lower accent lines)
    [-0.86, 0.86].forEach((xSide, idx) => {
      const skirt = BABYLON.MeshBuilder.CreateBox(
        `car_skirt_${idx}`,
        { width: 0.08, height: 0.14, depth: 2.2 },
        scene
      );
      skirt.position.set(xSide, 0.24, 0);
      skirt.material = matBlackTrim;
      skirt.parent = root;
    });

    // 3. Recessed Engine Bay Cavity & Mechanical Details
    const engineBay = BABYLON.MeshBuilder.CreateBox(
      'car_engine_bay',
      { width: 1.25, height: 0.38, depth: 1.35 },
      scene
    );
    engineBay.position.set(0, 0.44, 1.32);
    engineBay.material = matBlackTrim;
    engineBay.parent = root;

    // Aluminum Radiator & Cap
    const radiator = BABYLON.MeshBuilder.CreateBox(
      'car_radiator',
      { width: 0.95, height: 0.34, depth: 0.08 },
      scene
    );
    radiator.position.set(0, 0.48, 1.95);
    radiator.material = matChrome;
    radiator.parent = root;

    // Engine Block with DOHC Anodized Red Valve Cover
    const engineBlock = BABYLON.MeshBuilder.CreateBox(
      'car_engine_block',
      { width: 0.58, height: 0.42, depth: 0.75 },
      scene
    );
    engineBlock.position.set(0, 0.52, 1.25);
    engineBlock.material = matEngineBlock;
    engineBlock.parent = root;

    const valveCover = BABYLON.MeshBuilder.CreateBox(
      'car_valve_cover',
      { width: 0.32, height: 0.12, depth: 0.68 },
      scene
    );
    valveCover.position.set(0, 0.77, 1.25);
    valveCover.material = matBodyPaint;
    valveCover.parent = root;

    // Sloped Front Hood (Bonnet) with Wedge Profile
    const hood = BABYLON.MeshBuilder.CreateBox(
      'car_hood',
      { width: 1.48, height: 0.06, depth: 1.42 },
      scene
    );
    hood.position.set(0, 0.72, 1.32);
    hood.rotation.x = -0.07;
    hood.material = matBodyPaint;
    hood.parent = root;

    // 4. Cabin Glasshouse, Roof & Fastback Hatch
    const roof = BABYLON.MeshBuilder.CreateBox(
      'car_roof_panel',
      { width: 1.36, height: 0.08, depth: 1.62 },
      scene
    );
    roof.position.set(0, 1.26, -0.15);
    roof.material = matRoof;
    roof.parent = root;

    // Windshield (Tilted aerodynamic glass)
    const windshield = BABYLON.MeshBuilder.CreateBox(
      'car_windshield',
      { width: 1.34, height: 0.62, depth: 0.04 },
      scene
    );
    windshield.position.set(0, 1.02, 0.82);
    windshield.rotation.x = 0.56;
    windshield.material = matGlass;
    windshield.parent = root;

    // Fastback Rear Hatch Window
    const rearGlass = BABYLON.MeshBuilder.CreateBox(
      'car_rear_glass',
      { width: 1.32, height: 0.72, depth: 0.04 },
      scene
    );
    rearGlass.position.set(0, 1.04, -1.22);
    rearGlass.rotation.x = -0.58;
    rearGlass.material = matGlass;
    rearGlass.parent = root;

    // Side Door Windows
    [-0.72, 0.72].forEach((xGlass, idx) => {
      const sideGlass = BABYLON.MeshBuilder.CreateBox(
        `side_glass_${idx}`,
        { width: 0.04, height: 0.42, depth: 1.4 },
        scene
      );
      sideGlass.position.set(xGlass, 1.05, -0.15);
      sideGlass.material = matGlass;
      sideGlass.parent = root;
    });

    // 5. Functional First-Person Cockpit Interior
    const dashboard = BABYLON.MeshBuilder.CreateBox(
      'car_dashboard',
      { width: 1.42, height: 0.38, depth: 0.48 },
      scene
    );
    dashboard.position.set(0, 0.78, 0.45);
    dashboard.material = matInterior;
    dashboard.parent = root;

    // Glowing Analog Instrument Cluster (Speedo & Tacho dials)
    const cluster = BABYLON.MeshBuilder.CreateBox(
      'car_cluster',
      { width: 0.36, height: 0.16, depth: 0.04 },
      scene
    );
    cluster.position.set(-0.42, 0.82, 0.28);
    cluster.rotation.x = -0.32;
    cluster.material = matCluster;
    cluster.parent = root;

    // 3-Spoke Sports Steering Wheel (parented for steering rotation)
    const steeringWheel = BABYLON.MeshBuilder.CreateTorus(
      'car_steering_wheel',
      { diameter: 0.38, thickness: 0.042, tessellation: 20 },
      scene
    );
    steeringWheel.position.set(-0.42, 0.76, 0.18);
    steeringWheel.rotation.x = Math.PI / 2.6;
    steeringWheel.material = matBlackTrim;
    steeringWheel.parent = root;

    // Steering wheel center horn button and 3 aluminum spokes
    const horn = BABYLON.MeshBuilder.CreateCylinder(
      'horn_button',
      { diameter: 0.09, height: 0.03 },
      scene
    );
    horn.rotation.x = Math.PI / 2;
    horn.material = matChrome;
    horn.parent = steeringWheel;

    // Center Console, Gear Shifter & Handbrake Lever
    const consoleBox = BABYLON.MeshBuilder.CreateBox(
      'center_console',
      { width: 0.24, height: 0.28, depth: 0.85 },
      scene
    );
    consoleBox.position.set(0, 0.45, -0.05);
    consoleBox.material = matInterior;
    consoleBox.parent = root;

    const shifter = BABYLON.MeshBuilder.CreateCylinder(
      'gear_shifter',
      { diameter: 0.038, height: 0.18 },
      scene
    );
    shifter.position.set(0, 0.65, 0.1);
    shifter.material = matChrome;
    shifter.parent = root;

    const handbrakeLever = BABYLON.MeshBuilder.CreateBox(
      'handbrake_lever',
      { width: 0.04, height: 0.18, depth: 0.04 },
      scene
    );
    handbrakeLever.position.set(-0.06, 0.58, -0.15);
    handbrakeLever.rotation.x = -0.45;
    handbrakeLever.material = matBlackTrim;
    handbrakeLever.parent = root;

    // Bolstered Bucket Seats (Driver & Passenger)
    [-0.42, 0.42].forEach((xSeat, idx) => {
      const seatBase = BABYLON.MeshBuilder.CreateBox(
        `seat_base_${idx}`,
        { width: 0.48, height: 0.22, depth: 0.54 },
        scene
      );
      seatBase.position.set(xSeat, 0.42, -0.2);
      seatBase.material = matInterior;
      seatBase.parent = root;

      const seatBack = BABYLON.MeshBuilder.CreateBox(
        `seat_back_${idx}`,
        { width: 0.46, height: 0.62, depth: 0.14 },
        scene
      );
      seatBack.position.set(xSeat, 0.74, -0.48);
      seatBack.rotation.x = 0.18;
      seatBack.material = matInterior;
      seatBack.parent = root;
    });

    // 6. Exterior Lighting, Grille, Mirrors, Exhaust & Plates
    // Recessed Dark Grille
    const grille = BABYLON.MeshBuilder.CreateBox(
      'car_grille',
      { width: 0.88, height: 0.14, depth: 0.04 },
      scene
    );
    grille.position.set(0, 0.52, 2.12);
    grille.material = matBlackTrim;
    grille.parent = root;

    // Rectangular Pop-up Headlights (Left & Right)
    [-0.62, 0.62].forEach((xHl, idx) => {
      const hl = BABYLON.MeshBuilder.CreateBox(
        `headlight_${idx}`,
        { width: 0.32, height: 0.15, depth: 0.06 },
        scene
      );
      hl.position.set(xHl, 0.54, 2.12);
      hl.material = matHeadlight;
      hl.parent = root;
    });

    // Smoked Full-Width Rear Taillight Bar
    const taillightBar = BABYLON.MeshBuilder.CreateBox(
      'taillight_bar',
      { width: 1.62, height: 0.16, depth: 0.06 },
      scene
    );
    taillightBar.position.set(0, 0.54, -2.12);
    taillightBar.material = matTaillight;
    taillightBar.parent = root;

    // Aerodynamic Door Mirrors
    [-0.88, 0.88].forEach((xMir, idx) => {
      const mirror = BABYLON.MeshBuilder.CreateBox(
        `side_mirror_${idx}`,
        { width: 0.16, height: 0.1, depth: 0.12 },
        scene
      );
      mirror.position.set(xMir, 0.86, 0.58);
      mirror.material = matBlackTrim;
      mirror.parent = root;
    });

    // Angled Chrome Exhaust Muffler Tip
    const exhaust = BABYLON.MeshBuilder.CreateCylinder(
      'car_exhaust_tip',
      { diameter: 0.11, height: 0.38, tessellation: 16 },
      scene
    );
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.set(-0.58, 0.22, -2.22);
    exhaust.material = matChrome;
    exhaust.parent = root;

    // Japanese License Plates (Front & Rear)
    const plateF = BABYLON.MeshBuilder.CreateBox('plate_front', { width: 0.34, height: 0.17, depth: 0.02 }, scene);
    plateF.position.set(0, 0.32, 2.18);
    plateF.material = matChrome;
    plateF.parent = root;

    const plateR = BABYLON.MeshBuilder.CreateBox('plate_rear', { width: 0.34, height: 0.17, depth: 0.02 }, scene);
    plateR.position.set(0, 0.38, -2.18);
    plateR.material = matChrome;
    plateR.parent = root;

    // 7. Bolt-On Flared Wheel Arches (period-correct overfender lips)
    const archMeshes: BABYLON.Mesh[] = [];
    const archPositions: [number, number][] = [
      [-0.84, 1.25], [0.84, 1.25], [-0.84, -1.25], [0.84, -1.25],
    ];
    archPositions.forEach(([ax, az], idx) => {
      const arch = BABYLON.MeshBuilder.CreateTorus(
        `wheel_arch_${idx}`,
        { diameter: 0.82, thickness: 0.06, tessellation: 20 },
        scene
      );
      arch.rotation.z = Math.PI / 2;
      arch.position.set(ax, 0.32, az);
      arch.material = matBodyPaint;
      archMeshes.push(arch);
    });
    const mergedArches = BABYLON.Mesh.MergeMeshes(archMeshes, true, true, undefined, false, true);
    if (mergedArches) {
      mergedArches.name = 'car_flared_arches_merged';
      mergedArches.parent = root;
    }

    // 3D Hex Bolt Heads for the removable engine-bay parts (driven by the parts catalog)
    const boltMeshes: BABYLON.Mesh[] = [];
    for (const partId in CAR_PARTS_CATALOG_3D) {
      const part = CAR_PARTS_CATALOG_3D[partId];
      for (let b = 0; b < part.boltOffsets.length; b++) {
        const off = part.boltOffsets[b];
        const bolt = BABYLON.MeshBuilder.CreateCylinder(
          `bolt_${partId}_${b}`,
          { diameter: 0.05, height: 0.03, tessellation: 6 },
          scene
        );
        bolt.position.set(
          part.mountPosition[0] + off[0],
          part.mountPosition[1] + off[1],
          part.mountPosition[2] + off[2]
        );
        bolt.material = matChrome;
        boltMeshes.push(bolt);
      }
    }
    const mergedBolts = BABYLON.Mesh.MergeMeshes(boltMeshes, true, true, undefined, false, true);
    if (mergedBolts) {
      mergedBolts.name = 'car_engine_bolts_merged';
      mergedBolts.parent = root;
    }

    // 8. Multi-Part Deep-Dish Alloy Wheels with Visible Brakes
    const createDetailedWheel = (name: string, xPos: number, zPos: number): BABYLON.Mesh => {
      const wheelAssembly = new BABYLON.Mesh(name, scene);
      wheelAssembly.position.set(xPos, 0.32, zPos);
      wheelAssembly.parent = root;

      // Beveled Tire Tread and Sidewall
      const tire = BABYLON.MeshBuilder.CreateCylinder(
        `${name}_tire`,
        { diameter: 0.64, height: 0.24, tessellation: 24 },
        scene
      );
      tire.rotation.z = Math.PI / 2;
      tire.material = matTire;
      tire.parent = wheelAssembly;

      // Deep-Dish Alloy Rim Face
      const rim = BABYLON.MeshBuilder.CreateCylinder(
        `${name}_rim`,
        { diameter: 0.44, height: 0.25, tessellation: 20 },
        scene
      );
      rim.rotation.z = Math.PI / 2;
      rim.material = matDeepRim;
      rim.parent = wheelAssembly;

      // Center Hub Nut
      const hub = BABYLON.MeshBuilder.CreateCylinder(
        `${name}_hub`,
        { diameter: 0.14, height: 0.26, tessellation: 6 },
        scene
      );
      hub.rotation.z = Math.PI / 2;
      hub.material = matBlackTrim;
      hub.parent = wheelAssembly;

      // Cross-Drilled Steel Brake Rotor Disc
      const brakeRotor = BABYLON.MeshBuilder.CreateCylinder(
        `${name}_rotor`,
        { diameter: 0.34, height: 0.02, tessellation: 16 },
        scene
      );
      brakeRotor.rotation.z = Math.PI / 2;
      brakeRotor.position.x = xPos > 0 ? -0.06 : 0.06;
      brakeRotor.material = matBrakeRotor;
      brakeRotor.parent = wheelAssembly;

      // Red Racing Brake Caliper
      const caliper = BABYLON.MeshBuilder.CreateBox(
        `${name}_caliper`,
        { width: 0.05, height: 0.12, depth: 0.08 },
        scene
      );
      caliper.position.set(xPos > 0 ? -0.06 : 0.06, 0.12, 0.05);
      caliper.material = matBrakeCaliper;
      caliper.parent = wheelAssembly;

      return wheelAssembly;
    };

    // 4 Wheels: Wheelbase 2.55m, Track width 1.68m
    const wheelFL = createDetailedWheel('wheel_fl', -0.84, 1.25);
    const wheelFR = createDetailedWheel('wheel_fr', 0.84, 1.25);
    const wheelRL = createDetailedWheel('wheel_rl', -0.84, -1.25);
    const wheelRR = createDetailedWheel('wheel_rr', 0.84, -1.25);

    return { root, chassis, wheelFL, wheelFR, wheelRL, wheelRR, steeringWheel };
  }

  /**
   * Builds 3D mesh for handheld tools and car parts.
   */
  public static createItemMesh(scene: BABYLON.Scene, type: HoldableMeshType, name: string): BABYLON.Mesh {
    const rootMesh = new BABYLON.Mesh(name, scene);

    switch (type) {
      case 'wrench_10mm':
      case 'wrench_12mm':
      case 'wrench_14mm': {
        const matChrome = this.getMaterial(scene, 'mat_tool_chrome', '#d1d5db', '#ffffff');
        const colorBandHex = type === 'wrench_10mm' ? '#2563eb' : type === 'wrench_12mm' ? '#ea580c' : '#dc2626';
        const matBand = this.getMaterial(scene, `mat_band_${type}`, colorBandHex, '#ffffff');

        // Handle
        const len = type === 'wrench_10mm' ? 0.24 : type === 'wrench_12mm' ? 0.27 : 0.3;
        const handle = BABYLON.MeshBuilder.CreateBox('handle', { width: 0.025, height: 0.012, depth: len }, scene);
        handle.material = matChrome;
        handle.parent = rootMesh;

        // Open Head
        const head = BABYLON.MeshBuilder.CreateCylinder('head', { diameter: 0.055, height: 0.014, tessellation: 16 }, scene);
        head.position.z = len * 0.5;
        head.material = matChrome;
        head.parent = rootMesh;

        // Color ring
        const ring = BABYLON.MeshBuilder.CreateBox('ring', { width: 0.027, height: 0.014, depth: 0.03 }, scene);
        ring.position.z = 0;
        ring.material = matBand;
        ring.parent = rootMesh;
        break;
      }

      case 'screwdriver': {
        const matHandle = this.getMaterial(scene, 'mat_sd_handle', '#eab308', '#ffffff');
        const matSteel = this.getMaterial(scene, 'mat_tool_steel', '#9ca3af', '#ffffff');

        // Hex Handle
        const handle = BABYLON.MeshBuilder.CreateCylinder('sd_handle', { diameter: 0.045, height: 0.14, tessellation: 6 }, scene);
        handle.rotation.x = Math.PI / 2;
        handle.material = matHandle;
        handle.parent = rootMesh;

        // Shank
        const shank = BABYLON.MeshBuilder.CreateCylinder('sd_shank', { diameter: 0.01, height: 0.16, tessellation: 12 }, scene);
        shank.rotation.x = Math.PI / 2;
        shank.position.z = 0.14;
        shank.material = matSteel;
        shank.parent = rootMesh;
        break;
      }

      case 'part_turbo': {
        const matCast = this.getMaterial(scene, 'mat_turbo_cast', '#64748b', '#94a3b8');
        const matIntake = this.getMaterial(scene, 'mat_turbo_intake', '#dc2626', '#ff9999');

        // Compressor housing (torus + center cylinder)
        const snail = BABYLON.MeshBuilder.CreateTorus('snail', { diameter: 0.22, thickness: 0.09, tessellation: 20 }, scene);
        snail.rotation.x = Math.PI / 2;
        snail.material = matCast;
        snail.parent = rootMesh;

        const center = BABYLON.MeshBuilder.CreateCylinder('center', { diameter: 0.12, height: 0.14 }, scene);
        center.rotation.x = Math.PI / 2;
        center.material = matCast;
        center.parent = rootMesh;

        const intake = BABYLON.MeshBuilder.CreateCylinder('intake', { diameter: 0.11, height: 0.08 }, scene);
        intake.rotation.x = Math.PI / 2;
        intake.position.z = 0.09;
        intake.material = matIntake;
        intake.parent = rootMesh;
        break;
      }

      case 'part_battery': {
        const matCase = this.getMaterial(scene, 'mat_bat_case', '#18181b', '#333333');
        const matPos = this.getMaterial(scene, 'mat_bat_pos', '#ef4444', '#ffffff');
        const matNeg = this.getMaterial(scene, 'mat_bat_neg', '#3b82f6', '#ffffff');

        // Case (W: 0.28m, H: 0.22m, D: 0.18m)
        const box = BABYLON.MeshBuilder.CreateBox('case', { width: 0.28, height: 0.22, depth: 0.18 }, scene);
        box.position.y = 0.11;
        box.material = matCase;
        box.parent = rootMesh;

        // Terminals
        const termPos = BABYLON.MeshBuilder.CreateCylinder('pos', { diameter: 0.024, height: 0.03 }, scene);
        termPos.position.set(-0.09, 0.23, 0);
        termPos.material = matPos;
        termPos.parent = rootMesh;

        const termNeg = BABYLON.MeshBuilder.CreateCylinder('neg', { diameter: 0.024, height: 0.03 }, scene);
        termNeg.position.set(0.09, 0.23, 0);
        termNeg.material = matNeg;
        termNeg.parent = rootMesh;
        break;
      }
    }

    return rootMesh;
  }

  /**
   * Builds the 3D garage environment, workbench, and outdoor asphalt drift track.
   */
  public static createEnvironment(scene: BABYLON.Scene): {
    garageFloor: BABYLON.Mesh;
    workbench: BABYLON.Mesh;
  } {
    const matCache = MaterialCache.getInstance();
    const matConcrete = matCache.getRetroMaterial(scene, 'concrete', 6, 6);
    const matWall = matCache.getRetroMaterial(scene, 'rusted_metal', 4, 2);
    const matWood = matCache.getRetroMaterial(scene, 'weathered_wood', 3, 1);
    const matAsphalt = matCache.getRetroMaterial(scene, 'asphalt', 35, 35);

    // 1. Garage Interior Floor (16m x 14m)
    const garageFloor = BABYLON.MeshBuilder.CreateGround('garage_floor', { width: 16, height: 14 }, scene);
    garageFloor.position.set(0, 0, 0);
    garageFloor.material = matConcrete;

    // 2. Garage Walls
    const wallBack = BABYLON.MeshBuilder.CreateBox('wall_back', { width: 16, height: 4.5, depth: 0.3 }, scene);
    wallBack.position.set(0, 2.25, -7);
    wallBack.material = matWall;

    const wallLeft = BABYLON.MeshBuilder.CreateBox('wall_left', { width: 0.3, height: 4.5, depth: 14 }, scene);
    wallLeft.position.set(-8, 2.25, 0);
    wallLeft.material = matWall;

    const wallRight = BABYLON.MeshBuilder.CreateBox('wall_right', { width: 0.3, height: 4.5, depth: 14 }, scene);
    wallRight.position.set(8, 2.25, 0);
    wallRight.material = matWall;

    // Ceiling
    const ceiling = BABYLON.MeshBuilder.CreateBox('ceiling', { width: 16, height: 0.3, depth: 14 }, scene);
    ceiling.position.set(0, 4.5, 0);
    ceiling.material = matWall;

    // Fluorescent Tubes (Ceiling Lights)
    const matFluorescent = this.getMaterial(scene, 'mat_fluo', '#ffffff', '#ffffff');
    const tube1 = BABYLON.MeshBuilder.CreateCylinder('tube1', { diameter: 0.08, height: 3.5 }, scene);
    tube1.rotation.z = Math.PI / 2;
    tube1.position.set(0, 4.35, -2);
    tube1.material = matFluorescent;

    const light1 = new BABYLON.PointLight('light_tube1', new BABYLON.Vector3(0, 4.0, -2), scene);
    light1.intensity = 0.75;
    light1.diffuse = new BABYLON.Color3(0.95, 0.98, 1.0);

    const tube2 = BABYLON.MeshBuilder.CreateCylinder('tube2', { diameter: 0.08, height: 3.5 }, scene);
    tube2.rotation.z = Math.PI / 2;
    tube2.position.set(0, 4.35, 3);
    tube2.material = matFluorescent;

    const light2 = new BABYLON.PointLight('light_tube2', new BABYLON.Vector3(0, 4.0, 3), scene);
    light2.intensity = 0.75;
    light2.diffuse = new BABYLON.Color3(0.95, 0.98, 1.0);

    // 3. Mechanic Workbench (at the back wall)
    const benchTop = BABYLON.MeshBuilder.CreateBox('bench_top', { width: 4.2, height: 0.12, depth: 1.2 }, scene);
    benchTop.position.set(-3.5, 0.95, -6.2);
    benchTop.material = matWood;

    const benchLegs = BABYLON.MeshBuilder.CreateBox('bench_legs', { width: 4.1, height: 0.88, depth: 1.1 }, scene);
    benchLegs.position.set(-3.5, 0.44, -6.2);
    benchLegs.material = matWall;

    // 4. Outdoor Asphalt Drift Test Track (outside the open garage front: z > 7m)
    const track = BABYLON.MeshBuilder.CreateGround('drift_track', { width: 140, height: 140 }, scene);
    track.position.set(0, -0.01, 75);
    track.material = matAsphalt;

    // Sunlight
    const sun = new BABYLON.DirectionalLight('sunlight', new BABYLON.Vector3(-0.5, -1, 0.6), scene);
    sun.position = new BABYLON.Vector3(20, 40, -10);
    sun.intensity = 0.85;

    // Ambient light
    const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), scene);
    hemi.intensity = 0.45;
    hemi.groundColor = new BABYLON.Color3(0.2, 0.2, 0.25);

    return { garageFloor, workbench: benchTop };
  }
}
