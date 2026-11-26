// Procedural terrain, sea, runway, city and sky for Meridian Run.
// heightAt(x, z) is the one ground truth: the mesh, the collision check and the
// ring heights all read it, so the jet can never clip through a hill it sees.
import * as THREE from 'three';
import { COLORS, RUNWAY, WORLD } from './config.js';
import { makeNoise, smoothstep } from './random.js';

const TERRAIN_SEGMENTS = 192;

function riverCentre(z) {
  return -320 + 260 * Math.sin(z * 0.0011) + 120 * Math.sin(z * 0.0027 + 1.7);
}

export function createHeightfield(random) {
  const noise = makeNoise(random, 64);
  return function heightAt(x, z) {
    // Rolling hills, three octaves of value noise.
    let h = 34
      + noise(x, z, 900) * 34
      + noise(x + 500, z - 300, 300) * 15
      + noise(x - 700, z + 800, 110) * 6;
    // Mountain ridge to the east.
    h += smoothstep(1200, 2200, x) * (150 + noise(x, z, 420) * 110);
    // The sea floor falls away to the west.
    h -= smoothstep(-1100, -1700, -x) * 60;
    // A winding river carves a valley from the northern hills to the sea.
    const river = Math.abs(x - riverCentre(z));
    h -= (1 - smoothstep(30, 90, river)) * 13;
    // Flatten the runway apron so the strip sits on level ground.
    const runwayPad = (1 - smoothstep(60, 150, Math.abs(x - RUNWAY.x)))
      * (1 - smoothstep(360, 470, Math.abs(z - RUNWAY.z)));
    h = h * (1 - runwayPad) + WORLD.runwayElevation * runwayPad;
    return h;
  };
}

function groundColor(height, slope, riverDist, random) {
  const jitter = (random() - 0.5) * 0.08;
  if (height < 3) return [0.76 + jitter, 0.70 + jitter, 0.50]; // sand / beach
  if (riverDist < 70) return [0.72 + jitter, 0.66 + jitter, 0.48]; // river bank
  if (height > 215) return [0.93, 0.93, 0.95]; // snow caps
  if (height > 120 || slope > 0.55) return [0.44 + jitter, 0.41 + jitter, 0.39]; // rock
  if (height > 55) return [0.42 + jitter, 0.52 + jitter, 0.32]; // high grass
  return [0.36 + jitter, 0.55 + jitter, 0.29]; // lowland green
}

