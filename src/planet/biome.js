import * as THREE from 'https://cdn.skypack.dev/pin/three@v0.134.0-dfARp6tVCbGvQehLfkdx/mode=imports,min/optimized/three.js';

import * as PG from 'https://1florki.github.io/pg/pg.js'

import {
  Vegetation
} from './vegetation.js'


const BlueBiome = {
  type: "noise",
  noiseSettings: {
    octaves: 3,
    min: 0,
    max: 0.3,
    scl: 1.8,
    pow: 1.5,
    per: 0.40,
    warp: 0.1,
  },
  gradientSettings: {
    stops: [[-0.2, {stops: [[-.4, 0x002266],[0.4, 0x0044aa], [0.6, 0xccaa22],]}], [1.5, {stops: [[0, 0x330000]]}]],
  },
  
  vegetation: {
    options: {
      minHeight: -1,
      count: 30,
      scale: 0.03,
      moveY: -0.003,
      minDist: 0.05,
      ground: {
        enabled: true,
        noise: new PG.Noise({min: -0.05, max: 0.05, scl: 10, oct: 2}),
        raise: 0.01,
        radius: 0.05,
        power: 2,
        color: new THREE.Color(0x773333),
        maxColor: 0.6,
      },
      color: {
        colors: [ {color: new THREE.Color(0x0099aa), tint: new THREE.Color(0xffffff)}, {color: new THREE.Color(0x99aaff)}, {color: new THREE.Color(0x002255)}],
        noiseSettings: {scl: 10, pow: 3},
      },
    },
    items: [{preset: "birch"}, ]
  }
}

let presets = {
  blue: BlueBiome,
};

export class Biome {
  static makeBiome(biome) {
    biome = biome || {}
    if(biome.preset != undefined) {
      let oldSettings = biome;
      biome = Biome.getPreset(biome.preset)
      for(let k of Object.keys(oldSettings)) {
        biome[k] = oldSettings[k];
      }
    }
    if(biome.type == "noise" || (biome.type == undefined && biome.children == undefined)) {
      return new Biome(biome);
    }
    if(biome.type == "noisemixed" || biome.type == "mixed") {
      return new NoiseMixedBiome(biome);
    }
    if(biome.type == "image") {
      return new ImageBiome(biome);
    }
    if(biome.type == "poi" || biome.type == "dist" || biome.type == "pos") {
      return new DistanceMixedBiome(biome);
    }
    return new Biome(biome);
  }
  
  
  static getPreset(preset) {
    return presets[preset];
  }
  
  constructor(opts) {
    opts = opts || {};
    
    if(opts.preset != undefined) {
      let oldSettings = opts;
      opts = Biome.getPreset(opts.preset)
      for(let k of Object.keys(oldSettings)) {
        opts[k] = oldSettings[k];
      }
    }
    
    this.size = opts.size || 1;
    this.height = opts.height || 1;
    this.parent = opts.parent;
    this.opts = opts;
    
    this.plane = opts.plane;
    this.falloff = opts.falloff;
    
    if(opts.vegetation) opts.vegetation.biome = this;
    this.vegetation = opts.vegetation != undefined ? new Vegetation(opts.vegetation) : undefined;
    this.seaLevel = opts.seaLevel || 0;
    
    this.seed = opts.seed || this.randomSeed();
    this.RNG = new Srand(this.seed);
    
    this.count = opts.count || 1;
    
    this.shape = opts.shape;
    
    // noise and color stuff
    if(opts.noiseSettings && opts.noiseSettings.seed == undefined) {
      opts.noiseSettings.seed = this.randomSeed();
    }
    this.noise = opts.noise || new PG.Noise(opts.noiseSettings);
    
    this.gradient = opts.gradient || new PG.Mixer(opts.gradientSettings);
    
    this.seaLevel = this.seaLevel || this.noise.min;
    this.modNoise = opts.modNoise;
    this.modHeight = opts.modHeight;
    
    if(opts.oceanGradient || opts.oceanGradientSettings) this.oceanGradient = opts.oceanGradient || new PG.Mixer(opts.oceanGradientSettings);
    if(opts.oceanNoise || opts.oceanNoiseSettings) this.oceanNoise = opts.oceanNoise || new PG.Noise(opts.oceanNoiseSettings);
    if(opts.colorNoise || opts.colorNoiseSettings) this.colorNoise = opts.colorNoise || new PG.Noise(opts.colorNoiseSettings);
    if(this.oceanNoise != undefined) this.oceanNoise.setSeed(this.randomSeed());
    if(this.colorNoise != undefined) this.colorNoise.setSeed(this.randomSeed());
    if(opts.tintGradient || opts.tintGradientSettings) this.tintGradient = opts.tintGradient || new PG.Mixer(opts.tintGradientSettings);
    
    this.tintColor = opts.tintColor;
    
    console.log("biome seed: " + this.seed);
  }
  root() {
    if(this.parent == undefined) return this;
    return this.parent.root();
  }
  
