import { IGameState } from './GameState';
import { DesktopBridge } from '../../systems/platform/DesktopBridge';

/**
 * Manages serialization, disk persistence, and deserialization of game state.
 */
export class SaveManager {
  private static readonly CURRENT_VERSION = 1;
  private readonly bridge: DesktopBridge;

  constructor(bridge?: DesktopBridge) {
    this.bridge = bridge ?? DesktopBridge.getInstance();
  }

  /**
   * Generates a clean default game state for a new playthrough.
   */
  public createDefaultState(): IGameState {
    return {
      version: SaveManager.CURRENT_VERSION,
      timestamp: Date.now(),
      player: {
        position: [-65, 1.75, 20],
        facingYaw: 0,
        inVehicle: false,
        heldItemId: null,
      },
      car: {
        position: [-65, 0.1, 23],
        yaw: 0,
        parts: {
          part_manifold: { boltsTightened: [0, 0, 0, 0], condition: 95 },
          part_turbo: { boltsTightened: [0, 0, 0], condition: 80 },
          part_battery: { boltsTightened: [0, 0], condition: 100 },
        },
      },
      vitals: {
        digestionLevel: 10,
        respect: 50,
      },
      groundItems: [
        { id: 'item_wrench_10mm', name: '10mm Combination Wrench', category: 'tool', meshType: 'wrench_10mm', socketSize: '10mm', position: [-71.2, 1.02, 29.5] },
        { id: 'item_wrench_12mm', name: '12mm Combination Wrench', category: 'tool', meshType: 'wrench_12mm', socketSize: '12mm', position: [-70.7, 1.02, 29.5] },
        { id: 'item_wrench_14mm', name: '14mm Lug Wrench', category: 'tool', meshType: 'wrench_14mm', socketSize: '14mm', position: [-70.2, 1.02, 29.5] },
        { id: 'item_screwdriver', name: 'Flathead Screwdriver', category: 'tool', meshType: 'screwdriver', socketSize: 'flathead', position: [-69.7, 1.02, 29.5] },
        { id: 'item_part_turbo', name: 'T25 Turbocharger', category: 'part', meshType: 'part_turbo', socketSize: '10mm', carPartId: 'part_turbo', position: [-69.1, 1.08, 29.5] },
        { id: 'item_part_battery', name: '12V Battery', category: 'part', meshType: 'part_battery', socketSize: '10mm', carPartId: 'part_battery', position: [-68.5, 1.02, 29.5] },
      ],
    };
  }

  /**
   * Persists game state to a named save slot.
   *
   * @param slotName Identifier for the save slot (e.g. 'autosave', 'slot1').
   * @param state The game state to persist.
   */
  public async saveGame(slotName: string, state: IGameState): Promise<boolean> {
    try {
      state.timestamp = Date.now();
      const serialized = JSON.stringify(state, null, 2);
      return await this.bridge.writeAppData(`${slotName}.json`, serialized);
    } catch (err) {
      console.error(`[SaveManager] Failed to save state to slot "${slotName}":`, err);
      return false;
    }
  }

  /**
   * Loads game state from a named save slot.
   *
   * @param slotName Identifier for the save slot.
   * @returns Deserialized game state or null if not found or corrupted.
   */
  public async loadGame(slotName: string): Promise<IGameState | null> {
    try {
      const raw = await this.bridge.readAppData(`${slotName}.json`);
      if (!raw) return null;

      const parsed = JSON.parse(raw) as IGameState;
      if (parsed.version !== SaveManager.CURRENT_VERSION) {
        console.warn(`[SaveManager] Save version mismatch: got ${parsed.version}, expected ${SaveManager.CURRENT_VERSION}`);
      }
      return parsed;
    } catch (err) {
      console.error(`[SaveManager] Failed to load state from slot "${slotName}":`, err);
      return null;
    }
  }
}
