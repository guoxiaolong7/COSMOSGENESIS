import { clampProgress, getEpochWeights } from './epochs';

export interface CosmicParticleBuffers {
  count: number;
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  phases: Float32Array;
  epochPositions: [
    Float32Array,
    Float32Array,
    Float32Array,
    Float32Array,
    Float32Array,
    Float32Array,
  ];
  epochColors: [
    Float32Array,
    Float32Array,
    Float32Array,
    Float32Array,
    Float32Array,
    Float32Array,
  ];
}

export interface BackgroundStarfieldBuffers {
  count: number;
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
}

/** Deterministic PRNG (Mulberry32) so particle layouts are reproducible */
function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomUnitSphere(rng: () => number): [number, number, number] {
  const u = rng();
  const v = rng();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const sinPhi = Math.sin(phi);
  return [
    sinPhi * Math.cos(theta),
    sinPhi * Math.sin(theta),
    Math.cos(phi),
  ];
}

function lerp3(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function buildClusterNodesAndFilaments() {
  const rng = createRng(42013800);
  const nodeCount = 22;
  const nodes: Array<[number, number, number]> = [];
  const tilts: Array<{ ax: number; az: number }> = [];

  for (let n = 0; n < nodeCount; n++) {
    const [dx, dy, dz] = randomUnitSphere(rng);
    const r = 4.6 + Math.pow(rng(), 0.72) * 14.4;
    nodes.push([dx * r, dy * r * 0.76, dz * r]);
    tilts.push({
      ax: (rng() - 0.5) * 1.8,
      az: (rng() - 0.5) * 1.8,
    });
  }

  const filaments: Array<[number, number]> = [];
  for (let a = 0; a < nodeCount; a++) {
    const dists: Array<{ idx: number; d: number }> = [];
    for (let b = 0; b < nodeCount; b++) {
      if (a === b) continue;
      const dx = nodes[a][0] - nodes[b][0];
      const dy = nodes[a][1] - nodes[b][1];
      const dz = nodes[a][2] - nodes[b][2];
      dists.push({ idx: b, d: Math.hypot(dx, dy, dz) });
    }
    dists.sort((u, v) => u.d - v.d);
    for (let k = 0; k < 2; k++) {
      const b = dists[k].idx;
      if (a < b) filaments.push([a, b]);
    }
  }

  return { nodeCount, nodes, tilts, filaments };
}

/**
 * Generates line segment vertices for Dark Matter gravitational potential filaments
 * revealed softly during Epoch 5 (Dark Ages -> Cosmic Dawn).
 */
export function createDarkMatterFilamentPositions(): Float32Array {
  const { nodes, filaments } = buildClusterNodesAndFilaments();
  const out = new Float32Array(filaments.length * 6);
  for (let i = 0; i < filaments.length; i++) {
    const [a, b] = filaments[i];
    const base = i * 6;
    out[base] = nodes[a][0] * 1.05;
    out[base + 1] = nodes[a][1] * 1.05;
    out[base + 2] = nodes[a][2] * 1.05;
    out[base + 3] = nodes[b][0] * 1.05;
    out[base + 4] = nodes[b][1] * 1.05;
    out[base + 5] = nodes[b][2] * 1.05;
  }
  return out;
}

/**
 * Generates deterministic multi-epoch Float32Array particle positions & colors
 * representing metric spatial expansion + gravitational clustering + spiral galaxy clusters.
 */
export function createCosmicParticleBuffers(count: number): CosmicParticleBuffers {
  const rng = createRng(138002026);
  const { nodeCount, nodes, tilts, filaments } = buildClusterNodesAndFilaments();

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);

  const epochPositions: [
    Float32Array,
    Float32Array,
    Float32Array,
    Float32Array,
    Float32Array,
    Float32Array,
  ] = [
    new Float32Array(count * 3),
    new Float32Array(count * 3),
    new Float32Array(count * 3),
    new Float32Array(count * 3),
    new Float32Array(count * 3),
    new Float32Array(count * 3),
  ];

  const epochColors: [
    Float32Array,
    Float32Array,
    Float32Array,
    Float32Array,
    Float32Array,
    Float32Array,
  ] = [
    new Float32Array(count * 3),
    new Float32Array(count * 3),
    new Float32Array(count * 3),
    new Float32Array(count * 3),
    new Float32Array(count * 3),
    new Float32Array(count * 3),
  ];

  for (let i = 0; i < count; i++) {
    const idx3 = i * 3;
    const [ux, uy, uz] = randomUnitSphere(rng);
    const comovingRadius = Math.cbrt(rng());
    const phase = rng() * Math.PI * 2;
    phases[i] = phase;
    sizes[i] = 0.65 + Math.pow(rng(), 2.2) * 2.1;

    // 1. Epoch 1: Quantum Fluctuations & Planck/GUT State
    const r1 = 0.25 + Math.pow(comovingRadius, 1.35) * 2.15;
    epochPositions[0][idx3] = ux * r1;
    epochPositions[0][idx3 + 1] = uy * r1;
    epochPositions[0][idx3 + 2] = uz * r1;

    const heat1 = rng();
    epochColors[0][idx3] = lerp3(0.84, 1.0, heat1);
    epochColors[0][idx3 + 1] = lerp3(0.82, 0.96, heat1);
    epochColors[0][idx3 + 2] = lerp3(1.0, 0.9, heat1 * 0.5);

    // 2. Epoch 2: Cosmic Inflation & Primordial Density Seeds
    const seedWave = 1 + 0.16 * Math.sin(ux * 6.0 + uy * 5.0) * Math.cos(uz * 6.0);
    const r2 = (1.6 + comovingRadius * 8.2) * seedWave;
    epochPositions[1][idx3] = ux * r2;
    epochPositions[1][idx3 + 1] = uy * r2 * 0.9;
    epochPositions[1][idx3 + 2] = uz * r2;

    const cool2 = rng();
    epochColors[1][idx3] = lerp3(0.45, 1.0, cool2);
    epochColors[1][idx3 + 1] = lerp3(0.86, 0.92, cool2);
    epochColors[1][idx3 + 2] = lerp3(1.0, 0.62, cool2);

    // 3. Epoch 3: Quark-Gluon Plasma & BBN (BAO acoustic shells)
    const baoShell = 1 + 0.14 * Math.sin(comovingRadius * Math.PI * 5.5);
    const r3 = (1.9 + comovingRadius * 10.8) * baoShell;
    epochPositions[2][idx3] = ux * r3;
    epochPositions[2][idx3 + 1] = uy * r3 * 0.9;
    epochPositions[2][idx3 + 2] = uz * r3;

    const plasmaTemp = 1 - comovingRadius * 0.45 + (rng() - 0.5) * 0.25;
    epochColors[2][idx3] = Math.min(1, lerp3(0.92, 1.0, plasmaTemp));
    epochColors[2][idx3 + 1] = Math.max(0.24, lerp3(0.3, 0.78, plasmaTemp));
    epochColors[2][idx3 + 2] = Math.max(0.05, lerp3(0.07, 0.34, plasmaTemp));

    // 4. Epoch 4: Recombination & CMB Decoupling
    const isShellParticle = i % 3 === 0;
    const r4 = isShellParticle ? 13.8 + (rng() - 0.5) * 1.4 : 2.4 + comovingRadius * 12.4;
    epochPositions[3][idx3] = ux * r4;
    epochPositions[3][idx3 + 1] = uy * r4 * 0.94;
    epochPositions[3][idx3 + 2] = uz * r4;

    const dipole =
      Math.sin(ux * 3.4 + 0.5) * Math.cos(uy * 3.1) +
      0.65 * Math.sin(uz * 5.2 - ux * 2.7) +
      0.35 * Math.cos((ux + uy + uz) * 7.1);
    const aniso = Math.max(0, Math.min(1, 0.5 + dipole * 0.36));
    epochColors[3][idx3] = lerp3(0.1, 0.98, aniso);
    epochColors[3][idx3 + 1] = lerp3(0.42, 0.58, aniso * (1 - aniso * 0.25));
    epochColors[3][idx3 + 2] = lerp3(0.96, 0.14, aniso);

    // 5. Epoch 5: Dark Ages & Pop III First Stars
    const filIdx = i % filaments.length;
    const [na, nb] = filaments[filIdx];
    const tEdge = rng();
    const jitterScale5 = 1.05 + rng() * 1.85;
    const [jx5, jy5, jz5] = randomUnitSphere(rng);
    epochPositions[4][idx3] = lerp3(nodes[na][0], nodes[nb][0], tEdge) * 0.88 + jx5 * jitterScale5;
    epochPositions[4][idx3 + 1] = lerp3(nodes[na][1], nodes[nb][1], tEdge) * 0.88 + jy5 * jitterScale5;
    epochPositions[4][idx3 + 2] = lerp3(nodes[na][2], nodes[nb][2], tEdge) * 0.88 + jz5 * jitterScale5;

    const isPopIII = rng() > 0.84;
    if (isPopIII) {
      epochColors[4][idx3] = 0.78;
      epochColors[4][idx3 + 1] = 0.92;
      epochColors[4][idx3 + 2] = 1.0;
    } else {
      epochColors[4][idx3] = 0.18;
      epochColors[4][idx3 + 1] = 0.14;
      epochColors[4][idx3 + 2] = 0.42;
    }

    // 6. Epoch 6: Cosmic Web Filaments & Tilted Spiral Galaxy Clusters
    const role = rng();
    let x6: number;
    let y6: number;
    let z6: number;
    if (role < 0.44) {
      // Spiral galaxy / virialized cluster node with central bulge + 2-arm disk
      const nIdx = i % nodeCount;
      const isBulge = rng() < 0.34;
      let lx: number;
      let ly: number;
      let lz: number;
      if (isBulge) {
        const [bx, by, bz] = randomUnitSphere(rng);
        const br = Math.pow(rng(), 1.9) * 0.58;
        lx = bx * br;
        ly = by * br * 0.55;
        lz = bz * br;
      } else {
        const arm = i % 2;
        const radial = 0.28 + Math.pow(rng(), 1.15) * 1.85;
        const spiralAngle = arm * Math.PI + radial * 2.9 + (rng() - 0.5) * 0.78;
        const thickness = (rng() - 0.5) * 0.24 * (1 - radial * 0.25);
        lx = Math.cos(spiralAngle) * radial;
        ly = thickness;
        lz = Math.sin(spiralAngle) * radial;
      }

      // Tilt each galaxy cluster disk cleanly in 3D
      const { ax, az } = tilts[nIdx];
      const cosX = Math.cos(ax);
      const sinX = Math.sin(ax);
      const cosZ = Math.cos(az);
      const sinZ = Math.sin(az);
      const y1 = ly * cosX - lz * sinX;
      const z1 = ly * sinX + lz * cosX;
      const x2 = lx * cosZ - y1 * sinZ;
      const y2 = lx * sinZ + y1 * cosZ;

      x6 = nodes[nIdx][0] * 1.18 + x2;
      y6 = nodes[nIdx][1] * 1.18 + y2;
      z6 = nodes[nIdx][2] * 1.18 + z1;
    } else if (role < 0.89) {
      // Cosmic web filament bridges
      const [sx, sy, sz] = randomUnitSphere(rng);
      const tubeR = Math.pow(rng(), 1.5) * 0.78;
      x6 = lerp3(nodes[na][0], nodes[nb][0], tEdge) * 1.18 + sx * tubeR;
      y6 = lerp3(nodes[na][1], nodes[nb][1], tEdge) * 1.18 + sy * tubeR;
      z6 = lerp3(nodes[na][2], nodes[nb][2], tEdge) * 1.18 + sz * tubeR;
    } else {
      // Sparse dark-energy void field
      const rVoid = 6.5 + comovingRadius * 17.5;
      x6 = ux * rVoid;
      y6 = uy * rVoid * 0.85;
      z6 = uz * rVoid;
    }
    epochPositions[5][idx3] = x6;
    epochPositions[5][idx3 + 1] = y6;
    epochPositions[5][idx3 + 2] = z6;

    const pop = rng();
    if (role < 0.44) {
      if (pop < 0.48) {
        epochColors[5][idx3] = 0.62;
        epochColors[5][idx3 + 1] = 0.84;
        epochColors[5][idx3 + 2] = 1.0;
      } else if (pop < 0.85) {
        epochColors[5][idx3] = 1.0;
        epochColors[5][idx3 + 1] = 0.88;
        epochColors[5][idx3 + 2] = 0.62;
      } else {
        epochColors[5][idx3] = 0.98;
        epochColors[5][idx3 + 1] = 0.52;
        epochColors[5][idx3 + 2] = 0.6;
      }
    } else {
      epochColors[5][idx3] = 0.34;
      epochColors[5][idx3 + 1] = 0.45;
      epochColors[5][idx3 + 2] = 0.88;
    }

    positions[idx3] = epochPositions[0][idx3];
    positions[idx3 + 1] = epochPositions[0][idx3 + 1];
    positions[idx3 + 2] = epochPositions[0][idx3 + 2];

    colors[idx3] = epochColors[0][idx3];
    colors[idx3 + 1] = epochColors[0][idx3 + 1];
    colors[idx3 + 2] = epochColors[0][idx3 + 2];
  }

  return {
    count,
    positions,
    colors,
    sizes,
    phases,
    epochPositions,
    epochColors,
  };
}

