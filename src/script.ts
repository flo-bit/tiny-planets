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
