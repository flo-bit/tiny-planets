import { type BiomeOptions } from "./biome";
import { type PlanetOptions } from "./planet";

const beachBiome: BiomeOptions = {
  noise: {
    min: -0.05,
    max: 0.05,
    octaves: 4,
    lacunarity: 2.0,
    gain: {
      min: 0.1,
      max: 0.8,
      scale: 2,
    },
    warp: 0.3,
    scale: 1,
    power: 1.5,
  },

  colors: [
    [-0.5, 0x994400],
    [-0.0, 0xccaa00],
    [0.4, 0xcc7700],
    [1.0, 0x002222],
  ],

  seaColors: [
    [-1, 0x000066],
    [-0.55, 0x0000aa],
    [-0.1, 0x00f2e5],
  ],
  seaNoise: {
    min: -0.008,
    max: 0.008,
    scale: 6,
  },

  vegetation: {
    items: [
      {
        name: "Rock",
        density: 50,
        minimumHeight: 0.1,
        colors: {
          Gray: { array: [0x775544] },
        },
      },
      {
        name: "PalmTree",
        density: 50,
        minimumHeight: 0.1,
        colors: {
          Brown: { array: [0x8b4513, 0x5b3105] },
          Green: { array: [0x22851e, 0x22a51e] },
          DarkGreen: { array: [0x006400] },
        },
        ground: {
          color: 0x229900,
          radius: 0.1,
          raise: 0.01,
        },
      },
    ],
  },
};

const forestBiome: BiomeOptions = {
  noise: {
    min: -0.05,
    max: 0.05,
    octaves: 4,
    lacunarity: 2.0,
    gain: {
      min: 0.1,
      max: 0.8,
      scale: 2,
    },
    warp: 0.3,
    scale: 1,
    power: 0.8,
  },

  tintColor: 0x113322,

  colors: [
    [-0.5, 0x332200],
    [-0.0, 0x115512],
    [0.4, 0x224411],
    [1.0, 0x006622],
  ],

  seaColors: [
    [-1, 0x000066],
    [-0.52, 0x0000aa],
    [-0.1, 0x0042a5],
  ],
  seaNoise: {
    min: -0.005,
    max: 0.005,
    scale: 5,
  },

  vegetation: {
    items: [
      {
        name: "Rock",
        density: 5,
        minimumHeight: 0.1,
        colors: {
          Gray: { array: [0x888888, 0x616161, 0x414141] },
        },
      },
      {
        name: "CommonTree",
        density: 5,
        minimumHeight: 0.0,
      },
      {
        name: "Bush",
        density: 5,
        minimumHeight: 0.0,
      },
      {
        name: "CommonTree_Dead",
        density: 5,
      },
      {
        name: "PineTree",
        density: 5,
      },
      {
        name: "TreeStump",
        density: 1,
      },
      {
        name: "TreeStump_Moss",
        density: 1,
      },
      {
        name: "Willow",
        density: 5,
      },
      {
        name: "Willow_Dead",
        density: 5,
      },
      {
        name: "WoodLog",
        density: 1,
      },
      {
        name: "BirchTree",
        density: 5,
      },
      {
        name: "BirchTree_Dead",
        density: 5,
      },
    ],
  },
};

const snowForestBiome: BiomeOptions = {
  noise: {
    min: -0.05,
    max: 0.05,
    octaves: 4,
    lacunarity: 2.0,
    gain: {
      min: 0.1,
      max: 0.8,
      scale: 2,
    },
    warp: 0.3,
    scale: 1,
    power: 0.8,
  },

  tintColor: 0x119922,

  colors: [
    [-0.5, 0xff99ff],
    [-0.0, 0xffffff],
    [0.4, 0xeeffff],
    [1.0, 0xffffff],
  ],

  seaColors: [
    [-1, 0x8899cc],
    [-0.52, 0xaaccff],
    [-0.1, 0xaaccff],
  ],
  seaNoise: {
    min: -0.0,
    max: 0.001,
    scale: 5,
  },

  vegetation: {
    items: [
      {
        name: "Rock_Snow",
        density: 5,
        minimumHeight: 0.1,
        colors: {
          Gray: { array: [0x888888, 0x616161, 0x414141] },
        },
      },
      {
        name: "CommonTree_Snow",
        density: 5,
        minimumHeight: 0.0,
      },
      {
        name: "Bush_Snow",
        density: 5,
        minimumHeight: 0.0,
      },
      {
        name: "CommonTree_Dead_Snow",
        density: 5,
      },
      {
        name: "PineTree_Snow",
        density: 5,
      },
      {
        name: "TreeStump_Snow",
        density: 1,
      },
      {
        name: "TreeStump_Snow",
        density: 1,
      },
      {
        name: "Willow_Snow",
        density: 5,
      },
      {
        name: "Willow_Dead_Snow",
        density: 5,
      },
      {
        name: "WoodLog_Snow",
        density: 1,
      },
      {
        name: "BirchTree_Snow",
        density: 5,
      },
      {
        name: "BirchTree_Dead_Snow",
        density: 5,
      },
    ],
  },
};

export const biomePresets: Record<string, BiomeOptions> = {
  beach: beachBiome,
  forest: forestBiome,
  snowForest: snowForestBiome,
};

const beachPlanet: PlanetOptions = {
  biome: {
    preset: "beach",
  },

  material: "caustics",
};

const forestPlanet: PlanetOptions = {
  biome: {
    preset: "forest",
  },

  material: "normal",
};

const snowForestPlanet: PlanetOptions = {
  biome: {
    preset: "snowForest",
  },
};

export const planetPresets: Record<string, PlanetOptions> = {
  beach: beachPlanet,
  forest: forestPlanet,
  snowForest: snowForestPlanet,
};
