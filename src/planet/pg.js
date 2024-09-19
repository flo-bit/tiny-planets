import * as THREE from 'https://cdn.skypack.dev/pin/three@v0.134.0-dfARp6tVCbGvQehLfkdx/mode=imports,min/optimized/three.js';
import 'https://cdnjs.cloudflare.com/ajax/libs/simplex-noise/2.4.0/simplex-noise.min.js';


/*

## Noise

3D Uber noise (concept stolen from No Man's Sky) class for all your noise field needs.

- Seeded noise
- scaling, pow
- fBM
- Erosion-like fBM
- Domain warping
- Ridges, billows
- Stepped noise
- Combined noise

### Get noise

noise.get(x, y, z, up [optional])


### Seeding

set .seed to a number


### Scaling, pow

set .scale (*) to zoom in or out.

set .power (*) to do n^(power) where n between 0 - 1


### fBM (and erosion-like fBM)

Does fBM by setting .octaves > 0 (*)
Control fBM with .persistence (*) and .lacunarity (*)

Advanced erosion like fBM with .erosion > 0 (*) (currently very slow, needs up vector if not [0, 1, 0])

Change settings of individual noise layers with .layers = [{}, {}] or .all = {}

Set relative amplitude of layers with .amp (*).


### Domain warping (slow-ish)

set .warp != 0 (*) for domain warping.

Uses the same noise per default, can be changed by settings .warpNoise

Second order domain warping available with .warp2 and .warpNoise2


### Ridges, billows

set .sharpness > 0 (*) for billowed noise (1.0 completely billowed).
set .sharpness < 0 (*) for ridged noise (-1.0 completely ridged).


### Stepped noise

set .steps > 0 (*) for stepped noise with .steps as number of steps.


### Combine

set .combine to another noise field


seed: Math.random(),

scale (scl): 1,
power (pow): 1,

amp: 1,

octaves (oct): 0, (0, 1, 2, ....)
persistence (per): 0.5, 
lacunarity (lac): 2,

layers: [{}, {}, {}],

combine: {}, (noise opts)
mod: (val, this, x, y, z, up) => val,

sharpness: 0, (-1 -> 1)
warp: 0,
warp2: 0,
erosion: 0,

steps: undefined (1, 2, 3, 4, ...)

min: -1,
max: 1,

defaultUp: (x, y, z) => new THREE.Vector3(0, 1, 0),

*/

/*

Geo

Helper class to modify geometries.

Contains vertex, color, uv and normal data as THREE.Vector3 objects for easier modifying 
(non-indexed, meaning every vertex is only used once and in order).


let geo = new Geo(options)
// options
{
// creates a shape
shape: [sphere (radius), 
        ico (radius), 
        plane (w, l, h, numW, numL), 
        cylinder (sides, rows, radius, height, caps),
        box (size),
        triangle (radius),
        pyramid (sides, radius, height, base)]
subs: 0, // how often to subdivide created shape (only for created shapes)

geo: bufferGeo, // imports BufferGeometry
image: image, // image to use for colors when importing buffergeometry
mesh: mesh, // flattens mesh (add geometry of all children recursively)
vertexColors: false, // create vertex colors when importing mesh, will default 
// to true if mesh contains more than one geometry or if one or more geometries have vertex colors
// otherwise false

removeColors: false, // should we remove all colors from imported geometry or mesh (default: false)
removeUVs: false, // should we remove all uvs from imported geometry or mesh (default: false)
removeNormals: false, // should we remove all normals from imported geometry or mesh (default: false)

pos: positions, // move shape, geo, mesh to position
computeNormals: true, // should we compute normals

hasColor: false, // should we make an array for the color (default: false)
hasUVs: false, // should we make an array for the uvs (default: false)
}

-setFromMesh(mesh, vertexColors)
-setFromGeometry(mesh, image)
-setShape(shape, opts) // ico, plane, sphere, cylinder, box, triangle, pyramid


*/

/*
simple octree (THREE.js version)

// usage: 

// Octree(opts)
opts: {
- size s (bounds from [-s, -s, -s] to [s, s, s])
- bounds (clone Box3)
- min, max (vec3 for Box3 min, max)
- points: [vec3] (if no other option given, will set bounds to encompass all points, will add points to tree)

- cap (max number of points before tree is split, default 4)
}

let oct = new Octree(); // octree between (-1, -1, -1) and (1, 1, 1)
let oct2 = Octree.withSize(5) // octree between (-5, -5, -5) and (5, 5, 5)
let oct3 = new Octree() // octree between (0, 0, 0) and (10, 10, 10)


// insert(pos, data)

oct.insert(pos, "test")
oct.insertXYZ(1, 2, 3, {hello: "world"}) // adds a point at (1, 2, 3)
oct.insertPoint(new THREE.Vector3(2, 5, 7)) // adds a point at (2, 5, 7)


// query(pos, maxDist)

// O(log(n))

let points = oct.query(pos, 0.5) // returns an array with {point: p, data: d} objects around pos (max dist 0.5)
let points = oct.queryBox(new THREE.Box3()); // returns array with points (and data) in box 

*/

/*

## class Mixer

Mixes colors together.


### Get color

mix.get(i);


### even spacing

For even spacing between -1 and 1

let mix = new Mixer({between: [0xaa00aa, 0xff00aa, 0xcccc00]});


### custom spacing

colors at 0, 0.5 and 0.6:

let mix = new Mixer({stops: [[0, 0xaa0055], [0.5, 0xffff00], [0.6, 0x00ff00]]})


### 2D (3D, 4D) mixing

Create 2D mixer by mixing to Mixers:

let mix = new Mixer({between: [{between: [0xaa0055, 0xffff00]}, {between: [0x00ff00, 0xffffff]}]})

let c = mix.get(x, y);

call mix.dimensions() for number of dimensions (up to 4 supported)

*/


