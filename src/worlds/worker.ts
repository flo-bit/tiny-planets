import {
  IcosahedronGeometry,
  Vector3,
  BufferAttribute,
  Float32BufferAttribute,
  Color,
} from "three";

import { Biome, type VegetationItem } from "./biome";
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
    const oceanMorphPositions =
      oceanGeometry.morphAttributes.position[0].array.buffer;
    const oceanMorphNormals =
      oceanGeometry.morphAttributes.normal[0].array.buffer;

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
          oceanMorphPositions,
          oceanMorphNormals,
        },
        requestId,
      },
      // @ts-expect-error - hmm
      [
        positions,
        colors,
        normals,
        oceanPositions,
        oceanColors,
        oceanNormals,
        oceanMorphPositions,
        oceanMorphNormals,
      ],
    );
  } else {
    console.error("Unknown message type", type);
  }
};

function createGeometry(
  planetOptions: PlanetOptions,
): [IcosahedronGeometry, IcosahedronGeometry, Record<string, Vector3[]>] {
  const sphere = new IcosahedronGeometry(1, planetOptions.detail ?? 50);
  const oceanSphere = new IcosahedronGeometry(1, planetOptions.detail ?? 50);

  const biome = new Biome(planetOptions.biome);

  const vertices = sphere.getAttribute("position");
  const oceanVertices = oceanSphere.getAttribute("position");
  const faceCount = vertices.count / 3;
  const faceSize = (Math.PI * 4) / faceCount;
  console.log("faces:", faceCount);

  const calculatedVertices = new Map<
    string,
    {
      height: number;
      scatter: Vector3;

      seaHeight: number;
      seaMorph: number;
    }
  >();

  const calculatedVerticesArray: {
    height: number;
    scatter: Vector3;

    seaHeight: number;
    seaMorph: number;
  }[] = new Array(faceCount);

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

  // scatterAmount is based on side length of face (all faces are the same size)
  const scatterAmount = (planetOptions.scatter ?? 1) * b.distanceTo(a);
  const scatterScale = 100;

  const scatterNoise = new UberNoise({
    min: -scatterAmount / 2,
    max: scatterAmount / 2,
    scale: scatterScale,
    seed: 0,
  });

  oceanSphere.morphAttributes.position = [];
  oceanSphere.morphAttributes.normal = [];

  const oceanMorphPositions: number[] = [];
  const oceanMorphNormals: number[] = [];

  const oceanA = new Vector3(),
    oceanB = new Vector3(),
    oceanC = new Vector3(),
    oceanD = new Vector3(),
    oceanE = new Vector3(),
    oceanF = new Vector3();

  const temp = new Vector3();

  // go through all faces
  // - calculate height and scatter for vertices
  // - calculate height for ocean vertices
  // - calculate height for ocean morph vertices
  // - calculate color for vertices and ocean vertices
  // - calculate normal for vertices and ocean vertices
  // - add vegetation
  for (let i = 0; i < vertices.count; i += 3) {
    a.fromBufferAttribute(vertices, i);
    b.fromBufferAttribute(vertices, i + 1);
    c.fromBufferAttribute(vertices, i + 2);

    oceanA.fromBufferAttribute(oceanVertices, i);
    oceanB.fromBufferAttribute(oceanVertices, i + 1);
    oceanC.fromBufferAttribute(oceanVertices, i + 2);

    mid.set(0, 0, 0);
    mid.addVectors(a, b).add(c).divideScalar(3);

    let normalizedHeight = 0;

    // go through all vertices of the face
    for (let j = 0; j < 3; j++) {
      let v = a;
      if (j === 1) v = b;
      if (j === 2) v = c;

      // lets see if we already have info for this vertex
      const key = `${v.x.toFixed(5)},${v.y.toFixed(5)},${v.z.toFixed(5)}`;
      let move = calculatedVertices.get(key);

      // if not, calculate it
      if (!move) {
        // calculate height and scatter
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
        // calculate sea height and sea morph height
        const seaHeight = biome.getSeaHeight(v) + 1;
        const secondSeaHeight = biome.getSeaHeight(v.addScalar(100)) + 1;

        v.subScalar(100);

        move = {
          height,
          scatter: new Vector3(scatterX, scatterY, scatterZ),
          seaHeight,
          seaMorph: secondSeaHeight,
        };
        calculatedVertices.set(key, move);
      }

      // we store this info for later use (vegetation placement)
      calculatedVerticesArray[i + j] = move;

      // we add height here so we can calculate the average normalized height of the face later
      normalizedHeight += move.height - 1;

      // move vertex based on height and scatter
      v.add(move.scatter).normalize().multiplyScalar(move.height);
      vertices.setXYZ(i + j, v.x, v.y, v.z);

      // move ocean vertex based on sea height and scatter
      let oceanV = oceanA;
      if (j === 1) oceanV = oceanB;
      if (j === 2) oceanV = oceanC;
      oceanV.add(move.scatter).normalize().multiplyScalar(move.seaMorph);
      oceanMorphPositions.push(oceanV.x, oceanV.y, oceanV.z);

      // move ocean morph vertex based on sea height and scatter
      if (j === 0) {
        oceanD.copy(oceanV);
      } else if (j === 1) {
        oceanE.copy(oceanV);
      } else if (j === 2) {
        oceanF.copy(oceanV);
      }
      oceanV.normalize().multiplyScalar(move.seaHeight);
      oceanVertices.setXYZ(i + j, oceanV.x, oceanV.y, oceanV.z);
    }

    // calculate normalized height for the face (between -1 and 1, 0 is sea level)
    normalizedHeight /= 3;
    normalizedHeight =
      Math.min(-normalizedHeight / biome.min, 0) +
      Math.max(normalizedHeight / biome.max, 0);
    // now normalizedHeight should be between -1 and 1 (0 is sea level)
    // this will be used for color calculation and vegetation placement

    // calculate face normal
    temp.crossVectors(b.clone().sub(a), c.clone().sub(a)).normalize();
    // flat shading, so all normals for the face are the same
    normals.setXYZ(i, temp.x, temp.y, temp.z);
    normals.setXYZ(i + 1, temp.x, temp.y, temp.z);
    normals.setXYZ(i + 2, temp.x, temp.y, temp.z);

    // calculate steepness (acos of dot product of normal and up vector)
    // (up vector = old mid point on sphere)
    const steepness = Math.acos(Math.abs(temp.dot(mid)));
    // steepness is between 0 and PI/2
    // this will be used for color calculation and vegetation placement

    // calculate color for face
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

    // calculate ocean face color
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

    // calculate ocean normals
    temp
      .crossVectors(oceanB.clone().sub(oceanA), oceanC.clone().sub(oceanA))
      .normalize();
    oceanNormals.setXYZ(i, temp.x, temp.y, temp.z);
    oceanNormals.setXYZ(i + 1, temp.x, temp.y, temp.z);
    oceanNormals.setXYZ(i + 2, temp.x, temp.y, temp.z);

    // calculate ocean morph normals
    temp
      .crossVectors(oceanE.clone().sub(oceanD), oceanF.clone().sub(oceanD))
      .normalize();
    oceanMorphNormals.push(temp.x, temp.y, temp.z);
    oceanMorphNormals.push(temp.x, temp.y, temp.z);
    oceanMorphNormals.push(temp.x, temp.y, temp.z);

    // place vegetation
    for (
      let j = 0;
      biome.options.vegetation && j < biome.options.vegetation.items.length;
      j++
    ) {
      const vegetation = biome.options.vegetation.items[j];
      if (Math.random() < faceSize * (vegetation.density ?? 1)) {
        // discard if point is below or above height limits
        if (
          vegetation.minimumHeight !== undefined &&
          normalizedHeight < vegetation.minimumHeight
        ) {
          continue;
        }
        // default minimumHeight is 0 (= above sea level)
        if (vegetation.minimumHeight === undefined && normalizedHeight < 0) {
          continue;
        }
        if (
          vegetation.maximumHeight !== undefined &&
          normalizedHeight > vegetation.maximumHeight
        ) {
          continue;
        }

        // discard if point is below or above slope limits
        if (
          vegetation.minimumSlope !== undefined &&
          steepness < vegetation.minimumSlope
        ) {
          continue;
        }
        if (
          vegetation.maximumSlope !== undefined &&
          steepness > vegetation.maximumSlope
        ) {
          continue;
        }

        if (!placedVegetation[vegetation.name]) {
          placedVegetation[vegetation.name] = [];
        }
        let height = a.length();
        placedVegetation[vegetation.name].push(
          a
            .clone()
            .normalize()
            .multiplyScalar(height + 0.005),
        );

        biome.addVegetation(
          vegetation,
          a.normalize(),
          normalizedHeight,
          steepness,
        );
        break;
      }
    }
  }

  const maxDist = 0.14;
  // go through all vertices again and update height and color based on vegetation
  for (let i = 0; i < vertices.count; i += 3) {
    let found = false;
    let closestDistAll = 1;
    let closestVegetation: VegetationItem | undefined = undefined;

    for (let j = 0; j < 3; j++) {
      a.fromBufferAttribute(vertices, i + j);
      a.normalize();

      let p = biome.itemsAround(a, maxDist);
      if (p.length > 0) {
        // find closest point
        let closest = p[0];
        let closestDist = a.distanceTo(closest);
        for (let k = 1; k < p.length; k++) {
          let dist = a.distanceTo(p[k]);
          if (dist < closestDist) {
            closest = p[k];
            closestDist = dist;
          }
        }

        let moveInfo = calculatedVerticesArray[i + j];

        a.multiplyScalar(
          moveInfo.height + ((maxDist - closestDist) / maxDist) * 0.015,
        );

        vertices.setXYZ(i + j, a.x, a.y, a.z);

        if (closestDist < closestDistAll) {
          closestVegetation = closest.data;
        }

        closestDistAll = Math.min(closestDist, closestDistAll);
        found = true;
      }
    }

    if (!found) continue;

    let existingColor = new Color(
      colors[i * 3],
      colors[i * 3 + 1],
      colors[i * 3 + 2],
    );

    if (closestVegetation?.ground?.color) {
      // set color
      let newColor = new Color(closestVegetation.ground.color);

      newColor.lerp(existingColor, closestDistAll / maxDist);

      for (let j = 0; j < 3; j++) {
        colors[(i + j) * 3] = newColor.r;
        colors[(i + j) * 3 + 1] = newColor.g;
        colors[(i + j) * 3 + 2] = newColor.b;
      }
    }
  }

  oceanSphere.morphAttributes.position[0] = new Float32BufferAttribute(
    oceanMorphPositions,
    3,
  );
  oceanSphere.morphAttributes.normal[0] = new Float32BufferAttribute(
    oceanMorphNormals,
    3,
  );

  sphere.setAttribute("color", new BufferAttribute(colors, 3));
  oceanSphere.setAttribute("color", new BufferAttribute(oceanColors, 3));

  return [sphere, oceanSphere, placedVegetation];
}