/**
 * Updates active particle position & color buffers in-place for a given normalized progress ∈ [0, 1].
 * Zero heap allocations per frame.
 */
export function updateCosmicParticleBuffers(
  buffers: CosmicParticleBuffers,
  progress: number,
): void {
  const p = clampProgress(progress);
  const weights = getEpochWeights(p);
  const w0 = weights[0];
  const w1 = weights[1];
  const w2 = weights[2];
  const w3 = weights[3];
  const w4 = weights[4];
  const w5 = weights[5];

  const { count, positions, colors, epochPositions, epochColors } = buffers;
  const p0 = epochPositions[0];
  const p1 = epochPositions[1];
  const p2 = epochPositions[2];
  const p3 = epochPositions[3];
  const p4 = epochPositions[4];
  const p5 = epochPositions[5];

  const c0 = epochColors[0];
  const c1 = epochColors[1];
  const c2 = epochColors[2];
  const c3 = epochColors[3];
  const c4 = epochColors[4];
  const c5 = epochColors[5];

  const len = count * 3;
  for (let k = 0; k < len; k++) {
    positions[k] =
      p0[k] * w0 +
      p1[k] * w1 +
      p2[k] * w2 +
      p3[k] * w3 +
      p4[k] * w4 +
      p5[k] * w5;

    colors[k] =
      c0[k] * w0 +
      c1[k] * w1 +
      c2[k] * w2 +
      c3[k] * w3 +
      c4[k] * w4 +
      c5[k] * w5;
  }
}

export function createBackgroundStarfieldData(count: number): BackgroundStarfieldBuffers {
  const rng = createRng(9910421);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const idx3 = i * 3;
    const [ux, uy, uz] = randomUnitSphere(rng);
    const radius = 38 + rng() * 52;
    positions[idx3] = ux * radius;
    positions[idx3 + 1] = uy * radius;
    positions[idx3 + 2] = uz * radius;

    const tint = rng();
    colors[idx3] = lerp3(0.58, 0.92, tint);
    colors[idx3 + 1] = lerp3(0.68, 0.94, tint);
    colors[idx3 + 2] = lerp3(0.88, 1.0, tint * 0.7);
    sizes[i] = 0.5 + rng() * 1.4;
  }

  return { count, positions, colors, sizes };
}
