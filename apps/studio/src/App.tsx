import { useState, useEffect } from 'react';
import { TransportBar } from './components/TransportBar';
import { PatternEditor } from './components/PatternEditor';
import { MixerPage } from './components/MixerPage';
import { InstrumentsPage } from './components/InstrumentsPage';
import { ArrangementPage } from './components/ArrangementPage';
import { SamplerView } from './components/sampler';
import { useAudioEngine } from './hooks/useAudioEngine';
import { useSampler } from './hooks/useSampler';
import { Download } from 'lucide-react';
import { renderToWav, ExportMode } from './utils/export';
import { useProjectStore, useActivePattern } from './store/useProjectStore';

type MainTab = 'sequencer' | 'sampler' | 'instruments' | 'mixer' | 'arrangement';

export default function App() {
  const project = useProjectStore((s) => s.project);
  const activePatternId = useProjectStore((s) => s.activePatternId);
  const store = useProjectStore();

  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<MainTab>('sequencer');

  const activePattern = useActivePattern();
  const sampler = useSampler(project.mixer.sampler);
  const { isPlaying, currentStep, currentDrum2Step, currentPluckStep, currentPolySynthStep, togglePlay, analysers } = useAudioEngine(project, activePatternId, sampler.schedulePadAtTime);

  // Inject sampler analyser into the shared analysers map
  useEffect(() => {
    if (analysers && sampler.analyser.current) {
      analysers.current.sampler = sampler.analyser.current;
    }
  }, [analysers, sampler.analyser]);

  // Spacebar Play/Pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay]);

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportMaster = async () => {
    setIsExporting(true);
    try {
      const wavBlob = await renderToWav(project, activePattern, 'master', sampler.samplerBuffers, sampler.pads);
      downloadBlob(wavBlob, `${project.name.toLowerCase().replace(/\s+/g, '-')}-master.wav`);
    } catch (error) { console.error('Export failed:', error); }
    setIsExporting(false);
  };

  const handleExportStems = async () => {
    setIsExporting(true);
    try {
      const projectName = project.name.toLowerCase().replace(/\s+/g, '-');
      const stems: { mode: ExportMode; label: string }[] = [
        { mode: 'drums',     label: 'drums'     },
        { mode: 'bass',      label: 'bass'      },
        { mode: 'synth',     label: 'synth'     },
        { mode: 'polySynth', label: 'poly'      },
        { mode: 'drum2',     label: 'drum2'     },
      ];
      for (const { mode, label } of stems) {
        const blob = await renderToWav(project, activePattern, mode, sampler.samplerBuffers, sampler.pads);
        downloadBlob(blob, `${projectName}-stem-${label}.wav`);
        await new Promise(r => setTimeout(r, 300));
      }
    } catch (error) { console.error('Stem export failed:', error); }
    setIsExporting(false);
  };

  return (
    <div className="flex flex-col h-screen bg-[#0A0A0B] text-[#8A8A94] overflow-hidden font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-[#111113] border-b border-[#242428] shadow-md">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 bg-[#FF5F00] rounded-sm flex items-center justify-center"
            style={{ boxShadow: '0 0 12px rgba(255, 95, 0, 0.5)' }}
          >
            <div className="w-4 h-4 bg-black rounded-sm rotate-45" />
          </div>
          <div className="flex flex-col">
            <span className="text-[15px] uppercase tracking-[0.2em] text-[#FF5F00] font-bold leading-none">
              AudioCoach.ai
            </span>
            <input
              value={project.name}
              onChange={(e) => store.setProjectName(e.target.value)}
              className="bg-transparent font-bold text-sm text-[#F0F0F2] focus:outline-none hover:bg-[#242428] px-1 py-0.5 rounded transition-colors uppercase tracking-wider leading-tight"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportStems}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-[#111113] border border-[#242428] hover:border-[#FF5F00] hover:text-[#F0F0F2] rounded text-xs font-bold transition-colors uppercase tracking-widest disabled:opacity-50"
          >
            <Download size={14} />
            {isExporting ? 'Rendering...' : 'Export Stems'}
          </button>
          <button
            onClick={handleExportMaster}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-[#FF5F00] text-black hover:bg-[#E05500] rounded text-xs font-bold transition-colors uppercase tracking-widest disabled:opacity-50"
            style={{ boxShadow: '0 0 10px rgba(255, 95, 0, 0.3)' }}
          >
            <Download size={14} />
            {isExporting ? 'Rendering...' : 'Export Master'}
          </button>
        </div>
      </div>

      <TransportBar
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
        bpm={project.bpm}
        onBpmChange={store.setBpm}
        swing={project.swing}
        onSwingChange={store.setSwing}
        patterns={project.patterns}
        activePatternId={activePatternId}
        onSelectPattern={store.setActivePatternId}
        onSwitchOrCreatePattern={store.switchOrCreatePattern}
        onRenamePattern={store.renamePattern}
        onDeletePattern={store.deletePattern}
      />

      {/* Tab bar */}
      <div className="flex items-center gap-1 px-4 pt-3 pb-0 border-b border-[#242428]">
        {(['sequencer', 'mixer', 'sampler', 'instruments', 'arrangement'] as MainTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-8 py-3 text-[18px] font-bold uppercase tracking-widest rounded-t transition-colors"
            style={activeTab === tab
              ? { background: '#111113', color: '#FF5F00', borderBottom: '2px solid #FF5F00' }
              : { background: 'transparent', color: '#555', borderBottom: '2px solid transparent' }
            }
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden p-4 gap-4">
        <div className="flex-4 flex flex-col overflow-hidden">

          {activeTab === 'sequencer' ? (
            <div className="flex-1 bg-[#111113] border border-[#242428] rounded-lg p-4 shadow-lg overflow-y-auto">
              <PatternEditor
                pattern={activePattern}
                currentStep={currentStep}
                onToggleDrumStep={store.toggleDrumStep}
                onToggleBassStep={store.toggleBassStep}
                onToggleSynthStep={store.toggleSynthStep}
                drumKit={project.drumKit}
                onDrumKitChange={store.drumKitChange}
                drumParams={project.drumParams}
                onUpdateDrumParam={store.updateDrumParam}
                bassParams={project.bassParams}
                bassPreset={project.bassPreset}
                onUpdateBassParam={store.updateBassParam}
                onApplyBassPreset={store.applyBassPreset}
                synthParams={project.synthParams}
                synthPreset={project.synthPreset}
                onUpdateSynthParam={store.updateSynthParam}
                onApplySynthPreset={store.applySynthPreset}
                samplerPads={sampler.pads}
                padLoadStatus={sampler.padLoadStatus}
                samplerSteps={activePattern.samplerSteps}
                onToggleSamplerStep={store.toggleSamplerStep}
                onSetDrumSteps={store.setDrumSteps}
                onSetBassSteps={store.setBassSteps}
                onSetSynthSteps={store.setSynthSteps}
                onSetSamplerSteps={store.setSamplerSteps}
                polySynthParams={project.polySynthParams}
                polySynthPoweredOn={project.poweredOn?.polySynth ?? true}
                drumsPoweredOn={project.poweredOn?.drums ?? true}
                onToggleDrumsPower={() => store.togglePower('drums')}
                bassPoweredOn={project.poweredOn?.bass ?? true}
                onToggleBassPower={() => store.togglePower('bass')}
                synthPoweredOn={project.poweredOn?.synth ?? true}
                onToggleSynthPower={() => store.togglePower('synth')}
                onTogglePolySynthPower={() => store.togglePower('polySynth')}
                onTogglePolySynthStep={store.togglePolySynthStep}
                onSetPolySynthChord={store.setPolySynthChord}
                onUpdatePolySynthParam={store.updatePolySynthParam}
                currentPolySynthStep={currentPolySynthStep}
                drum2PoweredOn={project.poweredOn?.drum2 ?? true}
                onToggleDrum2Power={() => store.togglePower('drum2')}
                onToggleDrum2Step={store.toggleDrum2Step}
                currentDrum2Step={currentDrum2Step}
                onUpdateDrum2TrackParam={store.updateDrum2TrackParam}
                onSetDrum2Steps={store.setDrum2Steps}
                samplerPoweredOn={project.poweredOn?.sampler ?? true}
                onToggleSamplerPower={() => store.togglePower('sampler')}
                leadParams={project.leadParams}
                leadPreset={project.leadPreset}
                onUpdateLeadParam={store.updateLeadParam}
                onApplyLeadPreset={store.applyLeadPreset}
                onToggleLeadStep={store.toggleLeadStep}
                onSetLeadSteps={store.setLeadSteps}
                leadPoweredOn={project.poweredOn?.lead ?? true}
                onToggleLeadPower={() => store.togglePower('lead')}
                fmParams={project.fmParams}
                fmPreset={project.fmPreset}
                onUpdateFMParam={store.updateFMParam}
                onApplyFMPreset={store.applyFMPreset}
                onToggleFMStep={store.toggleFMStep}
                onSetFMSteps={store.setFMSteps}
                fmPoweredOn={project.poweredOn?.fm ?? true}
                onToggleFMPower={() => store.togglePower('fm')}
                pluckParams={project.pluckParams}
                pluckPreset={project.pluckPreset}
                onUpdatePluckParam={store.updatePluckParam}
                onApplyPluckPreset={store.applyPluckPreset}
                onTogglePluckStep={store.togglePluckStep}
                onSetPluckSteps={store.setPluckSteps}
                currentPluckStep={currentPluckStep}
                pluckPoweredOn={project.poweredOn?.pluck ?? true}
                onTogglePluckPower={() => store.togglePower('pluck')}
                stabParams={project.stabParams}
                stabPreset={project.stabPreset}
                onUpdateStabParam={store.updateStabParam}
                onApplyStabPreset={store.applyStabPreset}
                onToggleStabStep={store.toggleStabStep}
                onSetStabSteps={store.setStabSteps}
                stabPoweredOn={project.poweredOn?.stab ?? true}
                onToggleStabPower={() => store.togglePower('stab')}
              />
            </div>
          ) : activeTab === 'sampler' ? (
            <div className="flex-1 overflow-hidden">
              <SamplerView
                {...sampler}
                mixerChannel={project.mixer.sampler}
                onMixerChannelChange={(ch) => store.updateMixerChannel('sampler', ch)}
              />
            </div>
          ) : activeTab === 'instruments' ? (
            <div className="flex-1 overflow-hidden">
              <InstrumentsPage />
            </div>
          ) : activeTab === 'mixer' ? (
            <div className="flex-1 overflow-hidden">
              <MixerPage analysers={analysers} />
            </div>
          ) : (
            <div className="flex-1 overflow-hidden">
              <ArrangementPage />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