  random(min, max) {
    return this.randomNumber(min, max);
  }
  randomNumber(min, max) {
    min = min || 0;
    max = max || 1;
    return this.RNG.inRange(min, max)
  }
  randomPos(opts) {
    opts = opts || {};
    
    let maxTries = opts.maxTries || 100;
    for (let i = 0; i < maxTries; i++) {
      let pos = this.shape.getRandomPoint(this.RNG);
      if(this.checkPoint(pos, opts)) return pos;
    }
    return undefined;
  }
  randomSeed() {
    if(this.RNG == undefined) return Math.floor(Math.random() * 1000000);
    return Math.floor(this.randomNumber(0, 1000000));
  }
  
  setSeed(seed){
    this.seed = seed;
    this.RNG.seed(seed);
  }
  
  
  getNormNoise(pos) {
    return this.noise.getNorm(pos);
  }
  getNoise(pos) {
    return this.noise.get(pos.x, pos.y, pos.z);
  }
  
  getHeight(pos) {
    
    let veg = 0;
    let n = this.getNoise(pos);
    let points = this.itemsAround(pos, this.vegetation != undefined ? this.vegetation.maxGroundRadius : 0)
    if(points && points.length > 0) {
      for(let v of points) {
        let g = v.data.ground;
        if(g.enabled) {
          let d = v.distanceTo(pos);
          let n = g.noise != undefined ? g.noise.get(pos.x, pos.y, pos.z) : 0;
          if(d - n < g.radius) {
            veg += (g.raise || 0) * Math.pow((1 - ((d - n) / g.radius)), g.power || 1);
          }
        }
      }
    }
    if(this.falloff != undefined && this.children == undefined) {
      n += this.getGround(pos);
    }
    if(this.modHeight != undefined) {
      n = this.modHeight(n, pos, this);
    }
    return n + veg;
  }
  
  getColor(face, changedFace) {
    let pos = face.mid;
    
    let angle = this.gradient.dimensions() > 1 ? face.normal.angleTo(changedFace.normal) : undefined;
    
    let n = this.getNormNoise(pos) + ((this.colorNoise != undefined && this.tintColor == undefined) ? this.colorNoise.get(pos.x, pos.y, pos.z) : 0);
    let c = this.gradient.get(n);
    
    if(angle != undefined) {
      c = this.gradient.get(angle, n);
    }
    
    let points = this.itemsAround(pos, this.vegetation != undefined ? this.vegetation.maxGroundRadius : 0)
    if(points) {
      for(let v of points) {
        let g = v.data.ground;
        if(g.enabled) {
          let d = pos.distanceTo(v);
          let n = g.noise != undefined ? g.noise.get(pos.x, pos.y, pos.z) : 0;
          if(d - n < g.radius) {
            c.lerp(g.color, Math.min(1 - ((d - n) / g.radius), 1) * (g.maxColor || 1))
          }
        }
      }
    }
    
    if(this.tintColor != undefined) {
      c.lerp(this.tintColor, this.colorNoise.get(pos.x, pos.y, pos.z));
    }
    return c
  }
  
  hasOcean() {
    return this.seaLevel != undefined && this.oceanGradient != undefined;
  }
  
  getOceanColor(pos) {
    this.processPosition(pos);
    let min = this.root().getLowest();
    let ground = this.root().getGround(pos) + min;
    let seaHeight = this.getOceanHeight(pos) - min;
    let h = this.root().getHeight(pos) - ground;
    let norm = Math.pow(h / seaHeight, 2);
    if(this.oceanGradient != undefined) return this.oceanGradient.get(norm); 
  }
  getOceanHeight(pos) {
    this.processPosition(pos);
    return this.seaLevel * (this.oceanNoise != undefined ? this.oceanNoise.get(pos.x, pos.y, pos.z) : 1) + this.getGround(pos);
  }

