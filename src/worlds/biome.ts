import { UberNoise, type NoiseOptions } from "uber-noise";
import { Color, type ColorRepresentation, Vector3 } from "three";

import {
  ColorGradient,
  type ColorGradientOptions,
} from "./helper/colorgradient";
import { biomePresets } from "./presets";
import { Octree } from "./helper/octree";

export type VegetationItem = {
  name: string;
  density?: number;

  minimumHeight?: number;
  maximumHeight?: number;

  minimumSlope?: number;
  maximumSlope?: number;

  minimumDistance?: number;
  maximumDistance?: number;
  colors?: Record<string, { array?: number[] }>;

  ground?: {
    raise?: number;
    color?: ColorRepresentation;
    radius?: number;

    noise?: NoiseOptions;
  };
};

export type BiomeOptions = {
  name?: string;

  preset?: string;

  noise?: NoiseOptions;
  colors?: ColorGradientOptions;

  seaNoise?: NoiseOptions;
  seaColors?: ColorGradientOptions;

  tintColor?: number;

  vegetation?: {
    defaults?: Omit<Partial<VegetationItem>, "name">;

    items: VegetationItem[];
  };
};

export class Biome {
  noise: UberNoise | undefined;
  colors: ColorGradient | undefined;

  seaNoise: UberNoise | undefined;
  seaColors: ColorGradient | undefined;

  options: BiomeOptions;

  vegetationPositions: Octree<VegetationItem> = new Octree();

  constructor(opts: BiomeOptions = {}) {
    if (opts.preset) {
      const preset = biomePresets[opts.preset];

      if (preset) {
        opts = {
          ...preset,
          ...opts,
        };
      }
    }

    this.options = opts;

    if (opts.noise) this.noise = new UberNoise(opts.noise);

    if (opts.colors) {
      this.colors = new ColorGradient(opts.colors);
    }

    if (opts.seaNoise) this.seaNoise = new UberNoise(opts.seaNoise);

    if (opts.seaColors) {
      this.seaColors = new ColorGradient(opts.seaColors);
    }
  }

  get min(): number {
    return this.noise?.min ?? -1;
  }

  get max(): number {
    return this.noise?.max ?? 1;
  }

  getHeight(pos: Vector3): number {
    if (this.noise) return this.noise.get(pos);

    return 0;
  }

  getColor(
    pos: Vector3,
    height: number | undefined = undefined,
    steepness: number = 0,
  ): Color | undefined {
    if (this.noise && height === undefined) {
      height = this.noise.normalized(pos);
    }

    if (this.colors) {
      const color = this.colors.get(height);
      if (this.options.tintColor) {
        return color.lerp(
          new Color(this.options.tintColor),
          steepness / Math.PI,
        );
      }
      return color;
    }

    return undefined;
  }

  getSeaHeight(pos: Vector3): number {
    if (this.seaNoise) return this.seaNoise.get(pos);

    return 0;
  }

  getSeaColor(pos: Vector3, ground: number | undefined): Color | undefined {
    ground ??= this.noise?.normalized(pos) ?? 0;

    if (this.seaColors) {
      return this.seaColors.get(ground);
    }

    return undefined;
  }

  addVegetation(
    item: VegetationItem,
    position: Vector3,
    normalizedHeight: number,
    steepness: number,
  ) {
    this.vegetationPositions.insert(position, item);
  }

  closestVegetationDistance(
    position: Vector3,
    radius: number,
  ): number | undefined {
    const items = this.vegetationPositions.queryBoxXYZ(
      position.x,
      position.y,
      position.z,
      radius,
    );
    if (items.length === 0) return undefined;

    let closest = Infinity;
    for (const item of items) {
      const distance = position.distanceTo(item);
      if (distance < closest) closest = distance;
    }

    return closest < radius ? closest : undefined;
  }

  itemsAround(
    position: Vector3,
    radius: number,
  ): (Vector3 & { data?: VegetationItem })[] {
    return this.vegetationPositions.queryBoxXYZ(
      position.x,
      position.y,
      position.z,
      radius,
    );
  }

  maxVegetationRadius(): number {
    let max = 0;
    for (const item of this.options.vegetation?.items ?? []) {
      if (item.ground?.radius) {
        max = Math.max(max, item.ground.radius);
      }
    }

    return max;
  }

  vegetationHeightAndColorForFace(
    a: Vector3,
    b: Vector3,
    c: Vector3,
    color: Color,
    sideLength: number,
  ): {
    heightA: number;
    heightB: number;
    heightC: number;
    color: Color;
  } {
    const maxDist = this.maxVegetationRadius();
    // use a to find all vegetation items, we add sideLength so that we also find vegetation from b and c
    // that otherwise would be missed, because they are too far away from a
    const vegetations = this.itemsAround(a, maxDist + sideLength * 2);

    // go through a, b and c and add heights for all vegetation items that are close enough (distance is closer than item.ground.radius)
    let heightA = 0;
    let heightB = 0;
    let heightC = 0;

    let all = [a, b, c];
    for (let j = 0; j < 3; j++) {
      let p = all[j];

      for (const vegetation of vegetations) {
        if (!vegetation.data?.ground?.radius) continue;

        let distance = p.distanceTo(vegetation);

        if (distance < vegetation.data.ground?.radius) {
          let amount = Math.max(
            0,
            1 - distance / vegetation.data.ground.radius,
          );

          amount = Math.pow(amount, 0.5);

          let height = vegetation.data.ground?.raise ?? 0;
          height *= amount;

          if (j === 0) heightA += height;
          if (j === 1) heightB += height;
          if (j === 2) heightC += height;

          if (!vegetation.data.ground.color) continue;

          let newColor = new Color(vegetation.data.ground.color);

          // only lerp a third of the way, because we have three vertices
          // so if all vertices are close enough, we lerp 3 times
          color.lerp(newColor, amount / 3);
        }
      }
    }

    return {
      heightA,
      heightB,
      heightC,
      color,
    };
  }
}
