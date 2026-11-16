export interface IInputState {
  moveX: number;
  moveY: number;
  throttle: number;
  steer: number;
  handbrake: boolean;
  sprint: boolean;
  jump: boolean;
  interactPressed: boolean; // [E]
  dropPressed: boolean; // [G] or [Q]
  toggleVehiclePressed: boolean; // [F]
  actionClick: boolean; // Left Mouse Button click
  actionHeld: boolean; // Left Mouse Button hold
  quickSavePressed: boolean; // [F5]
  quickLoadPressed: boolean; // [F9]
}

/**
 * 3D Input Manager with PointerLock mouse-look and keyboard mapping.
 */
export class InputManager {
  private readonly canvas: HTMLCanvasElement;
  private readonly keysDown: Set<string> = new Set();
  private readonly justPressedKeys: Set<string> = new Set();
  private isMouseHeld = false;
  private isMouseJustClicked = false;

  public readonly state: IInputState = {
    moveX: 0,
    moveY: 0,
    throttle: 0,
    steer: 0,
    handbrake: false,
    sprint: false,
    jump: false,
    interactPressed: false,
    dropPressed: false,
    toggleVehiclePressed: false,
    actionClick: false,
    actionHeld: false,
    quickSavePressed: false,
    quickLoadPressed: false,
  };

  constructor(canvas: HTMLCanvasElement, onMouseMove?: (dx: number, dy: number) => void) {
    this.canvas = canvas;
    this.setupListeners(onMouseMove);
  }

  private setupListeners(onMouseMove?: (dx: number, dy: number) => void): void {
    window.addEventListener('keydown', (e) => {
      // Prevent browser default refresh on F5 so it acts as quick save
      if (e.key === 'F5' || e.key === 'F9') {
        e.preventDefault();
      }
      const code = e.code.toLowerCase();
      if (!this.keysDown.has(code)) {
        this.justPressedKeys.add(code);
      }
      this.keysDown.add(code);
    });

    window.addEventListener('keyup', (e) => {
      this.keysDown.delete(e.code.toLowerCase());
    });

    // PointerLock request on canvas click
    this.canvas.addEventListener('click', () => {
      if (document.pointerLockElement !== this.canvas) {
        this.canvas.requestPointerLock();
      }
    });

    // Mouse movement
    window.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement === this.canvas && onMouseMove) {
        onMouseMove(e.movementX, e.movementY);
      }
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isMouseHeld = true;
        this.isMouseJustClicked = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isMouseHeld = false;
      }
    });
  }

  /**
   * Refreshes the normalized input state every frame.
   */
  public update(): void {
    const s = this.state;

    // Movement axes
    let mx = 0;
    if (this.keysDown.has('keya') || this.keysDown.has('arrowleft')) mx -= 1;
    if (this.keysDown.has('keyd') || this.keysDown.has('arrowright')) mx += 1;
    s.moveX = mx;
    s.steer = mx;

    let my = 0;
    if (this.keysDown.has('keyw') || this.keysDown.has('arrowup')) my -= 1;
    if (this.keysDown.has('keys') || this.keysDown.has('arrowdown')) my += 1;
    s.moveY = my;
    s.throttle = -my; // -my because W is -1 in Y screen space, so forward is +1

    s.handbrake = this.keysDown.has('space');
    s.sprint = this.keysDown.has('shiftleft') || this.keysDown.has('shiftright');
    s.jump = this.justPressedKeys.has('space');

    s.interactPressed = this.justPressedKeys.has('keye');
    s.dropPressed = this.justPressedKeys.has('keyg') || this.justPressedKeys.has('keyq');
    s.toggleVehiclePressed = this.justPressedKeys.has('keyf');

    s.actionClick = this.isMouseJustClicked;
    s.actionHeld = this.isMouseHeld;

    s.quickSavePressed = this.justPressedKeys.has('f5');
    s.quickLoadPressed = this.justPressedKeys.has('f9');

    // Clear single frame triggers
    this.justPressedKeys.clear();
    this.isMouseJustClicked = false;
  }
}
