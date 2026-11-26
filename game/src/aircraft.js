// The player's jet: a low-poly aircraft built from primitives, nose toward -Z,
// so the chase camera sits behind it at +Z. All parts are one group the flight
// code moves as a whole; the trail line is updated from the nose position.
import * as THREE from 'three';

export function createJet() {
  const group = new THREE.Group();
  const white = new THREE.MeshPhongMaterial({ color: 0xf2f4f6, shininess: 60 });
  const orange = new THREE.MeshPhongMaterial({ color: 0xe8641c, shininess: 60 });
  const dark = new THREE.MeshPhongMaterial({ color: 0x182838, shininess: 120 });
  const grey = new THREE.MeshPhongMaterial({ color: 0x5a6068, shininess: 40 });

  // Fuselage: a tapered cylinder along Z with a cone nose.
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2.1, 8.5, 12), white);
  body.rotation.x = Math.PI / 2;
  group.add(body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(1.5, 3.4, 12), white);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -5.9;
  group.add(nose);
  // Orange cheatline along the fuselage.
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(4.32, 0.5, 7.6), orange);
  stripe.position.set(0, -0.1, -0.4);
  group.add(stripe);

  // Canopy: a dark glossy bubble on top, forward.
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.25, 14, 10), dark);
  canopy.scale.set(0.85, 0.62, 1.9);
  canopy.position.set(0, 1.55, -2.4);
  group.add(canopy);

  // Main wings: one swept slab each side, angled slightly back.
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.22, 3.1), white);
    wing.position.set(side * 4.6, -0.25, 0.9);
    wing.rotation.y = side * -0.28;
    group.add(wing);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 2.4), orange);
    tip.position.set(side * 7.6, -0.25, 1.7);
    tip.rotation.y = side * -0.28;
    group.add(tip);
    // Engine nacelle under each wing with a glowing exhaust.
    const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 3.4, 10), grey);
    engine.rotation.x = Math.PI / 2;
    engine.position.set(side * 3.1, -0.9, 1.4);
    group.add(engine);
    const exhaust = new THREE.Mesh(
      new THREE.CircleGeometry(0.8, 12),
      new THREE.MeshBasicMaterial({ color: 0xffc46b }),
    );
    exhaust.position.set(side * 3.1, -0.9, 3.15);
    group.add(exhaust);
  }

  // Tail: horizontal stabilisers and one vertical fin.
  for (const side of [-1, 1]) {
    const stab = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.18, 1.7), white);
    stab.position.set(side * 2.1, 0.35, 4.1);
    stab.rotation.y = side * -0.25;
    group.add(stab);
  }
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.7, 2.4), orange);
  fin.position.set(0, 1.7, 4.0);
  fin.rotation.x = 0.25;
  group.add(fin);

  // Contrail: a fading line trailing the jet, rebuilt from recent nose positions.
  const trailGeo = new THREE.BufferGeometry();
  const trailPositions = new Float32Array(60 * 3);
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
  const trail = new THREE.Line(
    trailGeo,
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }),
  );
  trail.frustumCulled = false;
  group.add(trail);
  const trailPoints = [];
  function updateTrail(worldPos) {
    trailPoints.unshift(worldPos.clone());
    if (trailPoints.length > 60) trailPoints.pop();
    for (let i = 0; i < 60; i += 1) {
      const p = trailPoints[Math.min(i, trailPoints.length - 1)] || worldPos;
      trailPositions[i * 3] = p.x - group.position.x;
      trailPositions[i * 3 + 1] = p.y - group.position.y;
      trailPositions[i * 3 + 2] = p.z - group.position.z;
    }
    trailGeo.attributes.position.needsUpdate = true;
  }
  return { group, updateTrail };
}
