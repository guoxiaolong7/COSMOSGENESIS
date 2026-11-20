import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DESKTOP_PARTICLE_COUNT,
  EPOCHS,
  MOBILE_PARTICLE_COUNT,
  clampProgress,
  computePhysicalTelemetry,
  getEpochForProgress,
  getEpochWeights,
  getParticleBudget,
} from './epochs';
import {
  createCosmicParticleBuffers,
  updateCosmicParticleBuffers,
} from './particleData';
import {
  CELESTIAL_HOTSPOTS,
  computeEpochVisualParams,
  getActiveHotspots,
  getCruiseCameraPose,
} from './hotspots';

test('particle budget scales down for mobile and coarse viewports', () => {
  assert.equal(getParticleBudget(1440, false), DESKTOP_PARTICLE_COUNT);
  assert.equal(getParticleBudget(1280, true), DESKTOP_PARTICLE_COUNT);
  assert.equal(getParticleBudget(390, true), MOBILE_PARTICLE_COUNT);
  assert.equal(getParticleBudget(700, false), MOBILE_PARTICLE_COUNT);
  assert.equal(getParticleBudget(900, true), MOBILE_PARTICLE_COUNT);
});

test('progress clamps cleanly and maps to all 6 epochs', () => {
  assert.equal(clampProgress(-0.5), 0);
  assert.equal(clampProgress(1.5), 1);
  assert.equal(clampProgress(Number.NaN), 0);

  assert.equal(EPOCHS.length, 6);
  assert.equal(getEpochForProgress(0.0).id, 1);
  assert.equal(getEpochForProgress(0.18).id, 2);
  assert.equal(getEpochForProgress(0.35).id, 3);
  assert.equal(getEpochForProgress(0.53).id, 4);
  assert.equal(getEpochForProgress(0.71).id, 5);
  assert.equal(getEpochForProgress(0.95).id, 6);
  assert.equal(getEpochForProgress(1.0).id, 6);
});

test('epoch blend weights always sum to 1.0 across progress [0, 1]', () => {
  for (let i = 0; i <= 20; i++) {
    const p = i / 20;
    const weights = getEpochWeights(p);
    const total = weights.reduce((acc, w) => acc + w, 0);
    assert.ok(Math.abs(total - 1) < 1e-5, `Expected sum ~1 at p=${p}, got ${total}`);
    for (const w of weights) {
      assert.ok(w >= 0 && w <= 1, `Weight out of range at p=${p}: ${w}`);
    }
  }
});

test('physical telemetry scale factor increases monotonically and formats labels', () => {
  let prevScale = -Infinity;
  for (let i = 0; i <= 20; i++) {
    const p = i / 20;
    const telemetry = computePhysicalTelemetry(p);
    assert.ok(
      telemetry.scaleFactorVisual >= prevScale,
      `Scale factor regressed at p=${p}: ${telemetry.scaleFactorVisual} < ${prevScale}`,
    );
    prevScale = telemetry.scaleFactorVisual;
    assert.ok(telemetry.timeLabel.length > 0);
    assert.ok(telemetry.tempLabel.length > 0);
    assert.ok(telemetry.redshiftLabel.length > 0);
  }

  const cmbTelemetry = computePhysicalTelemetry(0.53);
  assert.equal(cmbTelemetry.epoch.id, 4);
  assert.equal(cmbTelemetry.timeLabel, 't ≈ 380 kyr');
  assert.equal(cmbTelemetry.tempLabel, 'T ≈ 3,000 K');
});

test('cosmic particle Float32Array buffers stay finite and expand outward over time', () => {
  const count = 400;
  const buffers = createCosmicParticleBuffers(count);
  assert.equal(buffers.positions.length, count * 3);
  assert.equal(buffers.colors.length, count * 3);
  assert.equal(buffers.epochPositions.length, 6);

  const meanRadiusAt = (p: number): number => {
    updateCosmicParticleBuffers(buffers, p);
    let sum = 0;
    for (let i = 0; i < count; i++) {
      const x = buffers.positions[i * 3];
      const y = buffers.positions[i * 3 + 1];
      const z = buffers.positions[i * 3 + 2];
      assert.ok(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z));
      sum += Math.hypot(x, y, z);
    }
    return sum / count;
  };

  const rStart = meanRadiusAt(0.0);
  const rMid = meanRadiusAt(0.5);
  const rEnd = meanRadiusAt(1.0);
  assert.ok(rMid > rStart, `Expected expansion from Epoch 1 (${rStart}) to Epoch 4 (${rMid})`);
  assert.ok(rEnd > rStart * 2, `Expected cosmic web radius (${rEnd}) >> quantum core (${rStart})`);
});

test('each epoch exposes at least one celestial hotspot and valid visual shader params', () => {
  for (let i = 0; i < EPOCHS.length; i++) {
    const anchor = EPOCHS[i].anchor;
    const spots = getActiveHotspots(anchor);
    assert.ok(spots.length >= 1, `Expected hotspot for epoch ${EPOCHS[i].id}`);

    const visual = computeEpochVisualParams(anchor);
    assert.ok(visual.bloomStrength >= 0.65 && visual.bloomStrength <= 1.75);
    assert.ok(visual.pointSizeScale > 0.5);
  }
  assert.equal(CELESTIAL_HOTSPOTS.length, 6);
  // CMB shell should peak in Epoch 4
  assert.ok(computeEpochVisualParams(0.53).cmbShellOpacity > 0.5);
  assert.ok(computeEpochVisualParams(0.05).cmbShellOpacity < 0.05);
});

test('panoramic cruise camera trajectory stays strictly inside OrbitControls [4.5, 68] bounds', () => {
  for (let i = 0; i <= 20; i++) {
    const p = i / 20;
    const pose = getCruiseCameraPose(p, i * 1.5);
    const dist = Math.hypot(pose.position[0], pose.position[1], pose.position[2]);
    assert.ok(dist >= 4.5 && dist <= 68, `Cruise distance out of safe bounds at p=${p}: ${dist}`);
  }
});

test('boundary jumps between 0, 1, and rapid epoch toggles remain deterministic without NaN or drift', () => {
  const count = 250;
  const buffers = createCosmicParticleBuffers(count);
  updateCosmicParticleBuffers(buffers, 0);
  const snapshotAtZero = new Float32Array(buffers.positions);

  const sequence = [1, 0.05, 0.9, 0.35, 0.53, 0.71, Number.NaN, -2, 4, 0];
  for (const p of sequence) {
    updateCosmicParticleBuffers(buffers, p);
    const telemetry = computePhysicalTelemetry(p);
    assert.ok(Number.isFinite(telemetry.scaleFactorVisual));
    assert.ok(telemetry.timeLabel.length > 0 && telemetry.tempLabel.length > 0);
    for (let k = 0; k < buffers.positions.length; k++) {
      assert.ok(Number.isFinite(buffers.positions[k]), `Non-finite position at p=${p}`);
      assert.ok(Number.isFinite(buffers.colors[k]), `Non-finite color at p=${p}`);
    }
  }

  for (let k = 0; k < snapshotAtZero.length; k++) {
    assert.ok(
      Math.abs(buffers.positions[k] - snapshotAtZero[k]) < 1e-6,
      'Particle position drifted after rapid epoch jumps back to 0',
    );
  }
});

