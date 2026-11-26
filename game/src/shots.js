// The screenshot scenes behind ?shot=start|play|rings|end. Each one sets the
// jet to a real mid-flight state — parked on the runway, banking through a ring,
// low over the valley with rings ahead, or rolling out after landing — so the
// frame is what the game really looks like, and the same seed always gives the
// same frame.
import { GAME, RINGS } from './config.js';

function faceToward(state, x, y, z) {
  const dx = x - state.pos.x;
  const dz = z - state.pos.z;
  // yaw 0 faces -Z; atan2 gives the heading that points at the target.
  state.yaw = Math.atan2(-dx, -dz);
}

export function stageShot(name, world) {
  const state = world.state;
  world.reset();
  if (name === 'rings') {
    // Low pass over the river valley, rings 5, 6 and 7 ahead in the windscreen.
    state.pos.x = 300;
    state.pos.y = 175;
    state.pos.z = -1500;
    state.speed = 132;
    state.throttle = 0.72;
    state.pitch = -0.02;
    state.roll = -0.22;
    faceToward(state, RINGS[4].x, RINGS[4].y, RINGS[4].z);
    state.ringsPassed = 4;
    state.score = GAME.ringScore * 4;
    state.elapsed = 96;
    state.status = 'flying';
    state.onGround = false;
    return { screen: 'play', camera: 'chase' };
  }
  if (name === 'end') {
    // Rolling out on the runway after the landing, mission complete.
    state.pos.x = 0;
    state.pos.y = 16;
    state.pos.z = 40;
    state.speed = 24;
    state.throttle = 0;
    state.yaw = 0;
    state.ringsPassed = RINGS.length;
    state.score = GAME.ringScore * RINGS.length + GAME.landingBonus + 180;
    state.elapsed = 214;
    state.status = 'complete';
    state.onGround = true;
    return { screen: 'complete', camera: 'chase' };
  }
  if (name === 'play') {
    // Banking through ring 3, two rings already flown, valley and sea behind.
    state.pos.x = 185;
    state.pos.y = 205;
    state.pos.z = -1060;
    state.speed = 122;
    state.throttle = 0.68;
    state.pitch = 0.06;
    state.roll = 0.5;
    faceToward(state, RINGS[2].x, RINGS[2].y, RINGS[2].z);
    state.ringsPassed = 2;
    state.score = GAME.ringScore * 2;
    state.elapsed = 48;
    state.status = 'flying';
    state.onGround = false;
    return { screen: 'play', camera: 'chase' };
  }
  // start: parked on the runway threshold at first light, title screen up.
  state.pos.x = 0;
  state.pos.y = 16;
  state.pos.z = 300;
  state.speed = 0;
  state.throttle = 0.3;
  state.yaw = 0;
  state.status = 'title';
  state.onGround = true;
  return { screen: 'title', camera: 'runway' };
}
