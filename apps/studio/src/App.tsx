/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { TransportBar } from './components/TransportBar';
import { PatternEditor } from './components/PatternEditor';
import { PatternSwitcher } from './components/PatternSwitcher';
import { MixerView } from './components/MixerView';
import { ArrangementView } from './components/ArrangementView';
import { useAudioEngine } from './hooks/useAudioEngine';
import { INITIAL_PROJECT, INITIAL_PATTERN } from './constants';
import { Project, DrumInstrument } from './types';
import { Download, Save } from 'lucide-react';
import { renderToWav } from './utils/export';

export default function App() {
  const [project, setProject] = useState<Project>(() => {
    const saved = localStorage.getItem('sequencer-project');
    return saved ? JSON.parse(saved) : INITIAL_PROJECT;
  });
  const [activePatternId, setActivePatternId] = useState(project.patterns[0].id);
  const [isNoteSelectorOpen, setIsNoteSelectorOpen] = useState<number | null>(null);

  const { isPlaying, currentStep, togglePlay } = useAudioEngine(project);

  // Persistence
  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem('sequencer-project', JSON.stringify(project));
    }, 1000);
    return () => clearTimeout(timeout);
  }, [project]);

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

  const handleToggleBassStep = (step: number) => {
    updateActivePattern(p => ({
      ...p,
      bass: p.bass.map((s, i) => i === step ? { ...s, active: !s.active } : s)
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
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-zinc-950 border-b border-zinc-900">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 bg-black rounded-sm rotate-45" />
          </div>
          <input
            value={project.name}
            onChange={(e) => setProject({ ...project, name: e.target.value })}
            className="bg-transparent font-bold text-sm focus:outline-none hover:bg-zinc-900 px-2 py-1 rounded transition-colors"
          />
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 rounded-md text-xs font-bold transition-colors"
          >
            <Download size={14} />
            Export
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

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <ArrangementView arrangement={project.arrangement} patterns={project.patterns} />
          <PatternEditor
            pattern={activePattern}
            currentStep={currentStep}
            onToggleDrumStep={handleToggleDrumStep}
            onToggleBassStep={handleToggleBassStep}
            onBassNoteClick={(step) => setIsNoteSelectorOpen(step)}
          />
          <PatternSwitcher
            patterns={project.patterns}
            activePatternId={activePatternId}
            onSelectPattern={setActivePatternId}
            onAddPattern={handleAddPattern}
          />
        </div>
        <MixerView
          mixer={project.mixer}
          onMixerChange={(mixer) => setProject({ ...project, mixer })}
        />
      </div>

      {/* Note Selector Modal */}
      {isNoteSelectorOpen !== null && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-900 p-8 rounded-2xl border border-zinc-800 shadow-2xl max-w-md w-full">
            <h2 className="text-xl font-bold mb-6">Select Note</h2>
            <div className="grid grid-cols-4 gap-3">
              {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map((note) => (
                <button
                  key={note}
                  onClick={() => {
                    updateActivePattern(p => ({
                      ...p,
                      bass: p.bass.map((s, i) => i === isNoteSelectorOpen ? { ...s, note: `${note}2` } : s)
                    }));
                    setIsNoteSelectorOpen(null);
                  }}
                  className="h-12 bg-zinc-800 hover:bg-indigo-500 rounded-lg font-mono transition-colors"
                >
                  {note}
                </button>
              ))}
            </div>
            <button
              onClick={() => setIsNoteSelectorOpen(null)}
              className="mt-8 w-full py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
