import * as THREE from 'https://cdn.skypack.dev/pin/three@v0.134.0-dfARp6tVCbGvQehLfkdx/mode=imports,min/optimized/three.js';

import * as PG from 'https://1florki.github.io/pg/pg.js'



function combineDicts(array) {
  let combined = {};
  for(let a of array) {
    if(a != undefined) {
      for(let k of Object.keys(a)) {
        combined[k] = a[k];
      }
    }
  }
  return combined;
}

function combinePresetAndGroup(name, group) {
  let x = group[name];
  if(x) x.name = name;
  return combineDicts([group.options, x]);
}

// uses world matrix to flatten mesh and children 
// into an object with all meshes with geometry as children of one object3D
function getGeometryChildren(mesh) {
  let meshes = new THREE.Object3D();
  mesh.traverse((a) => {
    a.updateWorldMatrix();
    if(a.geometry) {
      // convert to lpgeometry and back to remove vertex colors, uvs and children
      let mesh = new PG.Geo({geo: a.geometry, removeColors: true, removeUVs: true}).mesh();
      
      mesh.geometry.applyMatrix4(a.matrixWorld);
      // reuse old material
      mesh.material = a.material;
      mesh.material.vertexColors = false;
      meshes.add(mesh);
    }
  })
  return meshes;
}


function imageData(image) {
  var canvas = document.createElement( 'canvas' );
  canvas.width = image.width;
  canvas.height = image.height;

  var context = canvas.getContext( '2d' );
  context.drawImage( image, 0, 0 );

  return context.getImageData( 0, 0, image.width, image.height );

}
function getPixel(imageData, x, y ) {
  x = Math.min(Math.floor(imageData.width * x), imageData.width - 1);
  y = Math.min(Math.floor(imageData.height * y), imageData.height - 1);
  var position = ( x + imageData.width * y ) * 4, data = imageData.data;
  return { r: data[ position ], g: data[ position + 1 ], b: data[ position + 2 ], a: data[ position + 3 ] };
}

function getGeometryChildren2(mesh, item) {
  let meshes = new THREE.Object3D();
  mesh.traverse((a) => {
    a.updateWorldMatrix();
    let colors = ["Green", "Wood", "Black"]
    if(a.geometry) {
      // convert to lpgeometry and back to
      // remove vertex colors, uvs and children
      let data = imageData(a.material.map.image)
      //let foundColors = [];
      let lps = new PG.Geo({geo: a.geometry}).split((face) => {
        let color = getPixel(data, face.a.uv.x, face.a.uv.y);
        /*
        let found = false;
        for(let f of foundColors) {
          if(f.r == color.r && f.g == color.g && f.b == color.b && f.a == color.a) {
            found = true;
            break;
          }
        }
        if(!found) foundColors.push(color);*/
        return color.g > color.r && color.g > color.b ? 0 : (color.g <= color.b || (item.index == 3 && color.g > color.b) || item.index == 6 ? 1 : 2)
      })
      
      //console.log(foundColors);
      //console.log(lps);
      for(let i = 0; i < lps.length; i++) {
        let lp = lps[i];
        lp.removeColors();
        lp.removeUVs();
        let mesh = lp.mesh();
        mesh.geometry.applyMatrix4(a.matrixWorld);
        
        mesh.material.name = colors[i];
        mesh.material.vertexColors = false;
        meshes.add(mesh);
      }
    }
  })
  return meshes;
}

function assignColorPreset1(mesh, color, opts) {
  //console.log(mesh.material.name);
  if(mesh.material.name.includes("Green") && color.length > 0) return color[0];
  if((mesh.material.name.includes("Wood") || mesh.material.name.includes("White") || mesh.material.name.includes("Yellow") || mesh.material.name.includes("Pink") || mesh.material.name.includes("Berry")) && color.length > 1) return color[1];
  if((mesh.material.name.includes("Black") || mesh.material.name.includes("Coconuts") || mesh.material.name.includes("Orange") || mesh.material.name.includes("Cyan")) && color.length > 2) return color[2];
  if(mesh.material.name.includes("Snow") && color.length > 3) return color[3];
  
  return color.length > 0 ? color[0] : undefined;
}

function assignFirstColor(mesh, color, opts) {
  return color != undefined && color.length > 0 ? color[0] : undefined;
}
function roughAndBrightMat(a) {
  return new THREE.MeshStandardMaterial({name: a.name, metalness: 0, roughness: 1})
  /*
  a.metalness = 0.0;
  a.roughness = 1.0;
  let mult = 1.5;
  a.color.r = Math.min(a.color.r * mult, 1);
  a.color.g = Math.min(a.color.g * mult, 1);
  a.color.b = Math.min(a.color.b * mult, 1);
  return a;*/
}

