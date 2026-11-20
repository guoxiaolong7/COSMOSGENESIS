export const DESKTOP_PARTICLE_COUNT = 20000;
export const MOBILE_PARTICLE_COUNT = 7000;

export interface EpochInfo {
  id: 1 | 2 | 3 | 4 | 5 | 6;
  key: 'quantum' | 'inflation' | 'plasma' | 'cmb' | 'dawn' | 'cosmicweb';
  shortLabel: string;
  title: string;
  enTitle: string;
  range: [number, number];
  anchor: number;
  timeSpan: string;
  tempSpan: string;
  accentColor: string;
  bloomStrength: number;
  summary: string;
  approxNote: string;
}

export const EPOCHS: readonly EpochInfo[] = [
  {
    id: 1,
    key: 'quantum',
    shortLabel: '01 量子涨落',
    title: '量子涨落与极早期高能态',
    enTitle: 'Quantum Fluctuations & Planck Era',
    range: [0.0, 0.12],
    anchor: 0.05,
    timeSpan: '10⁻⁴³ s – 10⁻³⁶ s',
    tempSpan: '≳ 10³² K → 10²⁸ K',
    accentColor: '#e0f2fe',
    bloomStrength: 1.55,
    summary:
      '时空曲率与能量密度达到普朗克与大统一能标，基本相互作用尚未完全分离，真空零点涨落在微观尺度剧烈起伏。',
    approxNote:
      '视觉近似：真实量子引力尚无经典粒子轨迹，此处以高频随机位移场近似量子泡沫涨落。',
  },
  {
    id: 2,
    key: 'inflation',
    shortLabel: '02 暴胀种子',
    title: '指数级暴胀与密度种子',
    enTitle: 'Cosmic Inflation & Primordial Seeds',
    range: [0.12, 0.26],
    anchor: 0.19,
    timeSpan: '10⁻³⁶ s – 10⁻³² s',
    tempSpan: '10²⁷ K → 10²⁵ K',
    accentColor: '#38bdf8',
    bloomStrength: 1.35,
    summary:
      '暴胀子场驱动空间度规呈指数级拉伸，将微观量子涨落冻结并放大为日后星系诞生的原初密度扰动种子。',
    approxNote:
      '视觉近似：将 e⁶⁰ 倍真实暴胀尺度压缩为平滑对数膨胀，并通过共动晶格拉伸体现空间度量增长。',
  },
  {
    id: 3,
    key: 'plasma',
    shortLabel: '03 太初炽雾',
    title: '夸克汤 / 太初核合成炽热雾',
    enTitle: 'Quark-Gluon Plasma & BBN',
    range: [0.26, 0.44],
    anchor: 0.35,
    timeSpan: '10⁻⁶ s – 20 min',
    tempSpan: '10¹² K → 10⁹ K',
    accentColor: '#fb923c',
    bloomStrength: 1.2,
    summary:
      '夸克与胶子强子化形成质子与中子，随后在数分钟内完成太初核合成，产生氢、氦-4 等轻元素；光子被自由电子频繁散射。',
    approxNote:
      '视觉近似：以光学厚炽热金橙色粒子雾与声学球面波纹近似光子-重子耦合等离子体流体。',
  },
  {
    id: 4,
    key: 'cmb',
    shortLabel: '04 复合CMB',
    title: '38 万年复合与 CMB 光子释放',
    enTitle: 'Recombination & CMB Decoupling',
    range: [0.44, 0.62],
    anchor: 0.53,
    timeSpan: '≈ 380,000 yr',
    tempSpan: '≈ 3,000 K',
    accentColor: '#f59e0b',
    bloomStrength: 0.85,
    summary:
      '宇宙冷却至约 3000 K，电子与质子结合为中性氢原子，光子终于得以自由穿行并留下宇宙微波背景（CMB）最后散射面印记。',
    approxNote:
      '视觉近似：将十万分之一量级的 CMB 温度涨落对比度放大，以红暖/蓝冷伪彩球壳可视化呈现。',
  },
  {
    id: 5,
    key: 'dawn',
    shortLabel: '05 第一代星',
    title: '黑暗时代与第一代恒星点亮',
    enTitle: 'Dark Ages & Cosmic Dawn (Pop III)',
    range: [0.62, 0.8],
    anchor: 0.71,
    timeSpan: '380 kyr – 400 Myr',
    tempSpan: '3,000 K → 60 K',
    accentColor: '#60a5fa',
    bloomStrength: 1.0,
    summary:
      '背景辐射红移至红外，宇宙进入黑暗时代；重子气体沿暗物质引力势阱坍缩，点燃炙热短寿的第三星族（Pop III）第一代恒星。',
    approxNote:
      '视觉近似：真实暗物质不可见，以微弱暗紫色势阱丝带辅助标示重子气体向节点坍缩的路径。',
  },
  {
    id: 6,
    key: 'cosmicweb',
    shortLabel: '06 宇宙网',
    title: '宇宙网、星系团与暗能量加速膨胀',
    enTitle: 'Cosmic Web & Dark Energy Acceleration',
    range: [0.8, 1.0],
    anchor: 0.9,
    timeSpan: '1 Gyr – 13.8 Gyr',
    tempSpan: '→ 2.725 K',
    accentColor: '#818cf8',
    bloomStrength: 0.92,
    summary:
      '星系团与纤维状宇宙网成熟定型；星系内部引力束缚态停止膨胀，而团际巨大空洞在暗能量主导下加速扩张。',
    approxNote:
      '视觉近似：以程序化纤维节点场近似 N 体引力坍缩结构，体现局部引力退耦与大尺度加速膨胀。',
  },
] as const;

