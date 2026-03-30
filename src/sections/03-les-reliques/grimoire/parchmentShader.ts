import * as THREE from 'three';

const VERT_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAG_SHADER = /* glsl */ `
  uniform float uTime;
  uniform vec2 uCandlePos;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i),             hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 6; i++) {
      v += amp * noise(p);
      p *= 2.1;
      amp *= 0.48;
    }
    return v;
  }

  void main() {
    // Base parchment palette
    vec3 light = vec3(0.96, 0.91, 0.78);   // ivory
    vec3 mid   = vec3(0.84, 0.72, 0.50);   // warm beige
    vec3 dark  = vec3(0.60, 0.42, 0.22);   // aged brown

    // Paper fiber texture
    float n = fbm(vUv * 14.0);
    float n2 = fbm(vUv * 6.0 + vec2(4.1, 2.3));
    vec3 color = mix(light, mid, n * 0.55);
    color = mix(color, dark, n2 * 0.18);

    // Horizontal fiber streaks
    float fibers = noise(vec2(vUv.x * 80.0, vUv.y * 3.0)) * 0.06;
    color -= vec3(fibers);

    // Edge aging / vignette
    float dx = min(vUv.x, 1.0 - vUv.x);
    float dy = min(vUv.y, 1.0 - vUv.y);
    float edge = smoothstep(0.0, 0.18, min(dx, dy));
    color = mix(dark * 0.5, color, edge);

    // Moisture stain patches
    float stain = fbm(vUv * 4.5 + vec2(1.8, 0.9));
    float stainMask = smoothstep(0.55, 0.7, stain);
    color = mix(color, color * vec3(0.88, 0.84, 0.76), stainMask * 0.4);

    // Candle light — warm amber radial falloff with flicker
    float flicker = sin(uTime * 3.7) * 0.04 + sin(uTime * 7.1) * 0.025 + sin(uTime * 13.3) * 0.01;
    float candleDist = length(vUv - uCandlePos);
    float candleLight = 1.0 - smoothstep(0.0, 0.75 + flicker, candleDist);
    candleLight = pow(candleLight, 1.6);
    vec3 ambiance = vec3(0.95, 0.62, 0.18) * candleLight * 0.22;
    color += ambiance;

    // Slightly warm overall tone
    color.r *= 1.04;
    color.b *= 0.92;

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
  }
`;

export interface ParchmentShader {
  canvas: HTMLCanvasElement;
  update: (elapsed: number) => void;
  resize: (width: number, height: number) => void;
  dispose: () => void;
}

export const createParchmentShader = (candlePosNorm = { x: 0.5, y: 0.5 }): ParchmentShader => {
  const canvas = document.createElement('canvas');
  canvas.className = 'grimoire__parchment-canvas';
  canvas.width = 800;
  canvas.height = 500;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
  renderer.setPixelRatio(1); // intentionally low-res for performance + retro feel

  const geometry = new THREE.PlaneGeometry(2, 2);
  const material = new THREE.ShaderMaterial({
    vertexShader: VERT_SHADER,
    fragmentShader: FRAG_SHADER,
    uniforms: {
      uTime: { value: 0 },
      uCandlePos: { value: new THREE.Vector2(candlePosNorm.x, candlePosNorm.y) },
    },
  });

  const mesh = new THREE.Mesh(geometry, material);
  const scene = new THREE.Scene();
  scene.add(mesh);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const update = (elapsed: number): void => {
    if (material.uniforms['uTime']) material.uniforms['uTime'].value = elapsed;
    renderer.render(scene, camera);
  };

  const resize = (width: number, height: number): void => {
    canvas.width = width;
    canvas.height = height;
    renderer.setSize(width, height, false);
  };

  const dispose = (): void => {
    canvas.remove();
    geometry.dispose();
    material.dispose();
    renderer.dispose();
  };

  return { canvas, update, resize, dispose };
};
