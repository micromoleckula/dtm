import { IHoldableItem } from '../types/inventory.types';
import { ICar3DTelemetry } from '../core/physics/Car3DPhysics';

/**
 * Modern HTML/DOM HUD overlay for 3D First-Person interaction and vehicle telemetry.
 */
export class HUDOverlay {
  private readonly container: HTMLElement;
  private readonly crosshair: HTMLElement;
  private readonly promptText: HTMLElement;
  private readonly modeLabel: HTMLElement;
  private readonly handsLabel: HTMLElement;
  private readonly telemetryLabel: HTMLElement;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'hud-root';
    this.container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      font-family: 'Courier New', Courier, monospace;
      color: #f8fafc;
      user-select: none;
    `;

    // 1. Center Crosshair & Prompt
    const centerWrap = document.createElement('div');
    centerWrap.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    `;

    this.crosshair = document.createElement('div');
    this.crosshair.style.cssText = `
      width: 8px;
      height: 8px;
      border: 2px solid rgba(255, 255, 255, 0.85);
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      box-shadow: 0 0 6px rgba(0,0,0,0.5);
    `;

    this.promptText = document.createElement('div');
    this.promptText.style.cssText = `
      font-size: 13px;
      font-weight: bold;
      color: #38bdf8;
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid #334155;
      padding: 4px 10px;
      border-radius: 4px;
      white-space: nowrap;
      display: none;
    `;

    centerWrap.appendChild(this.crosshair);
    centerWrap.appendChild(this.promptText);
    this.container.appendChild(centerWrap);

    // 2. Status Panel (Bottom Left)
    const statusPanel = document.createElement('div');
    statusPanel.style.cssText = `
      position: absolute;
      bottom: 24px;
      left: 24px;
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 14px 18px;
      min-width: 280px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    `;

    const title = document.createElement('div');
    title.textContent = '3D GARAGE & DRIFT SIM';
    title.style.cssText = 'font-size: 11px; color: #64748b; font-weight: bold; margin-bottom: 6px;';

    this.modeLabel = document.createElement('div');
    this.modeLabel.textContent = 'MODE: [FIRST PERSON]';
    this.modeLabel.style.cssText = 'font-size: 14px; font-weight: bold; color: #38bdf8; margin-bottom: 6px;';

    this.handsLabel = document.createElement('div');
    this.handsLabel.textContent = 'HANDS: [EMPTY]';
    this.handsLabel.style.cssText = 'font-size: 13px; color: #94a3b8;';

    statusPanel.appendChild(title);
    statusPanel.appendChild(this.modeLabel);
    statusPanel.appendChild(this.handsLabel);
    this.container.appendChild(statusPanel);

    // 3. Telemetry Panel (Bottom Right)
    const telemetryPanel = document.createElement('div');
    telemetryPanel.style.cssText = `
      position: absolute;
      bottom: 24px;
      right: 24px;
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 14px 18px;
      text-align: right;
      min-width: 200px;
    `;

    this.telemetryLabel = document.createElement('div');
    this.telemetryLabel.innerHTML = 'SPEED: <span style="font-size:22px;color:#f8fafc">0</span> km/h';
    this.telemetryLabel.style.cssText = 'font-size: 13px; color: #94a3b8; font-weight: bold;';

    telemetryPanel.appendChild(this.telemetryLabel);
    this.container.appendChild(telemetryPanel);

    // 4. Controls Helper (Top Right)
    const controls = document.createElement('div');
    controls.style.cssText = `
      position: absolute;
      top: 20px;
      right: 24px;
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid #1e293b;
      border-radius: 6px;
      padding: 10px 14px;
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.5;
    `;
    controls.innerHTML = `
      <b style="color:#e2e8f0">CONTROLS</b><br/>
      • Click canvas to Lock Mouse<br/>
      • WASD: Move / Steer<br/>
      • E: Pick up item / Interact<br/>
      • G / Q: Drop item from hands<br/>
      • F: Enter / Exit Car<br/>
      • Space: Handbrake (Car) / Jump (FPS)<br/>
      • Left Mouse: Use tool / Wrench twist<br/>
      • F5: Quick Save | F9: Quick Load<br/>
      • F11: Fullscreen
    `;
    this.container.appendChild(controls);

    document.body.appendChild(this.container);
  }

  /**
   * Updates HUD telemetry and interaction prompt.
   */
  public update(isDriving: boolean, heldItem: IHoldableItem | null, prompt: string, telemetry?: ICar3DTelemetry): void {
    // Interaction Prompt
    if (prompt && !isDriving) {
      this.promptText.textContent = prompt;
      this.promptText.style.display = 'block';
      this.crosshair.style.borderColor = '#38bdf8';
    } else {
      this.promptText.style.display = 'none';
      this.crosshair.style.borderColor = 'rgba(255, 255, 255, 0.85)';
    }

    // Mode
    if (isDriving) {
      this.modeLabel.textContent = 'MODE: [DRIVING CAR]';
      this.modeLabel.style.color = '#f59e0b';
      this.crosshair.style.display = 'none';

      const speed = telemetry?.speedKmh ?? 0;
      const driftText = telemetry?.isDrifting
        ? ` <span style="color:#ef4444;font-size:12px;">🔥 DRIFT! (${Math.round(telemetry.slipRatio * 100)}%)</span>`
        : '';
      this.telemetryLabel.innerHTML = `SPEED: <span style="font-size:24px;color:#f8fafc">${speed}</span> km/h${driftText}`;
    } else {
      this.modeLabel.textContent = 'MODE: [FIRST PERSON]';
      this.modeLabel.style.color = '#38bdf8';
      this.crosshair.style.display = 'block';
      this.telemetryLabel.innerHTML = 'SPEED: <span style="font-size:20px;color:#64748b">--</span> km/h';
    }

    // Hands
    if (heldItem) {
      const socketSpec = heldItem.socketSize ? ` [${heldItem.socketSize}]` : '';
      this.handsLabel.innerHTML = `HANDS: <span style="color:#f8fafc">${heldItem.name}${socketSpec}</span>`;
    } else {
      this.handsLabel.innerHTML = 'HANDS: <span style="color:#64748b">[EMPTY]</span>';
    }
  }

  public dispose(): void {
    this.container.remove();
  }
}
