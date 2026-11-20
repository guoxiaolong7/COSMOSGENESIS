import { EPOCHS, clampProgress, lerp, smoothstep } from './epochs';

export interface CelestialHotspot {
  id: string;
  epochIds: number[];
  title: string;
  category: string;
  metricBadge: string;
  description: string;
  /** Base 3D anchor in simulation space */
  basePosition: [number, number, number];
  /** Scales with visual scale factor a(t) or stays virialized */
  scalesWithMetric: boolean;
  accentHex: string;
}

export interface EpochVisualParams {
  bloomStrength: number;
  bloomThreshold: number;
  bloomRadius: number;
  pointSizeScale: number;
  quantumJitter: number;
  inflationStreak: number;
  plasmaSwirl: number;
  baoShellOpacity: number;
  cmbShellOpacity: number;
  darkMatterOpacity: number;
  starFlareMix: number;
  spiralMix: number;
}

export interface CruiseCameraPose {
  position: [number, number, number];
  target: [number, number, number];
}

export const CELESTIAL_HOTSPOTS: readonly CelestialHotspot[] = [
  {
    id: 'quantum-foam',
    epochIds: [1],
    title: '量子真空零点涨落',
    category: '普朗克 / 大统一能标',
    metricBadge: 'ΔE·Δt ~ ħ',
    description:
      '在极早期高能态下，不存在经典粒子轨道；不确定性原理驱动能量密度在微观尺度不断涨落，构成后续宇宙大尺度结构的最初源头。',
    basePosition: [0.6, 0.4, 0.8],
    scalesWithMetric: false,
    accentHex: '#e0f2fe',
  },
  {
    id: 'inflation-seed',
    epochIds: [2],
    title: '暴胀原初密度扰动种子',
    category: '尺度不变高斯涨落',
    metricBadge: 'nₛ ≈ 0.965',
    description:
      '指数级暴胀将亚原子尺度的量子涨落瞬间拉伸至超越哈勃视界，并“冻结”为微弱但长程关联的密度高低起伏。',
    basePosition: [3.2, 1.8, -2.4],
    scalesWithMetric: true,
    accentHex: '#38bdf8',
  },
  {
    id: 'bao-wave',
    epochIds: [3],
    title: '重子声学振荡波峰 (BAO)',
    category: '光子-重子耦合流体',
    metricBadge: 'cₛ ≈ c / √3',
    description:
      '在炽热不透明的等离子体时期，辐射压与引力相互角力，在流体中激发出以近三分之一光速传播的球面声学压缩波纹。',
    basePosition: [-4.6, 1.2, 3.8],
    scalesWithMetric: true,
    accentHex: '#fb923c',
  },
  {
    id: 'cmb-hotspot',
    epochIds: [4],
    title: 'CMB 最后散射面温度起伏',
    category: '宇宙微波背景遗迹',
    metricBadge: 'ΔT / T ~ 10⁻⁵',
    description:
      '中性氢复合瞬间，光子不再被自由电子散射。球壳上的暖斑对应原始势阱过密区，冷斑对应欠密区（此处放大对比度以便观测）。',
    basePosition: [7.8, 3.6, -5.2],
    scalesWithMetric: true,
    accentHex: '#f59e0b',
  },
  {
    id: 'pop3-star',
    epochIds: [5],
    title: '第三星族第一代恒星 (Pop III)',
    category: '宇宙黎明 · 零金属丰度',
    metricBadge: 'M ~ 100 M☉',
    description:
      '原始氢氦气体沿暗物质丝状势阱坍缩，点燃寿命短暂却极其炽热的蓝白色第一代恒星，释放强紫外光子开启宇宙再电离。',
    basePosition: [-5.8, -2.4, -4.2],
    scalesWithMetric: true,
    accentHex: '#93c5fd',
  },
  {
    id: 'cosmic-cluster',
    epochIds: [6],
    title: '星系团节点与旋涡星系群',
    category: '引力束缚 · 局部退耦',
    metricBadge: 'H₀ ≈ 67.4 km/s/Mpc',
    description:
      '星系团内部已达到维里平衡并脱离局域哈勃膨胀；而团际巨大空洞（Voids）则在暗能量（Λ）主导下持续加速扩张。',
    basePosition: [6.4, -1.8, 5.4],
    scalesWithMetric: true,
    accentHex: '#a5b4fc',
  },
] as const;

