import { MeshStandardMaterial } from "three";
import { noise } from "./noise";

const oceansCausticMaterial = new MeshStandardMaterial({
  vertexColors: true,
});
oceansCausticMaterial.onBeforeCompile = (shader) => {
  const caustics = `
float caustics(vec4 vPos) {
    // More intricate warping for marble patterns
    // float warpFactor = 2.0;
    // vec4 warpedPos = vPos * warpFactor + snoise(vPos * warpFactor * 0.5);
    // vec4 warpedPos2 = warpedPos * warpFactor * 0.3 + snoise(warpedPos * warpFactor * 0.5 + vec4(0, 2, 4, 8)) + vPos;

    // // Modulate the color intensity based on the noise
    // float vein = snoise(warpedPos2 * warpFactor) * snoise(warpedPos);

    // float a = 1.0 - (sin(vein * 12.0) + 1.0) * 0.5;
    // float diff = snoise(vPos * warpFactor);
    // diff = diff * snoise(diff * vPos) * a;
    // return vec3((diff));

    vec4 warpedPos = vPos * 2.0 + snoise(vPos * 3.0);
    vec4 warpedPos2 = warpedPos * 0.3 + snoise(warpedPos * 2.0 + vec4(0, 2, 4, 8)) + vPos;
float vein = snoise(warpedPos2) * snoise(warpedPos);
float a = 1.0 - (sin(vein * 2.0) + 1.0) * 0.5;

    return snoise(vPos + warpedPos + warpedPos2) * a * 1.5;
}`;
  shader.vertexShader = `varying vec3 vPos;\n${shader.vertexShader}`.replace(
    `#include <begin_vertex>`,
    `#include <begin_vertex>\nvPos = position;`,
  );

  shader.fragmentShader = `
  uniform float time;
  varying vec3 vPos;
  ${noise}
  ${caustics}
  ${shader.fragmentShader}`;

  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <color_fragment>",
    `#include <color_fragment>
    vec3 pos = vPos * 3.0;
    float len = length(vPos);
    // Fade in
    float fadeIn = smoothstep(0.96, 0.985, len);
    // Fade out
    float fadeOut = 1.0 - smoothstep(0.994, 0.999, len);
    float causticIntensity = fadeIn * fadeOut * 0.7;
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), causticIntensity * smoothstep(0.0, 1.0, caustics(vec4(pos, time * 0.05))));
`,
  );

  shader.uniforms.time = { value: 0 };
  oceansCausticMaterial.userData.shader = shader;

  // console.log("FRAGMENT", shader.fragmentShader);
  // console.log();
  // console.log("VERTEX", shader.vertexShader);
};

export default oceansCausticMaterial;
