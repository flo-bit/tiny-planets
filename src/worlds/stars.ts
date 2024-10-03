import * as THREE from "three";

export type StarsOptions = {
  particleCount: number;
  minimumDistance: number;
  maximumDistance: number;
};

export class Stars extends THREE.Group {
  private particleCount: number = 5000;

  private minimumDistance: number = 10;
  private maximumDistance: number = 20;

  private positions: Float32Array;
  private colors: Float32Array;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private particles: THREE.Points;

  private tempVector = new THREE.Vector3();

  constructor(opts: Partial<StarsOptions> = {}) {
    super();

    this.particleCount = opts.particleCount ?? this.particleCount;
    this.minimumDistance = opts.minimumDistance ?? this.minimumDistance;
    this.maximumDistance = opts.maximumDistance ?? this.maximumDistance;

    this.positions = new Float32Array(this.particleCount * 3);
    this.colors = new Float32Array(this.particleCount * 3);

    this.setupParticles();
  }

  private setupParticles() {
    for (let i = 0; i < this.particleCount; i++) {
      this.resetParticle(i);
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.positions, 3),
    );
    this.geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(this.colors, 3),
    );

    this.material = new THREE.PointsMaterial({
      size: 0.04,
      vertexColors: true,
    });

    this.particles = new THREE.Points(this.geometry, this.material);

    this.add(this.particles);
  }

  private resetParticle(i: number) {
    const index = i * 3;

    const distance =
      Math.random() * (this.maximumDistance - this.minimumDistance) +
      this.minimumDistance;
    this.tempVector.randomDirection().multiplyScalar(distance);

    this.positions[index] = this.tempVector.x;
    this.positions[index + 1] = this.tempVector.y;
    this.positions[index + 2] = this.tempVector.z;

    this.colors[index] = Math.random() < 0.2 ? 0.3 : 1.0;
    this.colors[index + 1] = Math.random() < 0.2 ? 0.3 : 1.0;
    this.colors[index + 2] = Math.random() < 0.2 ? 0.3 : 1.0;
  }
}