export class Octree {
  constructor(opts) {
    opts = opts || {};

    this.points = [];

    if (opts.bounds) {
      this.boundary = opts.bounds.clone();
    } else if (opts.size) {
      let s = opts.size;
      this.boundary = new THREE.Box3(new THREE.Vector3(-s, -s, -s), new THREE.Vector3(s, s, s))
    } else if (opts.min || opts.max) {
      let min = opts.min || new THREE.Vector3(-1, -1, -1);
      let max = opts.max || new THREE.Vector3(1, 1, 1);
      this.boundary = new THREE.Box3(min, max)
    } else if (opts.points && opts.points.length > 0) {
      let min = opts.points[0].clone();
      let max = opts.points[0].clone();
      for (let p of opts.points) {
        min.x = Math.min(min.x, p.x);
        min.y = Math.min(min.y, p.y);
        min.z = Math.min(min.z, p.z);

        max.x = Math.max(max.x, p.x);
        max.y = Math.max(max.y, p.y);
        max.z = Math.max(max.z, p.z);
      }
      this.boundary = new THREE.Box3(min, max);
    } else {
      this.boundary = new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));
    }


    this.capacity = opts.cap || 4;

    if (opts.points) {
      for (let p of opts.points) {
        this.insertXYZ(p.x, p.y, p.z);
      }
    }
  }

  subdivide() {
    // if already subdivided exit silently
    if (this.subdivisions != undefined) return;

    // divide each dimension => 2 * 2 * 2 = 8 subdivisions
    let size = new THREE.Vector3();
    let subdivisions = [];
    for (let x = 0; x < 2; x++) {
      for (let y = 0; y < 2; y++) {
        for (let z = 0; z < 2; z++) {
          let min = this.boundary.min.clone();
          let max = this.boundary.max.clone();
          this.boundary.getSize(size);
          size.divideScalar(2);
          min.x += x * size.x;
          min.y += y * size.y;
          min.z += z * size.z;
          max.x -= (1 - x) * size.x;
          max.y -= (1 - y) * size.y;
          max.z -= (1 - z) * size.z;
          subdivisions.push(new Octree({
            min: min,
            max: max,
            cap: this.capacity
          }));
        }
      }
    }
    this.subdivisions = subdivisions;
  }

  // returns array of points where 
  // distance between pos and point is less than dist
  query(pos, dist = 1) {
    let points = this.queryXYZ(pos.x, pos.y, pos.z, dist);
    for (let i = points.length - 1; i >= 0; i--) {
      if (points[i].distanceTo(pos) > dist) points.splice(i, 1);
    }
    return points;
  }
  // vector3 free version, returns points in box around xyz
  queryXYZ(x, y, z, s) {
    let min = new THREE.Vector3(x - s, y - s, z - s),
      max = new THREE.Vector3(x + s, y + s, z + s)
    let box = new THREE.Box3(min, max);
    return this.queryBox(box);
  }
  queryBox(box, found) {
    found = found || [];

    if (!box.intersectsBox(this.boundary)) return found;

    for (let p of this.points) {
      if (box.containsPoint(p)) found.push(p);
    }
    if (this.subdivisions) {
      for (let sub of this.subdivisions) {
        sub.queryBox(box, found);
      }
    }
    return found;
  }

  // returns true if no points are closer than dist to point
  minDist(pos, dist) {
    return (this.query(pos, dist).length < 1);
  }

  // insert point with optional data (sets vec.data = data)
  insert(pos, data) {
    return this.insertPoint(pos, data);
  }
  // vector3 free version
  insertXYZ(x, y, z, data) {
    return this.insertPoint(new THREE.Vector3(x, y, z), data);
  }
  insertPoint(p, data) {
    p = p.clone();
    if (data) p.data = data;
    if (!this.boundary.containsPoint(p)) return false;

    if (this.points.length < this.capacity) {
      this.points.push(p);
      return true;
    } else {
      this.subdivide();
      let added = false;
      for (let sub of this.subdivisions) {
        if (sub.insertPoint(p, data)) added = true;
      }
      return added;
    }
  }

  showBoxes(mat, parent) {
    let size = new THREE.Vector3();
    this.boundary.getSize(size);

    let box = new THREE.BoxGeometry(size.x * 2, size.y * 2, size.z * 2);
    let mesh = new THREE.Mesh(box, mat || new THREE.MeshStandardMaterial({
      wireframe: true
    }));
    this.boundary.getCenter(mesh.position);

    parent = parent || new THREE.Object3D();
    parent.add(mesh);

    if (this.subdivisions) {
      for (let sub of this.subdivisions) sub.showBoxes(mat, parent);
    }
    return parent;
  }
  show(opts) {
    opts = opts || {};
    let pointsOnly = opts.pointsOnly;
    let mat = opts.mat;
    let points = this.all();


    let pointsGeo = new THREE.BufferGeometry();
    let positionData = new Float32Array(points.length * 3);
    let colorData = new Float32Array(points.length * 3);
    let q;
    if (opts.p && opts.min) {
      for (let point of points) {
        point.close = false;
      }
      q = this.query(opts.p, opts.min);
      for (let point of q) {
        point.close = true;
      }
    }

    for (let i = 0; i < points.length; i++) {
      positionData[i * 3] = points[i].x;
      positionData[i * 3 + 1] = points[i].y;
      positionData[i * 3 + 2] = points[i].z;

      colorData[i * 3] = points[i].close ? 1 : 0.7;
      colorData[i * 3 + 1] = points[i].close ? 0 : 0.7;
      colorData[i * 3 + 2] = points[i].close ? 0 : 0.7;
    }
    pointsGeo.setAttribute('position', new THREE.BufferAttribute(positionData, 3));
    pointsGeo.setAttribute('color', new THREE.BufferAttribute(colorData, 3));
    let pointMesh = new THREE.Points(pointsGeo, new THREE.PointsMaterial({
      size: opts.size || 1,
      sizeAttenuation: opts.sizeAttenuation || false,
      vertexColors: true
    }));
    if (pointsOnly) return pointMesh;

    mat = mat || new THREE.MeshStandardMaterial({
      transparent: true,
      opacity: 0.01,
      depthTest: false
    });
    let boxes = this.showBoxes(mat);
    boxes.add(pointMesh);
    return boxes;
  }
  all(arr) {
    arr = arr || [];
    for (let p of this.points) {
      arr.push(p);
    }
    if (this.subdivisions) {
      for (let subs of this.subdivisions) subs.all(arr);
    }
    return arr;
  }
}



/*

## Noise

3D Uber noise (concept stolen from No Man's Sky) class for all your noise field needs.

- Seeded noise
- scaling, pow
- fBM
- Erosion-like fBM
- Domain warping
- Ridges, billows
- Stepped noise
- Combined noise

### Get noise

noise.get(x, y, z, up [optional])


### Seeding

set .seed to a number


### Scaling, pow

set .scale (*) to zoom in or out.

set .power (*) to do n^(power) where n between 0 - 1


### fBM (and erosion-like fBM)

Does fBM by setting .octaves > 0 (*)
Control fBM with .persistence (*) and .lacunarity (*)

Advanced erosion like fBM with .erosion > 0 (*) (currently very slow, needs up vector if not [0, 1, 0])

Change settings of individual noise layers with .layers = [{}, {}] or .all = {}

Set relative amplitude of layers with .amp (*).


### Domain warping (slow-ish)

set .warp != 0 (*) for domain warping.

Uses the same noise per default, can be changed by settings .warpNoise

Second order domain warping available with .warp2 and .warpNoise2


### Ridges, billows

set .sharpness > 0 (*) for billowed noise (1.0 completely billowed).
set .sharpness < 0 (*) for ridged noise (-1.0 completely ridged).


### Stepped noise

set .steps > 0 (*) for stepped noise with .steps as number of steps.


### Combine

set .combine to another noise field


seed: Math.random(),

scale (scl): 1,
power (pow): 1,

amp: 1,

octaves (oct): 0, (0, 1, 2, ....)
persistence (per): 0.5, 
lacunarity (lac): 2,

layers: [{}, {}, {}],

combine: {}, (noise opts)
mod: (val, this, x, y, z, up) => val,

sharpness: 0, (-1 -> 1)
warp: 0,
warp2: 0,
erosion: 0,

steps: undefined (1, 2, 3, 4, ...)

min: -1,
max: 1,

defaultUp: (x, y, z) => new THREE.Vector3(0, 1, 0),

*/

const defaultUp = new THREE.Vector3(0, 1, 0);

export class Noise {
  constructor(opts) {
    opts = opts || {};

    this.pos = new THREE.Vector3(0, 0, 0);

    this.seed = (opts.seed || Math.random());

    this.scale = opts.scale || (opts.scl || 1);
    this.checkValue("scale");

    this.power = opts.power || (opts.pow || 1);
    this.checkValue("power");

    this.shift = opts.shift || new THREE.Vector3(0, 0, 0);

    // fbm stuff
    // how many layers
    this.octaves = opts.octaves || (opts.oct || 0);
    this.checkValue("octaves");
    // how much to multiply amplitude per layer
    this.gain = opts.gain || (opts.persistence || (opts.per || 0.5));
    this.checkValue("gain");
    // how much to multiply scale per layer
    this.lacunarity = opts.lacunarity || (opts.lac || 2);
    this.checkValue("lacunarity");

    // how much previous layers influence amplitude of later layers
    this.erosion = opts.erosion != undefined ? opts.erosion : 0;
    this.checkValue("erosion");
    // how much to move x, y, z to calculate derivative 
    // (x2 - x1) / delta, (y2 - y1) / delta, (z2 - z1) / delta
    this.delta = opts.delta != undefined ? opts.delta : 0.0001;

    // amp is also only used for fbm
    this.amp = opts.amplitude || opts.amp;
    this.checkValue("amp");

    if (this.octaves > 0 || opts.layers != undefined) {
      this.layers = [];
      for (let i = 0; i <= this.octaves || (opts.layers && i < opts.layers.length); i++) {
        let settings = opts.layers != undefined && opts.layers.length > i ? opts.layers[i] : {};
        if (settings.seed == undefined) settings.seed = this.seed * 3 + i * 5

        let n = settings;
        if (opts.all) {
          for (let k of Object.keys(opts.all)) {
            n[k] = opts.all[k];
          }
        }
        if (n.isNoise != true) {
          n = new Noise(settings);
        }
        this.layers.push(n);
      }
    } else {
      this.simplex = new SimplexNoise(this.seed);
    }
    if (opts.combine != undefined) {
      this.combine = new Noise(opts.combine);
    }

    this.mod = opts.mod;

    this.sharpness = opts.sharpness;
    this.checkValue("sharpness");

    if (opts.warp != undefined) {
      this.warp = opts.warp;
      this.checkValue("warp");
      if (opts.warpNoise) {
        this.warpNoise = opts.warpNoise;
        if (this.warpNoise.isNoise != true) this.warpNoise = new Noise(opts.warpNoise);
      }
    }
    if (opts.warp2 != undefined) {
      this.warp2 = opts.warp2;
      this.checkValue("warp2");

      if (opts.warpNoise2) {
        this.warpNoise2 = opts.warpNoise2;
        if (this.warpNoise2.isNoise != true) this.warpNoise2 = new Noise(opts.warpNoise2);
      }
    }

    this.steps = opts.steps;
    this.checkValue("steps");

    this.min = opts.min != undefined ? opts.min : -1;
    this.checkValue("min");
    this.max = opts.max != undefined ? opts.max : 1;
    this.checkValue("max");

    this.defaultUp = opts.defaultUp;

    if (opts.amps) {
      this.multiplyAmps(opts.amps);
    }

    this.central = opts.central;

    this.isNoise = true;
  }

  // checks if this[key] is an object or a number and 
  // if it is an object but .isNoise != true 
  // turns that into a new Noise object
  checkValue(key) {
    let v = this[key];
    if (v != undefined && typeof v != "number" && v.isNoise != true) this[key] = new Noise(v);
  }

