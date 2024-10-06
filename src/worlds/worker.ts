import {
  IcosahedronGeometry,
  Vector3,
  BufferAttribute,
  Float32BufferAttribute,
  Color,
  PlaneGeometry,
  BufferGeometry,
} from "three";

import { Biome } from "./biome";
import { type PlanetOptions } from "./planet";
import UberNoise from "uber-noise";
import { type VertexInfo } from "./types";

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
): [BufferGeometry, BufferGeometry, Record<string, Vector3[]>] {
  const detail = planetOptions.detail ?? 50;

  const mainGeometry =
    planetOptions.shape == "plane"
      ? new PlaneGeometry(3, 3, detail, detail).toNonIndexed()
      : new IcosahedronGeometry(1, detail);
  const oceanGeometry =
    planetOptions.shape == "plane"
      ? new PlaneGeometry(3, 3, detail, detail).toNonIndexed()
      : new IcosahedronGeometry(1, detail);

  const biome = new Biome(planetOptions.biome);

  const vertices = mainGeometry.getAttribute("position");
  const oceanVertices = oceanGeometry.getAttribute("position");
  const faceCount = vertices.count / 3;
  const faceSize = (Math.PI * 4) / faceCount;
  console.log("faces:", faceCount);

  // store calculated vertices so we don't have to recalculate them
  // once store by hashed position (so we can find vertices of different faces that have the same position)
  const calculatedVertices = new Map<string, VertexInfo>();
  // and once by index for vegetation placement
  const calculatedVerticesArray: VertexInfo[] = new Array(faceCount);

  const colors = new Float32Array(vertices.count * 3);
  const oceanColors = new Float32Array(oceanVertices.count * 3);

  const normals = mainGeometry.getAttribute("normal");
  const oceanNormals = oceanGeometry.getAttribute("normal");

  const planeUp = new Vector3(0, 1, 0);

  const a = new Vector3(),
    b = new Vector3(),
    c = new Vector3();

  const mid = new Vector3();

  const placedVegetation: Record<string, Vector3[]> = {};
  a.fromBufferAttribute(vertices, 0);
  b.fromBufferAttribute(vertices, 1);

  const faceSideLength = a.distanceTo(b);

  // scatterAmount is based on side length of face (all faces have the same size)
  const scatterAmount = (planetOptions.scatter ?? 1.2) * faceSideLength;
  const scatterScale = 100;

  const scatterNoise = new UberNoise({
    min: -scatterAmount / 2,
    max: scatterAmount / 2,
    scale: scatterScale,
    seed: 0,
  });

  oceanGeometry.morphAttributes.position = [];
  oceanGeometry.morphAttributes.normal = [];

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

    if (planetOptions.shape == "plane") {
      // switch y and z
      let temp = a.y;
      a.y = a.z;
      a.z = temp;

      temp = b.y;
      b.y = b.z;
      b.z = temp;

      temp = c.y;
      c.y = c.z;
      c.z = temp;

      temp = oceanA.y;
      oceanA.y = oceanA.z;
      oceanA.z = temp;

      temp = oceanB.y;
      oceanB.y = oceanB.z;
      oceanB.z = temp;

      temp = oceanC.y;
      oceanC.y = oceanC.z;
      oceanC.z = temp;

      // switch a and c
      let tempVector = a.clone();
      a.copy(c);
      c.copy(tempVector);

      tempVector = oceanA.clone();
      oceanA.copy(oceanC);
      oceanC.copy(tempVector);
    }

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
        const height = biome.getHeight(v);
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
        const seaHeight = biome.getSeaHeight(v);
        const secondSeaHeight = biome.getSeaHeight(v.addScalar(100));

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
      normalizedHeight += move.height;

      // move vertex based on height and scatter
      v.add(move.scatter);
      if (planetOptions.shape == "plane") {
        v.y = move.height;
      } else {
        v.normalize().multiplyScalar(move.height + 1);
      }

      vertices.setXYZ(i + j, v.x, v.y, v.z);

      // move ocean morph vertex based on sea morph height and scatter
      let oceanV = oceanA;
      if (j === 1) oceanV = oceanB;
      if (j === 2) oceanV = oceanC;
      oceanV.add(move.scatter);

      if (planetOptions.shape == "plane") {
        oceanV.y = move.seaMorph;
      } else {
        oceanV.normalize().multiplyScalar(move.seaMorph + 1);
      }
      oceanMorphPositions.push(oceanV.x, oceanV.y, oceanV.z);

      // move ocean vertex based on sea height and scatter
      if (j === 0) {
        oceanD.copy(oceanV);
        oceanV = oceanD;
      } else if (j === 1) {
        oceanE.copy(oceanV);
        oceanV = oceanE;
      } else if (j === 2) {
        oceanF.copy(oceanV);
        oceanV = oceanF;
      }
      if (planetOptions.shape == "plane") {
        oceanV.y = move.seaHeight;
      } else {
        oceanV.normalize().multiplyScalar(move.seaHeight + 1);
      }
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
    const steepness = Math.acos(
      Math.abs(temp.dot(planetOptions.shape == "plane" ? planeUp : mid)),
    );
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

        placedVegetation[vegetation.name].push(a.clone());

        if (planetOptions.shape == "plane") {
          a.y = 0;
        } else {
          a.normalize();
        }

        biome.addVegetation(vegetation, a, normalizedHeight, steepness);
        break;
      }
    }
  }

  const color = new Color();

  // go through all vertices again and update height and color based on vegetation
  for (let i = 0; i < vertices.count; i += 3) {
    a.fromBufferAttribute(vertices, i);
    b.fromBufferAttribute(vertices, i + 1);
    c.fromBufferAttribute(vertices, i + 2);

    if (planetOptions.shape == "plane") {
      a.y = 0;
      b.y = 0;
      c.y = 0;
    } else {
      a.normalize();
      b.normalize();
      c.normalize();
    }

    color.setRGB(colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2]);

    const output = biome.vegetationHeightAndColorForFace(
      a,
      b,
      c,
      color,
      faceSideLength,
    );

    const moveDataA = calculatedVerticesArray[i];
    const moveDataB = calculatedVerticesArray[i + 1];
    const moveDataC = calculatedVerticesArray[i + 2];

    // update height based on vegetation
    if (planetOptions.shape == "plane") {
      a.y = moveDataA.height + output.heightA;
      b.y = moveDataB.height + output.heightB;
      c.y = moveDataC.height + output.heightC;
    } else {
      a.normalize().multiplyScalar(moveDataA.height + output.heightA + 1);
      b.normalize().multiplyScalar(moveDataB.height + output.heightB + 1);
      c.normalize().multiplyScalar(moveDataC.height + output.heightC + 1);
    }

    vertices.setXYZ(i, a.x, a.y, a.z);
    vertices.setXYZ(i + 1, b.x, b.y, b.z);
    vertices.setXYZ(i + 2, c.x, c.y, c.z);

    // update color based on vegetation
    colors[i * 3] = output.color.r;
    colors[i * 3 + 1] = output.color.g;
    colors[i * 3 + 2] = output.color.b;

    colors[i * 3 + 3] = output.color.r;
    colors[i * 3 + 4] = output.color.g;
    colors[i * 3 + 5] = output.color.b;

    colors[i * 3 + 6] = output.color.r;
    colors[i * 3 + 7] = output.color.g;
    colors[i * 3 + 8] = output.color.b;
  }

  oceanGeometry.morphAttributes.position[0] = new Float32BufferAttribute(
    oceanMorphPositions,
    3,
  );
  oceanGeometry.morphAttributes.normal[0] = new Float32BufferAttribute(
    oceanMorphNormals,
    3,
  );

  mainGeometry.setAttribute("color", new BufferAttribute(colors, 3));
  oceanGeometry.setAttribute("color", new BufferAttribute(oceanColors, 3));

  return [mainGeometry, oceanGeometry, placedVegetation];
}