export interface PhysicalTelemetry {
  epoch: EpochInfo;
  timeLabel: string;
  tempLabel: string;
  redshiftLabel: string;
  scaleFactorVisual: number;
  bloomStrength: number;
}

export function clampProgress(p: number): number {
  if (!Number.isFinite(p)) return 0;
  return Math.max(0, Math.min(1, p));
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function getParticleBudget(viewportWidth: number, isTouchDevice: boolean): number {
  if (viewportWidth < 768 || (isTouchDevice && viewportWidth < 1024)) {
    return MOBILE_PARTICLE_COUNT;
  }
  return DESKTOP_PARTICLE_COUNT;
}

export function getEpochForProgress(progress: number): EpochInfo {
  const p = clampProgress(progress);
  for (let i = 0; i < EPOCHS.length; i++) {
    const ep = EPOCHS[i];
    if (p >= ep.range[0] && (p < ep.range[1] || i === EPOCHS.length - 1)) {
      return ep;
    }
  }
  return EPOCHS[0];
}

/**
 * Returns normalized blend weights [w0..w5] with smooth crossfades near epoch boundaries.
 */
export function getEpochWeights(progress: number): [number, number, number, number, number, number] {
  const p = clampProgress(progress);
  const raw: number[] = [0, 0, 0, 0, 0, 0];
  const feather = 0.035;

  for (let i = 0; i < EPOCHS.length; i++) {
    const [start, end] = EPOCHS[i].range;
    const enter = i === 0 ? 1 : smoothstep(start - feather, start + feather, p);
    const exit = i === EPOCHS.length - 1 ? 1 : 1 - smoothstep(end - feather, end + feather, p);
    raw[i] = Math.max(0, enter * exit);
  }

  let sum = 0;
  for (let i = 0; i < 6; i++) sum += raw[i];
  if (sum <= 1e-6) {
    return [1, 0, 0, 0, 0, 0];
  }
  return [
    raw[0] / sum,
    raw[1] / sum,
    raw[2] / sum,
    raw[3] / sum,
    raw[4] / sum,
    raw[5] / sum,
  ];
}

function formatScientificPower(exp10: number, unit: string): string {
  const rounded = Math.round(exp10);
  return `10^${rounded} ${unit}`;
}

/**
 * Nonlinear mapping from normalized progress [0, 1] -> physical cosmic time,
 * temperature, redshift, and visual metric scale factor a_vis(p).
 */
export function computePhysicalTelemetry(progress: number): PhysicalTelemetry {
  const p = clampProgress(progress);
  const epoch = getEpochForProgress(p);
  const weights = getEpochWeights(p);

  // Piecewise logarithmic time (seconds) across 60+ orders of magnitude
  let logSec = -43;
  if (p < 0.12) {
    logSec = lerp(-43, -36, p / 0.12);
  } else if (p < 0.26) {
    logSec = lerp(-36, -32, (p - 0.12) / 0.14);
  } else if (p < 0.44) {
    // 10^-6 s -> 20 min (1200 s, log10 ≈ 3.08)
    logSec = lerp(-6, Math.log10(1200), (p - 0.26) / 0.18);
  } else if (p < 0.53) {
    // 20 min -> Recombination at ~380,000 yr (1.20e13 s, log10 ≈ 13.079)
    logSec = lerp(Math.log10(1200), 13.079, smoothstep(0.44, 0.53, p));
  } else if (p < 0.62) {
    // 380,000 yr -> 1.2 Myr (end of decoupling window)
    logSec = lerp(13.079, 13.58, (p - 0.53) / 0.09);
  } else if (p < 0.8) {
    // 1.2 Myr -> 400 Myr (~1.26e16 s)
    logSec = lerp(13.58, 16.1, (p - 0.62) / 0.18);
  } else {
    // 400 Myr -> 13.8 Gyr (~4.35e17 s)
    logSec = lerp(16.1, 17.638, (p - 0.8) / 0.2);
  }

  let timeLabel: string;
  const seconds = Math.pow(10, logSec);
  const yearSec = 3.15576e7;
  if (logSec < -3) {
    timeLabel = `t ≈ ${formatScientificPower(logSec, 's')}`;
  } else if (seconds < 120) {
    timeLabel = `t ≈ ${seconds.toFixed(1)} s`;
  } else if (seconds < 3600) {
    timeLabel = `t ≈ ${(seconds / 60).toFixed(1)} min`;
  } else if (seconds < yearSec * 1000) {
    const yrs = seconds / yearSec;
    timeLabel = yrs < 1 ? `t ≈ ${(seconds / 86400).toFixed(0)} d` : `t ≈ ${yrs.toFixed(0)} yr`;
  } else if (seconds < yearSec * 1e6) {
    timeLabel = `t ≈ ${(seconds / (yearSec * 1e3)).toFixed(0)} kyr`;
  } else if (seconds < yearSec * 1e9) {
    timeLabel = `t ≈ ${(seconds / (yearSec * 1e6)).toFixed(0)} Myr`;
  } else {
    timeLabel = `t ≈ ${(seconds / (yearSec * 1e9)).toFixed(2)} Gyr`;
  }

  // Piecewise logarithmic temperature (Kelvin)
  let logTemp = 32;
  if (p < 0.12) {
    logTemp = lerp(32, 28, p / 0.12);
  } else if (p < 0.26) {
    logTemp = lerp(27.5, 25, (p - 0.12) / 0.14);
  } else if (p < 0.44) {
    logTemp = lerp(12, 9, (p - 0.26) / 0.18);
  } else if (p < 0.53) {
    // Cooling from 10^9 K down to Recombination ~3,000 K
    logTemp = lerp(9, Math.log10(3000), smoothstep(0.44, 0.53, p));
  } else if (p < 0.62) {
    // 3,000 K -> ~2,000 K
    logTemp = lerp(Math.log10(3000), Math.log10(2000), (p - 0.53) / 0.09);
  } else if (p < 0.8) {
    logTemp = lerp(Math.log10(2000), Math.log10(60), (p - 0.62) / 0.18);
  } else {
    logTemp = lerp(Math.log10(60), Math.log10(2.725), (p - 0.8) / 0.2);
  }

  let tempLabel: string;
  if (logTemp >= 5.5) {
    tempLabel = `T ≈ ${formatScientificPower(logTemp, 'K')}`;
  } else {
    const kelvin = Math.pow(10, logTemp);
    tempLabel = kelvin >= 100 ? `T ≈ ${Math.round(kelvin).toLocaleString('en-US')} K` : `T ≈ ${kelvin.toFixed(2)} K`;
  }

  // Redshift z (meaningful post-BBN / photon decoupling onward)
  let redshiftLabel = 'z ≫ 10⁹';
  if (p >= 0.44 && p < 0.62) {
    const z = lerp(1100, 1050, (p - 0.44) / 0.18);
    redshiftLabel = `z ≈ ${Math.round(z)}`;
  } else if (p >= 0.62 && p < 0.8) {
    const z = lerp(1050, 12, (p - 0.62) / 0.18);
    redshiftLabel = `z ≈ ${z.toFixed(0)}`;
  } else if (p >= 0.8) {
    const z = lerp(12, 0, smoothstep(0.8, 1.0, p));
    redshiftLabel = `z ≈ ${z.toFixed(2)}`;
  } else if (p >= 0.26) {
    redshiftLabel = 'z > 10⁸';
  }

  // Visual metric scale factor a_vis(p):
  // Smoothly grows from compact quantum core (0.18) -> inflation surge -> cosmic expansion (2.45)
  const scaleFactorVisual =
    0.18 +
    0.72 * smoothstep(0.1, 0.28, p) +
    0.55 * smoothstep(0.26, 0.62, p) +
    0.45 * smoothstep(0.62, 0.82, p) +
    0.58 * Math.pow(smoothstep(0.8, 1.0, p), 1.35);

  let bloomStrength = 0;
  for (let i = 0; i < 6; i++) {
    bloomStrength += EPOCHS[i].bloomStrength * weights[i];
  }

  return {
    epoch,
    timeLabel,
    tempLabel,
    redshiftLabel,
    scaleFactorVisual,
    bloomStrength,
  };
}