export function createTerrain(heightAt, random) {
  const group = new THREE.Group();
  const size = WORLD.size;
  const geo = new THREE.PlaneGeometry(size, size, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = heightAt(x, z);
    pos.setY(i, h);
    // Slope from a forward sample, for rock vs grass colouring.
    const slope = Math.abs(heightAt(x + 8, z) - h) / 8 + Math.abs(heightAt(x, z + 8) - h) / 8;
    const c = groundColor(h, slope, Math.abs(x - riverCentre(z)), random);
    colors[i * 3] = c[0];
    colors[i * 3 + 1] = c[1];
    colors[i * 3 + 2] = c[2];
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshLambertMaterial({ vertexColors: true }),
  );
  group.add(mesh);

  // The sea: one flat plane at sea level; the terrain rises out of it at the shore.
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshPhongMaterial({
      color: COLORS.sea, transparent: true, opacity: 0.92, shininess: 120,
    }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = WORLD.seaLevel;
  group.add(sea);
  return group;
}

export function createRunway() {
  const group = new THREE.Group();
  const top = WORLD.runwayElevation + 0.6;
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(RUNWAY.width, 1.2, RUNWAY.length),
    new THREE.MeshLambertMaterial({ color: COLORS.runway }),
  );
  strip.position.set(RUNWAY.x, top - 0.6, RUNWAY.z);
  group.add(strip);
  // Centreline dashes.
  const dashGeo = new THREE.BoxGeometry(2.2, 0.15, 22);
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xf2f2ee });
  for (let z = -RUNWAY.length / 2 + 40; z < RUNWAY.length / 2 - 20; z += 60) {
    const dash = new THREE.Mesh(dashGeo, dashMat);
    dash.position.set(RUNWAY.x, top + 0.1, RUNWAY.z + z);
    group.add(dash);
  }
  // Threshold bars at both ends.
  const barGeo = new THREE.BoxGeometry(5, 0.15, 18);
  for (const side of [-1, 1]) {
    for (let dx = -18; dx <= 18; dx += 9) {
      const bar = new THREE.Mesh(barGeo, dashMat);
      bar.position.set(RUNWAY.x + dx, top + 0.1, RUNWAY.z + side * (RUNWAY.length / 2 - 22));
      group.add(bar);
    }
  }
  // Edge lights.
  const lightGeo = new THREE.SphereGeometry(0.9, 8, 6);
  const lightMat = new THREE.MeshBasicMaterial({ color: 0x7fd4ff });
  for (let z = -RUNWAY.length / 2 + 10; z <= RUNWAY.length / 2 - 10; z += 70) {
    for (const side of [-1, 1]) {
      const light = new THREE.Mesh(lightGeo, lightMat);
      light.position.set(RUNWAY.x + side * (RUNWAY.width / 2 + 2), top + 1, RUNWAY.z + z);
      group.add(light);
    }
  }
  // Control tower beside the strip.
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(4, 6, 46, 10),
    new THREE.MeshLambertMaterial({ color: 0xd8d3c8 }),
  );
  tower.position.set(RUNWAY.x + 62, WORLD.runwayElevation + 23, RUNWAY.z + 120);
  group.add(tower);
  const cab = new THREE.Mesh(
    new THREE.CylinderGeometry(7, 6, 7, 10),
    new THREE.MeshPhongMaterial({ color: 0x22405a, shininess: 90 }),
  );
  cab.position.set(RUNWAY.x + 62, WORLD.runwayElevation + 49, RUNWAY.z + 120);
  group.add(cab);
  return group;
}

export function createCity(random) {
  const group = new THREE.Group();
  const palette = [0x8a8f96, 0x6f7d8c, 0x9a8f7a, 0x7a6f66, 0x5d6b7a];
  for (let i = 0; i < 42; i += 1) {
    const w = 14 + random() * 22;
    const d = 14 + random() * 22;
    const h = 14 + random() * 58;
    const building = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshLambertMaterial({ color: palette[Math.floor(random() * palette.length)] }),
    );
    building.position.set(210 + random() * 480, WORLD.runwayElevation + h / 2, -260 + random() * 760);
    group.add(building);
    // A lit roof strip so the town reads at a glance from the air.
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.7, 1.2, d * 0.7),
      new THREE.MeshBasicMaterial({ color: 0xffd27a }),
    );
    roof.position.set(building.position.x, WORLD.runwayElevation + h + 0.6, building.position.z);
    group.add(roof);
  }
  return group;
}

export function createClouds(random) {
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 });
  for (let i = 0; i < 26; i += 1) {
    const cloud = new THREE.Group();
    const puffs = 3 + Math.floor(random() * 3);
    for (let p = 0; p < puffs; p += 1) {
      const s = 18 + random() * 26;
      const puff = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 8), mat);
      puff.scale.y = 0.45;
      puff.position.set((random() - 0.5) * 90, (random() - 0.5) * 8, (random() - 0.5) * 40);
      cloud.add(puff);
    }
    cloud.position.set(
      (random() - 0.5) * 5200,
      380 + random() * 180,
      (random() - 0.5) * 5200,
    );
    cloud.userData.drift = 2 + random() * 4;
    group.add(cloud);
  }
  return group;
}

export function createSky() {
  const geo = new THREE.SphereGeometry(9000, 24, 14);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(COLORS.skyTop) },
      horizon: { value: new THREE.Color(COLORS.skyHorizon) },
    },
    vertexShader: 'varying vec3 vPos; void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 horizon; varying vec3 vPos; void main() { float t = clamp(normalize(vPos).y * 1.6 + 0.18, 0.0, 1.0); gl_FragColor = vec4(mix(horizon, top, t), 1.0); }',
  });
  return new THREE.Mesh(geo, mat);
}
