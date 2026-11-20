import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  clampProgress,
  computePhysicalTelemetry,
  getEpochForProgress,
  getParticleBudget,
} from './epochs';
import {
  CELESTIAL_HOTSPOTS,
  CelestialHotspot,
  computeEpochVisualParams,
  getCruiseCameraPose,
  getHotspotWorldPosition,
} from './hotspots';
import {
  createBackgroundStarfieldData,
  createCosmicParticleBuffers,
  createDarkMatterFilamentPositions,
  updateCosmicParticleBuffers,
} from './particleData';

export type CameraMode = 'cruise' | 'free';

interface CosmosStageProps {
  progress: number;
  isPlaying: boolean;
  playbackSpeed: number;
  showGrid: boolean;
  showHotspots: boolean;
  cameraMode: CameraMode;
  selectedHotspotId: string | null;
  onProgressChange: (nextProgress: number) => void;
  onPlaybackComplete: () => void;
  onUserOrbitStart: () => void;
  onHotspotHover: (hotspot: CelestialHotspot | null) => void;
  onHotspotSelect: (hotspot: CelestialHotspot | null) => void;
}

const BASE_EVOLUTION_DURATION_SEC = 52;

// Pre-allocated math helpers (Zero GC inside render loop)
const _raycaster = new THREE.Raycaster();
const _pointerNdc = new THREE.Vector2();
const _visibleProxies: THREE.Object3D[] = [];