const underwaterGroup = {
  options: {
    split: getGeometryChildren,
    assignColor: assignColorPreset1,
    materialModifier: roughAndBrightMat,
    isModel: true,
    pathFunction: (opts) => {
      return "underwater/" + opts.preset + (opts.index || 1) + ".glb"
    },
  },
  coral: { num: 7 },
}

const presetGroup1 = {
  options: {
    split: getGeometryChildren,
    assignColor: assignColorPreset1,
    materialModifier: roughAndBrightMat,
    isModel: true,
    pathFunction: (opts) => {
      return "vegetation/" + opts.preset + (opts.index || 1) + ".glb"
    },
  },
  birch: { num: 5},
  birch_dead: { num: 5 },
  birch_dead_snow: { num: 5 },
  birch_snow: { num: 5 },
  bush: { num: 2 },
  bush_snow: { num: 2 },
  bush_berries: { num: 2 },
  cactus: { num: 5 },
  cactus_flower: { num: 5 },
  commontree: { num: 5 },
  commontree_dead: { num: 5 },
  commontree_dead_snow: { num: 5 },
  commontree_snow: { num: 5 },
  corn: { num: 2 },
  flowers: { num: 1 },
  grass: { num: 3 },
  weed: { num: 5 },
  hedge: { num: 4 },
  lilypad: { num: 1 },
  palm: { num: 4 },
  palm_bush: { num: 1 },
  pine: { num: 5 },
  pine_snow: { num: 5 },
  plant: { num: 9 },
  rock: { num: 7 },
  rock_moss: { num: 7 },
  rock_snow: { num: 7 },
  rocks: { num: 4 },
  rocks_cluster: { num: 4 },
  treestump: { num: 1 },
  treestump_moss: { num: 1 },
  treestump_snow: { num: 1 },
  wheat: { num: 1 },
  woodlog: { num: 1 },
  woodlog_moss: { num: 1 },
  woodlog_snow: { num: 1 },
  willow: { num: 5 },
  willow_dead: { num: 5 },
  willow_dead_snow: { num: 5 },
  willow_snow: { num: 5 },
}

const presetGroup2 = {
  options: {
    split: getGeometryChildren2,
    assignColor: assignColorPreset1,
    //materialModifier: roughAndBrightMat,
    isModel: true,
    pathFunction: (opts) => {
      return "veg2/" + opts.preset + (opts.index || 1) + ".gltf"
    },
  },
  flower: { num: 6},
  flowers: { num: 5},
  mushrooom: { num: 2},
  weed: { num: 3},
}

const groups = {
  underwater: underwaterGroup,
  preset2: presetGroup2
}


class ItemColor {
  constructor(opts) {
    opts = opts || {};
    
    if(opts.noiseSettings) this.noise = new PG.Noise(opts.noiseSettings);
    else this.noise = opts.noise;
    
    if(opts.gradientSettings) this.gradient = new PG.Mixer(opts.gradientSettings);
    else this.gradient = opts.gradient;
    
    this.biome = opts.biome;
    this.color = opts.color != undefined ? opts.color : new THREE.Color(0xffffff);
    this.tint = opts.tint;
    this.maxTint = opts.maxTint || 0;
    
    this.choose = opts.array;
  }
  random(pos, min, max) {
    min = min || 0;
    max = max || 1;
    if(this.noise != undefined) {
      this.noise.min = min;
      this.noise.max = max;
      return this.noise.get(pos.x, pos.y, pos.z);
    } else if(this.biome) {
      return this.biome.random(min, max);
    }
    return 0;
  }
  getColor(pos) {
    let color;
    if(this.gradient) {
      color = this.gradient.get(this.random(pos));
    } else if(this.choose) {
      let i = Math.floor(this.random(pos, 0, this.choose.length));
      color = this.choose[i].clone();
    } else {
      color = this.color.clone();
    }
    if(this.tint) {
      // change position so that tint amount is 
      // different from choosen color before
      pos = pos.clone();
      pos.multiplyScalar(10);
      pos.addScalar(100);
      color.lerp(this.tint, this.random(pos, 0, this.maxTint));
    }
    return color;
  }
}

