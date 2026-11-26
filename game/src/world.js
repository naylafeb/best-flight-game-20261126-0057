// The flight model and the mission: throttle, pitch and roll into motion, ring
// passes, terrain and water crashes, and the runway landing that completes the
// run. Pure state and arithmetic — no drawing and no browser in here.
import { GAME, PHYSICS, RING_RADIUS, RINGS, RUNWAY, WORLD } from './config.js';

export const EVENT_NONE = 0;
export const EVENT_RING = 1;
export const EVENT_CRASH = 2;
export const EVENT_LAND = 4;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function onRunway(x, z) {
  return Math.abs(x - RUNWAY.x) < RUNWAY.width / 2 + 6
    && Math.abs(z - RUNWAY.z) < RUNWAY.length / 2 + 6;
}

export function createWorld(heightAt) {
  const state = {
    pos: { x: 0, y: 0, z: 0 },
    yaw: 0,
    pitch: 0,
    roll: 0,
    speed: 0,
    throttle: 0,
    ringsPassed: 0,
    score: 0,
    elapsed: 0,
    status: 'title', // title | flying | paused | over | complete
    message: '',
    reason: '',
    onGround: true,
  };

  function reset() {
    state.pos.x = RUNWAY.x;
    state.pos.y = WORLD.runwayElevation + 2;
    state.pos.z = RUNWAY.z + 300;
    state.yaw = 0;
    state.pitch = 0;
    state.roll = 0;
    state.speed = 0;
    state.throttle = 0;
    state.ringsPassed = 0;
    state.score = 0;
    state.elapsed = 0;
    state.status = 'title';
    state.message = '';
    state.reason = '';
    state.onGround = true;
  }

  function forward() {
    const cp = Math.cos(state.pitch);
    return {
      x: -Math.sin(state.yaw) * cp,
      y: Math.sin(state.pitch),
      z: -Math.cos(state.yaw) * cp,
    };
  }

  function step(dt, input) {
    if (state.status !== 'flying') return EVENT_NONE;
    state.elapsed += dt;

    // Throttle and speed: the jet chases its throttle target speed.
    state.throttle = clamp(state.throttle + input.throttle * dt * 0.45, 0, 1);
    const targetSpeed = PHYSICS.minSpeed
      + state.throttle * (PHYSICS.maxSpeed - PHYSICS.minSpeed);
    const diff = targetSpeed - state.speed;
    state.speed += clamp(diff, -PHYSICS.accel * dt, PHYSICS.accel * dt);

    // Stick: pitch and roll chase their targets, then the bank turns the jet.
    const pitchTarget = input.pitch * PHYSICS.maxPitch;
    const rollTarget = input.roll * PHYSICS.maxRoll;
    state.pitch += clamp(pitchTarget - state.pitch, -PHYSICS.pitchRate * dt, PHYSICS.pitchRate * dt);
    state.roll += clamp(rollTarget - state.roll, -PHYSICS.rollRate * dt, PHYSICS.rollRate * dt);
    state.yaw -= Math.sin(state.roll) * PHYSICS.turnRate * (0.35 + state.speed / PHYSICS.maxSpeed) * dt;

    // On the runway the jet rolls until it is fast enough to rotate.
    if (state.onGround) {
      state.pitch = 0;
      if (state.speed > 62 && input.pitch > 0.3) {
        state.onGround = false;
        state.message = 'AIRBORNE — FLY THE RINGS';
      }
    }

    // Move, with a stall sink when the jet flies too slowly.
    const fwd = forward();
    const sink = state.speed < PHYSICS.minSpeed + 12
      ? (PHYSICS.minSpeed + 12 - state.speed) * 0.55 : 0;
    state.pos.x += fwd.x * state.speed * dt;
    state.pos.y += (fwd.y * state.speed - sink) * dt;
    state.pos.z += fwd.z * state.speed * dt;

    // Soft boundary: warn and steer back toward the valley.
    if (Math.abs(state.pos.x) > WORLD.half - 120 || Math.abs(state.pos.z) > WORLD.half - 120) {
      state.message = 'TURN BACK — LEAVING THE VALLEY';
      state.pos.x = clamp(state.pos.x, -WORLD.half + 100, WORLD.half - 100);
      state.pos.z = clamp(state.pos.z, -WORLD.half + 100, WORLD.half - 100);
    }

    // Ring pass: inside the torus opening of the next ring.
    if (state.ringsPassed < RINGS.length) {
      const ring = RINGS[state.ringsPassed];
      const dx = state.pos.x - ring.x;
      const dy = state.pos.y - ring.y;
      const dz = state.pos.z - ring.z;
      if (dx * dx + dy * dy + dz * dz < RING_RADIUS * RING_RADIUS) {
        state.ringsPassed += 1;
        state.score += GAME.ringScore;
        state.message = state.ringsPassed === RINGS.length
          ? 'ALL RINGS — LAND ON THE RUNWAY'
          : `RING ${state.ringsPassed}/${RINGS.length} — +${GAME.ringScore}`;
        return EVENT_RING;
      }
    }

    // Ground and water.
    const ground = heightAt(state.pos.x, state.pos.z);
    if (state.pos.y <= ground + PHYSICS.groundClearance) {
      if (state.ringsPassed === RINGS.length && onRunway(state.pos.x, state.pos.z)
        && state.speed < 78 && Math.abs(state.pitch) < 0.3) {
        state.pos.y = ground + PHYSICS.groundClearance;
        state.status = 'complete';
        state.score += GAME.landingBonus
          + Math.max(0, Math.round((300 - state.elapsed)) * GAME.timeBonusPerSecond);
        return EVENT_LAND;
      }
      state.status = 'over';
      state.reason = ground < WORLD.seaLevel + 1
        ? 'DITCHED IN THE SEA'
        : 'TERRAIN STRIKE — YOU CRASHED';
      return EVENT_CRASH;
    }
    return EVENT_NONE;
  }

  reset();
  return { state, reset, step, forward };
}
