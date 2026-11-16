/**
 * Deterministic spatial layout and coordinates for the Japanese Coastal Prefecture world.
 * All units are in SI meters. Coordinates: X = East/West, Y = Altitude, Z = North/South.
 */

export interface IVector3D {
  x: number;
  y: number;
  z: number;
}

export interface IRoadSegmentConfig {
  id: string;
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  width: number;
  hasDitches: boolean;
}

export interface IBuildingPlotConfig {
  id: string;
  type: 'player_house' | 'garage' | 'town_house' | 'store' | 'gas_station';
  x: number;
  y: number;
  z: number;
  yawRad: number;
  width: number;
  length: number;
  height: number;
}

export interface IBridgeConfig {
  id: string;
  type: 'concrete_road' | 'steel_truss';
  startX: number;
  endX: number;
  z: number;
  width: number;
  height: number;
}

export const WORLD_LAYOUT = {
  // World bounds in meters
  bounds: {
    minX: -260,
    maxX: 260,
    minZ: -280,
    maxZ: 280,
  },

  // Coastline & Seawall
  coastline: {
    seawallZ: -60,
    waterZStart: -65,
    waterZEnd: -300,
    waterLevelY: -2.8,
    seawallHeightY: 1.6,
  },

  // River channel cutting north-to-south into the ocean
  river: {
    startX: 40,
    width: 18,
    bankLeftX: 31,
    bankRightX: 49,
    depthY: -3.0,
    northZ: 280,
    southZ: -62,
  },

  // Player Compound & Homestead
  homestead: {
    garage: {
      x: -65,
      y: 0,
      z: 25,
      yawRad: 0,
      width: 12,
      length: 15,
      height: 5.5,
      doorWidth: 4.8,
      doorHeight: 4.0,
    },
    house: {
      x: -86,
      y: 0,
      z: 42,
      yawRad: 0,
      width: 14,
      length: 12,
      height: 6.2,
    },
    driveway: {
      startX: -65,
      startZ: 17,
      endX: -65,
      endZ: 6,
      width: 6,
    },
    spawnCar: { x: -65, y: 0.1, z: 23, yawRad: 0 },
    spawnPlayer: { x: -65, y: 1.75, z: 20, yawRad: 0 },
    workbench: { x: -69.8, y: 0.95, z: 29.5 },
  },

  // Road Network segments
  roads: [
    // Coastal Highway (Wide 2-lane asphalt along the sea)
    {
      id: 'coastal_highway_west',
      startX: -250,
      startZ: -48,
      endX: 28,
      endZ: -48,
      width: 8.5,
      hasDitches: false,
    },
    {
      id: 'coastal_highway_east',
      startX: 52,
      startZ: -48,
      endX: 250,
      endZ: -48,
      width: 8.5,
      hasDitches: false,
    },

    // Winding 1.5-lane rural road connecting Player Garage to Coastal Highway
    {
      id: 'garage_access_road',
      startX: -65,
      startZ: 6,
      endX: -65,
      endZ: -20,
      width: 5.0,
      hasDitches: true,
    },
    {
      id: 'garage_to_coast_curve',
      startX: -65,
      startZ: -20,
      endX: -65,
      endZ: -48,
      width: 5.2,
      hasDitches: true,
    },

    // Winding farm road from Player Compound eastward towards the Municipal Town Bridge
    {
      id: 'rural_winding_1',
      startX: -65,
      startZ: 6,
      endX: -30,
      endZ: 50,
      width: 4.8,
      hasDitches: true,
    },
    {
      id: 'rural_winding_2',
      startX: -30,
      startZ: 50,
      endX: 5,
      endZ: 95,
      width: 4.8,
      hasDitches: true,
    },
    {
      id: 'rural_winding_approach',
      startX: 5,
      startZ: 95,
      endX: 28,
      endZ: 110,
      width: 5.4,
      hasDitches: true,
    },

    // Main Town Road (east of river)
    {
      id: 'town_main_street',
      startX: 52,
      startZ: 110,
      endX: 230,
      endZ: 110,
      width: 7.5,
      hasDitches: false,
    },
    // Town Cross Street
    {
      id: 'town_cross_street',
      startX: 135,
      startZ: 60,
      endX: 135,
      endZ: 180,
      width: 6.0,
      hasDitches: false,
    },
    // Town coastal connector linking town street to coastal highway
    {
      id: 'town_coastal_connector',
      startX: 135,
      startZ: 60,
      endX: 135,
      endZ: -48,
      width: 6.5,
      hasDitches: false,
    },
  ] as IRoadSegmentConfig[],

  // Two traversable river bridges
  bridges: [
    {
      id: 'coastal_steel_bridge',
      type: 'steel_truss',
      startX: 28,
      endX: 52,
      z: -48,
      width: 8.5,
      height: 3.2,
    },
    {
      id: 'town_concrete_bridge',
      type: 'concrete_road',
      startX: 28,
      endX: 52,
      z: 110,
      width: 6.8,
      height: 2.2,
    },
  ] as IBridgeConfig[],

  // Buildings in Town & Homestead
  buildingPlots: [
    // Town Houses
    { id: 'town_house_1', type: 'town_house', x: 80, y: 0, z: 130, yawRad: 0, width: 11, length: 13, height: 6 },
    { id: 'town_house_2', type: 'town_house', x: 100, y: 0, z: 130, yawRad: 0, width: 12, length: 11, height: 5.8 },
    { id: 'town_house_3', type: 'town_house', x: 80, y: 0, z: 88, yawRad: Math.PI, width: 10, length: 12, height: 6 },
    { id: 'town_house_4', type: 'town_house', x: 102, y: 0, z: 88, yawRad: Math.PI, width: 11, length: 11, height: 5.5 },
    // Commercial Buildings
    { id: 'showa_store', type: 'store', x: 160, y: 0, z: 135, yawRad: 0, width: 16, length: 14, height: 5.2 },
    { id: 'gas_station', type: 'gas_station', x: 195, y: 0, z: 88, yawRad: Math.PI, width: 18, length: 15, height: 4.8 },
    { id: 'town_house_5', type: 'town_house', x: 165, y: 0, z: 88, yawRad: Math.PI, width: 11, length: 12, height: 5.8 },
  ] as IBuildingPlotConfig[],
} as const;
