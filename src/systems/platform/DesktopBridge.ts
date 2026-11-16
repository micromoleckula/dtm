/**
 * Platform abstraction layer for desktop runtime (Tauri v2) and browser dev fallback.
 */
export class DesktopBridge {
  private static instance: DesktopBridge | null = null;
  private isFullscreenActive = false;

  public static getInstance(): DesktopBridge {
    if (!DesktopBridge.instance) {
      DesktopBridge.instance = new DesktopBridge();
    }
    return DesktopBridge.instance;
  }

  constructor() {
    this.registerGlobalHotkeys();
  }

  /**
   * Checks whether the application is running inside the Tauri v2 desktop runtime.
   */
  public isTauri(): boolean {
    return (
      typeof window !== 'undefined' &&
      ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)
    );
  }

  /**
   * Registers global desktop hotkeys (F11 / Alt+Enter for fullscreen, Esc handling).
   */
  private registerGlobalHotkeys(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      // Toggle fullscreen on F11 or Alt+Enter
      if (e.key === 'F11' || (e.altKey && e.key === 'Enter')) {
        e.preventDefault();
        this.toggleFullscreen();
      }
    });
  }

  /**
   * Toggles borderless fullscreen mode.
   */
  public async toggleFullscreen(): Promise<boolean> {
    if (this.isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const state = await invoke<boolean>('toggle_fullscreen');
        this.isFullscreenActive = state;
        return state;
      } catch (err) {
        console.warn('[DesktopBridge] Tauri toggle_fullscreen failed, falling back to DOM API:', err);
      }
    }

    // Browser fallback
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen().catch(() => {});
      this.isFullscreenActive = true;
    } else {
      await document.exitFullscreen().catch(() => {});
      this.isFullscreenActive = false;
    }
    return this.isFullscreenActive;
  }

  /**
   * Cleanly closes the game process.
   */
  public async exitGame(): Promise<void> {
    if (this.isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('exit_game');
        return;
      } catch (err) {
        console.warn('[DesktopBridge] Tauri exit_game failed:', err);
      }
    }

    // Browser fallback
    window.close();
  }

  /**
   * Saves arbitrary string data (typically JSON) to local persistent storage.
   * Uses Tauri's OS app data directory when available, or localStorage in browser dev mode.
   */
  public async writeAppData(fileName: string, content: string): Promise<boolean> {
    if (this.isTauri()) {
      try {
        const { writeTextFile, BaseDirectory, mkdir, exists } = await import('@tauri-apps/plugin-fs');
        const saveDir = 'saves';
        const hasDir = await exists(saveDir, { baseDir: BaseDirectory.AppData }).catch(() => false);
        if (!hasDir) {
          await mkdir(saveDir, { baseDir: BaseDirectory.AppData, recursive: true });
        }
        await writeTextFile(`${saveDir}/${fileName}`, content, { baseDir: BaseDirectory.AppData });
        return true;
      } catch (err) {
        console.warn('[DesktopBridge] Failed writing file via Tauri FS plugin, using localStorage fallback:', err);
      }
    }

    try {
      localStorage.setItem(`rgd_appdata_${fileName}`, content);
      return true;
    } catch (e) {
      console.error('[DesktopBridge] LocalStorage write failed:', e);
      return false;
    }
  }

  /**
   * Reads string data from local persistent storage.
   */
  public async readAppData(fileName: string): Promise<string | null> {
    if (this.isTauri()) {
      try {
        const { readTextFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
        return await readTextFile(`saves/${fileName}`, { baseDir: BaseDirectory.AppData });
      } catch (err) {
        // Fall through to localStorage if not found or running in dev
      }
    }

    return localStorage.getItem(`rgd_appdata_${fileName}`);
  }
}
