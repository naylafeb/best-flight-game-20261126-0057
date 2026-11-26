// The ring course: ten glowing torus gates from the runway out over the valley
// and back for a landing. The next ring burns gold and pulses; rings already
// flown turn green; the rest wait in cyan.
import * as THREE from 'three';
import { COLORS, RING_RADIUS, RING_TUBE, RINGS } from './config.js';

export function createRingCourse() {
  const group = new THREE.Group();
  const geo = new THREE.TorusGeometry(RING_RADIUS, RING_TUBE, 12, 40);
  const rings = RINGS.map((def, index) => {
    const mat = new THREE.MeshBasicMaterial({ color: COLORS.ringLater });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(def.x, def.y, def.z);
    // Face each ring along the course: toward the next ring, or back to the runway.
    const next = RINGS[index + 1] || { x: 0, y: 30, z: 0 };
    mesh.lookAt(next.x, next.y, next.z);
    mesh.userData.baseScale = 1;
    group.add(mesh);
    // A small beacon light on top of each ring so it reads from far away.
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 8, 6),
      new THREE.MeshBasicMaterial({ color: COLORS.ringLater }),
    );
    beacon.position.set(def.x, def.y + RING_RADIUS + 4, def.z);
    group.add(beacon);
    return { def, mesh, beacon, passed: false };
  });

  function setNext(nextIndex, time) {
    rings.forEach((ring, index) => {
      if (ring.passed) {
        ring.mesh.material.color.setHex(COLORS.ringPassed);
        ring.beacon.material.color.setHex(COLORS.ringPassed);
        ring.mesh.scale.setScalar(1);
      } else if (index === nextIndex) {
        ring.mesh.material.color.setHex(COLORS.ringNext);
        ring.beacon.material.color.setHex(COLORS.ringNext);
        const pulse = 1 + 0.08 * Math.sin(time * 5);
        ring.mesh.scale.setScalar(pulse);
      } else {
        ring.mesh.material.color.setHex(COLORS.ringLater);
        ring.beacon.material.color.setHex(COLORS.ringLater);
        ring.mesh.scale.setScalar(1);
      }
    });
  }

  function pass(index) {
    if (rings[index]) rings[index].passed = true;
  }

  function reset() {
    rings.forEach((ring) => { ring.passed = false; });
    setNext(0, 0);
  }

  reset();
  return { group, rings, setNext, pass, reset };
}
