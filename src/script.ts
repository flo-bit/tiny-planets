import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Planet } from "./worlds/planet";

const presets = ["beach", "forest", "snowForest"];

const width = window.innerWidth,
  height = window.innerHeight;

const canvas = document.getElementById("root");

if (!canvas) {
  throw new Error("Canvas not found");
}
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, width / height, 0.01, 10);
camera.position.set(0, 0, 2.5);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  canvas,
  alpha: true,
});

renderer.toneMapping = THREE.ACESFilmicToneMapping;

renderer.shadowMap.enabled = true;

const _ = new OrbitControls(camera, renderer.domElement);

let hasPlanet = false;

let sphereGeometry = new THREE.IcosahedronGeometry(1, 20);
let sphereMaterial = new THREE.MeshStandardMaterial({
  color: "white",
  wireframe: true,
  wireframeLinewidth: 10,
});
let planetMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
scene.add(planetMesh);

const light = new THREE.DirectionalLight();
light.intensity = 2;
light.position.set(2, 1, 0);
scene.add(light);
light.castShadow = true;
light.shadow.mapSize.width = 512;
light.shadow.mapSize.height = 512;
light.shadow.camera.far = 10;
light.shadow.camera.near = 0.1;

light.shadow.bias = 0.01;
light.shadow.camera.top = 2;
light.shadow.camera.right = 2;
light.shadow.camera.bottom = -2;
light.shadow.camera.left = -2;

const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
scene.add(ambientLight);


