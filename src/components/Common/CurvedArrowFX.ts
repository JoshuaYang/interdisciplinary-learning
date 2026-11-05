import * as THREE from 'three';

export interface ArrowSpec {
  id: string;
  start: THREE.Vector3;
  end: THREE.Vector3;
  curveHeight?: number;
  color?: number;
  pulsePhase?: number;
}

export class CurvedMechanismArrows {
  public group: THREE.Group;
  private arrowMeshes: Map<
    string,
    {
      tubeMesh: THREE.Mesh;
      coneMesh: THREE.Mesh;
      particles: THREE.Mesh[];
      curve: THREE.QuadraticBezierCurve3;
    }
  > = new Map();
  private sphereGeo: THREE.SphereGeometry;
  private coneGeo: THREE.ConeGeometry;

  constructor() {
    this.group = new THREE.Group();
    this.sphereGeo = new THREE.SphereGeometry(0.045, 12, 12);
    this.coneGeo = new THREE.ConeGeometry(0.08, 0.22, 16);
  }

  public update(specs: ArrowSpec[], time: number, visible: boolean, globalOpacity: number = 1) {
    if (!visible || globalOpacity < 0.05 || specs.length === 0) {
      this.group.visible = false;
      return;
    }
    this.group.visible = true;

    // Remove obsolete arrows
    const activeIds = new Set(specs.map((s) => s.id));
    for (const [id, item] of this.arrowMeshes.entries()) {
      if (!activeIds.has(id)) {
        this.group.remove(item.tubeMesh, item.coneMesh, ...item.particles);
        item.tubeMesh.geometry.dispose();
        (item.tubeMesh.material as THREE.Material).dispose();
        (item.coneMesh.material as THREE.Material).dispose();
        item.particles.forEach((p) => {
          (p.material as THREE.Material).dispose();
        });
        this.arrowMeshes.delete(id);
      }
    }

    // Add or update active arrows
    for (const spec of specs) {
      let item = this.arrowMeshes.get(spec.id);
      const start = spec.start;
      const end = spec.end;
      const dist = start.distanceTo(end);
      if (dist < 0.08) continue;

      // Calculate arched control point
      const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      const dir = new THREE.Vector3().subVectors(end, start).normalize();
      let up = new THREE.Vector3(0, 1, 0);
      if (Math.abs(dir.y) > 0.9) up.set(1, 0, 0);
      const normal = new THREE.Vector3().crossVectors(dir, up).normalize();
      const archDir = new THREE.Vector3().crossVectors(normal, dir).normalize();
      const h = spec.curveHeight ?? Math.max(0.35, dist * 0.32);
      const ctrl = mid.clone().addScaledVector(archDir, h);

      const curve = new THREE.QuadraticBezierCurve3(start, ctrl, end);

      if (!item) {
        const color = spec.color ?? 0x38bdf8;
        const tubeGeo = new THREE.TubeGeometry(curve, 24, 0.024, 8, false);
        const tubeMat = new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.75,
          roughness: 0.25,
          transparent: true,
          opacity: 0.85 * globalOpacity,
        });
        const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);

        const coneMat = new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.95,
          roughness: 0.25,
          transparent: true,
          opacity: 0.95 * globalOpacity,
        });
        const coneMesh = new THREE.Mesh(this.coneGeo, coneMat);

        const particles: THREE.Mesh[] = [];
        for (let i = 0; i < 3; i++) {
          const pMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.95 * globalOpacity,
          });
          const pMesh = new THREE.Mesh(this.sphereGeo, pMat);
          particles.push(pMesh);
          this.group.add(pMesh);
        }

        this.group.add(tubeMesh, coneMesh);
        item = { tubeMesh, coneMesh, particles, curve };
        this.arrowMeshes.set(spec.id, item);
      } else {
        item.curve = curve;
        item.tubeMesh.geometry.dispose();
        item.tubeMesh.geometry = new THREE.TubeGeometry(curve, 24, 0.024, 8, false);
      }

      (item.tubeMesh.material as THREE.MeshStandardMaterial).opacity = 0.85 * globalOpacity;
      (item.coneMesh.material as THREE.MeshStandardMaterial).opacity = 0.95 * globalOpacity;

      // Position arrow cone head pointing along curve tangent
      item.coneMesh.position.copy(end);
      const tangent = curve.getTangent(1.0).normalize();
      const axis = new THREE.Vector3(0, 1, 0);
      item.coneMesh.quaternion.setFromUnitVectors(axis, tangent);

      // Animate flowing electron particles
      const phaseOffset = spec.pulsePhase ?? 0;
      item.particles.forEach((p, idx) => {
        const t = (time * 0.72 + phaseOffset + idx * 0.33) % 1.0;
        const pos = curve.getPoint(t);
        p.position.copy(pos);
        const alpha = Math.sin(t * Math.PI) * globalOpacity;
        (p.material as THREE.MeshBasicMaterial).opacity = alpha;
        p.scale.setScalar(0.7 + 0.45 * Math.sin(t * Math.PI));
      });
    }
  }

  public dispose() {
    for (const item of this.arrowMeshes.values()) {
      item.tubeMesh.geometry.dispose();
      (item.tubeMesh.material as THREE.Material).dispose();
      (item.coneMesh.material as THREE.Material).dispose();
      item.particles.forEach((p) => {
        (p.material as THREE.Material).dispose();
      });
    }
    this.arrowMeshes.clear();
    this.sphereGeo.dispose();
    this.coneGeo.dispose();
  }
}
