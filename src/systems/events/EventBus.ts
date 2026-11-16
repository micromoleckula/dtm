import { IGameEvents } from '../../types/events.types';

type EventCallback<T> = (data: T) => void;

/**
 * Strongly typed game event bus for decoupled communication.
 */
export class EventBus {
  private listeners: Map<keyof IGameEvents, Set<EventCallback<any>>> = new Map();

  /**
   * Subscribes to a typed game event.
   *
   * @param event Event identifier.
   * @param callback Callback invoked when event is emitted.
   * @returns Unsubscribe function.
   */
  public on<K extends keyof IGameEvents>(
    event: K,
    callback: EventCallback<IGameEvents[K]>
  ): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(callback);

    return () => {
      set?.delete(callback);
    };
  }

  /**
   * Emits a typed game event to all registered listeners.
   *
   * @param event Event identifier.
   * @param data Payload matching event type.
   */
  public emit<K extends keyof IGameEvents>(
    event: K,
    ...args: IGameEvents[K] extends void ? [] : [IGameEvents[K]]
  ): void {
    const set = this.listeners.get(event);
    if (!set || set.size === 0) return;

    const data = args[0] as IGameEvents[K];
    set.forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        console.error(`[EventBus] Error in listener for "${String(event)}":`, err);
      }
    });
  }

  /**
   * Clears all registered event listeners.
   */
  public clear(): void {
    this.listeners.clear();
  }
}
