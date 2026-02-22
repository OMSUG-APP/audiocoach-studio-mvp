import { useState, useEffect, useCallback } from 'react';
import { TransportBar } from './components/TransportBar';
import { PatternEditor } from './components/PatternEditor';
import { PatternSwitcher } from './components/PatternSwitcher';
import { MixerView } from './components/MixerView';
import { useAudioEngine } from './hooks/useAudioEngine';
import { INITIAL_PROJECT, INITIAL_PATTERN } from './constants';
import { Project, DrumInstrument } from './types';
import { Download } from 'lucide-react';
import { renderToWav } from './utils/export';

export default function App() {
  const [project, setProject] = useState<Project>(() => {
    const saved = localStorage.getItem('sequencer-project');
    return saved ? JSON.parse(saved) : INITIAL_PROJECT;
  });
  const [activePatternId, setActivePatternId] = useState(project.patterns[0].id);

  const { isPlaying, currentStep, togglePlay } = useAudioEngine(project);

  // Persistence
  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem('sequencer-project', JSON.stringify(project));
    }, 1000);
    return () => clearTimeout(timeout);
  }, [project]);

  // Spacebar Play/Pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if the user is typing in a text input (like the project name)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (e.code === 'Space') {
        e.preventDefault(); // Prevent the page from scrolling down
        togglePlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay]);
  const activePattern = project.patterns.find(p => p.id === activePatternId)!;

  const updateActivePattern = useCallback((updater: (p: typeof activePattern) => typeof activePattern) => {
    setProject(prev => ({
      ...prev,
      patterns: prev.patterns.map(p => p.id === activePatternId ? updater(p) : p)
    }));
  }, [activePatternId]);

  const handleToggleDrumStep = (inst: DrumInstrument, step: number) => {
    updateActivePattern(p => ({
      ...p,
      drums: {
        ...p.drums,
        [inst]: p.drums[inst].map((s, i) => i === step ? { ...s, active: !s.active } : s)
      }
    }));
  };

  const handleToggleBassStep = (step: number, note: string) => {
    updateActivePattern(p => ({
      ...p,
      bass: p.bass.map((s, i) => {
        if (i === step) {
          const isSameNote = s.note === note;
          return { ...s, active: isSameNote ? !s.active : true, note };
        }
        return s;
      })
    }));
  };

  const handleAddPattern = () => {
    const id = `p${project.patterns.length + 1}`;
    const newPattern = INITIAL_PATTERN(id, `Pattern ${project.patterns.length + 1}`);
    setProject(prev => ({
      ...prev,
      patterns: [...prev.patterns, newPattern]
    }));
    setActivePatternId(id);
  };

  const handleUpdateDrumParam = (inst: string, param: string, value: number) => {
    setProject(prev => ({
      ...prev,
      drumParams: {
        ...prev.drumParams,
        [inst]: {
          ...(prev.drumParams?.[inst] || { tune: 0.5, decay: 0.5 }),
          [param]: value
        }
      }
    }));
  };

  const handleUpdateBassParam = (param: string, value: any) => {
    setProject(prev => ({
      ...prev,
      bassParams: {
        ...(prev.bassParams || { waveform: 'sawtooth', cutoff: 0.5, resonance: 0.2, envMod: 0.5, decay: 0.5 }),
        [param]: value
      }
    }));
  };

  const handleExport = async () => {
    try {
      const wavBlob = await renderToWav(project);
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.toLowerCase().replace(/\s+/g, '-')}.wav`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] text-[#a1a1aa] overflow-hidden font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-[#121212] border-b border-[#27272a] shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#f97316] rounded-sm flex items-center justify-center shadow-[0_0_10px_rgba(249,115,22,0.3)]">
            <div className="w-4 h-4 bg-black rounded-sm rotate-45" />
          </div>
          <input
            value={project.name}
            onChange={(e) => setProject({ ...project, name: e.target.value })}
            className="bg-transparent font-bold text-sm text-[#f4f4f5] focus:outline-none hover:bg-[#27272a] px-2 py-1 rounded transition-colors uppercase tracking-wider"
          />
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-[#3f3f46] hover:bg-[#27272a] hover:text-[#f4f4f5] rounded text-xs font-bold transition-colors uppercase tracking-widest"
          >
            <Download size={14} />
            Export WAV
          </button>
        </div>
      </div>

      <TransportBar
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
        bpm={project.bpm}
        onBpmChange={(bpm) => setProject({ ...project, bpm })}
        swing={project.swing}
        onSwingChange={(swing) => setProject({ ...project, swing })}
      />

      <div className="flex flex-1 overflow-hidden p-4 gap-4">
        <div className="flex-1 flex flex-col overflow-hidden gap-4">
          
          {/* Pattern Editor (Drums, Params, & Bass) */}
          <div className="flex-1 bg-[#121212] border border-[#27272a] rounded-lg p-4 shadow-lg overflow-y-auto">
            <PatternEditor
              pattern={activePattern}
              currentStep={currentStep}
              onToggleDrumStep={handleToggleDrumStep}
              onToggleBassStep={handleToggleBassStep}
              drumParams={project.drumParams}
              onUpdateDrumParam={handleUpdateDrumParam}
              bassParams={project.bassParams}
              onUpdateBassParam={handleUpdateBassParam}
            />
          </div>

          {/* Pattern Switcher (Bottom) */}
          <div className="bg-[#121212] border border-[#27272a] rounded-lg p-4 shadow-lg h-24 flex-shrink-0">
            <PatternSwitcher
              patterns={project.patterns}
              activePatternId={activePatternId}
              onSelectPattern={setActivePatternId}
              onAddPattern={handleAddPattern}
            />
          </div>
          
        </div>
        
        {/* Mixer (Right Side) */}
        <div className="w-80 bg-[#121212] border border-[#27272a] rounded-lg p-4 shadow-lg overflow-y-auto">
          <MixerView
            mixer={project.mixer}
            onMixerChange={(mixer) => setProject({ ...project, mixer })}
          />
        </div>
      </div>
    </div>
  );
}