import {
  ChevronDown,
  ChevronUp,
  Compass,
  Crosshair,
  Grid3x3,
  Orbit,
  Pause,
  Play,
  RotateCcw,
  X,
} from 'lucide-react';
import type { CameraMode } from '../cosmos/CosmosStage';
import { EPOCHS, computePhysicalTelemetry } from '../cosmos/epochs';
import { CelestialHotspot, getActiveHotspots } from '../cosmos/hotspots';

interface CosmosHudProps {
  progress: number;
  isPlaying: boolean;
  playbackSpeed: number;
  showGrid: boolean;
  showHotspots: boolean;
  cameraMode: CameraMode;
  collapsed: boolean;
  activeHotspot: CelestialHotspot | null;
  isHotspotPinned: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  onScrub: (nextProgress: number) => void;
  onSelectEpoch: (anchorProgress: number) => void;
  onChangeSpeed: (speed: number) => void;
  onToggleGrid: () => void;
  onToggleHotspots: () => void;
  onChangeCameraMode: (mode: CameraMode) => void;
  onSelectHotspotChip: (hotspot: CelestialHotspot) => void;
  onDismissHotspot: () => void;
  onToggleCollapse: () => void;
}

const SPEED_OPTIONS = [0.5, 1, 2] as const;

export function CosmosHud({
  progress,
  isPlaying,
  playbackSpeed,
  showGrid,
  showHotspots,
  cameraMode,
  collapsed,
  activeHotspot,
  isHotspotPinned,
  onTogglePlay,
  onReset,
  onScrub,
  onSelectEpoch,
  onChangeSpeed,
  onToggleGrid,
  onToggleHotspots,
  onChangeCameraMode,
  onSelectHotspotChip,
  onDismissHotspot,
  onToggleCollapse,
}: CosmosHudProps) {
  const telemetry = computePhysicalTelemetry(progress);
  const { epoch } = telemetry;
  const pct = (progress * 100).toFixed(1);
  const epochHotspots = getActiveHotspots(progress);
  const visibleHotspot =
    activeHotspot && activeHotspot.epochIds.includes(epoch.id) ? activeHotspot : null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-3 sm:p-5"
      data-epoch={epoch.id}
      data-playing={isPlaying ? 'true' : 'false'}
      data-camera-mode={cameraMode}
    >
      {/* Top-Left Epoch Title, Physical Time Scale & Scientific Note */}
      <header className="pointer-events-auto max-w-[510px] rounded-xl border border-white/12 bg-[#070b15]/88 p-3 sm:p-4 shadow-2xl">
        <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
          <span className="font-display font-semibold tracking-wider text-sky-300">
            COSMOS GENESIS
          </span>
          <span className="font-mono-tabular text-slate-400">
            纪元 0{epoch.id} / 06
          </span>
        </div>

        <div className="mt-1">
          <h1
            className="font-display text-sm sm:text-lg font-semibold text-slate-50 leading-snug"
            data-testid="epoch-title"
          >
            {epoch.title}
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">{epoch.enTitle}</p>
        </div>

        <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-2 border-y border-white/10 py-2 text-xs">
          <div>
            <div className="text-[11px] text-slate-400">物理时间</div>
            <div
              className="font-mono-tabular font-medium text-slate-100 mt-0.5 whitespace-nowrap"
              data-testid="telemetry-time"
            >
              {telemetry.timeLabel}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400">估算温度</div>
            <div
              className="font-mono-tabular font-medium text-amber-300 mt-0.5 whitespace-nowrap"
              data-testid="telemetry-temp"
            >
              {telemetry.tempLabel}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400">宇宙红移</div>
            <div
              className="font-mono-tabular font-medium text-indigo-300 mt-0.5 whitespace-nowrap"
              data-testid="telemetry-redshift"
            >
              {telemetry.redshiftLabel}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400">尺度倍率</div>
            <div
              className="font-mono-tabular font-medium text-sky-300 mt-0.5 whitespace-nowrap"
              data-testid="telemetry-scale"
            >
              a ≈ {telemetry.scaleFactorVisual.toFixed(2)}
            </div>
          </div>
        </div>

        {!collapsed && (
          <div className="mt-2 space-y-1.5">
            <p className="text-xs sm:text-[13px] leading-relaxed text-slate-300">
              {epoch.summary}
            </p>
            <p className="hidden sm:block text-[11px] leading-relaxed text-slate-400">
              {epoch.approxNote}
            </p>
            {showHotspots && epochHotspots.length > 0 && (
              <div className="pt-1 flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-slate-400">天体观测点：</span>
                {epochHotspots.map((spot) => {
                  const selected = visibleHotspot?.id === spot.id;
                  return (
                    <button
                      key={spot.id}
                      type="button"
                      onClick={() => onSelectHotspotChip(spot)}
                      aria-pressed={selected}
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors ${
                        selected
                          ? 'border-amber-400/70 bg-amber-500/15 text-amber-100'
                          : 'border-white/12 bg-white/[0.04] text-slate-200 hover:bg-white/[0.1]'
                      }`}
                    >
                      <Crosshair className="w-3 h-3 text-sky-300" aria-hidden="true" />
                      <span>{spot.title}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </header>

      {/* Bottom Dock Region (Celestial Hotspot Tooltip + Collapsible Timeline Dock) */}
      <div className="flex flex-col items-center w-full gap-2">
        {visibleHotspot && (
          <aside
            aria-label="天体观测科普提示"
            data-testid="hotspot-card"
            className="pointer-events-auto w-full max-w-[600px] rounded-xl border border-sky-400/35 bg-[#080e1c]/95 px-4 py-3 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                  <span className="font-medium text-sky-300">{visibleHotspot.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular text-amber-300">
                    {visibleHotspot.metricBadge}
                  </span>
                </div>
                <h2 className="font-display text-sm font-semibold text-slate-50">
                  {visibleHotspot.title}
                </h2>
              </div>
              {isHotspotPinned && (
                <button
                  type="button"
                  onClick={onDismissHotspot}
                  aria-label="关闭天体提示"
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
              {visibleHotspot.description}
            </p>
          </aside>
        )}

        <div className="flex flex-col items-center w-full">
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-expanded={!collapsed}
            className="pointer-events-auto mb-1.5 inline-flex items-center gap-1.5 rounded-t-lg border border-b-0 border-white/12 bg-[#070b15]/90 px-3 py-1 text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            {collapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                <span>展开控制栏</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                <span>收起控制栏</span>
              </>
            )}
          </button>

          {!collapsed && (
            <section
              aria-label="宇宙演化时间轴控制"
              className="pointer-events-auto w-full max-w-[960px] rounded-xl border border-white/12 bg-[#070b15]/90 px-3.5 py-3 sm:px-5 sm:py-3.5 shadow-2xl space-y-3"
            >
              {/* 6 Epoch Quick Anchors */}
              <div
                className="grid grid-cols-3 sm:grid-cols-6 gap-1.5"
                role="group"
                aria-label="纪元快捷锚点"
              >
                {EPOCHS.map((item) => {
                  const isActive = item.id === epoch.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectEpoch(item.anchor)}
                      aria-pressed={isActive}
                      className={`min-h-[36px] px-2 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap truncate border ${
                        isActive
                          ? 'bg-sky-500/20 border-sky-400/60 text-sky-100'
                          : 'bg-white/[0.03] border-white/8 text-slate-300 hover:bg-white/[0.08] hover:text-white'
                      }`}
                    >
                      {item.shortLabel}
                    </button>
                  );
                })}
              </div>

              {/* Continuous Nonlinear Timeline Slider */}
              <div className="flex items-center gap-3">
                <label
                  htmlFor="cosmos-timeline-slider"
                  className="text-xs text-slate-400 whitespace-nowrap shrink-0"
                >
                  演化进度
                </label>
                <input
                  id="cosmos-timeline-slider"
                  type="range"
                  min={0}
                  max={1}
                  step={0.001}
                  value={progress}
                  onChange={(e) => onScrub(parseFloat(e.target.value))}
                  aria-label="宇宙演化非线性时间轴滑块"
                  className="cosmos-slider flex-1 h-4"
                  style={{
                    background: `linear-gradient(to right, #38bdf8 ${pct}%, rgba(255,255,255,0.14) ${pct}%)`,
                    borderRadius: '9999px',
                    height: '4px',
                  }}
                />
                <span
                  className="font-mono-tabular text-xs text-slate-200 w-12 text-right shrink-0"
                  data-testid="progress-percent"
                >
                  {pct}%
                </span>
              </div>

              {/* Playback, Camera Mode, Hotspots & Grid Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={onTogglePlay}
                    aria-pressed={isPlaying}
                    className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-1.5 rounded-lg bg-sky-500 text-slate-950 font-semibold text-xs hover:bg-sky-400 transition-colors whitespace-nowrap shrink-0"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>暂停演化</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>播放演化</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={onReset}
                    className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-lg border border-white/12 bg-white/[0.04] text-slate-200 text-xs font-medium hover:bg-white/[0.1] transition-colors whitespace-nowrap shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>重置演化</span>
                  </button>

                  <div
                    className="hidden sm:flex items-center rounded-lg border border-white/10 bg-white/[0.03] p-0.5"
                    role="group"
                    aria-label="演化倍速"
                  >
                    {SPEED_OPTIONS.map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        onClick={() => onChangeSpeed(spd)}
                        aria-pressed={playbackSpeed === spd}
                        className={`px-2 py-1 rounded-md text-xs font-mono-tabular transition-colors ${
                          playbackSpeed === spd
                            ? 'bg-white/15 text-white font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {spd}×
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Demo Camera Mode Toggle: Panoramic Cruise vs Free Orbit */}
                  <div
                    className="flex items-center rounded-lg border border-white/12 bg-white/[0.03] p-0.5"
                    role="group"
                    aria-label="演示相机模式"
                  >
                    <button
                      type="button"
                      onClick={() => onChangeCameraMode('cruise')}
                      aria-pressed={cameraMode === 'cruise'}
                      className={`inline-flex items-center gap-1 min-h-[32px] px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                        cameraMode === 'cruise'
                          ? 'bg-sky-500/25 text-sky-100'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Compass className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>全景巡航</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeCameraMode('free')}
                      aria-pressed={cameraMode === 'free'}
                      className={`inline-flex items-center gap-1 min-h-[32px] px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                        cameraMode === 'free'
                          ? 'bg-white/15 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Orbit className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>自由观察</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={onToggleHotspots}
                    aria-pressed={showHotspots}
                    className={`inline-flex items-center gap-1.5 min-h-[36px] px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      showHotspots
                        ? 'border-amber-400/50 bg-amber-500/15 text-amber-100'
                        : 'border-white/12 bg-white/[0.04] text-slate-300 hover:text-white'
                    }`}
                  >
                    <Crosshair className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>天体标注</span>
                  </button>

                  <button
                    type="button"
                    onClick={onToggleGrid}
                    aria-pressed={showGrid}
                    className={`inline-flex items-center gap-1.5 min-h-[36px] px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      showGrid
                        ? 'border-sky-400/50 bg-sky-500/15 text-sky-100'
                        : 'border-white/12 bg-white/[0.04] text-slate-300 hover:text-white'
                    }`}
                  >
                    <Grid3x3 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>共动网格</span>
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
