import React from 'react';
import {
  RimLightConfig,
  LyricConfig,
  LayoutMode,
  ColorPalette,
  PalettePreset,
  RimMode,
  LyricStyle,
  FontSizeSetting
} from '../types';
import {
  X,
  Sliders,
  Sun,
  Type,
  Layout,
  Radio,
  Sparkles,
  Upload,
  Info,
  Check,
  Apple
} from 'lucide-react';
import { PRESET_PALETTES } from '../services/colorExtractor';

interface ControlsModalProps {
  isOpen: boolean;
  onClose: () => void;
  rimConfig: RimLightConfig;
  setRimConfig: React.Dispatch<React.SetStateAction<RimLightConfig>>;
  lyricConfig: LyricConfig;
  setLyricConfig: React.Dispatch<React.SetStateAction<LyricConfig>>;
  layoutMode: LayoutMode;
  setLayoutMode: (mode: LayoutMode) => void;
  palette: ColorPalette;
  isMacBridgeOnline: boolean;
  onFileUpload: (file: File) => void;
}

export const ControlsModal: React.FC<ControlsModalProps> = ({
  isOpen,
  onClose,
  rimConfig,
  setRimConfig,
  lyricConfig,
  setLyricConfig,
  layoutMode,
  setLayoutMode,
  palette,
  isMacBridgeOnline,
  onFileUpload
}) => {
  const [activeTab, setActiveTab] = React.useState<'rim' | 'lyrics' | 'layout' | 'source' | 'about'>('lyrics');
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div
        className="glass-panel w-full max-w-2xl max-h-[85vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-white/15"
        style={{
          boxShadow: `0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px -10px ${palette.glow}`
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Lyric Settings & Controls</h2>
              <p className="text-xs text-white/50">Kinetic captions, sync calibration & ambient glow</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 py-2.5 bg-black/40 border-b border-white/10 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('lyrics')}
            className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-2 shrink-0 ${
              activeTab === 'lyrics'
                ? 'bg-white/20 text-white shadow-sm'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Type className="w-3.5 h-3.5 text-cyan-400" />
            Lyrics & Captions
          </button>
          <button
            onClick={() => setActiveTab('rim')}
            className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-2 shrink-0 ${
              activeTab === 'rim'
                ? 'bg-white/20 text-white shadow-sm'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            Rim Lighting
          </button>
          <button
            onClick={() => setActiveTab('layout')}
            className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-2 shrink-0 ${
              activeTab === 'layout'
                ? 'bg-white/20 text-white shadow-sm'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layout className="w-3.5 h-3.5 text-indigo-400" />
            Views & Layout
          </button>
          <button
            onClick={() => setActiveTab('source')}
            className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-2 shrink-0 ${
              activeTab === 'source'
                ? 'bg-white/20 text-white shadow-sm'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            Music Sources
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-2 shrink-0 ${
              activeTab === 'about'
                ? 'bg-white/20 text-white shadow-sm'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Info className="w-3.5 h-3.5 text-fuchsia-400" />
            Open Source
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-white/80">
          {/* TAB: LYRIC ENGINE & CAPTIONS */}
          {activeTab === 'lyrics' && (
            <div className="space-y-6">
              {/* Lyric Style Selection */}
              <div>
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">
                  Animation & Caption Mode
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      id: 'verci-single-word',
                      title: 'Single-Word Stage',
                      desc: 'Signature 1-word-at-a-time kinetic pop with spring physics, motion blur & ghost preview'
                    },
                    {
                      id: 'smooth-captions',
                      title: 'Smooth Captions',
                      desc: 'Sentence view where active words bounce and glow dynamically to the rhythm'
                    }
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setLyricConfig(c => ({ ...c, style: s.id as LyricStyle }))}
                      className={`p-3.5 rounded-2xl text-left border transition ${
                        lyricConfig.style === s.id
                          ? 'border-cyan-400 bg-cyan-500/20 text-white shadow-sm'
                          : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h5 className="font-bold text-white text-sm">{s.title}</h5>
                        {lyricConfig.style === s.id && <Check className="w-4 h-4 text-cyan-400" />}
                      </div>
                      <p className="text-[11px] text-white/50 mt-1 leading-snug">{s.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sync Calibration Offset Slider */}
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <div className="flex justify-between items-center text-xs font-semibold mb-2">
                  <div>
                    <span className="text-white font-bold">Sync Timing Calibration</span>
                    <p className="text-[11px] text-white/50">
                      Fine-tune sync timing. Also use [ and ] keyboard shortcuts!
                    </p>
                  </div>
                  <span className="font-mono px-3 py-1 rounded-lg bg-black/50 border border-white/10 text-cyan-300 font-bold">
                    {lyricConfig.syncOffset > 0 ? `+${lyricConfig.syncOffset}` : lyricConfig.syncOffset} ms
                  </span>
                </div>
                <input
                  type="range"
                  min="-2000"
                  max="2000"
                  step="50"
                  value={lyricConfig.syncOffset}
                  onChange={(e) => setLyricConfig(c => ({ ...c, syncOffset: parseInt(e.target.value) }))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-white/40 mt-1">
                  <span>Lyrics earlier (-2.0s)</span>
                  <button
                    onClick={() => setLyricConfig(c => ({ ...c, syncOffset: 0 }))}
                    className="hover:text-cyan-300 underline font-semibold"
                  >
                    Reset (0ms)
                  </button>
                  <span>Lyrics later (+2.0s)</span>
                </div>
              </div>

              {/* Typography Scale */}
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">
                  Typography Size Scale
                </label>
                <div className="flex gap-2">
                  {(['normal', 'large', 'massive'] as FontSizeSetting[]).map((size) => (
                    <button
                      key={size}
                      onClick={() => setLyricConfig(c => ({ ...c, fontSize: size }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium capitalize border transition ${
                        lyricConfig.fontSize === size
                          ? 'border-cyan-400 bg-white/20 text-white font-bold'
                          : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: RIM LIGHTING */}
          {activeTab === 'rim' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                <div>
                  <h4 className="font-semibold text-white">Enable Screen-Edge Rim Lighting</h4>
                  <p className="text-xs text-white/50">Ambient rim lighting around display borders (trylumn.xyz)</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rimConfig.enabled}
                    onChange={(e) => setRimConfig(c => ({ ...c, enabled: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500" />
                </label>
              </div>

              {/* Sliders */}
              <div className="space-y-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Rim Thickness</span>
                    <span className="font-mono text-cyan-400">{rimConfig.thickness}px</span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="48"
                    value={rimConfig.thickness}
                    onChange={(e) => setRimConfig(c => ({ ...c, thickness: parseInt(e.target.value) }))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Glow Blur & Spread</span>
                    <span className="font-mono text-cyan-400">{rimConfig.blur}px</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={rimConfig.blur}
                    onChange={(e) => setRimConfig(c => ({ ...c, blur: parseInt(e.target.value) }))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Glow Brightness</span>
                    <span className="font-mono text-cyan-400">{Math.round(rimConfig.intensity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="180"
                    value={Math.round(rimConfig.intensity * 100)}
                    onChange={(e) => setRimConfig(c => ({ ...c, intensity: parseInt(e.target.value) / 100 }))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Palette presets */}
              <div>
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">
                  Color Palette Preset
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.keys(PRESET_PALETTES) as PalettePreset[]).map((preset) => {
                    const p = PRESET_PALETTES[preset];
                    return (
                      <button
                        key={preset}
                        onClick={() => setRimConfig(c => ({ ...c, palettePreset: preset }))}
                        className={`p-2.5 rounded-xl border flex items-center gap-2.5 text-xs transition ${
                          rimConfig.palettePreset === preset
                            ? 'border-cyan-400 bg-white/15 text-white'
                            : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex -space-x-1 shrink-0">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/40"
                            style={{ background: p.dominant }}
                          />
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/40"
                            style={{ background: p.accent }}
                          />
                        </div>
                        <span className="capitalize truncate font-medium">{preset}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB: LAYOUT */}
          {activeTab === 'layout' && (
            <div className="space-y-4">
              <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider">
                Select View Experience
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    id: 'split',
                    name: 'Split Stage',
                    desc: 'Side-by-side liquid-glass player and kinetic lyrics'
                  },
                  {
                    id: 'lockscreen',
                    name: 'Lock Screen Center',
                    desc: 'Centered frosted glass player with ambient rim glow'
                  },
                  {
                    id: 'fullscreen-lyrics',
                    name: 'Fullscreen Lyrics Stage',
                    desc: 'Immersive edge-to-edge word and lyric animations'
                  },
                  {
                    id: 'mini-island',
                    name: 'Dynamic Island',
                    desc: 'Minimal floating pill at top of screen with live lyric subtitle'
                  }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setLayoutMode(item.id as LayoutMode)}
                    className={`p-4 rounded-2xl text-left border transition ${
                      layoutMode === item.id
                        ? 'border-cyan-400 bg-cyan-500/20 text-white shadow-sm'
                        : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{item.name}</span>
                      {layoutMode === item.id && <Check className="w-4 h-4 text-cyan-400" />}
                    </div>
                    <p className="text-xs text-white/50 mt-1 leading-snug">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB: SOURCES */}
          {activeTab === 'source' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Apple className="w-5 h-5 text-white/90" />
                    <div>
                      <h4 className="font-semibold text-white">macOS Spotify & Apple Music Bridge</h4>
                      <p className="text-xs text-white/50">High-speed AppleScript poller with clock interpolation</p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      isMacBridgeOnline
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {isMacBridgeOnline ? 'Bridge Connected' : 'Companion Offline'}
                  </span>
                </div>
              </div>

              {/* Local File Dropzone */}
              <div>
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">
                  Play Local Audio File
                </label>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-white/20 hover:border-cyan-400/60 rounded-2xl p-6 text-center cursor-pointer transition bg-white/5 hover:bg-white/10"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        onFileUpload(e.target.files[0]);
                      }
                    }}
                  />
                  <Upload className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-white">Click or Drag & Drop Audio</p>
                  <p className="text-xs text-white/50 mt-1">
                    Supports MP3, FLAC, WAV, M4A. Auto-fetches lyrics on LRCLIB!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: OPEN SOURCE */}
          {activeTab === 'about' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <h4 className="font-bold text-white text-base">Lyric — 100% Free & Open Source</h4>
                <p className="text-xs text-white/70 leading-relaxed">
                  Open-source fusion of <b>trylumn.xyz</b> ambient lighting and <b>verci.xyz</b> word-by-word kinetic lyrics.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-white/5 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-white text-black hover:bg-white/90 active:scale-95 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