export class Vegetation {
  static groupWithName(name) {
    return groups[name];
  }
  constructor(opts) {
    opts = opts || {};
    this.defaultOptions = opts.options || {};
    this.maxGroundRadius = 0;
    this.biome = opts.biome;
    this.items = [];
    for(let i of opts.items) {
      if(i.preset == "all") {
        let group = Vegetation.groupWithName(i.group) || presetGroup1;
        for(let k of Object.keys(group)) {
          if(k != "options") {
            i.preset = k;
            this.addItem(i);
          }
        }
      } else this.addItem(i);
    }
  }
  addItem(opts) {
    opts.biome = this.biome;
    let items = VegItem.createMultiple(opts, this.defaultOptions);
    for(let i of items) {
      this.items.push(i);
      if(i.opts.ground) this.maxGroundRadius = Math.max(i.ground.radius || 0, this.maxGroundRadius)
    }
  }
  
  getPaths(paths) {
    // returns an array of paths to all models
    // will use given array if available and will not add path more than once
    paths = paths || [];
    for(let i of this.items) {
      if(i.isModel && i.path != undefined) {
        if(!paths.includes(i.path)) paths.push(i.path);
      }
    }
    return paths;
  }
  
  loadedModels(meshes) {
    // expects dictionary with path => mesh as key => value pairs
    for(let i of this.items) {
      if(i.isModel && i.path != undefined) {
        let mesh = meshes[i.path];
        if(mesh) {
          i.setMesh(mesh);
        }
      }
    }
  }
  
  generatePositions(biome, count) {
    for(let i of this.items) {
      i.generatePositions(biome, count);
    }
  }
  
  placeItems(parent, scale, planet) {
    for(let i of this.items) {
      i.placeItem(parent, scale, planet);
    }
  }
}

class VegItem {
  
  static createMultiple(opts, defaultOpts) {
    // creates an array of one or more vegitems (depending on opts.num)
    // and splits opts.count over all those items
    // e.g. if we want 3 items with total 10 count, we get (4, 3, 3)
    let arr = [];
    let presetOpts = combinePresetAndGroup(opts.preset, Vegetation.groupWithName(opts.group || defaultOpts.group) || presetGroup1);
    let combined = combineDicts([presetOpts, defaultOpts, opts]);
    combined.num = combined.num || 1;
    combined.start = combined.start || 0
    for(let i = combined.start; i < combined.num; i++) {
      opts.index = i + 1;
      opts.count = Math.floor(combined.count / (combined.num - combined.start)) + (i < ((combined.count - combined.start) % combined.num) ? 1 : 0);
      arr.push(new VegItem(opts, defaultOpts));
      if(i > combined.start) {
        arr[i - combined.start].itemColors = arr[0].itemColors;
        arr[i - combined.start].opts.noise = arr[0].opts.noise;
      }
    }
    return arr;
  }
  
  constructor(opts, defaultOpts) {
    opts = opts || {};
    this.presetGroup = Vegetation.groupWithName(opts.group || defaultOpts.group) || presetGroup1
    this.presetOptions = combinePresetAndGroup(opts.preset, this.presetGroup)
    
    this.opts = combineDicts([this.presetOptions, defaultOpts, opts]);
    
    this.biome = this.opts.biome;
    this.index = this.opts.index || 1;
    this.name = this.opts.name;
    this.mesh = undefined;
    this.positions = [];
    this.colors = [];
    
    this.split = this.opts.split || this.groupOptions.split;
    this.assignColorFunction  = this.opts.assignColor || this.groupOptions.assignColor;
    
    this.itemColors = [];
    let letters = "abcdefghijklmnopqrstuvwxyz";
    for(let i = 0; i < (this.opts.maxColors || 4); i++) {
      let colorOpts = combineDicts([defaultOpts.color, opts.color,
                                    defaultOpts.color != undefined ? defaultOpts.color[letters[i]] : undefined, 
                                    opts.color != undefined ? opts.color[letters[i]] : undefined]);
      this.itemColors.push(new ItemColor(colorOpts));
      if(i > 0 && this.itemColors[i].noise) this.itemColors[i].noise = this.itemColors[0].noise
    }
  
    
    if(this.opts.noiseSettings) this.opts.noise = new Noise(opts.noiseSettings);
    else if(this.opts.noise) this.opts.noise.setSeed(this.biome.randomSeed());
    
    this.colorFunction = this.opts.colorFunction;
    this.materialModifier = this.opts.materialModifier;
    this.ground = combineDicts([defaultOpts.groundPreset, opts.groundPreset, defaultOpts.ground, opts.ground]) || {};
    
    this.isModel = this.opts.isModel != undefined ? this.opts.isModel : false;
    
    this.path = (this.opts.pathFunction != undefined) ? this.opts.pathFunction(this.opts) : undefined;
    
    if(this.opts.mesh) this.setMesh(this.opts.mesh);
    if(this.opts.meshFunction) this.setMesh(this.opts.meshFunction(this));
    
    this.instanced = this.opts.instanced != undefined ? this.opts.instanced : false;
    this.instances = [];
    
    this.moveY = this.opts.moveY || 0;
    this.scale = this.opts.scale || 1;
    
    this.count = opts.count || 1;
  }
  