  setSeed(seed) {
    seed = seed || (Math.random() * 10000);
    this.simplex = new SimplexNoise(seed);
    if (this.layers) {
      let i = 13
      for (let l of this.layers) {
        l.setSeed(seed * 3 + i++ * 7);
      }
    }
    return seed;
  }

  shiftBy(dX, dY, dZ) {
    this.shift.x += dX;
    this.shift.y += dY;
    this.shift.z += dZ;
  }

  multiplyAmps(arr) {
    if (this.layers == undefined) return;

    for (let i = 0; i < this.layers.length && i < arr.length; i++) {
      this.layers[i].amp *= arr[i];
    }
  }

  getFBM(x, y, z, up, noErosion) {
    let scale = this.getValue("scale", x, y, z);

    // if no layers exit early
    if (this.layers == undefined) {
      // if object has simplex noise return result of that
      if (this.simplex != undefined) return this.simplex.noise3D(x * scale, y * scale, z * scale);
      // no data
      return 0;
    }
    // for calculating angle between derivative and tangent
    // when erosion > 0
    up = up || (this.defaultUp != undefined ? this.defaultUp(x, y, z) : defaultUp);
    
    let maxAmp = 1;
    let amp = 1,
      freq = scale;

    let lac = this.getValue("lacunarity", x, y, z);
    let gain = this.getValue("gain", x, y, z);

    // reuse vector
    this.sum = this.sum || new THREE.Vector3();
    this.sum.set(0, 0, 0);

    let n = 0;
    let erosion = noErosion != true ? this.getValue("erosion", x, y, z) : 0;
    let octaves = this.getValue("octaves", x, y, z);
    for (let i = 0; i <= octaves && i < this.layers.length; i++) {
      let l = this.layers[i];
      let layerAmp = l.getValue("amp", x, y, z) || 1;
      let val = l.get(x * freq, y * freq, z * freq, up) * amp * layerAmp;
      if (erosion > 0) {
        let d = l.getDerivative(x * freq, y * freq, z * freq);
        d.setLength(amp * layerAmp);

        this.sum.add(d);
        // calculate normalized angle between sum of derivatives and tangent, should be between 0 and 1
        let mult = Math.abs(1 - up.angleTo(this.sum) / Math.PI);
        
        n += val * (mult * erosion + 1 - erosion);
      } else {
        n += val;
      }
      amp *= gain;
      freq *= lac;
      maxAmp += amp * layerAmp;
    }
    return n / maxAmp;
  }

  // main method, returns value between -1 and +1
  getNoise(x, y, z, up) {
    x = x || 0;
    y = y || 0;
    z = z || 0;

    x += this.shift.x;
    y += this.shift.y;
    z += this.shift.z;

    let lerp = THREE.MathUtils.lerp;
    let warp = this.getValue("warp", x, y, z);
    if (warp) {
      if (this.warpNoise) {
        x += this.warpNoise.get(x - 7.98, y + 4.33, z + 1.1) * warp;
        y += this.warpNoise.get(x + 1.23, y + 5.79, z + 9.31) * warp;
        z += this.warpNoise.get(x + 11.47, y + 17.98, z + 23.56) * warp;
      } else {
        x += this.getFBM(x - 7.98, y + 4.33, z + 1.1, up, true) * warp;
        y += this.getFBM(x + 1.23, y + 5.79, z + 9.31, up, true) * warp;
        z += this.getFBM(x + 11.47, y + 17.98, z + 23.56, up, true) * warp;
      }
    }

    let warp2 = this.getValue("warp2", x, y, z);
    if (warp2) {
      if (this.warpNoise2) {
        x += this.warpNoise2.get(x + 1.23, y + 5.79, z + 9.31) * warp2;
        y += this.warpNoise2.get(x + 11.47, y + 17.98, z + 23.56) * warp2;
        z += this.warpNoise2.get(x - 7.98, y + 4.33, z + 1.1) * warp2;
      } else {
        x += this.getFBM(x + 11.47, y + 17.98, z + 23.56) * warp2;
        y += this.getFBM(x - 7.98, y + 4.33, z + 1.1) * warp2;
        z += this.getFBM(x + 1.23, y + 5.79, z + 9.31) * warp2;
      }
    }

    let norm = this.getFBM(x, y, z, up);

    if (this.clamp) {
      norm = Math.min(norm, 1);
      norm = Math.max(norm, -1);
    }

    if (this.sharpness) {
      let sharp = this.getValue("sharpness", x, y, z);
      let billow = (Math.abs(norm) - 0.5) * 2;
      let ridged = (0.5 - Math.abs(norm)) * 2;


      norm = lerp(norm, billow, Math.max(0, sharp));
      norm = lerp(norm, ridged, Math.abs(Math.min(0, sharp)));
    }


    // modify with function
    if (this.mod) {
      norm = this.mod(norm, this, x, y, z, up);
    }

    let power = this.getValue("power", x, y, z);
    if (power && power != 1) {
      // convert to [0 - 1], apply power and back to [-1, 1]
      norm = (Math.pow((norm + 1) * 0.5, power) - 0.5) * 2
    }

    //combine with other noise:
    if (this.combine) {
      norm *= this.combine.get(x, y, z);
    }

    // turn into steps 
    // (e.g. 2 steps => only 0 or 1, 3 steps => 0, 0.5 and 1)
    let steps = Math.round(this.getValue("steps", x, y, z));
    if (steps != undefined && steps > 1) {
      let s = (Math.floor((norm + 1) * steps * 0.5) / (steps - 1) - 0.5) * 2;
      return s;
    }


    return norm;
  }

  getDerivative(x, y, z, n) {
    // left side or central difference
    // very expensive (four/six noise calls), should be changed to analytical derivatives
    // see https://iquilezles.org/www/articles/morenoise/morenoise.htm

    n = n || this.get(x, y, z);
    let mov = this.delta;

    let dx = (this.central ? this.get(x - mov, y, z) : n) - this.get(x + mov, y, z);
    let dy = (this.central ? this.get(x, y - mov, z) : n) - this.get(x, y + mov, z);
    let dz = (this.central ? this.get(x, y, z - mov) : n) - this.get(x, y, z + mov);

    let d = new THREE.Vector3(dx, dy, dz);
    d.normalize();
    return d;
  }

  // returns value of property at x, y, z
  getValue(key, x, y, z) {
    x = x || 0;
    y = y || 0;
    z = z || 0;
    let v = this[key];
    if (typeof v == "number") return v;
    if (v != undefined && v.isNoise) return v.get(x, y, z);
  }

  // returns noise between -1 and 1
  getNormXYZ(x, y, z, up) {
    return this.getNoise(x, y, z, up);
  }
  getNorm(vecOrX, y, z, up) {
    if (typeof vecOrX == "number") {
      return this.getNormXYZ(vecOrX, y, z, up);
    }
    return this.getNormXYZ(vecOrX.x, vecOrX.y, vecOrX.z, up);
  }

  // converts from -1, 1 to min, max
  normToMinMax(norm, x, y, z) {
    let min = this.getValue("min", x, y, z);
    let max = this.getValue("max", x, y, z);
    return (norm + 1) * 0.5 * (max - min) + min;
  }
  // converts from min, max to -1, 1
  minMaxToNorm(minMax, x, y, z) {
    let min = this.getValue("min", x, y, z);
    let max = this.getValue("max", x, y, z);
    return ((minMax - min) / (max - min) - 0.5) * 2
  }

  // returns noise between min and max
  getXYZ(x, y, z, up) {
    return this.normToMinMax(this.getNormXYZ(x, y, z, up), x, y, z);
  }
  get(vecOrX, y, z, up) {
    if (typeof vecOrX == "number") {
      return this.getXYZ(vecOrX, y, z, up);
    }
    return this.getXYZ(vecOrX.x, vecOrX.y, vecOrX.z, up);
  }
}


/*

Geo

Helper class to modify geometries.

Contains vertex, color, uv and normal data as THREE.Vector3 objects for easier modifying 
(non-indexed, meaning every vertex is only used once and in order).


let geo = new Geo(options)
// options
{
// creates a shape
shape: [sphere (radius), 
        ico (radius), 
        plane (w, l, h, numW, numL), 
        cylinder (sides, rows, radius, height, caps),
        box (size),
        triangle (radius),
        pyramid (sides, radius, height, base)]
subs: 0, // how often to subdivide created shape (only for created shapes)

geo: bufferGeo, // imports BufferGeometry
image: image, // image to use for colors when importing buffergeometry
mesh: mesh, // flattens mesh (add geometry of all children recursively)
vertexColors: false, // create vertex colors when importing mesh, will default 
// to true if mesh contains more than one geometry or if one or more geometries have vertex colors
// otherwise false

removeColors: false, // should we remove all colors from imported geometry or mesh (default: false)
removeUVs: false, // should we remove all uvs from imported geometry or mesh (default: false)
removeNormals: false, // should we remove all normals from imported geometry or mesh (default: false)

pos: positions, // move shape, geo, mesh to position
computeNormals: true, // should we compute normals

hasColor: false, // should we make an array for the color (default: false)
hasUVs: false, // should we make an array for the uvs (default: false)
}

-setFromMesh(mesh, vertexColors)
-setFromGeometry(mesh, image)
-setShape(shape, opts) // ico, plane, sphere, cylinder, box, triangle, pyramid


*/



