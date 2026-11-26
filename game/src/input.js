// Keyboard and mouse input. Arrows fly the jet, Shift/Ctrl (or W/S) work the
// throttle, Enter confirms, P pauses, R restarts. Dragging with the mouse also
// steers: horizontal drag banks, vertical drag pitches.
export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_RESTART = 'restart';

const KEYMAP = {
  ArrowUp: 'pitchUp',
  ArrowDown: 'pitchDown',
  ArrowLeft: 'rollLeft',
  ArrowRight: 'rollRight',
  KeyW: 'throttleUp',
  KeyS: 'throttleDown',
  ShiftLeft: 'throttleUp',
  ShiftRight: 'throttleUp',
  ControlLeft: 'throttleDown',
  ControlRight: 'throttleDown',
  Enter: ACTION_CONFIRM,
  KeyP: ACTION_PAUSE,
  KeyR: ACTION_RESTART,
};

export function createInput(target) {
  const held = new Set();
  const pressed = new Set();
  const mouse = { active: false, dx: 0, dy: 0, down: false, lastX: 0, lastY: 0 };

  function onKeyDown(event) {
    const action = KEYMAP[event.code];
    if (!action) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      event.preventDefault();
    }
    if (!event.repeat) pressed.add(action);
    held.add(action);
  }
  function onKeyUp(event) {
    const action = KEYMAP[event.code];
    if (action) held.delete(action);
  }
  function onMouseDown(event) {
    mouse.down = true;
    mouse.lastX = event.clientX;
    mouse.lastY = event.clientY;
  }
  function onMouseMove(event) {
    if (!mouse.down) return;
    mouse.dx += event.clientX - mouse.lastX;
    mouse.dy += event.clientY - mouse.lastY;
    mouse.lastX = event.clientX;
    mouse.lastY = event.clientY;
    mouse.active = true;
  }
  function onMouseUp() {
    mouse.down = false;
  }

  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup', onKeyUp);
  target.addEventListener('mousedown', onMouseDown);
  target.addEventListener('mousemove', onMouseMove);
  target.addEventListener('mouseup', onMouseUp);
  target.addEventListener('blur', () => held.clear());

  // Read the current control state and clear one-shot presses and mouse drift.
  function read() {
    const pitch = (held.has('pitchUp') ? 1 : 0) - (held.has('pitchDown') ? 1 : 0)
      - Math.max(-1, Math.min(1, mouse.dy / 120));
    const roll = (held.has('rollRight') ? 1 : 0) - (held.has('rollLeft') ? 1 : 0)
      + Math.max(-1, Math.min(1, mouse.dx / 160));
    const throttle = (held.has('throttleUp') ? 1 : 0) - (held.has('throttleDown') ? 1 : 0);
    const actions = new Set(pressed);
    pressed.clear();
    mouse.dx *= 0.6;
    mouse.dy *= 0.6;
    if (Math.abs(mouse.dx) < 0.5) mouse.dx = 0;
    if (Math.abs(mouse.dy) < 0.5) mouse.dy = 0;
    return { pitch, roll, throttle, actions };
  }

  return { read };
}