  setMesh(mesh) {
    if(this.split) this.mesh = this.split(mesh, this);
    else this.mesh = mesh;
    
    if(this.materialModifier) {
      this.mesh.traverse((a) => {
        if(a.material) {
          a.material = this.materialModifier(a.material);
        }
      })
    }
  }
  
  placeItem(parent, scale, planet) {
    scale = scale || 1;
    if(this.positions.length < 1) return;
    let dummy = new THREE.Object3D();
    
    dummy.aboveGround = this.moveY;
    dummy.scale.set(this.scale * scale, this.scale * scale, this.scale * scale);
    planet.add(dummy);
    
    // place item at all positions using instance meshes 
    // (should be a lot faster as all instances are just 1 draw call together)
    // we assume that each child of our mesh has a geometry and material
    // adjust split function if necessary to make sure of that
    if(this.instanced && this.positions.length > 1) {
      // change colors of children
      for(let child of this.mesh.children) {
        child.material.oldColor = child.material.color;
        
        // if more than one color set default material color to white
        // final color will be set per instance later
        if(this.colors.length > 1) child.material.color = new THREE.Color("white");
        else if(this.colors.length == 1) {
          // otherwise change to first color (or old color)
          child.material.color = this.assignColorFunction != undefined ? this.assignColorFunction(child, this.colors[0], this) : child.material.color;
        }
        
        // create one instancemesh per child
        let instMesh = new THREE.InstancedMesh(child.geometry, child.material, this.positions.length);
        this.instances.push(instMesh);
        parent.add(instMesh);
      }
      // go through all positions
      for(let i = 0; i < this.positions.length; i++) {
        // update matrix of all instances
        dummy.yaw = this.biome.random(0, Math.PI * 4);
        planet.updatePosition(dummy, this.positions[i]);
        dummy.updateMatrix();
        for(let j = 0; j < this.instances.length; j++) {
          let inst = this.instances[j];
          inst.setMatrixAt(i, dummy.matrix);
          
          if(this.colors.length > 1 && this.colors.length > i && this.assignColorFunction != undefined) {
            let color = this.assignColorFunction(this.mesh.children[j], this.colors[i], this.opts);
            //console.log(color);
            if(color) inst.setColorAt(i, color);
          }
        }
      }
      // tell instances they need to update their matrixes
      for(let inst of this.instances) {
        inst.instanceMatrix.needsUpdate = true;
      }
    } else {
      // non instanced version should work with any mesh and children 
      // (e.g. geometries can be children of children)
      // only colors of first order children with materials 
      // will be changed though
      
      // set mesh children to first color (if it exists) as default
      for(let child of this.mesh.children) {
        if(child.material) {
          child.material.oldColor = child.material.color;
          child.material.color = this.assignColorFunction != undefined && this.colors.length > 0 ? this.assignColorFunction(child, this.colors[0], this) : child.material.color;
        }
      }
      
      // clone mesh, set color, add to planet
      for(let i = 0; i < this.positions.length; i++) {
        let s = this.mesh.clone();
        s.scale.set(this.opts.scale, this.opts.scale, this.opts.scale);
        if(this.colors.length > i && this.assignColorFunction) {
          for(let child of s.children) {
            let color = this.assignColorFunction(child, this.colors[i], this);
            if(child.material && color) child.material.color = color;
          }
        }
        s.aboveGround = this.moveY;
        s.yaw = this.biome.random(0, Math.PI * 4);
        planet.add(s, this.positions[i]);
      }
    }
  }
  
  generatePositions(biome, countMult) {
    let fails = 0;
    let count = this.count * (countMult || 1);
    for (let i = 0; i < count; i++) {
      if(Math.random() > count - i) continue;
      this.opts.oct = biome.getOctree();
      let point = biome.randomPos(this.opts);
      if(point) {
        let pos = point.point;
        pos.normal = point.changedFace.normal;
        // add position
        this.positions.push(pos);
        biome.addToOctree(pos, this);
        
        // add color (if different colors add one per position, otherwise only add 1)
        if(this.opts.differentColors || this.colors.length < 1) { 
          let color = [];
          for(let itemColor of this.itemColors) {
            itemColor.biome = biome;
            color.push(itemColor.getColor(pos));
          }
          this.colors.push(color);
        }
      }
      else if(fails < 100) {
        i--;
        fails++;
      }
      //if(this.colorFunction) this.colors.push()
    }
  console.log(this.colors);
  }
  
}