// HELPER

export class Helper {
  static splitAlongLongestSide(a, b, c, array) {
    array = array || [];
    let ab = a.distanceTo(b);
    let bc = b.distanceTo(c);
    let ca = c.distanceTo(a);
    if (ab > bc && ab > ca) {
      let mid = b.clone().add(a).divideScalar(2)
      array.push(a.clone(), mid.clone(), c.clone(), mid.clone(), b.clone(), c.clone());
    } else if (bc > ab && bc > ca) {
      let mid = c.clone().add(b).divideScalar(2)
      array.push(a.clone(), b.clone(), mid.clone(), mid.clone(), c.clone(), a.clone());
    } else {
      let mid = a.clone().add(c).divideScalar(2)
      array.push(a.clone(), b.clone(), mid.clone(), b.clone(), c.clone(), mid.clone(), );
    }
    return array;
  }

  // turns rectangle with sides ab, bc, cd, da into two triangles
  static makeFacesFromRect(a, b, c, d, array) {
    array = array || [];
    array.push(a.clone(), d.clone(), c.clone(), a.clone(), c.clone(), b.clone());
    return array;
  }


  static midpoint(a, b) {
    return a.clone().lerp(b, 0.5);
  }

  static createPerFaceVerticesFromIndices(ver, ind) {
    let vertices = [];
    for (let i = 0; i < ind.length; i++) {
      let vi = ind[i] * 3;
      vertices.push(Helper.makeVertex(ver[vi], ver[vi + 1], ver[vi + 2]));
    }
    return vertices;
  }

  static subdivideFace(a, b, c, noClone) {
    let newFaces = [];
    let d = Helper.midpoint(a, b);
    let e = Helper.midpoint(b, c);
    let f = Helper.midpoint(c, a);
    if (noClone == true) {
      newFaces.push(d, e, f)
      newFaces.push(a, d, f)
      newFaces.push(d, b, e)
      newFaces.push(e, c, f)
    } else {
      newFaces.push(d.clone(), e.clone(), f.clone())
      newFaces.push(a.clone(), d.clone(), f.clone())
      newFaces.push(d.clone(), b.clone(), e.clone())
      newFaces.push(e.clone(), c.clone(), f.clone())
    }
    return newFaces;
  }

  static addArrayToArray(toArr, fromArr) {
    for (let i of fromArr) {
      toArr.push(i);
    }
  }

  static vertexPosForAngle(a, h, r) {
    return new THREE.Vector3(Math.sin(a) * (r || 1), h, Math.cos(a) * (r || 1));
  }

  static addMorphToGeo(geo, morphGeo) {
    if (geo.morphAttributes.position == undefined) geo.morphAttributes.position = [];
    if (geo.morphAttributes.normal == undefined) geo.morphAttributes.normal = [];

    let i = geo.morphAttributes.position.length;
    geo.morphAttributes.position[i] = morphGeo.getAttribute("position").clone();
    geo.morphAttributes.normal[i] = morphGeo.getAttribute("normal").clone();
  }

  static makeVertex(x, y, z) {
    return new THREE.Vector3(x, y, z);
  }
  static makeFace(a, b, c, index) {
    let mid = Helper.makeVertex((a.x + b.x + c.x) / 3, (a.y + b.y + c.y) / 3, (a.z + b.z + c.z) / 3)
    return {
      a: a,
      b: b,
      c: c,
      face: index,
      mid: mid
    };
  }

  // barycentric method
  static isPointInFace(face, v) {
    var v0 = face.c.clone().sub(face.a);
    var v1 = face.b.clone().sub(face.a);
    var v2 = v.clone().sub(face.a);
    var dot00 = v0.dot(v0);
    var dot01 = v0.dot(v1);
    var dot02 = v0.dot(v2);
    var dot11 = v1.dot(v1);
    var dot12 = v1.dot(v2);
    var invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
    var u = (dot11 * dot02 - dot01 * dot12) * invDenom;
    var v = (dot00 * dot12 - dot01 * dot02) * invDenom;
    return (u >= 0) && (v >= 0) && (u + v < 1);
  }
  
  static randomPointInFace(face, RNG) {
    // Call the corners of the triangle A, B, C, the side vectors AB, BC, AC
    let ab = face.b.clone().sub(face.a);
    let bc = face.c.clone().sub(face.b);
    let ac = face.c.clone().sub(face.a);
    // generate two random numbers in [0,1] called u and v.
    let u = RNG != undefined ? RNG.random() : Math.random();
    let v = RNG != undefined ? RNG.random() : Math.random();
    // Let p = u * AB + v * AC.
    let p = ab.clone().multiplyScalar(u).add(ac.clone().multiplyScalar(v));

    // If A+p is inside the triangle, return A+p
    let point = face.a.clone().add(p);

    // If A+p is outside the triangle, return A + AB + AC - p
    if (!Helper.isPointInFace(face, point)) {
      point.sub(p.multiplyScalar(2));
      point.add(ab);
      point.add(ac);
    }
    return point;
  }

  // load pixel data of image so we can access it with getPixel(data, x, y) where x, y in range [0, 1]
  static loadImageData(image) {
    let canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;

    let context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);

    return context.getImageData(0, 0, image.width, image.height);
  }
  // returns pixel as a THREE.Color() object with an addition alpha (a)
  static getPixel(imageData, x, y) {
    // convert from [0, 1] to [0, width/height in pixel]
    x = Math.min(Math.floor(imageData.width * x), imageData.width - 1);
    y = Math.min(Math.floor(imageData.height * y), imageData.height - 1);

    let position = (x + imageData.width * y) * 4,
      data = imageData.data;

    let color = new THREE.Color(data[position], data[position + 1], data[position + 2]);
    color.a = data[position + 3];
    return color;
  }
}


// SHAPES
const icosahedronInd = [5, 0, 11, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8, 3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9, 4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1];
const icoT = (1.0 + Math.sqrt(5)) / 2.0;
const icosahedronVer = [-1, icoT, 0, 1, icoT, 0, -1, -icoT, 0, 1, -icoT, 0, 0, -1, icoT, 0, 1, icoT, 0, -1, -icoT, 0, 1, -icoT, icoT, 0, -1, icoT, 0, 1, -icoT, 0, -1, -icoT, 0, 1];

class Shapes {
  // radius, subs
  static icoVerts(geo, opts) {
    opts = opts || {};
    geo.radius = opts.radius || 1;
    geo.verts = Helper.createPerFaceVerticesFromIndices(icosahedronVer, icosahedronInd);
    geo.setLengthAll(geo.radius);
    geo.subdivideAll(opts.subs);
  }
  // radius, subs
  static sphereVerts(geo, opts) {
    geo.addShape("ico", {subs: opts.subs});
    geo.setLengthAll(opts.radius || 1);
  }

  // size, maxSideLength, subs
  static planeVerts(geo, opts) {
    opts = opts || {};
    let size = opts.size || new THREE.Vector3(1, 0, 1);
    geo.addShape("para", {
      a: new THREE.Vector3(-size.x, 0, -size.z),
      b: new THREE.Vector3(size.x, 0, -size.z),
      c: new THREE.Vector3(-size.x, 0, size.z),
      maxSideLength: opts.maxSideLength
    })
    geo.subdivideAll(opts.subs);
  }

  // center, size, maxSideLength
  static boxVerts(geo, opts) {
    opts = opts || {};

    let center = opts.center || new THREE.Vector3(0, 0, 0);
    let size = opts.size || new THREE.Vector3(1, 1, 1);

    let half = size.clone().divideScalar(2);
    let a = center.clone().sub(half);
    a.y += size.y;

    let b = a.clone();
    b.x += size.x;
    let c = b.clone();
    c.z += size.z;
    let d = a.clone();
    d.z += size.z;

    let e = a.clone();
    e.y -= size.y;

    let f = b.clone();
    f.y -= size.y;

    let g = c.clone();
    g.y -= size.y;

    let h = d.clone();
    h.y -= size.y;
    geo.addShape("paraBox", {
      a: a,
      b: b,
      c: c,
      d: d,
      e: e,
      f: f,
      g: g,
      h: h,
      maxSideLength: opts.maxSideLength
    })
  }