  getGround(pos) {
    if(pos && this.falloff != undefined) {
      let myPos = pos.clone();
      myPos.y = this.falloff;
      myPos.setLength(this.falloff);
      return (myPos.y - this.falloff);
    }
    return 0;
  }
  getLowest() {
    return this.noise.min;
  }
  
  getOctree() {
    if(this.parent != undefined) return this.parent.getOctree();
    if(this.octree == undefined) this.octree = new PG.Octree({size: this.size * 1.01});
    return this.octree;
  }
  itemsAround(pos, radius) {
    let oct = this.getOctree();
    return oct != undefined ? oct.query(pos, radius) : [];
  }
  addToOctree(pos, item) {
    this.getOctree().insert(pos, item);
  }
  
  checkPoint(res, opts) {
    opts = opts || {};
    let pos = res.point;
    if(pos == undefined) return false;
    
    opts.height = this.root().getHeight(pos) - this.root().getGround(pos);
    
    if (opts.minHeight != undefined && opts.minHeight > opts.height) return false;
    if (opts.maxHeight != undefined && opts.maxHeight < opts.height) return false;
    if (opts.function != undefined && opts.function(pos, opts) == false) return false;
    if (opts.noise != undefined) {
      if (opts.minNoise != undefined && opts.minNoise > opts.noise.get(pos.x, pos.y, pos.z)) return false;
      if (opts.maxNoise != undefined && opts.maxNoise < opts.noise.get(pos.x, pos.y, pos.z)) return false;
    }
    if (opts.minDist != undefined && opts.oct != undefined && opts.oct.query(pos, opts.minDist).length > 0) {
      return false;
    } else if(opts.minDist != undefined && opts.points != undefined) {
      for(let p of opts.points) {
        if(p.distanceTo(pos) < opts.minDist) return false;
      }
    }
    if(!this.checkBiome(pos, this)) return false;
    
    return true;
  }
  checkBiome(pos, biome) {
    if(this.parent != undefined && !this.parent.checkBiome(pos, this)) return false;
    return true;
  }
  
  availableBiomeColor() {
    if(this.parent) return this.root().availableBiomeColor();
    this.usedColors = (this.usedColors + 1) || 1;
    return biomeColors[this.usedColors - 1];
  }
  getBiomeColor(pos) {
    if(!this.color) this.color = this.availableBiomeColor();
    return this.color;
  }
  
  // vegetation methods
  
  // generate positions of vegetation with generatePositions(mult)
  // load all models from getPaths()
  // set meshes with loadedModels(models)
  // place items as children of mesh with placeItems(parent, planet)
  
  getPaths(arr) {
    if(this.vegetation) return this.vegetation.getPaths(arr);
  }
  loadedModels(models) {
    if(this.vegetation) this.vegetation.loadedModels(models);
  }
  generatePositions(countMult) {
    countMult = countMult || 1
    if(this.vegetation) {
      this.vegetation.generatePositions(this, countMult * this.count);
      this.hasPositions = true;
    }
  }
  
  placeItems(parent, scale, planet) {
    if(this.vegetation) this.vegetation.placeItems(parent, scale, planet);
  }
}

