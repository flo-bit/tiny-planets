import * as THREE from "https://cdn.skypack.dev/pin/three@v0.134.0-dfARp6tVCbGvQehLfkdx/mode=imports,min/optimized/three.js";

import { GLTFHelper } from "./gltf.js"; //'https://1florki.github.io/threejsutils/gltf.js';

import * as PG from "https://1florki.github.io/pg/pg.js";

import { Biome } from "./biome.js";

let defaultNoise = new PG.Noise({ min: -0.2, max: 0.5 });

const defaultSettings = {
  geo: {
    shape: "sphere",
    subs: 6,
  },

  change: (v, h) => {
    let normal = v.clone();
    normal.normalize();
    normal.multiplyScalar(h);
    v.add(normal);
  },

  biomeSettings: {
    noiseSettings: { min: -0.1, max: 0.3, oct: 4, warp: 0.2 },
    gradientSettings: {
      stops: [
        [0, { between: [0x550000, 0xff7700] }],
        [1, { between: [0x5500aa, 0x003355] }],
      ],
    },
  },

  reset: (v) => {
    v.setLength(1);
  },
};

const defaultPlaneSettings = {
  geo: {
    shape: "plane",
    subs: 6,
  },

  change: (v, h) => {
    v.y += h;
  },
  reset: (v) => {
    v.y = 0;
  },
};

const presets = {
  normal: defaultSettings,
  plane: defaultPlaneSettings,
};

export class World {
  constructor(opts) {
    opts = opts || defaultSettings;

    if (opts.preset) {
      let otherOptions = opts;
      opts = presets[opts.preset] || {};
      for (let k of Object.keys(otherOptions)) {
        opts[k] = otherOptions[k];
      }
    }
    let otherOptions = opts;
    opts = presets["normal"] || {};
    for (let k of Object.keys(otherOptions)) {
      opts[k] = otherOptions[k];
    }

    this.biome = opts.biome || new Biome(opts.biomeSettings);
    this.biome.shape = this;

    this.change = opts.change;
    this.shape = new PG.Geo(opts.geo);

    this.scatter = opts.scatter;

    this.reset = opts.reset;

    this.opts = opts;
    console.log(opts);
    console.log(this);
  }
  createPlanet() {
    if (this.scatter > 0) {
      this.shape.scatter(this.scatter, 1000);
      this.shape.change(this.reset);
    }
    // clone shape
    this.orig = this.shape.clone();
    this.orig.calculateNormals();

    // set heights (without vegetation influence)
    this.shape.change((v) => {
      this.change(v, this.biome.getHeight(v));
    });
    this.shape.calculateNormals();

    // adds position of vegetation
    this.biome.generatePositions(this.itemCount);

    this.shape = this.orig.clone();

    // change height again (this time with )
    this.shape.change((v) => {
      this.change(v, this.biome.getHeight(v));
    });
    this.shape.calculateNormals();

    let faceCount = this.shape.faceCount();
    let colors = [];
    for (let i = 0; i < faceCount; i++) {
      let changedFace = this.shape.getFace(i);
      let face = this.orig.getFace(i);
      let color = this.biome.getColor(face, changedFace);
      colors.push(color, color, color);
    }
    this.shape.colors = colors;
    this.shape.normals = undefined;

    this.worldMesh = new THREE.Object3D();

    this.mesh = this.shape.mesh();
    this.mesh.add(this.worldMesh);

    this.createVegetation();
  }

  getRandomPoint(RNG) {
    RNG = RNG || Math;
    let faceIndex = Math.floor(this.shape.faceCount() * RNG.random());

    let origFace = this.orig.getFace(faceIndex);
    let changedFace = this.shape.getFace(faceIndex);

    let point = PG.Helper.randomPointInFace(origFace, RNG);
    let res = { point: point, face: origFace, changedFace: changedFace };
    return res;
  }

  createVegetation() {
    // get all models we should load
    let paths = this.biome.getPaths();
    // if no models exit early
    if (!paths) return;
    // gltfhelper expects a dictionary so turn array of path into dict where [key, value] is [path, path]
    let dict = {};
    for (let p of paths) dict[p] = p;

    let helper = new GLTFHelper(dict, () => {
      // assign models to vegetation items
      // helper.models is a dict where [key, value] is [path, model]
      this.biome.loadedModels(helper.models);
      // place models
      this.biome.placeItems(this.worldMesh, this.scale, this);
      //if(this.worldMesh.material.envMap) this.setEnvMap(this.worldMesh.material.envMap)
    });
  }
  add(obj, pos) {
    obj.position.set(0, 1, 0);

    //obj.up = new THREE.Vector3(0, 1, 0);
    this.worldMesh.add(obj);
    if (pos) this.updatePosition(obj, pos);
  }
  /*
  updatePosition(obj, pos) {
    this.change(pos, this.biome.getHeight(pos));
    
    obj.position.copy(pos);
    console.log(obj.position);
    console.log(obj);
    obj.rotBuffer = obj.rotBuffer || new THREE.Quaternion();
    let currentRotation = new THREE.Quaternion();
    pos.normalize();
    currentRotation.setFromUnitVectors(pos, obj.up);

    obj.rotBuffer.premultiply(currentRotation);
    obj.quaternion.copy(obj.rotBuffer);
    
    obj.up = pos.clone();
  }*/
  updatePosition(item, pos) {
    // update height
    //console.log(item);
    if (item.rotBuffer == undefined) item.rotBuffer = new THREE.Quaternion();
    item.oldPosition = item.position.clone();
    item.position.copy(pos);

    if (item.aboveGround != undefined) {
      pos.normalize();
      item.currentHeight = this.biome.getHeight(pos);

      item.position.setLength(1 + item.currentHeight + item.aboveGround);
    }
    if (item.height != undefined) {
      item.position.setLength(item.height);
    }

    // update up vector
    let currentRotation = new THREE.Quaternion();
    let a = item.up.clone();
    let b = pos.normal.clone();

    b.normalize();
    a.normalize();

    currentRotation.setFromUnitVectors(a, b);

    item.rotBuffer.premultiply(currentRotation);
    item.quaternion.copy(item.rotBuffer);

    item.up = b;
    console.log(item);
    console.log(pos);
  }
}
