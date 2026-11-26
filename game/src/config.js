// Meridian Run — shared constants: the world, the course and the flight model.
// One source of truth so the renderer, the physics and the screenshot staging agree.
export const WORLD = {
  size: 6000,
  half: 3000,
  seaLevel: 0,
  runwayElevation: 14,
};

export const RUNWAY = {
  x: 0,
  z: 0,
  length: 700,
  width: 46,
  heading: 0, // runway runs along -Z (take off toward the north)
};

// The ring course: ten glowing rings from the runway out over the valley and back
// for a final approach and landing. y is altitude above sea level.
export const RINGS = [
  { x: 0, y: 130, z: -420 },
  { x: 260, y: 190, z: -820 },
  { x: -220, y: 230, z: -1230 },
  { x: 420, y: 170, z: -1620 },
  { x: 0, y: 270, z: -2010 },
  { x: -470, y: 210, z: -2380 },
  { x: 160, y: 150, z: -2620 },
  { x: 60, y: 110, z: -2150 },
  { x: -40, y: 70, z: -1250 },
  { x: 0, y: 45, z: -430 },
];
export const RING_RADIUS = 18;
export const RING_TUBE = 1.6;

export const PHYSICS = {
  minSpeed: 42, // below this the jet sinks (stall)
  maxSpeed: 165,
  cruiseThrottle: 0.62,
  accel: 26, // speed units per second toward the throttle target
  pitchRate: 0.85, // radians per second at full stick
  rollRate: 1.9,
  turnRate: 0.55, // yaw rate per radian of bank
  maxPitch: 0.6,
  maxRoll: 1.1,
  gravitySink: 26, // extra sink per second when stalled
  groundClearance: 3.2,
};

export const GAME = {
  title: 'Meridian Run',
  ringScore: 100,
  landingBonus: 500,
  timeBonusPerSecond: 2,
  bestKey: 'meridian-run-best',
};

export const COLORS = {
  skyTop: 0x2f6fb4,
  skyHorizon: 0xd8e9f2,
  fog: 0xcfe0ea,
  sun: 0xfff2d8,
  sea: 0x1a5f8a,
  sand: 0xc2b280,
  grass: 0x5a8a46,
  grassDry: 0x7a9a4a,
  rock: 0x6f6a63,
  snow: 0xeef1f4,
  runway: 0x2e3138,
  ringNext: 0xffb020,
  ringLater: 0x27c4d8,
  ringPassed: 0x37c978,
};
