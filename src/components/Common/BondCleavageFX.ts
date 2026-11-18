import * as THREE from 'three';

export interface ActiveBondCleavage {
  id: string;
  posA: THREE.Vector3;
  posB: THREE.Vector3;
  weight: number;
}

interface CleavageUnit {
  subGroup: THREE.Group;
  plasmaRing: THREE.Mesh;
  coreGlow: THREE.Sprite;
  sparks: THREE.Mesh[];
  sparkSpeeds: THREE.Vector3[];
}

/**
 * High-fidelity Microscopic Quantum Bond Cleavage & Formation FX
 * Supports both single and simultaneous multi-bond transitions (e.g. 3 termination reactions).
 */
export class BondCleavageFX {
  public group: THREE.Group;
  private units: CleavageUnit[] = [];
  private flareTex: THREE.CanvasTexture;

  constructor(maxUnits = 4) {
    this.group = new THREE.Group();

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
    this.flareTex = new THREE.CanvasTexture(canvas);

    for (let u = 0; u < maxUnits; u++) {
      this.units.push(this.createUnit());
    }
  }

  private createUnit(): CleavageUnit {
    const subGroup = new THREE.Group();
    subGroup.visible = false;
    this.group.add(subGroup);

    const ringGeo = new THREE.TorusGeometry(0.14, 0.024, 12, 36);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const plasmaRing = new THREE.Mesh(ringGeo, ringMat);
    subGroup.add(plasmaRing);

    const sparks: THREE.Mesh[] = [];
    const sparkSpeeds: THREE.Vector3[] = [];
    const sparkGeo = new THREE.SphereGeometry(0.026, 8, 8);
    for (let i = 0; i < 10; i++) {
      const sparkMat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0xffffff : 0x7dd3fc,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const spark = new THREE.Mesh(sparkGeo, sparkMat);
      sparks.push(spark);
      subGroup.add(spark);

      const angle = (i / 10) * Math.PI * 2;
      sparkSpeeds.push(
        new THREE.Vector3(
          Math.cos(angle) * (0.5 + Math.random() * 0.4),
          Math.sin(angle) * (0.5 + Math.random() * 0.4),
          (Math.random() - 0.5) * 0.35
        )
      );
    }

    const flareMat = new THREE.SpriteMaterial({
      map: this.flareTex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const coreGlow = new THREE.Sprite(flareMat);
    coreGlow.scale.set(0.6, 0.6, 0.6);
    subGroup.add(coreGlow);

    return { subGroup, plasmaRing, coreGlow, sparks, sparkSpeeds };
  }

  public update(active: ActiveBondCleavage | ActiveBondCleavage[] | null, time: number) {
    const list = !active ? [] : Array.isArray(active) ? active : [active];
    const validList = list.filter((a) => a && a.weight > 0.02 && a.weight < 0.94);

    if (validList.length === 0) {
      this.group.visible = false;
      this.units.forEach((u) => (u.subGroup.visible = false));
      return;
    }
    this.group.visible = true;

    this.units.forEach((unit, uIdx) => {
      const item = validList[uIdx];
      if (!item) {
        unit.subGroup.visible = false;
        return;
      }
      unit.subGroup.visible = true;

      const { posA, posB, weight } = item;
      const mid = new THREE.Vector3().addVectors(posA, posB).multiplyScalar(0.5);
      const dir = new THREE.Vector3().subVectors(posB, posA).normalize();

      const factor = Math.sin(weight * Math.PI);
      const intensity = Math.pow(factor, 1.4);

      unit.plasmaRing.position.copy(mid);
      const defaultAxis = new THREE.Vector3(0, 0, 1);
      unit.plasmaRing.quaternion.setFromUnitVectors(defaultAxis, dir);
      const ringScale = 0.8 + (1 - factor) * 1.8;
      unit.plasmaRing.scale.set(ringScale, ringScale, ringScale);
      (unit.plasmaRing.material as THREE.MeshBasicMaterial).opacity = intensity * 0.9;

      unit.coreGlow.position.copy(mid);
      unit.coreGlow.scale.setScalar(0.35 + factor * 0.65);
      (unit.coreGlow.material as THREE.SpriteMaterial).opacity = Math.pow(factor, 2) * 0.92;

      let up = new THREE.Vector3(0, 1, 0);
      if (Math.abs(dir.y) > 0.88) up.set(1, 0, 0);
      const right = new THREE.Vector3().crossVectors(dir, up).normalize();
      const orthoUp = new THREE.Vector3().crossVectors(right, dir).normalize();

      unit.sparks.forEach((spark, idx) => {
        const sp = unit.sparkSpeeds[idx];
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
    });
  }

  public dispose() {
    this.units.forEach((u) => {
      u.plasmaRing.geometry.dispose();
      (u.plasmaRing.material as THREE.Material).dispose();
      u.sparks.forEach((s) => {
        s.geometry.dispose();
        (s.material as THREE.Material).dispose();
      });
      u.coreGlow.material.dispose();
    });
    this.flareTex.dispose();
  }
}