/*

let all = {};
    
    let defaultOptions = this.vegetation.options || {};
    let items = this.vegetation.items;
    
    
    this.maxRaiseRadius = 0;
    
    for (let type of items) {
      if (type.options == undefined) {
        if(type.option == undefined) type.option = ""
        type.options = [type];
      }
      for (let opt of type.options) {
        let models = generateVegetationArray(type.type, opt.option);

        let group = type.group || vegGroups;
        
        let opts = combineDicts([group.options, type.type.overwriteOptions, defaultOptions, type, opt]);
        opts.count *= this.countMult || 1;
        opts.num = models.length;
        
        if(opts.noiseSettings) opts.noise = new Noise(opts.noiseSettings);
        if(opts.noise) opts.noise.setSeed(this.randomSeed());
          
        opts.ground = combineDicts([defaultOptions.groundPreset, type.groundPreset, opt.groundPreset, defaultOptions.ground, type.ground, opt.ground]);
        if(opts.ground.noiseSettings) opts.ground.noise = new Noise(opts.ground.noiseSettings);
        if(opts.ground.noise) opts.ground.noise.setSeed(this.randomSeed());
          
        opts.color = combineDicts([defaultOptions.colorPreset, type.colorPreset, opt.colorPreset, defaultOptions.color, type.color, opt.color]);
        if(opts.color.noiseSettings) opts.color.noise = new Noise(opts.color.noiseSettings);
        if(opts.color.noise) opts.color.noise.setSeed(this.randomSeed());
          
        opts.biome = this
        this.maxRaiseRadius = Math.max(opts.ground.radius, this.maxRaiseRadius);
        console.log(opts.count);
        let i = 0;
        for (let m of models) {
          let optsCopy = combineDicts([opts]);
          optsCopy.count = Math.floor(opts.count / models.length) + (i - 1 < (opts.count % models.length) ? 1 : 0);
          optsCopy.index = i;
          all[m] = [optsCopy];
          i++;
        }
      }
    }
    return all;

  // returns all vegetation item in a dict
  // where key : value = filepath : [options]
  getItems() {
    if(this.items != undefined) return this.items;
    if(this.vegetation == undefined) return;
    
    let all = {};
    
    let defaultOptions = this.vegetation.options || {};
    let items = this.vegetation.items;
    
    
    this.maxRaiseRadius = 0;
    
    for (let type of items) {
      if (type.options == undefined) {
        if(type.option == undefined) type.option = ""
        type.options = [type];
      }
      for (let opt of type.options) {
        let models = generateVegetationArray(type.type, opt.option);

        let group = type.group || vegGroups;
        
        let opts = combineDicts([group.options, type.type.overwriteOptions, defaultOptions, type, opt]);
        opts.count *= this.countMult || 1;
        opts.num = models.length;
        
        if(opts.noiseSettings) opts.noise = new Noise(opts.noiseSettings);
        if(opts.noise) opts.noise.setSeed(this.randomSeed());
          
        opts.ground = combineDicts([defaultOptions.groundPreset, type.groundPreset, opt.groundPreset, defaultOptions.ground, type.ground, opt.ground]);
        if(opts.ground.noiseSettings) opts.ground.noise = new Noise(opts.ground.noiseSettings);
        if(opts.ground.noise) opts.ground.noise.setSeed(this.randomSeed());
          
        opts.color = combineDicts([defaultOptions.colorPreset, type.colorPreset, opt.colorPreset, defaultOptions.color, type.color, opt.color]);
        if(opts.color.noiseSettings) opts.color.noise = new Noise(opts.color.noiseSettings);
        if(opts.color.noise) opts.color.noise.setSeed(this.randomSeed());
          
        opts.biome = this
        this.maxRaiseRadius = Math.max(opts.ground.radius, this.maxRaiseRadius);
        console.log(opts.count);
        let i = 0;
        for (let m of models) {
          let optsCopy = combineDicts([opts]);
          optsCopy.count = Math.floor(opts.count / models.length) + (i - 1 < (opts.count % models.length) ? 1 : 0);
          optsCopy.index = i;
          all[m] = [optsCopy];
          i++;
        }
      }
    }
    return all;
  }
  
*/