/*
class DistanceMixedBiome extends Biome {
  constructor(opts) {
    opts = opts || {};
    super(opts);
    
    this.children = [];
    
    let childPositions = [];
    for(let child of opts.children) {
      child.biome.parent = this;
      child.biome.plane = this.plane;
      child.biome.size = this.size;
      child.biome.seed = this.randomSeed();
      child.biome.shape = this.shape;
      
      let biome = Biome.makeBiome(child.biome);
      
      child.minRadius = child.minRadius || 0.2;
      child.maxRadius = child.maxRadius || 0.4;
      
      if(child.noiseSettings) {
        child.noiseSettings.seed = this.randomSeed();
        child.noise = new Noise(child.noiseSettings);
      }
      
      child.options = child.options || {};
      child.options.points = childPositions;
      if(biome.noise) child.options.noise = biome.noise;
      
      for(let i = 0; i < (child.count || 1); i++) {
        let pos = child.positions != undefined && child.positions.length > i ? child.positions[i] : this.randomPos(child.options);
        console.log(pos);
        if(pos) {
          if(this.plane) pos.y = 0;
          this.children.push({pos: pos, opts: child, biome: biome, noise: child.noise, raise: child.raise});
          childPositions.push(pos);
        }
      }
    }
  }
  
  getHeight(pos) {
    let h = super.getHeight(pos);
    for(let child of this.children) {
      let d = pos.distanceTo(child.pos) + (child.noise ? child.noise.get(pos.x, pos.y, pos.z) : 0);
      if(d < child.opts.maxRadius) {
        let amt = THREE.MathUtils.clamp(1 - ((d - child.opts.minRadius) / (child.opts.maxRadius - child.opts.minRadius)), 0, 1);
        if(child.opts.type == "replace") {
          h = h * (1 - amt) + child.biome.getHeight(pos) * amt + (child.raise != undefined ? child.raise(d) : 0);
        } else if(child.opts.type == "max") {
          h = Math.max(h, h * (1 - amt) + child.biome.getHeight(pos) * amt + (child.raise != undefined ? child.raise(d) : 0));
        } else {
          h += child.biome.getHeight(pos) * amt + (child.raise != undefined ? child.raise(d) : 0);
        }
        
      }
    }
    if(this.falloff) {
      h += this.getGround(pos);
    }
    return h;
  }
  getColor(pos) {
    let color = super.getColor(pos);
    for(let child of this.children) {
      let d = pos.distanceTo(child.pos) + (child.noise ? child.noise.get(pos.x, pos.y, pos.z) : 0);
      if(d < child.opts.maxRadius) {
        let amt = THREE.MathUtils.clamp(1 - ((d - child.opts.minRadius) / (child.opts.maxRadius - child.opts.minRadius)), 0, 1);
        let biomeColor = child.biome.getColor(pos);
        color.lerp(biomeColor, amt);
      }
    }
    return color;
  }
  
  getLowest() {
    let ground = super.getLowest();
    for(let p of this.children) {
      ground = Math.min(ground, p.biome.getGround());
    }
    return ground;
  }
  
  checkBiome(pos, biome) {
    if(this.parent != undefined && !this.parent.checkBiome(pos, this)) return false;
    if(biome == this) return true;
    
    for(let child of this.children) {
      let d = pos.distanceTo(child.pos) + (child.noise ? child.noise.get(pos.x, pos.y, pos.z) : 0);
      if(d < child.opts.maxRadius && child.biome == biome) return true;
    }
    return false;
  }
  
  getBiomeColor(pos) {
    let color = super.getBiomeColor(pos);
    
    for(let child of this.children) {
      let d = pos.distanceTo(child.pos) + (child.noise ? child.noise.get(pos.x, pos.y, pos.z) : 0);
      if(d < child.opts.maxRadius) {
        let amt = THREE.MathUtils.clamp(1 - ((d - child.opts.minRadius) / (child.opts.maxRadius - child.opts.minRadius)), 0, 1);
        let biomeColor = child.biome.getBiomeColor(pos);
        color.lerp(biomeColor, amt);
      }
    }
    return color;
  }
  
  getPaths(arr) {
    arr = arr || [];
    super.getPaths(arr);
    for(let child of this.children) {
      if(!child.biome.gotPaths) child.biome.getPaths(arr);
      child.biome.gotPaths = true;
    }
    return arr;
  }
  loadedModels(models) {
    super.loadedModels(models);
    for(let child of this.children) {
      if(!child.biome.processedModels) child.biome.loadedModels(models);
      child.biome.processedModels = true;
    }
  }
  generatePositions(countMult) {
    countMult = countMult || 1
    super.generatePositions(countMult);
    for(let child of this.children) {
      if(!child.biome.hasPositions) child.biome.generatePositions(this.count * child.count * countMult);
    }
  }
  placeItems(parent, scale, planet) {
    super.placeItems(parent, scale, planet);
    for(let child of this.children) {
      if(!child.biome.placedItems) child.biome.placeItems(parent, scale, planet);
      child.biome.placedItems = true;
    }
  }
}

class NoiseMixedBiome extends Biome {
  constructor(opts) {
    opts = opts || {};
    super(opts);
    
    this.children = [];
    for(let child of opts.children) {
      child.seed = this.randomSeed();
      child.plane = this.plane;
      child.size = this.size;
      child.parent = this;
      child.shape = this.shape;
      
      let b = Biome.makeBiome(child);
      this.children.push(b);
    }
    this.noise.min = 0;
    this.noise.max = this.children.length;
    
    this.border = opts.border || 0.2;
  }
  getBiome(pos) {
    return Math.floor(this.noise.get(pos.x, pos.y, pos.z));
  }
  
  getHeight(pos) {
    this.processPosition(pos);
    let bio = this.getNoise(pos);
    let down = Math.floor(bio);
    if(down >= this.children.length) {
      return this.children.length > 0 ? this.children[0].getHeight(pos) : this.seaLevel;
    }
    let dist = bio - Math.round(bio);
    let n = this.children[down].getHeight(pos);
    
    if(Math.abs(dist) < this.border) {
      let amt = ((this.border - Math.abs(dist)) / this.border) * 0.5;
      if(dist > 0 && down > 0) {
        n = this.children[down].getHeight(pos) * (1.0 - amt) + this.children[down - 1].getHeight(pos) * amt;
      } else if(dist < 0 && down < this.children.length - 1) {
        n = this.children[down].getHeight(pos) * (1.0 - amt) + this.children[down + 1].getHeight(pos) * amt;
      }
    }
    if(this.falloff != undefined) {
      n += this.getGround(pos);
    }
    
    return n;
  }
  getColor(pos) {
    this.processPosition(pos);
    let bio = this.getNoise(pos);
    let down = Math.floor(bio);
    let dist = bio - Math.round(bio);
    
    if(Math.abs(dist) < this.border) {
      let amt = ((this.border - Math.abs(dist)) / this.border) * 0.5;
      if(dist > 0 && down > 0) {
        return this.children[down].getColor(pos).lerp(this.children[down - 1].getColor(pos), amt);
      }
      if(dist < 0 && down < this.children.length - 1) {
        return this.children[down].getColor(pos).lerp(this.children[down + 1].getColor(pos), amt);
      }
    }
    return this.children[down].getColor(pos);
  }
  getOceanColor(pos) {
    this.processPosition(pos);
    let bio = this.getNoise(pos);
    let down = Math.floor(bio);
    let dist = bio - Math.round(bio);
    
    if(Math.abs(dist) < this.border) {
      let amt = (this.border - Math.abs(dist)) / this.border / 2;
      if(dist > 0 && down > 0) {
        return this.children[down].getOceanColor(pos).lerp(this.children[down - 1].getOceanColor(pos), amt);
      }
      if(dist < 0 && down < this.children.length - 1) {
        return this.children[down].getOceanColor(pos).lerp(this.children[down + 1].getOceanColor(pos), amt);
      }
    }
    return this.children[down].getOceanColor(pos);
  }
  getOceanHeight(pos) {
    this.processPosition(pos);
    let bio = this.getNoise(pos);
    let down = Math.floor(bio);
    let dist = bio - Math.round(bio);
    let h = this.children[down].getOceanHeight(pos);
    
    if(Math.abs(dist) < this.border) {
      let amt = (this.border - Math.abs(dist)) / this.border / 2;
      
      if(dist > 0 && down > 0) {
        h = this.children[down].getOceanHeight(pos) * (1.0 - amt) + this.children[down - 1].getOceanHeight(pos) * amt;
      }
      if(dist < 0 && down < this.children.length - 1) {
        h = this.children[down].getOceanHeight(pos) * (1.0 - amt) + this.children[down + 1].getOceanHeight(pos) * amt;
      }
    }
    
    if(this.falloff) {
      h += this.getGround(pos);
    }
    return h
  }
  
  getBiomeColor(pos) {
    let bio = this.getNoise(pos);
    let down = Math.floor(bio);
    let dist = bio - Math.round(bio);
    
    if(Math.abs(dist) < this.border) {
      let amt = ((this.border - Math.abs(dist)) / this.border) * 0.5;
      if(dist > 0 && down > 0) {
        return this.children[down].getBiomeColor(pos).lerp(this.children[down - 1].getBiomeColor(pos), amt);
      }
      if(dist < 0 && down < this.children.length - 1) {
        return this.children[down].getBiomeColor(pos).lerp(this.children[down + 1].getBiomeColor(pos), amt);
      }
    }
    return this.children[down].getBiomeColor(pos);
  }
  
  getLowest() {
    let ground = this.children[0].getLowest();
    for(let b of this.children) {
      ground = Math.min(ground, b.getLowest());
    }
    return ground;
  }
  
  checkBiome(pos, biome) {
    if(this.parent != undefined && !this.parent.checkBiome(pos, this)) return false;
    return this.children[this.getBiome(pos)] == biome;
  }
  
  getPaths(arr) {
    arr = arr || [];
    for(let b of this.children) {
      b.getPaths(arr);
    }
    return arr;
  }
  loadedModels(models) {
    for(let b of this.children) {
      b.loadedModels(models);
    }
  }
  generatePositions(countMult) {
    for(let b of this.children) {
      b.generatePositions(countMult * this.count);
    }
  }
  placeItems(parent, scale, planet) {
    for(let b of this.children) {
      b.placeItems(parent, scale, planet);
    }
  }
}


export class ImageBiome extends Biome {
  constructor(opts) {
    opts = opts || {};
    super(opts);
    
    // instantiate a loader
    this.heightmap = this.imageData(opts.heightmap); 
    this.colormap = this.imageData(opts.colormap); 
    
    this.oceanFloor = 0.7
    this.seaLevel = 0.709
    this.gradient = new Gradient({between: [Gradient.color(0x000044), Gradient.color(0x3355ff)]});
  }
  
  getSperical(x, y, z) {
    let s = new THREE.Spherical().setFromCartesianCoords(x, y, z);
    s.makeSafe();
    let yi = s.phi / Math.PI;
    let xi = (s.theta / (Math.PI * 2) + 0.5);
    return {x: xi, y: yi};
  }
  getOceanHeight(x, y, z) {
    return this.seaLevel
  }
  getOceanColor(x, y, z) {
    let h = this.getHeight(x, y, z);
    let d = (h - this.seaLevel) / (this.seaLevel - this.oceanFloor);
    return this.gradient.get(1 + d)
  }
  getHeight(x, y, z) {
    let p = this.getSperical(x, y, z);
    let px = this.getPixel(this.heightmap, p.x, p.y);
    
    return (px.g / 256) * 0.02 + 0.7
  }
  getColor(x, y, z) {
    let p = this.getSperical(x, y, z);
    let px = this.getPixel(this.colormap, p.x, p.y);
    px.r /= 256;
    px.g /= 256;
    px.b /= 256;
    px.a /= 256;
    return px//(px.g / 256) * 0.2 + 1
  }
  imageData(image) {
    var canvas = document.createElement( 'canvas' );
    canvas.width = image.width;
    canvas.height = image.height;

    var context = canvas.getContext( '2d' );
    context.drawImage( image, 0, 0 );

    return context.getImageData( 0, 0, image.width, image.height );

  }
  getPixel(imageData, x, y ) {
    x = Math.min(Math.floor(imageData.width * x), imageData.width - 1);
    y = Math.min(Math.floor(imageData.height * y), imageData.height - 1);
    var position = ( x + imageData.width * y ) * 4, data = imageData.data;
    return { r: data[ position ], g: data[ position + 1 ], b: data[ position + 2 ], a: data[ position + 3 ] };
  }
}
*/


/*

  getItems() {
    if(this.items) return this.items;
    let all = {};
    let i = 0;
    for(let b of this.biomes) {
      let items = b.getItems();
      for(let k of Object.keys(items)) {
        if(all[k] != undefined) all[k].push(items[k][0])
        else all[k] = items[k];
      }
      i++;
    }
    this.items = all;
    return all;
  }
  

  getItems() {
    if(this.items) return this.items;
    let all = {};
    let i = 0;
    for(let poi of this.pois) {
      let items = poi.biome.getItems();
      if(items == undefined) continue;
      for(let k of Object.keys(items)) {
        if(all[k] != undefined) all[k].push(items[k][0])
        else all[k] = items[k];
      }
      i++;
    }
    
    let items = this.groundBiome.getItems();
    if(items == undefined) return all;
    for(let k of Object.keys(items)) {
      if(all[k] != undefined) all[k].push(items[k][0])
      else all[k] = items[k];
    }
    this.items = all;
    return all;
  }
*/