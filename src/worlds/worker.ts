import { IcosahedronGeometry, Vector3, BufferAttribute } from "three";

import { Biome, type BiomeOptions } from "./biome";
import { type PlanetOptions } from "./planet";
import UberNoise from "uber-noise";

onmessage = function (e) {
  const { type, data, requestId } = e.data;

  if (type === "createGeometry") {
    const [geometry, oceanGeometry, vegetation] = createGeometry(data);

    const positions = geometry.getAttribute("position").array.buffer;
    const colors = geometry.getAttribute("color").array.buffer;
    const normals = geometry.getAttribute("normal").array.buffer;

    const oceanPositions = oceanGeometry.getAttribute("position").array.buffer;
    const oceanColors = oceanGeometry.getAttribute("color").array.buffer;
    const oceanNormals = oceanGeometry.getAttribute("normal").array.buffer;

    postMessage(
      {
        type: "geometry",
        data: {
          positions,
          colors,
          normals,
          oceanPositions,
          oceanColors,
          oceanNormals,
          vegetation,
        },
        requestId,
      },
      // @ts-expect-error - hmm
      [positions, colors, normals, oceanPositions, oceanColors, oceanNormals],
    );
  } else {
    console.error("Unknown message type", type);
  }
};

function createGeometry({
  biomeOptions,
  planetOptions,
}: {
  biomeOptions: BiomeOptions;
  planetOptions: PlanetOptions;
}): [IcosahedronGeometry, IcosahedronGeometry, Record<string, Vector3[]>] {
  const sphere = new IcosahedronGeometry(1, planetOptions.detail ?? 50);
  const oceanSphere = new IcosahedronGeometry(1, planetOptions.detail ?? 50);

  const biome = new Biome(biomeOptions);

  const vertices = sphere.getAttribute("position");
  const oceanVertices = oceanSphere.getAttribute("position");
  const faceCount = vertices.count / 3;
  const faceSize = (Math.PI * 4) / faceCount;
  console.log("faces:", faceCount);

  const calculatedVertices = new Map<
    string,
    {
      height: number;
      seaHeight: number;
      scatter: Vector3;
    }
  >();

  const colors = new Float32Array(vertices.count * 3);
  const oceanColors = new Float32Array(oceanVertices.count * 3);

  const normals = sphere.getAttribute("normal");
  const oceanNormals = oceanSphere.getAttribute("normal");

  const a = new Vector3(),
    b = new Vector3(),
    c = new Vector3();

  const mid = new Vector3();

  const placedVegetation: Record<string, Vector3[]> = {};
  a.fromBufferAttribute(vertices, 0);
  b.fromBufferAttribute(vertices, 1);

  // default to scatter = distance of first edge
  const scatterAmount = planetOptions.scatter ?? b.distanceTo(a);
  const scatterScale = 100;

  const scatterNoise = new UberNoise({
    min: -scatterAmount / 2,
    max: scatterAmount / 2,
    scale: scatterScale,
    seed: 0,
  });

  for (let i = 0; i < vertices.count; i += 3) {
    a.fromBufferAttribute(vertices, i);
    b.fromBufferAttribute(vertices, i + 1);
    c.fromBufferAttribute(vertices, i + 2);

    mid.set(0, 0, 0);
    mid.addVectors(a, b).add(c).divideScalar(3);

    let normalizedHeight = 0;

    for (let j = 0; j < 3; j++) {
      let v = a;
      if (j === 1) v = b;
      if (j === 2) v = c;
      const key = `${v.x.toFixed(5)},${v.y.toFixed(5)},${v.z.toFixed(5)}`;

      let move = calculatedVertices.get(key);

      if (!move) {
        const height = biome.getHeight(v) + 1;
        const scatterX = scatterNoise.get(v);
        const scatterY = scatterNoise.get(
          v.y + scatterScale * 100,
          v.z - scatterScale * 100,
          v.x + scatterScale * 100,
        );
        const scatterZ = scatterNoise.get(
          v.z - scatterScale * 200,
          v.x + scatterScale * 200,
          v.y - scatterScale * 200,
        );
        const seaHeight = biome.getSeaHeight(v) + 1;

        move = {
          height,
          scatter: new Vector3(scatterX, scatterY, scatterZ),
          seaHeight,
        };
        calculatedVertices.set(key, move);
      }

      normalizedHeight += move.height - 1;
      v.add(move.scatter).normalize().multiplyScalar(move.height);

      vertices.setXYZ(i + j, v.x, v.y, v.z);

      const oceanV = v.clone().normalize().multiplyScalar(move.seaHeight);
      oceanVertices.setXYZ(i + j, oceanV.x, oceanV.y, oceanV.z);
    }

    normalizedHeight /= 3;
    normalizedHeight = (normalizedHeight - biome.min) / (biome.max - biome.min);
    normalizedHeight = normalizedHeight * 2 - 1;
    // now averageHeight is between -1 and 1 (0 is sea level)

    for (
      let j = 0;
      biome.options.vegetation && j < biome.options.vegetation.items.length;
      j++
    ) {
      const vegetation = biome.options.vegetation.items[j];
      if (Math.random() < faceSize * vegetation.density) {
        if (
          vegetation.minimumHeight !== undefined &&
          normalizedHeight < vegetation.minimumHeight
        ) {
          continue;
        }

        if (vegetation.minimumHeight === undefined && normalizedHeight < 0) {
          continue;
        }

        if (
          vegetation.maximumHeight !== undefined &&
          normalizedHeight > vegetation.maximumHeight
        ) {
          continue;
        }
        if (!placedVegetation[vegetation.name]) {
          placedVegetation[vegetation.name] = [];
        }
        placedVegetation[vegetation.name].push(a.clone());
        break;
      }
    }

    // calculate new normal
    const normal = new Vector3();
    normal.crossVectors(b.clone().sub(a), c.clone().sub(a)).normalize();

    // flat shading, so all normals for the face are the same
    normals.setXYZ(i, normal.x, normal.y, normal.z);
    normals.setXYZ(i + 1, normal.x, normal.y, normal.z);
    normals.setXYZ(i + 2, normal.x, normal.y, normal.z);

    // calculate steepness (acos of dot product of normal and up vector)
    // (up vector = old mid point on sphere)
    const steepness = Math.acos(Math.abs(normal.dot(mid)));
    // steepness is between 0 and PI/2

    const color = biome.getColor(mid, normalizedHeight, steepness);

    // flat shading, so all colors for the face are the same
    if (color) {
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      colors[i * 3 + 3] = color.r;
      colors[i * 3 + 4] = color.g;
      colors[i * 3 + 5] = color.b;

      colors[i * 3 + 6] = color.r;
      colors[i * 3 + 7] = color.g;
      colors[i * 3 + 8] = color.b;
    }

    // calculate ocean vertices
    const oceanColor = biome.getSeaColor(mid, normalizedHeight);

    if (oceanColor) {
      oceanColors[i * 3] = oceanColor.r;
      oceanColors[i * 3 + 1] = oceanColor.g;
      oceanColors[i * 3 + 2] = oceanColor.b;

      oceanColors[i * 3 + 3] = oceanColor.r;
      oceanColors[i * 3 + 4] = oceanColor.g;
      oceanColors[i * 3 + 5] = oceanColor.b;

      oceanColors[i * 3 + 6] = oceanColor.r;
      oceanColors[i * 3 + 7] = oceanColor.g;
      oceanColors[i * 3 + 8] = oceanColor.b;
    }

    oceanNormals.setXYZ(i, mid.x, mid.y, mid.z);
    oceanNormals.setXYZ(i + 1, mid.x, mid.y, mid.z);
    oceanNormals.setXYZ(i + 2, mid.x, mid.y, mid.z);
  }

  sphere.setAttribute("color", new BufferAttribute(colors, 3));
  oceanSphere.setAttribute("color", new BufferAttribute(oceanColors, 3));

  return [sphere, oceanSphere, placedVegetation];
}