  // radius, maxSideLength, rows, sides, caps
  static cylVerts(geo, opts) {
    opts = opts || {};

    geo.height = opts.height || 1;
    geo.caps = opts.caps != undefined ? opts.caps : false;
    geo.radius = opts.radius || 1;

    geo.sides = opts.sides != undefined && opts.sides > 2 ? opts.sides : 3;
    geo.rows = opts.rows || 1;
    if (opts.sides == undefined && opts.maxSideLength != undefined) {
      let circ = Math.PI * 2 * Math.pow(geo.radius, 2);
      geo.sides = Math.max(3, Math.ceil(circ / opts.maxSideLength));
    }
    if (opts.rows == undefined && opts.maxSideLength != undefined) {
      geo.rows = Math.ceil(geo.height / opts.maxSideLength);
    }

    let vertices = [],
      sides = geo.sides,
      height = geo.height;

    for (let i = 0; i < sides; i++) {
      for (let r = 0; r < geo.rows; r++) {
        let lo = -height / 2 + r / geo.rows * height,
          hi = -height / 2 + (r + 1) / geo.rows * height;
        let a1 = i / sides * Math.PI * 2 + 0.0001;
        let a2 = (i + 1) / sides * Math.PI * 2 + 0.0001;
        let v1 = Helper.vertexPosForAngle(a1, lo);
        let v2 = Helper.vertexPosForAngle(a2, lo);
        let v3 = Helper.vertexPosForAngle(a1, hi)
        let v4 = Helper.vertexPosForAngle(a2, hi);
        vertices.push(v3, v2, v4);
        vertices.push(v1, v2.clone(), v3.clone());
      }
    }
    geo.verts = vertices;

    geo.change((v) => {
      let y = v.y;
      v.y = 0;
      if (v.length() > 0.01) v.setLength(geo.radius);
      v.y = y;
    });
    if (opts.caps) {
      geo.addShape("ring", {
        sides: geo.sides,
        radius: geo.radius,
        pos: new THREE.Vector3(0, height / 2, 0),
        maxSideLength: opts.maxSideLength,
        innerRadius: opts.innerRadius
      })
      geo.addShape("ring", {
        sides: geo.sides,
        reverse: true,
        radius: geo.radius,
        pos: new THREE.Vector3(0, -height / 2, 0),
        maxSideLength: opts.maxSideLength,
        innerRadius: opts.innerRadius
      })
    }
    geo.subdivideAll(opts.subs);
  }
  static circleVerts(geo, opts) {
    geo.radius = opts.radius || 1;
    geo.sides = opts.sides || 3;
    geo.verts = [];

    for (let i = 0; i < geo.sides; i++) {
      let tv1 = Helper.vertexPosForAngle(i / geo.sides * Math.PI * 2 + 0.0001, 0);
      tv1.setLength(geo.radius);
      let tv2 = Helper.vertexPosForAngle((i + 1) / geo.sides * Math.PI * 2 + 0.0001, 0);
      tv2.setLength(geo.radius);
      let tv3 = Helper.makeVertex(0, 0, 0);

      geo.verts.push(tv1, tv2, tv3);
    }
    geo.subdivideAll(opts.subs);
  }

  // innerRadius, radius, rows, sides, maxSideLength
  static ringVerts(geo, opts) {
    let radius = opts.radius || 1;
    let innerRadius = opts.innerRadius || 0;

    let sides = opts.sides || 3;
    if (opts.sides == undefined && opts.maxSideLength != undefined) {
      sides = Math.max(3, Math.ceil((Math.PI * 2 * Math.pow(radius, 2)) / opts.maxSideLength));
    }

    let rows = opts.rows || 1;
    if (opts.rows == undefined && opts.maxSideLength != undefined) {
      rows = Math.ceil((radius - innerRadius) / opts.maxSideLength);
    }

    geo.verts = [];

    for (let i = 0; i < rows; i++) {
      let smallRadius = innerRadius + (radius - innerRadius) * (i / (rows));
      let bigRadius = innerRadius + (radius - innerRadius) * ((i + 1) / (rows))

      let lastBig, lastSmall;
      for (let j = 0; j <= sides; j++) {

        let newBig = Helper.vertexPosForAngle(j / sides * Math.PI * 2 + 0.0001, 0);
        newBig.setLength(bigRadius);
        if (smallRadius < 0.0001) {
          if (lastBig) {
            geo.verts.push(lastBig.clone(), newBig.clone(), Helper.makeVertex(0, 0, 0));
          }
        } else {
          let newSmall = newBig.clone();
          newSmall.setLength(smallRadius);

          if (lastBig) {
            geo.verts.push(lastBig.clone(), newBig.clone(), lastSmall.clone(), newBig.clone(), newSmall.clone(), lastSmall.clone());
          }
          lastSmall = newSmall;
        }
        lastBig = newBig;
      }
    }
    geo.subdivideAll(opts.subs);
  }

  // height, sides, radius, base (true/false)
  static pyrVerts(geo, opts) {
    opts = opts || {};
    geo.radius = opts.radius || 1;
    geo.sides = opts.sides != undefined && opts.sides > 2 ? opts.sides : 3;
    geo.height = opts.height || 1;
    geo.base = opts.base != undefined ? opts.base : false;

    let vertices = [],
      lo = 0,
      hi = geo.height,
      sides = Math.round(geo.sides);
    for (let i = 0; i < sides; i++) {
      let a1 = i / sides * Math.PI * 2 + 0.0001;
      let a2 = (i + 1) / sides * Math.PI * 2 + 0.0001;
      let v1 = Helper.vertexPosForAngle(a1, lo);
      v1.setLength(geo.radius);
      let v2 = Helper.vertexPosForAngle(a2, lo);
      v2.setLength(geo.radius);
      let v3 = Helper.makeVertex(0, hi, 0);
      vertices.push(v2, v3, v1);
    }
    geo.verts = vertices;
    if (geo.base) {
      let lo = 0;
      for (let i = 0; i < sides; i++) {
        let a1 = i / sides * Math.PI * 2 + 0.0001;
        let a2 = (i + 1) / sides * Math.PI * 2 + 0.0001;
        let v1 = Helper.vertexPosForAngle(a1, lo);
        v1.setLength(geo.radius);
        let v2 = Helper.vertexPosForAngle(a2, lo)
        v2.setLength(geo.radius);
        let v3 = Helper.makeVertex(0, lo, 0);
        geo.verts.push(v2, v1, v3);
      }
    }
    geo.subdivideAll(opts.subs);
  }

  // parallelogram with sides ab, ac, ..
  // set subdivisions with subsW, subsH or maxSideLength
  static para(geo, opts) {
    let a = opts.a,
      b = opts.b,
      c = opts.c;
    let subsW = Math.max(1, opts.subsW || 1);
    let subsH = Math.max(1, opts.subsH || 1);
    if (opts.maxSideLength) {
      subsW = Math.ceil(a.distanceTo(b) / opts.maxSideLength);
      subsH = Math.ceil(a.distanceTo(c) / opts.maxSideLength);
    }

    let vecW = b.clone().sub(a).divideScalar(subsW);
    let vecH = c.clone().sub(a).divideScalar(subsH);
    for (let x = 0; x < subsW; x++) {
      for (let y = 0; y < subsH; y++) {
        let smallA = a.clone().add(vecW.clone().multiplyScalar(x).add(vecH.clone().multiplyScalar(y)));
        let smallB = smallA.clone().add(vecW);
        let smallC = smallB.clone().add(vecH);
        let smallD = smallA.clone().add(vecH);
        Helper.makeFacesFromRect(smallA, smallB, smallC, smallD, geo.verts);
      }
    }
  }

  // a box where all sides are parallelograms,
  // defined by a top parallelogram with a, b, c, d
  // and a bottom parallelogram with e, f, g, h
  static paraBox(geo, opts) {
    let a = opts.a,
      b = opts.b,
      c = opts.c,
      d = opts.d,
      e = opts.e,
      f = opts.f,
      g = opts.g,
      h = opts.h;

    geo.addShape("para", {
      a: a,
      b: b,
      c: d,
      maxSideLength: opts.maxSideLength
    });
    geo.addShape("para", {
      a: c,
      b: b,
      c: g,
      maxSideLength: opts.maxSideLength
    });
    geo.addShape("para", {
      a: d,
      b: c,
      c: h,
      maxSideLength: opts.maxSideLength
    });
    geo.addShape("para", {
      a: a,
      b: d,
      c: e,
      maxSideLength: opts.maxSideLength
    });
    geo.addShape("para", {
      a: b,
      b: a,
      c: f,
      maxSideLength: opts.maxSideLength
    });
    geo.addShape("para", {
      a: h,
      b: g,
      c: e,
      maxSideLength: opts.maxSideLength
    });
  }

  // parabox from a to b, with up vector and size (x, y)
  static beam(geo, opts) {
    let p1 = opts.a || (opts.p1 || new THREE.Vector3(0, 0, 0)),
      p2 = opts.b || (opts.p2 || new THREE.Vector3(0, 0, 0)),
      size = opts.size || new THREE.Vector3(1, 1, 1),
      up = opts.up || new THREE.Vector3(0, 1, 0);

    let side = p2.clone().sub(p1).cross(up);
    side.setLength(size.x / 2);
    up.setLength(size.y / 2);
    let a = p1.clone().add(up).add(side);
    let b = p1.clone().add(up).sub(side);
    let c = p2.clone().add(up).sub(side);
    let d = p2.clone().add(up).add(side);

    let e = p1.clone().sub(up).add(side);
    let f = p1.clone().sub(up).sub(side);
    let g = p2.clone().sub(up).sub(side);
    let h = p2.clone().sub(up).add(side);
    geo.addShape("paraBox", {
      a: a,
      b: b,
      c: c,
      d: d,
      e: e,
      f: f,
      g: g,
      h: h,
      maxSideLength: opts.maxSideLength
    })
  }

