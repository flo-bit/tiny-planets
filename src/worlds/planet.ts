import {
  BufferGeometry,
  Float32BufferAttribute,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Vector3,
  IcosahedronGeometry,
} from "three";
import { Biome, type BiomeOptions } from "./biome";
import { loadModels } from "./models";

import { PlanetMaterialWithCaustics } from "./materials/OceanCausticsMaterial";
import { createAtmosphereMaterial } from "./materials/AtmosphereMaterial";
import { createBufferGeometry } from "./helper/helper";

export type PlanetOptions = {
  scatter?: number;

  ground?: number;

  detail?: number;

  atmosphere?: {
    enabled?: boolean;
    color?: Vector3;
    height?: number;
  };

  material?: "normal" | "caustics";

  biome?: BiomeOptions;

  shape?: "sphere" | "plane";
};

export class Planet {
  worker: Worker;

  callbacks: Record<number, (data: Mesh) => void>;
  requestId: number;

  biome: Biome;

  biomeOptions: BiomeOptions;
  options: PlanetOptions;

  vegetationPositions?: Record<string, Vector3[]>;

  shape: "sphere" | "plane" = "sphere";

  tempQuaternion = new Quaternion();

  constructor(options: PlanetOptions = {}) {
    this.shape = options.shape ?? this.shape;
    options.shape = this.shape;

    this.options = options;

    this.biome = new Biome(options.biome);
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
        oceanMorphPositions: number[];
        oceanMorphNormals: number[];
      };
      requestId: number;
    };
  }) {
    const { data, requestId } = event.data;

    const callback = this.callbacks[requestId];
    if (!callback) {
      console.error("No callback found for requestId:", requestId);
      return;
    }

    const geometry = createBufferGeometry(
      data.positions,
      data.colors,
      data.normals,
    );

    const oceanGeometry = createBufferGeometry(
      data.oceanPositions,
      data.oceanColors,
      data.oceanNormals,
    );

    oceanGeometry.morphAttributes.position = [
      new Float32BufferAttribute(data.oceanMorphPositions, 3),
    ];
    oceanGeometry.morphAttributes.normal = [
      new Float32BufferAttribute(data.oceanMorphNormals, 3),
    ];

    this.vegetationPositions = data.vegetation;

    const materialOptions = { vertexColors: true };

    const material =
      this.options.material === "caustics"
        ? new PlanetMaterialWithCaustics({
            ...materialOptions,
            shape: this.shape,
          })
        : new MeshStandardMaterial(materialOptions);

    const planetMesh = new Mesh(geometry, material);
    planetMesh.castShadow = true;

    if (this.options.material === "caustics") {
      planetMesh.onBeforeRender = (
        renderer,
        scene,
        camera,
        geometry,
        material,
      ) => {
        if (material instanceof PlanetMaterialWithCaustics) {
          material.update();
        }
      };
    }

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
    oceanMesh.onBeforeRender = (
      renderer,
      scene,
      camera,
      geometry,
      material,
    ) => {
      // update morph targets
      if (oceanMesh.morphTargetInfluences)
        oceanMesh.morphTargetInfluences[0] =
          Math.sin(performance.now() / 1000) * 0.5 + 0.5;
    };

    if (this.options.atmosphere?.enabled !== false) {
      this.addAtmosphere(planetMesh);
    }
    callback(planetMesh);

    delete this.callbacks[requestId];
  }

  async create(): Promise<Mesh> {
    // let collection = "stylized_nature";

    const models = this.biomeOptions.vegetation?.items.map((item) => {
      return item.name;
    });

    const loaded: Promise<Object3D[] | Mesh>[] = [];

    for (const model of models ?? []) {
      const loadedModels = loadModels(model); //, collection);
      loaded.push(loadedModels);
    }

    const planetPromise = this.createMesh();
    loaded.push(planetPromise);

    await Promise.all(loaded);

    const planet = await planetPromise;

    for (let i = 0; i < loaded.length - 1; i++) {
      const models = (await loaded[i]) as Object3D[];
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
            if (color?.array) {
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

  async createMesh(): Promise<Mesh> {
    return new Promise((resolve) => {
      const requestId = this.requestId++;
      this.callbacks[requestId] = resolve;

      this.worker.postMessage({
        type: "createGeometry",
        requestId,
        data: this.options,
      });
    });
  }

  addAtmosphere(planet: Mesh) {
    // Create the atmosphere geometry
    const atmosphereGeometry = new IcosahedronGeometry(
      this.options.atmosphere?.height ?? 1.2,
      this.options.detail ?? 20,
    );
    const atmosphere = new Mesh(
      atmosphereGeometry,
      createAtmosphereMaterial(this.options.atmosphere?.color),
    );
    atmosphere.renderOrder = 1;
    planet.add(atmosphere);
  }

  updatePosition(item: Object3D, pos: Vector3) {
    item.position.copy(pos);

    if (this.shape === "sphere") {
      const a = item.up.clone().normalize();
      const b = pos.clone().normalize();

      this.tempQuaternion.setFromUnitVectors(a, b);

      item.quaternion.copy(this.tempQuaternion);

      item.up = b;
    }
  }
}