const atmosphereShader = {
  uniforms: {
    lightDirection: { value: new THREE.Vector3(1.0, 1.0, 0.0).normalize() }, // Sunlight direction
    atmosphereColor: { value: new THREE.Vector3(0.3, 0.6, 1.0) }, // Blue tint for atmosphere

  },
  vertexShader: `
  varying vec3 vNormal;
  varying vec3 vViewLightDirection; // Light direction relative to the camera
  varying vec3 vViewPosition; // View position

  uniform vec3 lightDirection; // Light direction in world space

  void main() {
    // Transform the vertex normal to world space
    vNormal = normalize(normalMatrix * normal);
    // Transform the light direction to view space
    vViewLightDirection = (viewMatrix * vec4(lightDirection, 0.0)).xyz;
    vViewPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,
  fragmentShader: `
    varying vec3 vNormal;
    varying vec3 vViewLightDirection;
    varying vec3 vViewPosition;
    uniform vec3 atmosphereColor;

    void main() {

      // Normalize the normal and the view direction
      vec3 viewDirection = normalize(vViewPosition);

      // Calculate how much of the surface is perpendicular to the view direction
      float viewFactor = dot(normalize(vNormal), -viewDirection);

      // Calculate the dot product of the light direction and the surface normal
      float lightFactor = dot(normalize(vNormal), normalize(vViewLightDirection));

      // Use smoothstep to soften the transition from light to dark side
      lightFactor = smoothstep(-0.2, 0.4, lightFactor);

      // Ensure a minimum glow, even on the dark side
      float minGlow = 0.2; // Adjust this to control how much it glows on the dark side
      lightFactor = mix(minGlow, 1.0, lightFactor);

      // Adjust the intensity for the atmosphere's glow, including the minimum glow
      float dotProduct = dot(normalize(vNormal), vec3(0, 0.0, 1.0));
      float intensity = pow(dotProduct, 8.0);
      intensity *= lightFactor;

      viewFactor = clamp(1.0 - viewFactor, 0.0, 1.0);

      // Use smoothstep for a smooth transition on the edges
      float atmosphereFactor = smoothstep(0.0, 0.6, viewFactor);

      // Output the final color
      gl_FragColor = vec4(atmosphereColor, intensity * atmosphereFactor);
      // Set the final fragment color with the computed intensity
      //gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
    }`,
  side: THREE.FrontSide,
  transparent: true,
  depthWrite: false,
};

// Create the atmosphere material
const atmosphereMaterial = new THREE.ShaderMaterial(atmosphereShader);

// Create the atmosphere geometry
const atmosphereGeometry = new THREE.IcosahedronGeometry(1.2, 20);
const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
atmosphere.renderOrder = 1;
scene.add(atmosphere);



// const atmosphereShader = {
//   uniforms: {
//     lightDirection: { value: new THREE.Vector3(1.0, 1.0, 0.0).normalize() }, // Sunlight direction
//     atmosphereColor: { value: new THREE.Vector3(0.3, 0.6, 1.0) }, // Blue tint for atmosphere
//   },
//   vertexShader: `
//     varying vec3 vNormal;
//     varying vec3 vViewPosition;

//     void main() {
//       // Pass the vertex normal to the fragment shader
//       vNormal = normalize(normalMatrix * normal);
      
//       // Get the view-space position (relative to the camera)
      // vViewPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;

//       // Standard vertex position transformation
//       gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
//     }
//   `,
//   fragmentShader: `
//     varying vec3 vNormal;
//     varying vec3 vViewPosition;

//     uniform vec3 atmosphereColor;

//     void main() {
//       // Normalize the normal and the view direction
//       vec3 viewDirection = normalize(vViewPosition);

//       // Calculate how much of the surface is perpendicular to the view direction
//       float viewFactor = dot(normalize(vNormal), -viewDirection);

//       // Invert and clamp the viewFactor to ensure a smooth fade on the edges
//       viewFactor = clamp(1.0 - viewFactor, 0.0, 1.0);

//       // Use smoothstep for a smooth transition on the edges
//       float atmosphereFactor = smoothstep(0.2, 0.8, viewFactor);

//       // Apply the blue tint more strongly on the edges
//       vec3 finalColor = mix(vec3(1.0), atmosphereColor, atmosphereFactor);

//       // Output the final color
//       gl_FragColor = vec4(finalColor, atmosphereFactor);
//     }
//   `,
//   side: THREE.FrontSide,
//   transparent: true,
//   depthWrite: false,
// };

// // Create atmosphere material using the shader
// const atmosphereMaterial = new THREE.ShaderMaterial(atmosphereShader);

// // Create your atmosphere geometry and apply the material
// const atmosphereGeometry = new THREE.SphereGeometry(1.3, 32, 32);
// const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
// atmosphereMesh.renderOrder = 1;
// scene.add(atmosphereMesh);

// const atmosphereShader = {
//   uniforms: {
//     lightDirection: { value: new THREE.Vector3(1.0, 1.0, 0.0).normalize() }, // Sunlight direction
//   },
//   vertexShader: `
//     varying vec3 vNormal;
//     varying vec3 vViewLightDirection; // Light direction relative to the camera

//     uniform vec3 lightDirection; // Light direction in world space

//     void main() {
//       // Transform the vertex normal to world space
//       vNormal = normalize(normalMatrix * normal);
//       // Transform the light direction to view space
//       vViewLightDirection = (viewMatrix * vec4(lightDirection, 0.0)).xyz;

//       gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
//     }
//   `,
//   fragmentShader: `
//     varying vec3 vNormal;
//     varying vec3 vViewLightDirection;

//     void main() {
//       // Calculate the dot product of the light direction and the surface normal
//       float lightFactor = dot(normalize(vNormal), normalize(vViewLightDirection));

//       // Use smoothstep to soften the transition from light to dark side
//       lightFactor = smoothstep(0.0, 0.5, lightFactor);

//       // Ensure a minimum glow, even on the dark side
//       float minGlow = 0.5; // Adjust this to control how much it glows on the dark side
//       lightFactor = mix(minGlow, 1.0, lightFactor);

//       // Adjust the intensity for the atmosphere's glow, including the minimum glow
//       float intensity = pow(0.7 - dot(normalize(vNormal), vec3(0, 0, 1.0)), 2.0);
//       intensity *= lightFactor;

//       // Calculate an alpha value for fog-like fading effect near the edges
//       // This will make the atmosphere more transparent at the edges
//       float alpha = lightFactor * 0.6; // Adjust alpha factor for stronger or softer fade

//       // Set the final fragment color with the computed intensity and alpha
//       gl_FragColor = vec4(0.3, 0.6, 1.0, alpha) * intensity;
//     }`,
//   side: THREE.BackSide,  // Only render the back faces of the atmosphere
//   transparent: true,     // Enable transparency for the fade effect
// };

// // Create the atmosphere material
// const atmosphereMaterial = new THREE.ShaderMaterial(atmosphereShader);

// // Create the atmosphere geometry
// const atmosphereGeometry = new THREE.IcosahedronGeometry(1, 20);
// const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
// const scale = 1.2;
// atmosphere.scale.set(scale, scale, scale);
// scene.add(atmosphere);

let total = 0;
let lastDelta = 0;
renderer.setAnimationLoop((delta) => {
  renderer.render(scene, camera);

  planetMesh.rotation.y += 0.001;

  if (lastDelta > 0) {
    total += delta - lastDelta;
  }
  lastDelta = delta;

  if (!hasPlanet) {
    console.log("Creating planet");
    createPlanet();
    hasPlanet = true;
  }
});

// add keydown event listener
document.addEventListener("keydown", (event) => {
  if (event.key === "1") {
    createPlanet("beach");
  } else if (event.key === "2") {
    createPlanet("forest");
  } else if (event.key === "3") {
    createPlanet("snowForest");
  }

  if (event.key === "a") {
    atmosphere.visible = !atmosphere.visible;
  }
});

// button press
let button = document.getElementById("button");
if (button) {
  console.log("Button found");
  button.addEventListener("click", () => {
    let randomPreset = presets[Math.floor(Math.random() * presets.length)];
    createPlanet(randomPreset);
  });
}

async function createPlanet(preset: string | undefined = undefined) {
  if (!preset) {
    preset = presets[Math.floor(Math.random() * presets.length)];
  }

  console.time("planet");
  const planet = new Planet({ preset });
  let mesh = await planet.create();
  scene.remove(planetMesh);
  scene.add(mesh);
  planetMesh = mesh;
  console.timeEnd("planet");
}

function updateSize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

updateSize();
window.addEventListener("resize", updateSize);
