/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { CosmosHud } from './components/CosmosHud';
import { CameraMode, CosmosStage } from './cosmos/CosmosStage';
import { EPOCHS, clampProgress } from './cosmos/epochs';
import { CelestialHotspot } from './cosmos/hotspots';

export default function App() {
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [showHotspots, setShowHotspots] = useState(true);
  const [cameraMode, setCameraMode] = useState<CameraMode>('cruise');
  const [hudCollapsed, setHudCollapsed] = useState(false);

  const [hoveredHotspot, setHoveredHotspot] = useState<CelestialHotspot | null>(null);
  const [selectedHotspot, setSelectedHotspot] = useState<CelestialHotspot | null>(null);

  const activeHotspot = selectedHotspot ?? hoveredHotspot;

  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      if (!prev && progress >= 0.999) {
        setProgress(0);
      }
      return !prev;
    });
  }, [progress]);

  const handleReset = useCallback(() => {
    setProgress(0);
    setIsPlaying(true);
    setSelectedHotspot(null);
  }, []);

  const handleScrub = useCallback((nextProgress: number) => {
    setProgress(clampProgress(nextProgress));
    setSelectedHotspot(null);
  }, []);

  const handleSelectEpoch = useCallback((anchorProgress: number) => {
    setProgress(clampProgress(anchorProgress));
    setSelectedHotspot(null);
  }, []);

  const handlePlaybackComplete = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleUserOrbitStart = useCallback(() => {
    setCameraMode('free');
  }, []);

  const handleHotspotSelect = useCallback((hotspot: CelestialHotspot | null) => {
    setSelectedHotspot((prev) => {
      if (!hotspot) return null;
      return prev?.id === hotspot.id ? null : hotspot;
    });
  }, []);

  const handleSelectHotspotChip = useCallback((hotspot: CelestialHotspot) => {
    setSelectedHotspot((prev) => (prev?.id === hotspot.id ? null : hotspot));
  }, []);

  // Keyboard shortcuts: Space (Play/Pause), R (Reset), H (Collapse HUD), C (Toggle Cruise/Free), 1-6 (Epoch jump)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.key === 'r' || e.key === 'R') {
        handleReset();
      } else if (e.key === 'h' || e.key === 'H') {
        setHudCollapsed((prev) => !prev);
      } else if (e.key === 'c' || e.key === 'C') {
        setCameraMode((prev) => (prev === 'cruise' ? 'free' : 'cruise'));
      } else if (e.key === 'Escape') {
        setSelectedHotspot(null);
      } else if (e.key >= '1' && e.key <= '6') {
        const idx = Number(e.key) - 1;
        if (EPOCHS[idx]) {
          handleSelectEpoch(EPOCHS[idx].anchor);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleReset, handleSelectEpoch, handleTogglePlay]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#03050c]">
      <CosmosStage
        progress={progress}
        isPlaying={isPlaying}
        playbackSpeed={playbackSpeed}
        showGrid={showGrid}
        showHotspots={showHotspots}
        cameraMode={cameraMode}
        selectedHotspotId={selectedHotspot?.id ?? null}
        onProgressChange={setProgress}
        onPlaybackComplete={handlePlaybackComplete}
        onUserOrbitStart={handleUserOrbitStart}
        onHotspotHover={setHoveredHotspot}
        onHotspotSelect={handleHotspotSelect}
      />
      <CosmosHud
        progress={progress}
        isPlaying={isPlaying}
        playbackSpeed={playbackSpeed}
        showGrid={showGrid}
        showHotspots={showHotspots}
        cameraMode={cameraMode}
        collapsed={hudCollapsed}
        activeHotspot={activeHotspot}
        isHotspotPinned={selectedHotspot !== null}
        onTogglePlay={handleTogglePlay}
        onReset={handleReset}
        onScrub={handleScrub}
        onSelectEpoch={handleSelectEpoch}
        onChangeSpeed={setPlaybackSpeed}
        onToggleGrid={() => setShowGrid((prev) => !prev)}
        onToggleHotspots={() => {
          setShowHotspots((prev) => {
            if (prev) setSelectedHotspot(null);
            return !prev;
          });
        }}
        onChangeCameraMode={setCameraMode}
        onSelectHotspotChip={handleSelectHotspotChip}
        onDismissHotspot={() => setSelectedHotspot(null)}
        onToggleCollapse={() => setHudCollapsed((prev) => !prev)}
      />
    </main>
  );
}
