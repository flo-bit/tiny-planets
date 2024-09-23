import { UberNoise, type NoiseOptions } from "uber-noise";
import { Color, Vector3 } from "three";

import {
  ColorGradient,
  type ColorGradientOptions,
} from "./helper/colorgradient";
import { biomePresets } from "./presets";
import { Octree } from "./helper/octree";

export type VegetationItem = {
  name: string;
  density: number;

  minimumHeight?: number;
  maximumHeight?: number;

  minimumSlope?: number;
  maximumSlope?: number;

  minimumDistance?: number;
  maximumDistance?: number;
  colors?: Record<string, { array?: number[] }>;
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
    defaults?: {
      density?: number;
    };
    items: VegetationItem[];
  };
};

export class Biome {
  noise: UberNoise | undefined;
  colors: ColorGradient | undefined;

  seaNoise: UberNoise | undefined;
  seaColors: ColorGradient | undefined;

  options: BiomeOptions;

  vegetationPositions: Octree = new Octree();

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

  itemsAround(position: Vector3, radius: number): Vector3[] {
    return this.vegetationPositions.query(position, radius);
  }
}