  // innerRadius, radius, height, caps, maxSideLength
  static tube(geo, opts) {
    geo.radius = opts.radius || 1;

    geo.sides = opts.sides != undefined && opts.sides > 2 ? opts.sides : 3;
    if (opts.sides == undefined && opts.maxSideLength != undefined) {
      let circ = Math.PI * 2 * Math.pow(geo.radius, 2);
      geo.sides = Math.max(3, Math.ceil(circ / opts.maxSideLength));
    }

    geo.addShape("cylinder", {
      radius: opts.radius,
      innerRadius: opts.innerRadius,
      height: opts.height,
      sides: geo.sides,
      rows: opts.rows,
      maxSideLength: opts.maxSideLength,
      caps: opts.caps
    });
    geo.addShape("cylinder", {
      radius: opts.innerRadius,
      height: opts.height,
      sides: geo.sides,
      rows: opts.rows,
      maxSideLength: opts.maxSideLength,
      reverse: true
    });
  }

}


const shapes = {
  ico: Shapes.icoVerts,
  plane: Shapes.planeVerts,
  sphere: Shapes.sphereVerts,
  s: Shapes.sphereVerts,
  cylinder: Shapes.cylVerts,
  cyl: Shapes.cylVerts,
  box: Shapes.boxVerts,
  b: Shapes.boxVerts,
  circle: Shapes.circleVerts,
  pyramid: Shapes.pyrVerts,
  pyr: Shapes.pyrVerts,
  para: Shapes.para,
  paraBox: Shapes.paraBox,
  beam: Shapes.beam,
  ring: Shapes.ringVerts,
  tube: Shapes.tube,
}
export class Geo {
  constructor(opts) {
    opts = opts || {};

    this.opts = opts;

    this.pos = new THREE.Vector3(0, 0, 0);
    this.subs = opts.subs || 0;

    this.verts = [];
    if (opts.verts) {
      for (let v of opts.verts) {
        this.verts.push(v.clone());
      }
    }
    this.colors = opts.hasColor || opts.colors != undefined ? [] : undefined;
    if (opts.colors) {
      for (let c of opts.colors) {
        this.colors.push(c.clone());
      }
    }
    this.uvs = opts.hasUVs || opts.uvs != undefined ? [] : undefined;
    if (opts.uvs) {
      for (let u of opts.uvs) {
        this.uvs.push(u.clone());
      }
    }
    this.normals = opts.hasNormals || opts.normals != undefined ? [] : undefined;
    if (opts.normals) {
      for (let n of opts.normals) {
        this.normals.push(n.clone());
      }
    }

    if (opts.shape) {
      this.setShape(opts.shape, opts);
    }
    if (opts.mesh) {
      this.setFromMesh(opts.mesh, opts.vertexColors);
    } else if (opts.geo) {
      this.setFromBufferGeometry(opts.geo);
    }
    if (opts.image) {
      this.setColorFromImage(opts.image)
    }
    if (opts.removeColors == true) {
      this.removeColors();
    }
    if (opts.removeUVs == true) {
      this.removeUVs();
    }
    if (opts.removeNormals == true) {
      this.removeNormals();
    }
    if (opts.computeNormals == true) {
      this.calculateNormals();
    }
    if (opts.rot) {
      this.applyEuler(opts.rot);
    }
    if (opts.pos) {
      this.setPosition(opts.pos);
    }
    if (opts.color) {
      this.setColor(opts.color);
    }
    if (opts.material) {
      this.material = opts.material;
    }

    if (opts.scatter) {
      this.scatter(opts.scatter);
    }
    if (opts.reverse) {
      this.reverseFaces();
    }
  }

  vertexCount() {
    return this.verts.length;
  }
  faceCount() {
    return this.vertexCount() / 3;
  }

  reverseFaces() {
    let verts = [];
    for (let i = 0; i < this.verts.length; i += 3) {
      verts.push(this.verts[i + 2]);
      verts.push(this.verts[i + 1]);
      verts.push(this.verts[i]);
    }
    this.verts = verts;
  }

  clone() {
    return new Geo({
      verts: this.verts,
      colors: this.colors,
      uvs: this.uvs,
      normals: this.normals
    });
  }

  // convinience methods that 
  // are called for all vertices

  // call func for each vertex
  change(func) {
    this.changeVertices(func);
  }

  replaceFaces(func) {
    let newVerts = [];
    for (let i = 0; i < this.faceCount(); i++) {
      let face = this.getFace(i);
      func(face, newVerts);
    }
    this.verts = newVerts;
  }

  // change vertices, rotation, transformation, scale, length
  applyMatrix4(mat) {
    this.change((v) => v.applyMatrix4(mat))
  }
  applyEuler(euler) {
    this.change((v) => v.applyEuler(euler))
  }
  applyQuaternion(q) {
    this.change((v) => v.applyQuaternion(q))
  }
  setLength(lengthFunc) {
    this.change((vert) => {
      vert.setLength(lengthFunc(vert));
    });
  }
  setLengthAll(mag) {
    return this.setLength(() => mag);
  }
  // move all by vertex
  transform(transformVertex) {
    return this.changeVertices((vert) => {
      vert.x += transformVertex.x
      vert.y += transformVertex.y
      vert.z += transformVertex.z
    });
  }
  // scale all by vertex
  scale(scaleVertex) {
    return this.changeVertices((vert) => {
      vert.x *= scaleVertex.x
      vert.y *= scaleVertex.y
      vert.z *= scaleVertex.z
    });
  }

  // color faces with colorFunc(face) -> color
  color(colorFunc) {
    return this.setFaceColor(colorFunc);
  }

  random(RNG) {
    return this.randomPoint(RNG);
  }
  // generate random point on one of the faces
  // uniform random point generation if all faces have the same are
  randomPoint(RNG) {
    // get random face
    let randomFace = Math.floor((RNG != undefined ? RNG.random() : Math.random()) * this.faceCount());
    let face = this.getFace(randomFace);

    return Helper.randomPointInFace(face, RNG);
  }

  // move all vertices up to max in any direction
  scatter(max, scl) {
    max = max || 0.01;
    let noise = new Noise({
      min: -max,
      max: max,
      scl: scl || 10
    });
    this.change((v) => {
      v.x += noise.get(v.x, v.y, v.z);
      v.y += noise.get(v.x + 10, v.y, v.z - 10);
      v.z += noise.get(v.x - 10, v.y + 10, v.z);
    })
    return this;
  }

  // repeatedly subdivide all faces with at least one edge thats longer than maxEdgeLength
  // by splitting longest edge in half
  tessellate(maxEdgeLength) {
    let i = 1; // counts number of subdivided faces
    let max = 20;
    let count = 0;
    // as long as we subdivided at least one face we try again
    while (i > 0 && count++ < max) {
      i = 0;
      // subdivide all faces where one edge < maxEdgeLength and count those
      this.replaceFaces((face, newVerts) => {
        let ab = face.a.distanceTo(face.b);
        let bc = face.b.distanceTo(face.c);
        let ca = face.c.distanceTo(face.a);
        if (ab > maxEdgeLength || bc > maxEdgeLength || ca > maxEdgeLength) {
          Helper.splitAlongLongestSide(face.a, face.b, face.c, newVerts);
          i++;
        } else {
          newVerts.push(face.a, face.b, face.c);
        }
      })
      console.log(this.verts);
    }
    return this;
  }

  // split geometry into n geometries
  // puts faces into nth geometry
  // if splitFunction(face) returns n - 1
  // returns array with all geometries (first geometry is this)
  split(splitFunction, remove) {
    let otherGeos = [this];

    for (let i = (this.verts.length / 3) - 1; i >= 0; i--) {
      let face = this.getFace(i);
      let geo = splitFunction(face);

      while (!remove && otherGeos.length <= geo) {
        otherGeos.push(new Geo({
          hasColor: this.colors != undefined,
          hasUVs: this.uvs != undefined,
          hasNormals: this.normals != undefined
        }));
      }
      if (geo > 0) {
        this.removeFace(i);
        if (!remove) otherGeos[geo].addFace(face)
      }
    }
    return otherGeos;
  }

  // splits geometry into data.length + 1 parts
  // tag is the key (string), data should be an array with possible values
  // returns an array with first element where tag == undefined or not found in data
  // and remaining elements correspong to data array (element 1 in result has tag value of element 0 in data)
  // uses first vertex of each face
  splitByTag(tag, data) {
    return this.split((face) => {
      let currentData = face.a[tag];
      if (currentData) {
        return data.indexOf(currentData) + 1;
      }
      return 0;
    });
  }

