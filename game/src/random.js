// A small seeded random number generator (mulberry32): the same seed gives the
// same world, which is what makes the screenshot scenes repeatable.
export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smoothstep helper shared by the terrain shapers.
export function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// Deterministic value noise over a seeded grid: hash(ix, iz) is stable per cell.
export function makeNoise(random, gridSize) {
  const grid = new Float32Array(gridSize * gridSize);
  for (let i = 0; i < grid.length; i += 1) grid[i] = random();
  const at = (ix, iz) => {
    const x = ((ix % gridSize) + gridSize) % gridSize;
    const z = ((iz % gridSize) + gridSize) % gridSize;
    return grid[z * gridSize + x];
  };
  return function noise(x, z, cell) {
    const fx = x / cell;
    const fz = z / cell;
    const ix = Math.floor(fx);
    const iz = Math.floor(fz);
    const tx = fx - ix;
    const tz = fz - iz;
    const sx = tx * tx * (3 - 2 * tx);
    const sz = tz * tz * (3 - 2 * tz);
    const a = at(ix, iz);
    const b = at(ix + 1, iz);
    const c = at(ix, iz + 1);
    const d = at(ix + 1, iz + 1);
    return (a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz) * 2 - 1;
  };
}
