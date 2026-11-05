import * as THREE from 'three';

export interface ActiveBondCleavage {
  id: string;
  posA: THREE.Vector3;
  posB: THREE.Vector3;
  weight: number;
}

/**
 * High-fidelity Microscopic Quantum Bond Cleavage & Formation FX
 * Replaces generic flat shockwaves with localized bond-axis plasma wavelet,
 * core energy flash, and radiating quantum sparks at the exact fracture gap.
 */
export class BondCleavageFX {
  public group: THREE.Group;
  private plasmaRing: THREE.Mesh;
  private coreGlow: THREE.Sprite;
  private sparks: THREE.Mesh[] = [];
  private sparkSpeeds: THREE.Vector3[] = [];

  constructor() {
    this.group = new THREE.Group();

    // 1. Coaxial Plasma Torus (oriented perpendicular to the bond axis)
    const ringGeo = new THREE.TorusGeometry(0.14, 0.024, 12, 36);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.plasmaRing = new THREE.Mesh(ringGeo, ringMat);
    this.group.add(this.plasmaRing);

    // 2. High-energy radiating quantum micro-sparks (10 particles)
    const sparkGeo = new THREE.SphereGeometry(0.026, 8, 8);
    for (let i = 0; i < 10; i++) {
      const sparkMat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0xffffff : 0x7dd3fc,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const spark = new THREE.Mesh(sparkGeo, sparkMat);
      this.sparks.push(spark);
      this.group.add(spark);

      const angle = (i / 10) * Math.PI * 2;
      this.sparkSpeeds.push(
        new THREE.Vector3(
          Math.cos(angle) * (0.5 + Math.random() * 0.4),
          Math.sin(angle) * (0.5 + Math.random() * 0.4),
          (Math.random() - 0.5) * 0.35
        )
      );
    }

    // 3. Central Core Energy Flare (luminous radial sprite)
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.28, 'rgba(56, 189, 248, 0.85)');
      grad.addColorStop(0.7, 'rgba(14, 165, 233, 0.3)');
      grad.addColorStop(1, 'rgba(14, 165, 233, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
    }
    const flareTex = new THREE.CanvasTexture(canvas);
    const flareMat = new THREE.SpriteMaterial({
      map: flareTex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.coreGlow = new THREE.Sprite(flareMat);
    this.coreGlow.scale.set(0.6, 0.6, 0.6);
    this.group.add(this.coreGlow);
  }

  public update(active: ActiveBondCleavage | null, time: number) {
    if (!active || active.weight <= 0.02 || active.weight >= 0.94) {
      this.group.visible = false;
      return;
    }
    this.group.visible = true;

    const { posA, posB, weight } = active;
    const mid = new THREE.Vector3().addVectors(posA, posB).multiplyScalar(0.5);
    const dir = new THREE.Vector3().subVectors(posB, posA).normalize();

    // Transition peak factor: reaches 1.0 at weight 0.5 (maximum activation barrier)
    const factor = Math.sin(weight * Math.PI);
    const intensity = Math.pow(factor, 1.4);

    // 1. Position and orient the Coaxial Plasma Torus
    this.plasmaRing.position.copy(mid);
    const defaultAxis = new THREE.Vector3(0, 0, 1);
    this.plasmaRing.quaternion.setFromUnitVectors(defaultAxis, dir);
    const ringScale = 0.8 + (1 - factor) * 1.8;
    this.plasmaRing.scale.set(ringScale, ringScale, ringScale);
    (this.plasmaRing.material as THREE.MeshBasicMaterial).opacity = intensity * 0.9;

    // 2. Position Central Flare
    this.coreGlow.position.copy(mid);
    this.coreGlow.scale.setScalar(0.35 + factor * 0.65);
    (this.coreGlow.material as THREE.SpriteMaterial).opacity = Math.pow(factor, 2) * 0.92;

    // 3. Discharge radial micro-sparks around the cleavage plane
    let up = new THREE.Vector3(0, 1, 0);
    if (Math.abs(dir.y) > 0.88) up.set(1, 0, 0);
    const right = new THREE.Vector3().crossVectors(dir, up).normalize();
    const orthoUp = new THREE.Vector3().crossVectors(right, dir).normalize();

    this.sparks.forEach((spark, idx) => {
      const sp = this.sparkSpeeds[idx];
      const sparkDist = (0.06 + (1 - factor) * 0.48) * sp.length();
      const angle = (idx / 10) * Math.PI * 2 + time * 1.8;
      const sparkPos = mid
        .clone()
        .addScaledVector(right, Math.cos(angle) * sparkDist)
        .addScaledVector(orthoUp, Math.sin(angle) * sparkDist)
        .addScaledVector(dir, sp.z * (1 - factor) * 0.3);

      spark.position.copy(sparkPos);
      const sparkAlpha = intensity * (0.65 + 0.35 * Math.sin(time * 10 + idx));
      (spark.material as THREE.MeshBasicMaterial).opacity = sparkAlpha;
      spark.scale.setScalar(0.7 + 0.5 * factor);
    });
  }

  public dispose() {
    this.plasmaRing.geometry.dispose();
    (this.plasmaRing.material as THREE.Material).dispose();
    this.sparks.forEach((s) => {
      s.geometry.dispose();
      (s.material as THREE.Material).dispose();
    });
    this.coreGlow.material.map?.dispose();
    this.coreGlow.material.dispose();
  }
}
