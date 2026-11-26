// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps, and the renderer paints what is there. The game moves between
// four screens: title, play, paused and game over (plus mission complete).
//
// ?seed=N fixes the world. ?shot=start|play|rings|end (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady
// for a screenshot.
import * as THREE from 'three';
import { COLORS, GAME, RINGS } from './config.js';
import { createRandom } from './random.js';
import { createJet } from './aircraft.js';
import { createCity, createClouds, createHeightfield, createRunway, createSky, createTerrain } from './terrain.js';
import { createRingCourse } from './rings.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createHud } from './hud.js';
import { createWorld, EVENT_CRASH, EVENT_LAND, EVENT_RING } from './world.js';
import { stageShot } from './shots.js';

const STEP = 1 / 60;
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');

const random = createRandom(seed);
const heightAt = createHeightfield(createRandom(seed + 1));
const world = createWorld(heightAt);
const hud = createHud(document);

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
} catch (error) {
  status.textContent = 'WebGL is not available in this browser.';
  throw error;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(COLORS.fog, 700, 5200);
scene.add(createSky());
scene.add(new THREE.HemisphereLight(0xbfd9ff, 0x8a7a5a, 0.85));
const sun = new THREE.DirectionalLight(COLORS.sun, 1.5);
sun.position.set(1500, 1900, 900);
scene.add(sun);

scene.add(createTerrain(heightAt, createRandom(seed + 2)));
scene.add(createRunway());
scene.add(createCity(createRandom(seed + 3)));
const clouds = createClouds(createRandom(seed + 4));
scene.add(clouds);
const course = createRingCourse();
scene.add(course.group);
const jet = createJet();
scene.add(jet.group);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.5, 20000);
const cameraTarget = new THREE.Vector3();
const cameraGoal = new THREE.Vector3();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(GAME.bestKey) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}
function saveBest(value) {
  try {
    window.localStorage.setItem(GAME.bestKey, String(value));
  } catch {
    // Storage can be off: the best score then lasts this visit only.
  }
}

function placeJet() {
  const state = world.state;
  jet.group.position.set(state.pos.x, state.pos.y, state.pos.z);
  jet.group.rotation.order = 'YXZ';
  jet.group.rotation.y = state.yaw;
  jet.group.rotation.x = state.pitch;
  jet.group.rotation.z = -state.roll;
  jet.updateTrail(new THREE.Vector3(state.pos.x, state.pos.y, state.pos.z + 3));
}

function placeCamera(dt, mode) {
  const state = world.state;
  const fwdX = -Math.sin(state.yaw);
  const fwdZ = -Math.cos(state.yaw);
  if (mode === 'runway') {
    cameraGoal.set(state.pos.x + 9, state.pos.y + 4.5, state.pos.z + 26);
    camera.position.copy(cameraGoal);
    camera.lookAt(state.pos.x, state.pos.y + 2, state.pos.z - 60);
    return;
  }
  cameraGoal.set(
    state.pos.x - fwdX * 17,
    state.pos.y + 6.5,
    state.pos.z - fwdZ * 17,
  );
  const k = 1 - Math.exp(-dt * 5);
  camera.position.lerp(cameraGoal, k);
  cameraTarget.set(state.pos.x + fwdX * 30, state.pos.y + 1.5, state.pos.z + fwdZ * 30);
  camera.lookAt(cameraTarget);
}

function renderFrame(time) {
  course.setNext(world.state.ringsPassed, time);
  placeJet();
  hud.update(world.state, time);
  renderer.render(scene, camera);
}

function runShot(name) {
  const staged = stageShot(name, world);
  const state = world.state;
  if (staged.screen === 'title') hud.showScreen('title', { best: readBest() });
  else if (staged.screen === 'complete') {
    hud.showScreen('complete', { score: state.score, elapsed: state.elapsed, best: readBest() });
  } else hud.showScreen(null);
  placeCamera(1, staged.camera);
  let painted = 0;
  function paint() {
    renderFrame(performance.now() / 1000);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(window);
  let screen = 'title';
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  hud.showScreen('title', { best });

  function setScreen(next, data) {
    screen = next;
    hud.showScreen(next, data);
  }

  function startFlying() {
    world.reset();
    world.state.status = 'flying';
    setScreen(null);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const time = now / 1000;
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    const control = input.read();
    if (control.actions.has(ACTION_CONFIRM) && (screen === 'title' || screen === 'over' || screen === 'complete')) {
      startFlying();
    }
    if (control.actions.has(ACTION_RESTART) && screen !== 'title') startFlying();
    if (control.actions.has(ACTION_PAUSE) && world.state.status === 'flying') {
      world.state.status = 'paused';
      setScreen('paused');
    } else if (control.actions.has(ACTION_PAUSE) && world.state.status === 'paused') {
      world.state.status = 'flying';
      setScreen(null);
    }

    if (world.state.status === 'flying') {
      accumulator += elapsed;
      let steps = 0;
      while (accumulator >= STEP && steps < 5) {
        const event = world.step(STEP, control);
        accumulator -= STEP;
        steps += 1;
        if (event & EVENT_RING) hud.flash(world.state.message, 2.5, time);
        if (event & EVENT_CRASH) {
          best = Math.max(best, world.state.score);
          saveBest(best);
          setScreen('over', { score: world.state.score, best, reason: world.state.reason });
        }
        if (event & EVENT_LAND) {
          best = Math.max(best, world.state.score);
          saveBest(best);
          setScreen('complete', { score: world.state.score, elapsed: world.state.elapsed, best });
        }
        if (world.state.status !== 'flying') break;
      }
      // Drift the clouds with the clock, wrapping around the valley.
      for (const cloud of clouds.children) {
        cloud.position.x += cloud.userData.drift * elapsed;
        if (cloud.position.x > 2800) cloud.position.x = -2800;
      }
    }
    if (world.state.message && world.state.status === 'flying') {
      hud.flash(world.state.message, 0.2, time);
    }
    placeCamera(elapsed, 'chase');
    renderFrame(time);
  }
  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

if (shot) runShot(shot);
else runGame();
