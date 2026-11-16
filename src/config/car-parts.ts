import { ICarPart } from '../types/assembly.types';
import { IHoldableItem } from '../types/inventory.types';

/**
 * 3D Vehicle parts catalog with local bolt coordinates for engine bay assembly.
 */
export interface ICarPart3D extends ICarPart {
  /** Relative 3D position [x, y, z] inside the car engine bay / chassis */
  readonly mountPosition: [number, number, number];
  /** Local 3D coordinates [x, y, z] for each bolt relative to the part */
  readonly boltOffsets: [number, number, number][];
}

export const CAR_PARTS_CATALOG_3D: Record<string, ICarPart3D> = {
  part_manifold: {
    id: 'part_manifold',
    name: 'Cast Iron Exhaust Manifold',
    socketSize: '12mm',
    boltsRequired: 4,
    boltsTightened: [0, 0, 0, 0],
    dependencies: [],
    condition: 95,
    mountPosition: [0.35, 0.45, 1.1],
    boltOffsets: [
      [-0.12, 0.05, -0.08],
      [0.12, 0.05, -0.08],
      [-0.12, 0.05, 0.08],
      [0.12, 0.05, 0.08],
    ],
  },
  part_turbo: {
    id: 'part_turbo',
    name: 'Garrett T25 Turbocharger',
    socketSize: '10mm',
    boltsRequired: 3,
    boltsTightened: [0, 0, 0],
    dependencies: ['part_manifold'],
    condition: 80,
    mountPosition: [0.35, 0.55, 1.3],
    boltOffsets: [
      [-0.06, 0.06, 0],
      [0.06, 0.06, 0],
      [0, -0.06, 0],
    ],
  },
  part_battery: {
    id: 'part_battery',
    name: 'Heavy-Duty 12V Battery',
    socketSize: '10mm',
    boltsRequired: 2,
    boltsTightened: [0, 0],
    dependencies: [],
    condition: 100,
    mountPosition: [-0.4, 0.48, 1.25],
    boltOffsets: [
      [-0.1, 0.12, 0],
      [0.1, 0.12, 0],
    ],
  },
};

/**
 * 3D Tools and holdable items spawned in the garage.
 */
export const INITIAL_GARAGE_ITEMS_3D: IHoldableItem[] = [
  {
    id: 'item_wrench_10mm',
    name: '10mm Combination Wrench',
    category: 'tool',
    socketSize: '10mm',
    meshType: 'wrench_10mm',
  },
  {
    id: 'item_wrench_12mm',
    name: '12mm Combination Wrench',
    category: 'tool',
    socketSize: '12mm',
    meshType: 'wrench_12mm',
  },
  {
    id: 'item_wrench_14mm',
    name: '14mm Lug Wrench',
    category: 'tool',
    socketSize: '14mm',
    meshType: 'wrench_14mm',
  },
  {
    id: 'item_screwdriver',
    name: 'Flathead Screwdriver',
    category: 'tool',
    socketSize: 'flathead',
    meshType: 'screwdriver',
  },
  {
    id: 'item_part_turbo',
    name: 'T25 Turbocharger',
    category: 'part',
    socketSize: '10mm',
    carPartId: 'part_turbo',
    meshType: 'part_turbo',
  },
  {
    id: 'item_part_battery',
    name: '12V Battery',
    category: 'part',
    socketSize: '10mm',
    carPartId: 'part_battery',
    meshType: 'part_battery',
  },
];