  // moves all vertices by current position - new position
  setPosition(pos) {
    this.oldPos = this.pos != undefined ? this.pos.clone() : new THREE.Vector3(0, 0, 0);
    this.pos = pos;
    this.transform(this.pos.clone().sub(this.oldPos));
    return this;
  }

  // set vertex.tag = data (data defaults to true) for all vertices
  setTag(tag, data) {
    for (let v of this.verts) {
      v[tag] = data || true
    }
    return this;
  }

  // adds otherGeo to this object by adding each face
  merge(otherGeo) {
    for (let i = 0; i < otherGeo.faceCount(); i++) {
      let face = otherGeo.getFace(i);
      this.addFace(face);
      /*
      this.verts.push(otherGeo.verts[i]);
      
      if(this.colors && otherGeo.colors) this.colors.push(otherGeo.colors[i]);
      if(this.uvs && otherGeo.uvs) this.uvs.push(otherGeo.uvs[i]);*/
    }
    return this;
  }

  // subdivides all faces where func(face) returns true
  subdivide(func) {
    let newVert = [],
      oldVerts = this.verts;
    // go through each triangle 
    // (each containing 3 points with x, y and z)
    for (let j = 0; j < oldVerts.length; j += 3) {
      // split every triangle into four smaller triangles

      let face = this.getFace(j / 3);

      if (func(face)) {
        let subTriangles = Helper.subdivideFace(face.a, face.b, face.c);
        Helper.addArrayToArray(newVert, subTriangles);
      } else {
        newVerts.push(oldVerts[j], oldVerts[j + 1], oldVerts[j + 2]);
      }
    }
    this.verts = newVert;

    return this;
  }

  // subdivide all face num times 
  // (4^num faces in the end)
  subdivideAll(num) {
    for (let i = 0; i < num; i++) {
      this.subdivide(() => true);
    }
    return this;
  }

  getVertex(i) {
    if (i >= this.vertexCount() || i < 0) return;

    let v = this.verts[i];
    v.index = i;
    if (this.colors) v.color = this.colors[i];
    if (this.uvs) v.uv = this.uvs[i];
    return v;
  }
  getFace(i) {
    i *= 3;
    if (i + 2 >= this.vertexCount() || i < 0) return;

    let face = Helper.makeFace(this.getVertex(i), this.getVertex(i + 1), this.getVertex(i + 2), i / 3);
    if (this.normals) face.normal = this.normals[i / 3];
    return face;
  }

  removeVertex(i) {
    if (i >= this.vertexCount() || i < 0) return;

    this.verts.splice(i, 1);
    if (this.colors) this.colors.splice(i, 1);
    if (this.uvs) this.uvs.splice(i, 1);
    return this;
  }
  removeFace(i) {
    i *= 3;
    if (i + 2 >= this.vertexCount() || i < 0) return;
    for (let j = 0; j < 3; j++) this.removeVertex(i);
    if (this.normals) this.normals.splice(i / 3, 1);
    return this;
  }

  addVertex(v) {
    this.verts.push(v);
    if (this.colors && v.color) this.colors.push(v.color);
    if (this.uvs && v.uv) this.uvs.push(v.uv);
    return this;
  }
  addFace(face) {
    this.addVertex(face.a);
    this.addVertex(face.b);
    this.addVertex(face.c);
    if (this.normals && face.normal) this.normals.push(face.normal);
    return this;
  }

  // removes all faces where removeFunction(face) returns a number > 0
  removeFaces(func) {
    this.split(func, true);
    return this;
  }

  // modify vertices with func(vert)
  changeVertices(func) {
    for (let i = 0; i < this.vertexCount(); i++) {
      func(this.getVertex(i));
    }
    return this;
  }
  // modify faces with func(face)
  changeFaces(func) {
    for (let i = 0; i < this.faceCount(); i++) {
      func(this.getFace(i));
    }
    return this;
  }

  // COLOR
  // solid color for all vertices
  // only use this if you plan to later combine
  // multiple objects, otherwise just change material color
  setColor(color) {
    this.setFaceColor(() => color.clone());
    return this;
  }

  changeColor(colorFunction) {
    this.setVertexColor(colorFunction);
    return this;
  }
  setVertexColor(colorFunction) {
    let colors = [],
      vert = this.verts;
    for (let i = 0; i < vert.length; i++) {
      let v = this.getVertex(i);
      let c = colorFunction(v);
      colors[i] = c || v.color;
      v.color = c || v.color;
    }
    this.colors = colors;
    return this;
  }
  setFaceColor(colorFunction) {
    let colors = [],
      vert = this.verts;
    for (let i = 0; i < this.faceCount(); i++) {
      let face = this.getFace(i);
      let color = colorFunction(face);
      colors[face.a.index] = color || face.a.color;
      colors[face.b.index] = color || face.b.color;
      colors[face.c.index] = color || face.c.color;
    }
    this.colors = colors;
    return this;
  }
  // set vertex colors from uv coordinates and an image
  setColorFromImage(image) {
    if (this.uvs == undefined || image == undefined) return;

    let imageData = loadImageData(image);
    this.setVertexColor((v) => {
      return getPixel(imageData, v.uv.x, v.uv.y);
    });
    return this;
  }
  removeColors() {
    this.colors = undefined;
    return this;
  }

  // UVS
  setUV(uvFunction) {
    let uvs = [],
      vert = this.verts;
    for (let i = 0; i < vert.length; i++) {
      vert[i].index = i;
      let uv = uvFunction(vert[i]);
      uvs.push(uv);
      vert[i].uv = uv;
    }
    this.uvs = uvs;
    return this;
  }
  setFaceUV(uvFunction) {
    let uvs = [];
    for (let i = 0; i < this.verts.length; i += 3) {
      let face = this.getFace(i / 3);
      let uv = uvFunction(face);
      uvs[face.a.index] = uv || face.a.uv;
      uvs[face.b.index] = uv || face.b.uv;
      uvs[face.c.index] = uv || face.c.uv;
    }
    this.uvs = uvs;
    return this;
  }
  mapUVSpherical(useMid) {
    let s = new THREE.Spherical(); // phi between 0 and PI, theta between -PI and PI
    this.setFaceUV((face) => {
      // a
      s.setFromVector3(face.a);
      let x = (s.theta / (Math.PI * 2)) + 0.5;
      let y = s.phi / Math.PI;
      face.a.uv = new THREE.Vector3(x, y, s.radius);

      // b
      s.setFromVector3(face.b);
      x = (s.theta / (Math.PI * 2)) + 0.5;
      y = s.phi / Math.PI;
      // check if point b on same side of texture as a
      if (face.a.uv.x < 0.2 && x > 0.8) x -= 1;
      if (face.a.uv.x > 0.8 && x < 0.2) x += 1;
      face.b.uv = new THREE.Vector3(x, y, s.radius);

      // c
      s.setFromVector3(face.c);
      x = (s.theta / (Math.PI * 2)) + 0.5;
      y = s.phi / Math.PI;
      // check if point c on same side of texture as a
      if (face.a.uv.x < 0.2 && x > 0.8) x -= 1;
      if (face.a.uv.x > 0.8 && x < 0.2) x += 1;
      face.c.uv = new THREE.Vector3(x, y, s.radius);

      // midpoint
      if (useMid) {
        s.setFromVector3(face.mid);
        x = (s.theta / (Math.PI * 2)) + 0.5;
        y = s.phi / Math.PI;
        return new THREE.Vector3(x, y, s.radius);
      }
    });
    return this;
  }
  removeUVs() {
    this.uvs = undefined;
    return this;
  }

  // NORMALS
  calculateNormals(inverse) {
    // one normal per face
    this.normals = [];

    for (let i = 0; i < this.faceCount(); i++) {
      // normal is cross product of two "edge vectors" from a
      let face = this.getFace(i);
      let u = face.b.clone().sub(face.a);
      let v = face.c.clone().sub(face.a);

      // inverse changes direction of normal (inside or outside)
      let normal = inverse == true ? v.cross(u) : u.cross(v);
      normal.normalize();
      this.normals.push(normal);
    }
    return this;
  }
  removeNormals() {
    this.normals = undefined;
    return this;
  }

  // EXPORT
  createGeometry(computeNormals = true) {
    var bufferedVertices = new Float32Array(this.verts.length * 3);
    if (this.colors) var bufferedColor = new Float32Array(this.colors.length * 3);
    if (this.uvs) var bufferedUVs = new Float32Array(this.uvs.length * 2);
    if (this.normals) var bufferedNormals = new Float32Array(this.normals.length * 3);

    for (let i = 0; i < this.verts.length; i++) {
      bufferedVertices[i * 3] = this.verts[i].x;
      bufferedVertices[i * 3 + 1] = this.verts[i].y;
      bufferedVertices[i * 3 + 2] = this.verts[i].z;
    }
    for (let i = 0; this.colors && i < this.colors.length; i++) {
      bufferedColor[i * 3] = this.colors[i].r;
      bufferedColor[i * 3 + 1] = this.colors[i].g;
      bufferedColor[i * 3 + 2] = this.colors[i].b;
    }
    for (let i = 0; this.uvs && i < this.uvs.length; i++) {
      bufferedUVs[i * 2] = this.uvs[i].x;
      bufferedUVs[i * 2 + 1] = this.uvs[i].y;
    }
    for (let i = 0; this.normals && i < this.normals.length; i++) {
      bufferedNormals[i * 3] = this.normals[i].x;
      bufferedNormals[i * 3 + 1] = this.normals[i].y;
      bufferedNormals[i * 3 + 2] = this.normals[i].z;
    }

    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(bufferedVertices, 3));

