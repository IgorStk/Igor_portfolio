import * as THREE from 'three';

/** Thin, overlapping volumes of procedural mist around the desk. */
export function createMist() {
  const uniforms = {
    uTime: { value: 0 },
    uLight: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uLight;
      varying vec3 vWorld;

      float hash(vec3 p) {
        p = fract(p * 0.3183099 + vec3(0.11, 0.37, 0.73));
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }
      float noise(vec3 p) {
        vec3 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
              mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
          mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
              mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
      }
      float fbm(vec3 p) {
        float result = 0.0, amplitude = 0.55;
        for (int i = 0; i < 4; i++) {
          result += noise(p) * amplitude;
          p = p * 2.03 + vec3(7.1, 3.7, 5.3);
          amplitude *= 0.5;
        }
        return result;
      }
      void main() {
        vec3 p = vWorld * vec3(0.65, 1.3, 0.65);
        p += vec3(uTime * 0.055, -uTime * 0.018, uTime * 0.028);
        float curl = noise(p * 0.65 + vec3(0, 0, uTime * 0.025));
        float density = fbm(p + vec3(curl * 1.6, curl * 0.5, -curl));
        density = smoothstep(0.28, 0.78, density);

        // Keep the tabletop clear; dissolve the outer perimeter without hard edges.
        vec2 q = abs(vWorld.xz) - vec2(1.9, 1.08);
        float deskDistance = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
        float aroundDesk = smoothstep(-0.12, 0.75, deskDistance);
        float perimeter = 1.0 - smoothstep(3.6, 6.0, length(vWorld.xz));
        float heightFade = 1.0 - smoothstep(0.5, 2.0, vWorld.y);
        float alpha = density * aroundDesk * perimeter * heightFade * 0.16 * uLight;
        gl_FragColor = vec4(vec3(0.30, 0.42, 0.57), alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const group = new THREE.Group();
  group.name = 'Animated desk mist';
  const geometry = new THREE.PlaneGeometry(13, 13);
  for (let i = 0; i < 9; i++) {
    const layer = new THREE.Mesh(geometry, material);
    layer.rotation.x = -Math.PI / 2;
    layer.position.y = 0.10 + i * 0.21;
    group.add(layer);
  }
  return { group, uniforms };
}
