import { BufferGeometry, Float32BufferAttribute } from "three";

export function createBufferGeometry(
  positions: number[],
  colors?: number[],
  normals?: number[],
) {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new Float32BufferAttribute(new Float32Array(positions), 3),
  );

  if (colors) {
    geometry.setAttribute(
      "color",
      new Float32BufferAttribute(new Float32Array(colors), 3),
    );
  }
  if (normals) {
    geometry.setAttribute(
      "normal",
      new Float32BufferAttribute(new Float32Array(normals), 3),
    );
  }

  return geometry;
}
