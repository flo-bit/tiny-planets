import {
  BufferGeometry,
  Float32BufferAttribute,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Vector3,
} from "three";
import { Biome, type BiomeOptions } from "./biome";
import { loadModels } from "./models";

export type PlanetOptions = {
  scatter?: number;

  ground?: number;

  detail?: number;
};

export class Planet {
  worker: Worker;

  callbacks: Record<number, (data: Mesh) => void>;
  requestId: number;

  biome: Biome;

  biomeOptions: BiomeOptions;
  options: PlanetOptions;

  vegetationPositions?: Record<string, Vector3[]>;

  constructor(biomeOptions: BiomeOptions, planetOptions: PlanetOptions = {}) {
    this.options = planetOptions;

    this.biome = new Biome(biomeOptions);
    this.biomeOptions = this.biome.options;

    this.worker = new Worker(new URL("worker.ts", import.meta.url), {
      type: "module",
    });
    this.worker.onmessage = this.handleMessage.bind(this);
    this.callbacks = {};
    this.requestId = 0;
  }

  handleMessage(event: {
    data: {
      type: "geometry";
      data: {
        positions: number[];
        colors: number[];
        normals: number[];
        oceanPositions: number[];
        oceanColors: number[];
        oceanNormals: number[];
        vegetation: Record<string, Vector3[]>;
      };
      requestId: number;
    };
  }) {
    const { type, data, requestId } = event.data;

    const callback = this.callbacks[requestId];
    if (!callback) {
      console.error("No callback found for requestId:", requestId);
      return;
    }

    if (type === "geometry") {
      const geometry = new BufferGeometry();
      const oceanGeometry = new BufferGeometry();
      geometry.setAttribute(
        "position",
        new Float32BufferAttribute(new Float32Array(data.positions), 3),
      );
      geometry.setAttribute(
        "color",
        new Float32BufferAttribute(new Float32Array(data.colors), 3),
      );
      geometry.setAttribute(
        "normal",
        new Float32BufferAttribute(new Float32Array(data.normals), 3),
      );

      oceanGeometry.setAttribute(
        "position",
        new Float32BufferAttribute(new Float32Array(data.oceanPositions), 3),
      );
      oceanGeometry.setAttribute(
        "color",
        new Float32BufferAttribute(new Float32Array(data.oceanColors), 3),
      );

      oceanGeometry.computeVertexNormals();

      this.vegetationPositions = data.vegetation;

      const planetMesh = new Mesh(
        geometry,
        new MeshStandardMaterial({
          vertexColors: true,
        }),
      );
      planetMesh.castShadow = true;

      const oceanMesh = new Mesh(
        oceanGeometry,
        new MeshStandardMaterial({
          vertexColors: true,
          transparent: true,
          opacity: 0.7,
          metalness: 0.5,
          roughness: 0.5,
        }),
      );

      planetMesh.add(oceanMesh);
      callback(planetMesh);
    }

    delete this.callbacks[requestId];
  }

  async create(): Promise<Mesh> {
    const models = this.biomeOptions.vegetation?.items.map((item) => {
      return item.name;
    });

    const loaded: Promise<Object3D[] | Mesh>[] = [];

    for (const model of models ?? []) {
      const loadedModels = loadModels(model);
      loaded.push(loadedModels);
    }

    const planetPromise = this.createMesh();
    loaded.push(planetPromise);

    await Promise.all(loaded);

    const planet = await planetPromise;

    for (let i = 0; i < loaded.length - 1; i++) {
      const models = await loaded[i];
      const name = models[0].userData.name;

      const positions = this.vegetationPositions?.[name];

      if (!positions) continue;

      let item = this.biomeOptions.vegetation?.items[i];

      for (const position of positions) {
        const model = models[Math.floor(Math.random() * models.length)].clone();
        model.position.set(0, 1, 0);
        this.updatePosition(
          model,
          new Vector3(position.x, position.y, position.z),
        );
        model.scale.setScalar(0.04);

        model.traverse((child) => {
          if (child instanceof Mesh) {
            let color = item?.colors?.[child.material.name];
            if (color && color.array) {
              let randomColor =
                color.array[Math.floor(Math.random() * color.array.length)];
              child.material.color.setHex(randomColor);
            }

            if (child.material.name === "Snow") {
              child.material.roughness = 0.2;
              child.material.color.setHex(0xffffff);
            }
            child.castShadow = false;
            child.receiveShadow = true;
          }
        });
        planet.add(model);
      }
    }

    return planetPromise;
  }

  createMesh(): Promise<Mesh> {
    return new Promise((resolve) => {
      const requestId = this.requestId++;
      this.callbacks[requestId] = resolve;

      this.worker.postMessage({
        type: "createGeometry",
        requestId,
        data: {
          biomeOptions: this.biome.options,
          planetOptions: this.options,
        },
      });
    });
  }

  updatePosition(item: Object3D, pos: Vector3) {
    item.position.copy(pos);

    const currentRotation = new Quaternion();
    const a = item.up.clone().normalize();
    const b = pos.clone().normalize();

    currentRotation.setFromUnitVectors(a, b);

    item.quaternion.copy(currentRotation);

    item.up = b;
  }
}