    if (this.colors) geo.setAttribute('color', new THREE.BufferAttribute(bufferedColor, 3));
    if (this.uvs) geo.setAttribute('uv', new THREE.BufferAttribute(bufferedUVs, 2));
    if (this.normals) geo.setAttribute('normal', new THREE.BufferAttribute(bufferedNormals, 3));
    else if (computeNormals == true) geo.computeVertexNormals();

    return geo;
  }
  geo(computeNormals = true) {
    return this.createGeometry(computeNormals)
  }
  mesh(mat) {
    let geo = this.geo();
    mat = mat || new THREE.MeshStandardMaterial({
      vertexColors: (this.colors != undefined),
      metalness: 0.0,
      roughness: 1.0,
      flatShading: true
    })
    if (this.material) {
      for (let k of Object.keys(this.material)) {
        mat[k] = this.material[k];
      }
    }
    return new THREE.Mesh(geo, mat);
  }


  // IMPORT

  // flatten mesh and all children into one geometry
  // will add vertex colors, if either more than one geometry exists or if
  // one or more geometries already have vertex colors
  // if geometry doesnt have vertex colors, will add material color as vertex color
  // 
  // you can force no vertex colors by calling setFromMesh(mesh, false)
  setFromMesh(mesh, vertexColors) {
    this.verts = [];

    let colors = 0;
    mesh.traverse((a) => {
      if (a.geometry) colors += 1;
      if (a.material.vertexColors == true) vertexColors = vertexColors != undefined ? vertexColors : true;
    });
    if ((vertexColors == undefined && colors > 1) || vertexColors == true) {
      this.colors = [];
    } else {
      this.colors = undefined;
    }
    let num = 0;
    mesh.traverse((a) => {
      a.updateMatrixWorld();
      if (a.geometry) {
        let child = new Geo({
          geo: a.geometry
        });
        if (this.colors != undefined && child.colors == undefined) {
          child.setColor(a.material);
        }
        child.applyMatrix4(a.matrixWorld);
        child.setTag("childIndex", num++);
        this.merge(child);
      }
    })
    return this;
  }

  // will set vertices, colors and uv from buffergeometry
  // if an additional image is given and the geometry has uv coordinates, 
  // will use uv and image for the color instead
  setFromBufferGeometry(geo) {
    let pos = geo.getAttribute("position");
    let c = geo.getAttribute("color");
    let uv = geo.getAttribute("uv");

    let imageData;
    this.verts = [];
    if (c) this.colors = [];
    if (uv) this.uvs = [];
    let maxIndex = geo.index ? geo.index.array.length : geo.attributes.position.count;
    for (let i = 0; i < maxIndex; i++) {
      let index = geo.index ? geo.index.array[i] : i;
      let v = new THREE.Vector3(pos.array[index * pos.itemSize], pos.array[index * pos.itemSize + 1], pos.array[index * pos.itemSize + 2]);

      if (uv) {
        v.uv = {
          x: uv.array[index * uv.itemSize],
          y: uv.array[index * uv.itemSize + 1]
        };
        this.uvs.push(v.uv);
      }
      if (c) {
        v.color = new THREE.Color(c.array[index * c.itemSize], c.array[index * c.itemSize + 1], c.array[index * c.itemSize + 2]);
        this.colors.push(v.color);
      }
      this.verts.push(v);
    }
    return this;
  }
  setShape(shape, opts) {
    let shapeFunction = shapes[shape];
    if (shapeFunction != undefined) {
      shapeFunction(this, opts);
    }
    return this;
  }


  // ADD
  addMesh(mesh, process, vertexColors) {
    let geo = new Geo({
      mesh: mesh,
      vertexColors: vertexColors
    });
    if (process) process(geo);
    return this.merge(geo);
  }
  addBufferGeometry(geo, process) {
    let mygeo = new Geo({
      geo: geo
    });
    if (process) process(mygeo);
    return this.merge(mygeo);
  }
  addShape(shape, opts, process) {
    opts = opts || {};
    opts.shape = shape;
    let geo = new Geo(opts);
    if (process) process(geo);
    return this.merge(geo);
  }
}



/*

## class Mixer

Mixes colors together.


### Get color

mix.get(i);


### even spacing

For even spacing between -1 and 1

let mix = new Mixer({between: [0xaa00aa, 0xff00aa, 0xcccc00]});


### custom spacing

colors at 0, 0.5 and 0.6:

let mix = new Mixer({stops: [[0, 0xaa0055], [0.5, 0xffff00], [0.6, 0x00ff00]]})


### 2D (3D, 4D) mixing

Create 2D mixer by mixing to Mixers:

let mix = new Mixer({between: [{between: [0xaa0055, 0xffff00]}, {between: [0x00ff00, 0xffffff]}]})

let c = mix.get(x, y);

call mix.dimensions() for number of dimensions (up to 4 supported)

*/

const noColor = new THREE.Color(0xff00cc);

export class Mixer {
  constructor(opts) {
    opts = opts || {};
    this.stops = [];

    this.hsl = opts.hsl;
    this.isMixer = true;
    if (opts.between) this.addBetween(opts.between, opts.min, opts.max);
    if (opts.stops) this.addStops(opts.stops);

    this.defaultMod = opts.mod;
  }

  addStops(arr) {
    for (let s of arr) {
      this.addStop(s);
    }
  }

  // add stops in even spacing between min and max
  addBetween(arr, min, max) {
    min = min || -1;
    max = max || 1;
    let step = arr.length > 1 ? (max - min) / (arr.length - 1) : 0;
    for (let i = 0; i < arr.length; i++) {
      this.addStop([i * step + min, arr[i]]);
    }
  }

  addStop(s) {
    let pos, mixObject, mod;

    if (s instanceof Array) {
      pos = s[0];
      mixObject = s[1];
      if (s.length > 2) mod = s[2];
    } else {
      pos = (s.pos || s.p || s.stop || 0);
      mixObject = (s.obj || s.color || s.c || 0);
      mod = s.mod;
    }
    if (typeof mixObject == "number") {
      mixObject = new THREE.Color(mixObject);
    } else if (!(mixObject instanceof THREE.Color) && mixObject.isMixer != true) {
      mixObject = new Mixer(mixObject);
    }

    let i = 0;
    while (i < this.stops.length && pos > this.stops[i].pos) i++;

    this.stops.splice(i, 0, {
      pos: pos,
      obj: mixObject,
      mod: mod
    });
  }

  colorAt(i, y, z, w) {
    if (i < 0 || i >= this.stops.length) return;

    let c = this.stops[i].obj;
    if (c.isMixer) {
      c = c.get(y, z, w);
    } else {
      c = c.clone();
    }
    return c;
  }

  dimensions() {
    let maxD = 0;
    for (let s of this.stops) {
      if (s.obj.isMixer) {
        maxD = Math.max(s.obj.dimensions(), maxD);
      }
    }
    return maxD + 1;
  }

  mix(i, j, amt, y, z, w) {
    if (i < 0 || i >= this.stops.length || j < 0 || j >= this.stops.length) return undefined;

    amt = Math.min(Math.max(0, amt), 1)

    let c = this.colorAt(i, y, z, w);

    if (i == j) return c;

    if (this.stops[i].mod) {
      amt = this.stops[i].mod(amt);
    }
    if (this.defaultMod) {
      amt = this.defaultMod(amt);
    }

    if (this.hsl) c.lerpHSL(this.colorAt(j, y, z, w), amt);
    else c.lerp(this.colorAt(j, y, z, w), amt);

    return c;
  }

  get(x, y, z, w) {
    x = x || 0;

    if (this.stops.length < 1) return noColor;

    if (x <= this.stops[0].pos || this.stops.length == 1) return this.mix(0, 0, 0, y, z, w)

    for (let i = 0; i < this.stops.length - 1; i++) {
      let s1 = this.stops[i].pos,
        s2 = this.stops[i + 1].pos;
      if (s1 <= x && x <= s2) {
        let amt = (x - s1) / (s2 - s1);
        return this.mix(i, i + 1, amt, y, z, w);
      }
    }
    return this.mix(this.stops.length - 1, this.stops.length - 1, 0, y, z, w)
  }

  getColor(x, y, z, w) {
    return this.get(x, y, z, w);
  }

  static between(arr, min, max) {
    return new Mixer({
      between: arr,
      min: min,
      max: max
    });
  }
  static stops(arr) {
    return new Mixer({
      stops: arr
    });
  }
}