export function getActiveHotspots(progress: number): CelestialHotspot[] {
  const p = clampProgress(progress);
  let activeEpochId = 1;
  for (let i = 0; i < EPOCHS.length; i++) {
    const ep = EPOCHS[i];
    if (p >= ep.range[0] && (p < ep.range[1] || i === EPOCHS.length - 1)) {
      activeEpochId = ep.id;
      break;
    }
  }
  return CELESTIAL_HOTSPOTS.filter((h) => h.epochIds.includes(activeEpochId));
}

export function getHotspotWorldPosition(
  hotspot: CelestialHotspot,
  scaleFactorVisual: number,
): [number, number, number] {
  const s = hotspot.scalesWithMetric ? 0.55 + scaleFactorVisual * 0.55 : 1.0;
  return [
    hotspot.basePosition[0] * s,
    hotspot.basePosition[1] * s,
    hotspot.basePosition[2] * s,
  ];
}

/**
 * Computes smoothly blended per-epoch shader & post-processing parameters
 * so every epoch exhibits distinct morphology, color temperature, and glow.
 */
export function computeEpochVisualParams(progress: number): EpochVisualParams {
  const p = clampProgress(progress);

  const quantumJitter = 1 - smoothstep(0.06, 0.24, p);
  const inflationStreak = smoothstep(0.1, 0.16, p) * (1 - smoothstep(0.24, 0.34, p));
  const plasmaSwirl = smoothstep(0.22, 0.3, p) * (1 - smoothstep(0.42, 0.54, p));
  const baoShellOpacity = smoothstep(0.25, 0.33, p) * (1 - smoothstep(0.43, 0.53, p));
  const cmbShellOpacity = smoothstep(0.41, 0.49, p) * (1 - smoothstep(0.6, 0.69, p));
  const darkMatterOpacity = smoothstep(0.58, 0.67, p) * (1 - smoothstep(0.84, 0.96, p));
  const starFlareMix = smoothstep(0.64, 0.74, p);
  const spiralMix = smoothstep(0.78, 0.9, p);

  const bloomStrength =
    1.55 * (1 - smoothstep(0.12, 0.3, p)) +
    1.22 * plasmaSwirl +
    0.72 * cmbShellOpacity +
    0.96 * starFlareMix;

  const bloomThreshold = lerp(0.16, 0.32, smoothstep(0.25, 0.75, p));
  const bloomRadius = lerp(0.62, 0.38, smoothstep(0.2, 0.85, p));

  // Larger soft clouds during plasma fog, crisp sharp stars in Epoch 5-6
  const pointSizeScale =
    1.05 +
    0.72 * plasmaSwirl -
    0.22 * smoothstep(0.6, 0.95, p);

  return {
    bloomStrength: Math.max(0.65, Math.min(1.75, bloomStrength)),
    bloomThreshold,
    bloomRadius,
    pointSizeScale,
    quantumJitter,
    inflationStreak,
    plasmaSwirl,
    baoShellOpacity,
    cmbShellOpacity,
    darkMatterOpacity,
    starFlareMix,
    spiralMix,
  };
}

/**
 * Curated, restrained cinematic cruise camera trajectory that frames each epoch
 * cleanly within [minDistance=4.5, maxDistance=68].
 */
export function getCruiseCameraPose(progress: number, timeSec: number): CruiseCameraPose {
  const p = clampProgress(progress);

  // Smooth distance choreography from intimate quantum core -> wide cosmic web
  const baseRadius =
    11.5 +
    8.5 * smoothstep(0.1, 0.28, p) +
    6.5 * smoothstep(0.28, 0.62, p) +
    5.5 * smoothstep(0.62, 1.0, p);

  const orbitAngle = p * Math.PI * 1.45 + timeSec * 0.055;
  const elevation =
    2.6 +
    3.4 * Math.sin(p * Math.PI * 1.3 + 0.4) +
    1.2 * Math.cos(timeSec * 0.14);

  const x = Math.sin(orbitAngle) * baseRadius;
  const z = Math.cos(orbitAngle) * baseRadius;
  const y = Math.max(-14, Math.min(18, elevation));

  return {
    position: [x, y, z],
    target: [0, 0, 0],
  };
}
