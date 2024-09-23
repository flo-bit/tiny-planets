import { ShaderMaterial, Vector3 } from "three";

export function createAtmosphereMaterial(
  color: Vector3 | undefined = undefined,
  lightDirection: Vector3 | undefined = undefined,
) {
  const uniforms = {
    lightDirection: {
      value: (lightDirection ?? new Vector3(1.0, 1.0, 0.0)).normalize(),
    },
    atmosphereColor: { value: color ?? new Vector3(0.3, 0.6, 1.0) },
  };

  const atmosphereShader = {
    uniforms,
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
          float atmosphereFactor = smoothstep(0.2, 0.6, viewFactor);
      
          // Output the final color
          gl_FragColor = vec4(atmosphereColor, intensity * atmosphereFactor);
          // Set the final fragment color with the computed intensity
          //gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
        }`,
    transparent: true,
    depthWrite: false,
  };

  return new ShaderMaterial(atmosphereShader);
}