function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createComovingLatticeGeometry(): THREE.BufferGeometry {
  const half = 12;
  const step = 4;
  const coords: number[] = [];

  for (let x = -half; x <= half; x += step) {
    for (let y = -half; y <= half; y += step) {
      coords.push(x, y, -half, x, y, half);
    }
  }
  for (let x = -half; x <= half; x += step) {
    for (let z = -half; z <= half; z += step) {
      coords.push(x, -half, z, x, half, z);
    }
  }
  for (let y = -half; y <= half; y += step) {
    for (let z = -half; z <= half; z += step) {
      coords.push(-half, y, z, half, y, z);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(coords, 3));
  return geometry;
}

export function CosmosStage({
  progress,
  isPlaying,
  playbackSpeed,
  showGrid,
  showHotspots,
  cameraMode,
  selectedHotspotId,
  onProgressChange,
  onPlaybackComplete,
  onUserOrbitStart,
  onHotspotHover,
  onHotspotSelect,
}: CosmosStageProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [contextLost, setContextLost] = useState(false);
  const [webglUnavailable, setWebglUnavailable] = useState(false);
  const [cursorPointer, setCursorPointer] = useState(false);

  // Refs preserve WebGL instance across HUD state updates
  const progressRef = useRef(progress);
  const isPlayingRef = useRef(isPlaying);
  const speedRef = useRef(playbackSpeed);
  const showGridRef = useRef(showGrid);
  const showHotspotsRef = useRef(showHotspots);
  const cameraModeRef = useRef<CameraMode>(cameraMode);
  const selectedHotspotIdRef = useRef<string | null>(selectedHotspotId);
  const hoveredHotspotIdRef = useRef<string | null>(null);
  const onProgressChangeRef = useRef(onProgressChange);
  const onPlaybackCompleteRef = useRef(onPlaybackComplete);
  const onUserOrbitStartRef = useRef(onUserOrbitStart);
  const onHotspotHoverRef = useRef(onHotspotHover);
  const onHotspotSelectRef = useRef(onHotspotSelect);
  const lastAppliedProgressRef = useRef(-1);

  progressRef.current = progress;
  isPlayingRef.current = isPlaying;
  speedRef.current = playbackSpeed;
  showGridRef.current = showGrid;
  showHotspotsRef.current = showHotspots;
  cameraModeRef.current = cameraMode;
  selectedHotspotIdRef.current = selectedHotspotId;
  onProgressChangeRef.current = onProgressChange;
  onPlaybackCompleteRef.current = onPlaybackComplete;
  onUserOrbitStartRef.current = onUserOrbitStart;
  onHotspotHoverRef.current = onHotspotHover;
  onHotspotSelectRef.current = onHotspotSelect;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const isTouch = navigator.maxTouchPoints > 0;
    const particleBudget = getParticleBudget(window.innerWidth, isTouch);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglUnavailable(true);
      return;
    }

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const pixelRatio = isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2);

    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => {
      setContextLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x03050c);
    scene.fog = new THREE.FogExp2(0x03050c, 0.01);

    const camera = new THREE.PerspectiveCamera(56, width / height, 0.1, 240);
    const initPose = getCruiseCameraPose(progressRef.current, 0);
    camera.position.set(initPose.position[0], initPose.position[1], initPose.position[2]);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.rotateSpeed = 0.65;
    controls.zoomSpeed = 0.85;
    controls.minDistance = 4.5;
    controls.maxDistance = 68;
    controls.target.set(0, 0, 0);
    controls.update();

    // Immediately yield automatic cruise camera to user the moment OrbitControls starts
    const handleControlsStart = () => {
      if (cameraModeRef.current === 'cruise') {
        cameraModeRef.current = 'free';
        onUserOrbitStartRef.current();
      }
    };
    controls.addEventListener('start', handleControlsStart);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      1.15,
      0.48,
      0.22,
    );
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());

    // 1. Main Multi-Stage Cosmic Particle System with Stage 3 Epoch Shaders
    const particleBuffers = createCosmicParticleBuffers(particleBudget);
    const particleGeo = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(particleBuffers.positions, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    const colAttr = new THREE.BufferAttribute(particleBuffers.colors, 3);
    colAttr.setUsage(THREE.DynamicDrawUsage);

    particleGeo.setAttribute('position', posAttr);
    particleGeo.setAttribute('aColor', colAttr);
    particleGeo.setAttribute('aSize', new THREE.BufferAttribute(particleBuffers.sizes, 1));
    particleGeo.setAttribute('aPhase', new THREE.BufferAttribute(particleBuffers.phases, 1));

    const particleMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: progressRef.current },
        uPixelRatio: { value: pixelRatio },
        uQuantumJitter: { value: 1 },
        uInflationStreak: { value: 0 },
        uPlasmaSwirl: { value: 0 },
        uPointSizeScale: { value: 1 },
        uStarFlareMix: { value: 0 },
      },
      vertexShader: `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aPhase;

        uniform float uTime;
        uniform float uProgress;
        uniform float uPixelRatio;
        uniform float uQuantumJitter;
        uniform float uInflationStreak;
        uniform float uPlasmaSwirl;
        uniform float uPointSizeScale;

        varying vec3 vColor;
        varying float vAlpha;
        varying float vSize;

        // === [STAGE 3: EPOCH SHADERS & TRANSITIONS] ===
        void main() {
          vColor = aColor;
          vSize = aSize;

          vec3 p = position;
          float rad = max(0.1, length(p));
          vec3 dir = p / rad;

          // Epoch 1: High-frequency quantum foam uncertainty displacement
          vec3 qJitter = vec3(
            sin(uTime * 6.5 + aPhase * 3.1 + p.y * 4.0),
            cos(uTime * 5.8 + aPhase * 2.7 + p.z * 4.0),
            sin(uTime * 6.1 + aPhase * 3.7 + p.x * 4.0)
          ) * (0.24 * uQuantumJitter);

          // Epoch 2: Longitudinal metric inflation ripple streaks
          float infWave = sin(rad * 1.8 - uTime * 4.2 + aPhase) * 0.42 * uInflationStreak;
          p += qJitter + dir * infWave;

          // Epoch 3: Turbulent relativistic plasma swirl
          if (uPlasmaSwirl > 0.001) {
            float swirlAng = uPlasmaSwirl * (0.35 * sin(uTime * 0.9 + rad * 0.35 + aPhase));
            float cs = cos(swirlAng);
            float sn = sin(swirlAng);
            p.xz = mat2(cs, -sn, sn, cs) * p.xz;
            p.y += sin(uTime * 1.8 + aPhase + rad * 0.5) * 0.25 * uPlasmaSwirl;
          }

          vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
          float dist = max(1.5, -mvPosition.z);

          float dynamicSize = aSize * uPointSizeScale * (1.0 + 0.35 * uInflationStreak);
          gl_PointSize = clamp((dynamicSize * 38.0 * uPixelRatio) / dist, 1.4, 28.0);
          vAlpha = smoothstep(115.0, 12.0, dist) * (0.76 + 0.24 * sin(uTime * 1.4 + aPhase));
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uPlasmaSwirl;
        uniform float uStarFlareMix;

        varying vec3 vColor;
        varying float vAlpha;
        varying float vSize;

        // === [STAGE 3: EPOCH SHADERS & TRANSITIONS] ===
        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float r2 = dot(uv, uv);
          if (r2 > 0.25) discard;

          // Soft foggy plasma falloff vs sharp stellar core
          float softness = mix(17.0, 7.5, uPlasmaSwirl);
          float radial = exp(-r2 * softness);
          float core = exp(-r2 * 52.0) * 0.65;

          // Diffraction cross flare for bright Pop III & spiral galaxy stars (Epochs 5-6)
          float flareStrength = uStarFlareMix * smoothstep(1.35, 2.5, vSize);
          float crossX = exp(-abs(uv.y) * 32.0) * exp(-abs(uv.x) * 9.0);
          float crossY = exp(-abs(uv.x) * 32.0) * exp(-abs(uv.y) * 9.0);
          float flare = (crossX + crossY) * 0.45 * flareStrength;

          float alpha = (radial + core + flare) * vAlpha;
          vec3 finalCol = vColor * (0.95 + core * 0.8 + flare * 0.9);
          gl_FragColor = vec4(finalCol, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const cosmicParticles = new THREE.Points(particleGeo, particleMat);
    cosmicParticles.frustumCulled = false;
    scene.add(cosmicParticles);

    // 2. Procedural BAO Acoustic Pressure Shells (Epoch 3)
    const baoMat1 = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 } },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPos;
        varying vec3 vObjPos;
        void main() {
          vObjPos = position;
          vNormal = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vViewPos = -mv.xyz;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uOpacity;
        varying vec3 vNormal;
        varying vec3 vViewPos;
        varying vec3 vObjPos;
        void main() {
          float rim = pow(1.0 - abs(dot(normalize(vViewPos), normalize(vNormal))), 2.2);
          float ripple = 0.6 + 0.4 * sin(vObjPos.y * 2.4 - uTime * 2.2 + vObjPos.x * 1.4);
          vec3 col = mix(vec3(0.95, 0.42, 0.12), vec3(1.0, 0.82, 0.35), ripple);
          gl_FragColor = vec4(col, rim * ripple * uOpacity * 0.42);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const baoShell1 = new THREE.Mesh(new THREE.SphereGeometry(7.2, 36, 36), baoMat1);
    const baoShell2 = new THREE.Mesh(new THREE.SphereGeometry(11.4, 36, 36), baoMat1);
    scene.add(baoShell1);
    scene.add(baoShell2);

    // 3. Procedural CMB Last-Scattering Anisotropy Shell (Epoch 4)
    const cmbMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 } },
      vertexShader: `
        varying vec3 vDir;
        varying vec3 vNormal;
        varying vec3 vViewPos;
        void main() {
          vDir = normalize(position);
          vNormal = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vViewPos = -mv.xyz;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uOpacity;
        varying vec3 vDir;
        varying vec3 vNormal;
        varying vec3 vViewPos;

        float hash3(vec3 p) {
          p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }

        float noise3(vec3 x) {
          vec3 i = floor(x);
          vec3 f = fract(x);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(mix(hash3(i + vec3(0,0,0)), hash3(i + vec3(1,0,0)), f.x),
                mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
            mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x),
                mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y),
            f.z
          );
        }

        float fbm3(vec3 p) {
          float v = 0.0;
          float amp = 0.5;
          for (int i = 0; i < 4; i++) {
            v += amp * noise3(p);
            p = p * 2.15 + vec3(1.7, 9.2, 3.4);
            amp *= 0.5;
          }
          return v;
        }

        void main() {
          vec3 p = vDir * 3.8 + vec3(uTime * 0.015, 0.0, -uTime * 0.01);
          float deltaT = fbm3(p);
          float contrast = smoothstep(0.28, 0.72, deltaT);

          // Planck false-color: cold deep cyan-blue vs warm amber-crimson
          vec3 coldCol = vec3(0.08, 0.36, 0.92);
          vec3 midCol = vec3(0.16, 0.65, 0.74);
          vec3 hotCol = vec3(0.98, 0.44, 0.12);
          vec3 col = mix(coldCol, midCol, smoothstep(0.0, 0.48, contrast));
          col = mix(col, hotCol, smoothstep(0.48, 1.0, contrast));

          float rim = 0.45 + 0.55 * pow(1.0 - abs(dot(normalize(vViewPos), normalize(vNormal))), 1.5);
          gl_FragColor = vec4(col, uOpacity * rim * 0.46);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    const cmbShell = new THREE.Mesh(new THREE.SphereGeometry(21, 48, 48), cmbMat);
    scene.add(cmbShell);

    // 4. Dark Matter Potential Filaments (Epoch 5)
    const dmGeo = new THREE.BufferGeometry();
    dmGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(createDarkMatterFilamentPositions(), 3),
    );
    const dmMat = new THREE.LineBasicMaterial({
      color: 0x7c3aed,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const darkMatterLines = new THREE.LineSegments(dmGeo, dmMat);
    scene.add(darkMatterLines);

    // 5. Background Deep-Space Stardust
    const starData = createBackgroundStarfieldData(isSoftwareGl ? 900 : 1600);
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starData.positions, 3));
    starGeo.setAttribute('aColor', new THREE.BufferAttribute(starData.colors, 3));
    starGeo.setAttribute('aSize', new THREE.BufferAttribute(starData.sizes, 1));

    const starMat = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: pixelRatio },
        uOpacity: { value: 0.45 },
      },
      vertexShader: `
        attribute vec3 aColor;
        attribute float aSize;
        uniform float uPixelRatio;
        varying vec3 vColor;
        void main() {
          vColor = aColor;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = clamp((aSize * 28.0 * uPixelRatio) / max(10.0, -mvPosition.z), 1.0, 5.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        varying vec3 vColor;
        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float r2 = dot(uv, uv);
          if (r2 > 0.25) discard;
          float falloff = exp(-r2 * 18.0);
          gl_FragColor = vec4(vColor, falloff * uOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const backgroundStars = new THREE.Points(starGeo, starMat);
    scene.add(backgroundStars);

    // 6. Central Energy Field Core (Epochs 1-3)
    const coreGroup = new THREE.Group();
    const innerCoreGeo = new THREE.SphereGeometry(1.1, 28, 28);
    const innerCoreMat = new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 0.85 } },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPos;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vViewPos = -mv.xyz;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        varying vec3 vNormal;
        varying vec3 vViewPos;
        void main() {
          float ndotv = max(0.0, dot(normalize(vViewPos), normalize(vNormal)));
          float glow = pow(ndotv, 2.2);
          vec3 col = mix(vec3(0.98, 0.72, 0.35), vec3(1.0, 0.98, 0.92), glow);
          gl_FragColor = vec4(col, glow * uOpacity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    coreGroup.add(new THREE.Mesh(innerCoreGeo, innerCoreMat));

    const coronaGeo = new THREE.SphereGeometry(2.1, 28, 28);
    const coronaMat = new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 0.45 } },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPos;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vViewPos = -mv.xyz;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        varying vec3 vNormal;
        varying vec3 vViewPos;
        void main() {
          float ndotv = max(0.0, dot(normalize(vViewPos), normalize(vNormal)));
          float glow = pow(ndotv, 2.8);
          gl_FragColor = vec4(vec3(0.38, 0.68, 1.0), glow * uOpacity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    coreGroup.add(new THREE.Mesh(coronaGeo, coronaMat));

    const haloGeo = new THREE.RingGeometry(1.9, 2.35, 64);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const haloRing = new THREE.Mesh(haloGeo, haloMat);
    haloRing.rotation.x = Math.PI * 0.42;
    coreGroup.add(haloRing);
    scene.add(coreGroup);

    // 7. Comoving Spacetime Metric Reference Grid
    const latticeGeo = createComovingLatticeGeometry();
    const latticeMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
    });
    const comovingLattice = new THREE.LineSegments(latticeGeo, latticeMat);
    scene.add(comovingLattice);

    // 8. Interactive Celestial Hotspots (Raycasting Layer + Visible Reticle Rings)
    const hotspotGroup = new THREE.Group();
    const hotspotProxies: THREE.Mesh[] = [];
    const hotspotEntries: Array<{
      hotspot: CelestialHotspot;
      anchor: THREE.Group;
      ringMat: THREE.MeshBasicMaterial;
      dotMat: THREE.MeshBasicMaterial;
      proxy: THREE.Mesh;
    }> = [];

    const sharedRingGeo = new THREE.RingGeometry(0.46, 0.58, 32);
    const sharedDotGeo = new THREE.SphereGeometry(0.16, 12, 12);
    const sharedProxyGeo = new THREE.SphereGeometry(1.35, 10, 10);
    const sharedProxyMat = new THREE.MeshBasicMaterial({ visible: false });

    for (const hotspot of CELESTIAL_HOTSPOTS) {
      const anchor = new THREE.Group();
      const color = new THREE.Color(hotspot.accentHex);

      const ringMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const ring = new THREE.Mesh(sharedRingGeo, ringMat);
      anchor.add(ring);

      const dotMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const dot = new THREE.Mesh(sharedDotGeo, dotMat);
      anchor.add(dot);

      const proxy = new THREE.Mesh(sharedProxyGeo, sharedProxyMat);
      proxy.userData.hotspot = hotspot;
      anchor.add(proxy);

      hotspotProxies.push(proxy);
      hotspotEntries.push({ hotspot, anchor, ringMat, dotMat, proxy });
      hotspotGroup.add(anchor);
    }
    scene.add(hotspotGroup);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Throttled Raycasting for Hover & Click Inspection
    let lastRaycastMs = 0;
    let pointerDownPos = { x: 0, y: 0 };

    const pickHotspot = (clientX: number, clientY: number): CelestialHotspot | null => {
      if (!showHotspotsRef.current) return null;
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      _pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      _pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      _raycaster.setFromCamera(_pointerNdc, camera);
      _visibleProxies.length = 0;
      for (let i = 0; i < hotspotProxies.length; i++) {
        const proxy = hotspotProxies[i];
        if (proxy.parent?.visible) _visibleProxies.push(proxy);
      }
      if (_visibleProxies.length === 0) return null;
      const hits = _raycaster.intersectObjects(_visibleProxies, false);
      if (hits.length > 0) {
        return (hits[0].object.userData.hotspot as CelestialHotspot) ?? null;
      }
      return null;
    };

    const handlePointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastRaycastMs < 45) return;
      lastRaycastMs = now;
      const hit = pickHotspot(e.clientX, e.clientY);
      const nextId = hit ? hit.id : null;
      if (nextId !== hoveredHotspotIdRef.current) {
        hoveredHotspotIdRef.current = nextId;
        setCursorPointer(nextId !== null);
        onHotspotHoverRef.current(hit);
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: PointerEvent) => {
      const moved = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (moved > 6) return; // Ignore orbit drag releases
      const hit = pickHotspot(e.clientX, e.clientY);
      onHotspotSelectRef.current(hit);
    };

    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);

    const handleResize = () => {
      if (!container) return;
      const w = Math.max(1, container.clientWidth || window.innerWidth);
      const h = Math.max(1, container.clientHeight || window.innerHeight);
      const nextPr = isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(nextPr);
      renderer.setSize(w, h);
      composer.setSize(w, h);
      bloomPass.resolution.set(w, h);
      particleMat.uniforms.uPixelRatio.value = nextPr;
      starMat.uniforms.uPixelRatio.value = nextPr;
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let frameId = 0;
    let disposed = false;
    let lastClockMs = performance.now();
    let elapsedSec = 0;
    let lastHudSyncMs = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function applySimulationState(p: number, timeSec: number, dt: number) {
      const clamped = clampProgress(p);
      if (Math.abs(clamped - lastAppliedProgressRef.current) > 1e-4) {
        updateCosmicParticleBuffers(particleBuffers, clamped);
        posAttr.needsUpdate = true;
        colAttr.needsUpdate = true;
        lastAppliedProgressRef.current = clamped;
      }

      const telemetry = computePhysicalTelemetry(clamped);
      const visual = computeEpochVisualParams(clamped);
      const activeEpochId = getEpochForProgress(clamped).id;

      // === [STAGE 3: EPOCH SHADERS & TRANSITIONS] ===
      particleMat.uniforms.uTime.value = timeSec;
      particleMat.uniforms.uProgress.value = clamped;
      particleMat.uniforms.uQuantumJitter.value = visual.quantumJitter;
      particleMat.uniforms.uInflationStreak.value = visual.inflationStreak;
      particleMat.uniforms.uPlasmaSwirl.value = visual.plasmaSwirl;
      particleMat.uniforms.uPointSizeScale.value = visual.pointSizeScale;
      particleMat.uniforms.uStarFlareMix.value = visual.starFlareMix;

      bloomPass.strength = visual.bloomStrength;
      bloomPass.threshold = visual.bloomThreshold;
      bloomPass.radius = visual.bloomRadius;

      // BAO acoustic pressure shells (Epoch 3)
      baoShell1.visible = visual.baoShellOpacity > 0.01;
      baoShell2.visible = visual.baoShellOpacity > 0.01;
      baoMat1.uniforms.uTime.value = timeSec;
      baoMat1.uniforms.uOpacity.value = visual.baoShellOpacity;
      if (baoShell1.visible) {
        const baoScale = 0.8 + telemetry.scaleFactorVisual * 0.45;
        baoShell1.scale.setScalar(baoScale);
        baoShell2.scale.setScalar(baoScale * 1.12);
      }

      // CMB spherical anisotropy shell (Epoch 4)
      cmbShell.visible = visual.cmbShellOpacity > 0.01;
      cmbMat.uniforms.uTime.value = timeSec;
      cmbMat.uniforms.uOpacity.value = visual.cmbShellOpacity;

      // Dark matter potential filaments (Epoch 5)
      darkMatterLines.visible = visual.darkMatterOpacity > 0.01;
      dmMat.opacity = visual.darkMatterOpacity * 0.34;
      darkMatterLines.rotation.y = timeSec * 0.014;

      // Comoving spacetime lattice
      comovingLattice.visible = showGridRef.current;
      const latticeScale = telemetry.scaleFactorVisual * 1.15;
      comovingLattice.scale.setScalar(latticeScale);
      latticeMat.opacity = 0.065 + 0.075 * (1 - clamped * 0.45);

      // Central energy field core (Epochs 1-3)
      const coreVisibility = 1 - THREE.MathUtils.smoothstep(clamped, 0.26, 0.46);
      coreGroup.visible = coreVisibility > 0.01;
      if (coreGroup.visible) {
        const pulse = 1 + 0.08 * Math.sin(timeSec * 3.1);
        const coreScale = (0.55 + telemetry.scaleFactorVisual * 0.65) * pulse;
        coreGroup.scale.setScalar(coreScale);
        innerCoreMat.uniforms.uOpacity.value = 0.85 * coreVisibility;
        coronaMat.uniforms.uOpacity.value = 0.42 * coreVisibility;
        haloMat.opacity = 0.22 * coreVisibility;
        haloRing.rotation.z = timeSec * 0.35;
      }

      // Interactive Celestial Hotspots positioning & billboard orientation
      hotspotGroup.visible = showHotspotsRef.current;
      for (const entry of hotspotEntries) {
        const activeForEpoch = entry.hotspot.epochIds.includes(activeEpochId);
        entry.anchor.visible = showHotspotsRef.current && activeForEpoch;
        if (!entry.anchor.visible) {
          if (hoveredHotspotIdRef.current === entry.hotspot.id) {
            hoveredHotspotIdRef.current = null;
            setCursorPointer(false);
            onHotspotHoverRef.current(null);
          }
          continue;
        }

        const [wx, wy, wz] = getHotspotWorldPosition(
          entry.hotspot,
          telemetry.scaleFactorVisual,
        );
        // Apply same subtle Y-axis rotation as cosmicParticles
        const rotY = timeSec * 0.014;
        const cs = Math.cos(rotY);
        const sn = Math.sin(rotY);
        entry.anchor.position.set(wx * cs + wz * sn, wy, -wx * sn + wz * cs);
        entry.anchor.quaternion.copy(camera.quaternion);

        const isHighlighted =
          hoveredHotspotIdRef.current === entry.hotspot.id ||
          selectedHotspotIdRef.current === entry.hotspot.id;
        const scale = isHighlighted ? 1.45 : 1.0 + 0.08 * Math.sin(timeSec * 2.5);
        entry.anchor.scale.setScalar(scale);
        entry.ringMat.opacity = isHighlighted ? 1.0 : 0.75;
        entry.dotMat.opacity = isHighlighted ? 1.0 : 0.85;
      }

      // Camera Mode: Panoramic Cruise smoothly yields on user OrbitControls interaction
      if (cameraModeRef.current === 'cruise') {
        const pose = getCruiseCameraPose(clamped, timeSec);
        const lambda = isSoftwareGl ? 10 : 2.6;
        camera.position.x = THREE.MathUtils.damp(camera.position.x, pose.position[0], lambda, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, pose.position[1], lambda, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, pose.position[2], lambda, dt);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, pose.target[0], lambda, dt);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, pose.target[1], lambda, dt);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, pose.target[2], lambda, dt);
      }

      backgroundStars.rotation.y = timeSec * 0.008;
      cosmicParticles.rotation.y = timeSec * 0.014;
    }

    applySimulationState(progressRef.current, 0, 0.016);

    function tick() {
      if (disposed) return;

      const nowMs = performance.now();
      const dt = Math.max(0.001, Math.min(0.05, (nowMs - lastClockMs) / 1000));
      lastClockMs = nowMs;
      elapsedSec += dt;

      if (isPlayingRef.current) {
        const nextP =
          progressRef.current + (dt * speedRef.current) / BASE_EVOLUTION_DURATION_SEC;
        if (nextP >= 1) {
          progressRef.current = 1;
          isPlayingRef.current = false;
          onProgressChangeRef.current(1);
          onPlaybackCompleteRef.current();
        } else {
          progressRef.current = nextP;
          if (nowMs - lastHudSyncMs >= 66) {
            lastHudSyncMs = nowMs;
            onProgressChangeRef.current(nextP);
          }
        }
      }

      applySimulationState(progressRef.current, elapsedSec, dt);
      controls.update();

      if (isSoftwareGl) {
        renderer.render(scene, camera);
        afterDraw(tick);
      } else {
        composer.render();
        frameId = window.requestAnimationFrame(tick);
      }
    }

    if (isSoftwareGl) {
      renderer.render(scene, camera);
      afterDraw(tick);
    } else {
      frameId = window.requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      controls.removeEventListener('start', handleControlsStart);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);

      controls.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      baoShell1.geometry.dispose();
      baoShell2.geometry.dispose();
      baoMat1.dispose();
      cmbShell.geometry.dispose();
      cmbMat.dispose();
      dmGeo.dispose();
      dmMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      innerCoreGeo.dispose();
      innerCoreMat.dispose();
      coronaGeo.dispose();
      coronaMat.dispose();
      haloGeo.dispose();
      haloMat.dispose();
      latticeGeo.dispose();
      latticeMat.dispose();
      sharedRingGeo.dispose();
      sharedDotGeo.dispose();
      sharedProxyGeo.dispose();
      sharedProxyMat.dispose();
      for (const entry of hotspotEntries) {
        entry.ringMat.dispose();
        entry.dotMat.dispose();
      }
      composer.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  if (webglUnavailable) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#03050c] text-slate-200 p-6">
        <div className="max-w-md border border-white/15 bg-[#0b1020] rounded-xl p-6 text-center space-y-2">
          <h2 className="font-display text-lg font-semibold">WebGL 渲染环境不可用</h2>
          <p className="text-sm text-slate-400">
            当前浏览器未开启硬件或软件 WebGL2 支持，请尝试启用硬件加速后刷新页面。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      <div
        ref={mountRef}
        data-testid="cosmos-canvas-container"
        className={`w-full h-full ${
          cursorPointer ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
        }`}
      />
      {contextLost && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#03050c]/85 text-slate-200 z-30">
          <div className="border border-white/15 bg-[#0b1020] rounded-xl px-5 py-4 text-sm">
            WebGL 上下文已暂停，正在尝试恢复渲染…
          </div>
        </div>
      )}
    </div>
  );
}
