import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Project, Pattern, DrumInstrument, Step, NoteStep, ChannelMixer, Drum2Track, LeadSynthParams, FMSynthParams, PluckSynthParams, ChordStabParams } from '../types';
import { INITIAL_PROJECT, INITIAL_PATTERN } from '../constants';

interface ProjectStore {
  project: Project;
  activePatternId: string;

  // Project actions
  setProject: (project: Project) => void;
  setProjectName: (name: string) => void;
  setBpm: (bpm: number) => void;
  setSwing: (swing: number) => void;

  // Pattern actions
  setActivePatternId: (id: string) => void;
  updateActivePattern: (updater: (p: Pattern) => Pattern) => void;
  switchOrCreatePattern: (slotIndex: number) => void;
  renamePattern: (id: string, name: string) => void;

  // Instrument handlers
  toggleDrumStep: (inst: DrumInstrument, step: number) => void;
  toggleBassStep: (step: number, note: string) => void;
  toggleSynthStep: (step: number, note: string) => void;
  toggleSamplerStep: (padId: number, step: number) => void;
  setDrumSteps: (steps: Record<DrumInstrument, Step[]>) => void;
  setBassSteps: (steps: NoteStep[]) => void;
  setSynthSteps: (steps: NoteStep[]) => void;
  setSamplerSteps: (steps: boolean[][]) => void;

  // Param handlers
  updateDrumParam: (inst: string, param: string, value: any) => void;
  drumKitChange: (kit: '808' | '909') => void;
  applyBassPreset: (preset: any, name: string) => void;
  updateBassParam: (param: string, value: any) => void;
  applySynthPreset: (preset: any, name: string) => void;
  updateSynthParam: (param: string, value: any) => void;

  // Mixer
  updateMixer: (mixer: Project['mixer']) => void;
  updateMixerChannel: (channel: keyof Project['mixer'], value: ChannelMixer) => void;

  // Power
  togglePower: (instrument: keyof NonNullable<Project['poweredOn']>) => void;

  // PolySynth steps
  togglePolySynthStep: (step: number) => void;
  setPolySynthChord: (step: number, chord: string[]) => void;
  updatePolySynthParam: (param: string, value: any) => void;

  // Drum2
  toggleDrum2Step: (trackIndex: number, step: number) => void;
  updateDrum2TrackParam: (trackIndex: number, param: string, value: any) => void;
  setDrum2Steps: (tracks: Drum2Track[]) => void;

  // Lead Synth
  toggleLeadStep: (step: number, note: string) => void;
  setLeadSteps: (steps: NoteStep[]) => void;
  updateLeadParam: (param: string, value: any) => void;
  applyLeadPreset: (preset: LeadSynthParams, name: string) => void;

  // FM Synth
  toggleFMStep: (step: number, note: string) => void;
  setFMSteps: (steps: NoteStep[]) => void;
  updateFMParam: (param: string, value: any) => void;
  applyFMPreset: (preset: FMSynthParams, name: string) => void;

  // Pluck Synth
  togglePluckStep: (step: number, note: string) => void;
  setPluckSteps: (steps: NoteStep[]) => void;
  updatePluckParam: (param: string, value: any) => void;
  applyPluckPreset: (preset: PluckSynthParams, name: string) => void;

  // Chord Stab
  toggleStabStep: (step: number, note: string) => void;
  setStabSteps: (steps: NoteStep[]) => void;
  updateStabParam: (param: string, value: any) => void;
  applyStabPreset: (preset: ChordStabParams, name: string) => void;

  // Arrangement
  updateArrangementBlocks: (blocks: NonNullable<Project['arrangementBlocks']>) => void;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      project: INITIAL_PROJECT,
      activePatternId: INITIAL_PROJECT.patterns[0].id,

      setProject: (project) => set({ project, activePatternId: project.patterns[0]?.id }),
      setProjectName: (name) => set((s) => ({ project: { ...s.project, name } })),
      setBpm: (bpm) => set((s) => ({ project: { ...s.project, bpm } })),
      setSwing: (swing) => set((s) => ({ project: { ...s.project, swing } })),

      setActivePatternId: (id) => set({ activePatternId: id }),

      updateActivePattern: (updater) =>
        set((s) => ({
          project: {
            ...s.project,
            patterns: s.project.patterns.map((p) =>
              p.id === s.activePatternId ? updater(p) : p,
            ),
          },
        })),

      switchOrCreatePattern: (slotIndex) => {
        const { project, activePatternId } = get();
        const existing = project.patterns[slotIndex];
        if (existing) {
          set({ activePatternId: existing.id });
          return;
        }
        // Create new pattern, deep-copying steps from the current active pattern
        const currentPattern = project.patterns.find((p) => p.id === activePatternId);
        const id = `p${Date.now()}`;
        const name = `Pattern ${slotIndex + 1}`;
        const base = INITIAL_PATTERN(id, name);
        const newPattern: Pattern = currentPattern
          ? {
              ...base,
              drums: Object.fromEntries(
                Object.entries(currentPattern.drums).map(([k, v]) => [k, v.map(s => ({ ...s }))]),
              ) as Pattern['drums'],
              bass:    currentPattern.bass.map(s => ({ ...s })),
              synth:   currentPattern.synth.map(s => ({ ...s })),
              polySynth: currentPattern.polySynth?.map(s => ({ ...s, chord: [...s.chord] })),
              drum2:   currentPattern.drum2?.map(t => ({ ...t, steps: t.steps.map(s => ({ ...s })) })),
              samplerSteps: currentPattern.samplerSteps?.map(row => [...row]),
              lead:  currentPattern.lead?.map(s => ({ ...s })),
              fm:    currentPattern.fm?.map(s => ({ ...s })),
              pluck: currentPattern.pluck?.map(s => ({ ...s })),
              stab:  currentPattern.stab?.map(s => ({ ...s })),
            }
          : base;

        // Fill slots between current length and slotIndex with undefined placeholders
        const patterns = [...project.patterns];
        // Extend array to slotIndex if needed (sparse not supported — fill gaps with empty)
        while (patterns.length <= slotIndex) {
          patterns.push(INITIAL_PATTERN(`p${Date.now()}_${patterns.length}`, `Pattern ${patterns.length + 1}`));
        }
        patterns[slotIndex] = newPattern;

        set({
          project: { ...project, patterns },
          activePatternId: id,
        });
      },

      renamePattern: (id, name) =>
        set((s) => ({
          project: {
            ...s.project,
            patterns: s.project.patterns.map((p) => (p.id === id ? { ...p, name } : p)),
          },
        })),

      toggleDrumStep: (inst, step) =>
        get().updateActivePattern((p) => ({
          ...p,
          drums: {
            ...p.drums,
            [inst]: p.drums[inst].map((s, i) => (i === step ? { ...s, active: !s.active } : s)),
          },
        })),

      toggleBassStep: (step, note) =>
        get().updateActivePattern((p) => ({
          ...p,
          bass: p.bass.map((s, i) => {
            if (i !== step) return s;
            const isSameNote = s.note === note;
            return { ...s, active: isSameNote ? !s.active : true, note };
          }),
        })),

      toggleSynthStep: (step, note) =>
        get().updateActivePattern((p) => ({
          ...p,
          synth: (p.synth || Array(16).fill({ active: false, note: '', velocity: 0.6, length: 4 })).map((s, i) => {
            if (i !== step) return s;
            const isSameNote = s.note === note;
            return { ...s, active: isSameNote ? !s.active : true, note };
          }),
        })),

      toggleSamplerStep: (padId, step) =>
        get().updateActivePattern((p) => {
          const current = p.samplerSteps || Array.from({ length: 16 }, () => Array(16).fill(false));
          const next = current.map((row, i) =>
            i === padId ? row.map((v: boolean, j: number) => (j === step ? !v : v)) : row,
          );
          return { ...p, samplerSteps: next };
        }),

      setDrumSteps: (steps) => get().updateActivePattern((p) => ({ ...p, drums: steps })),
      setBassSteps: (steps) => get().updateActivePattern((p) => ({ ...p, bass: steps })),
      setSynthSteps: (steps) => get().updateActivePattern((p) => ({ ...p, synth: steps })),
      setSamplerSteps: (steps) => get().updateActivePattern((p) => ({ ...p, samplerSteps: steps })),

      updateDrumParam: (inst, param, value) =>
        set((s) => ({
          project: {
            ...s.project,
            drumParams: {
              ...s.project.drumParams,
              [inst]: {
                ...(s.project.drumParams?.[inst] || { tune: 0.5, decay: 0.5, mute: false, solo: false }),
                [param]: value,
              },
            },
          },
        })),

      drumKitChange: (kit) =>
        set((s) => ({ project: { ...s.project, drumKit: kit } })),

      applyBassPreset: (preset, name) =>
        set((s) => ({ project: { ...s.project, bassPreset: name, bassParams: { ...preset } } })),

      updateBassParam: (param, value) =>
        set((s) => ({
          project: {
            ...s.project,
            bassParams: {
              ...(s.project.bassParams || { waveform: 'sawtooth', octave: 2, cutoff: 0.5, resonance: 0.2, envMod: 0.5, decay: 0.5 }),
              [param]: value,
            },
          },
        })),

      applySynthPreset: (preset, name) =>
        set((s) => ({ project: { ...s.project, synthPreset: name, synthParams: { ...preset } } })),

      updateSynthParam: (param, value) =>
        set((s) => ({
          project: {
            ...s.project,
            synthParams: {
              octave: 4,
              attack: 0.5, release: 0.5, cutoff: 0.5, detune: 0.5,
              ...(s.project.synthParams || {}),
              [param]: value,
            },
          },
        })),

      updateMixer: (mixer) =>
        set((s) => ({ project: { ...s.project, mixer } })),

      updateMixerChannel: (channel, value) =>
        set((s) => ({
          project: {
            ...s.project,
            mixer: { ...s.project.mixer, [channel]: value },
          },
        })),

      togglePower: (instrument) =>
        set((s) => ({
          project: {
            ...s.project,
            poweredOn: {
              drums: true, bass: true, synth: true, polySynth: true, drum2: true, sampler: true,
              lead: true, fm: true, pluck: true, stab: true,
              ...(s.project.poweredOn || {}),
              [instrument]: !(s.project.poweredOn?.[instrument] ?? true),
            },
          },
        })),

      togglePolySynthStep: (step) =>
        get().updateActivePattern((p) => {
          const base = p.polySynth || [];
          const padded = [...base, ...Array.from({ length: Math.max(0, 32 - base.length) }, () => ({ active: false, chord: [], velocity: 0.7, length: 4 }))];
          return { ...p, polySynth: padded.map((s, i) => i === step ? { ...s, active: !s.active } : s) };
        }),

      setPolySynthChord: (step, chord) =>
        get().updateActivePattern((p) => {
          const base = p.polySynth || [];
          const padded = [...base, ...Array.from({ length: Math.max(0, 32 - base.length) }, () => ({ active: false, chord: [], velocity: 0.7, length: 4 }))];
          return { ...p, polySynth: padded.map((s, i) => i === step ? { ...s, chord, active: chord.length > 0 } : s) };
        }),

      updatePolySynthParam: (param, value) =>
        set((s) => ({
          project: {
            ...s.project,
            polySynthParams: {
              ...(s.project.polySynthParams || {}),
              [param]: value,
            } as any,
          },
        })),

      toggleDrum2Step: (trackIndex, step) =>
        get().updateActivePattern((p) => ({
          ...p,
          drum2: (p.drum2 || []).map((track, i) =>
            i === trackIndex
              ? { ...track, steps: track.steps.map((s, j) => (j === step ? { ...s, active: !s.active } : s)) }
              : track,
          ),
        })),

      updateDrum2TrackParam: (trackIndex, param, value) =>
        get().updateActivePattern((p) => ({
          ...p,
          drum2: (p.drum2 || []).map((track, i) =>
            i === trackIndex ? { ...track, [param]: value } : track,
          ),
        })),

      setDrum2Steps: (tracks) => get().updateActivePattern((p) => ({ ...p, drum2: tracks })),

      // Lead Synth implementations
      toggleLeadStep: (step, note) =>
        get().updateActivePattern((p) => ({
          ...p,
          lead: (p.lead || Array.from({ length: 16 }, () => ({ active: false, note: '', velocity: 0.6, length: 4 }))).map((s, i) => {
            if (i !== step) return s;
            const isSameNote = s.note === note;
            return { ...s, active: isSameNote ? !s.active : true, note };
          }),
        })),

      setLeadSteps: (steps) => get().updateActivePattern((p) => ({ ...p, lead: steps })),

      updateLeadParam: (param, value) =>
        set((s) => ({
          project: {
            ...s.project,
            leadParams: {
              waveform: 'sawtooth', octave: 4, cutoff: 0.8, resonance: 0.3, attack: 0.01, decay: 0.3, portamento: 0.0,
              ...(s.project.leadParams || {}),
              [param]: value,
            },
          },
        })),

      applyLeadPreset: (preset, name) =>
        set((s) => ({ project: { ...s.project, leadPreset: name, leadParams: { ...preset } } })),

      // FM Synth implementations
      toggleFMStep: (step, note) =>
        get().updateActivePattern((p) => ({
          ...p,
          fm: (p.fm || Array.from({ length: 16 }, () => ({ active: false, note: '', velocity: 0.6, length: 4 }))).map((s, i) => {
            if (i !== step) return s;
            const isSameNote = s.note === note;
            return { ...s, active: isSameNote ? !s.active : true, note };
          }),
        })),

      setFMSteps: (steps) => get().updateActivePattern((p) => ({ ...p, fm: steps })),

      updateFMParam: (param, value) =>
        set((s) => ({
          project: {
            ...s.project,
            fmParams: {
              ratio: 0.5, modIndex: 0.7, attack: 0.01, decay: 0.8, octave: 5, feedback: 0.0,
              ...(s.project.fmParams || {}),
              [param]: value,
            },
          },
        })),

      applyFMPreset: (preset, name) =>
        set((s) => ({ project: { ...s.project, fmPreset: name, fmParams: { ...preset } } })),

      // Pluck Synth implementations
      togglePluckStep: (step, note) =>
        get().updateActivePattern((p) => ({
          ...p,
          pluck: (p.pluck || Array.from({ length: 16 }, () => ({ active: false, note: '', velocity: 0.6, length: 4 }))).map((s, i) => {
            if (i !== step) return s;
            const isSameNote = s.note === note;
            return { ...s, active: isSameNote ? !s.active : true, note };
          }),
        })),

      setPluckSteps: (steps) => get().updateActivePattern((p) => ({ ...p, pluck: steps })),

      updatePluckParam: (param, value) =>
        set((s) => ({
          project: {
            ...s.project,
            pluckParams: {
              damping: 0.7, brightness: 0.8, body: 0.5, octave: 3,
              ...(s.project.pluckParams || {}),
              [param]: value,
            },
          },
        })),

      applyPluckPreset: (preset, name) =>
        set((s) => ({ project: { ...s.project, pluckPreset: name, pluckParams: { ...preset } } })),

      // Chord Stab implementations
      toggleStabStep: (step, note) =>
        get().updateActivePattern((p) => ({
          ...p,
          stab: (p.stab || Array.from({ length: 16 }, () => ({ active: false, note: '', velocity: 0.6, length: 4 }))).map((s, i) => {
            if (i !== step) return s;
            const isSameNote = s.note === note;
            return { ...s, active: isSameNote ? !s.active : true, note };
          }),
        })),

      setStabSteps: (steps) => get().updateActivePattern((p) => ({ ...p, stab: steps })),

      updateStabParam: (param, value) =>
        set((s) => ({
          project: {
            ...s.project,
            stabParams: {
              waveform: 'sawtooth', octave: 4, cutoff: 0.7, attack: 0.01, decay: 0.15, spread: 0.3,
              ...(s.project.stabParams || {}),
              [param]: value,
            },
          },
        })),

      applyStabPreset: (preset, name) =>
        set((s) => ({ project: { ...s.project, stabPreset: name, stabParams: { ...preset } } })),

      updateArrangementBlocks: (blocks) =>
        set((s) => ({ project: { ...s.project, arrangementBlocks: blocks } })),
    }),
    {
      name: 'sequencer-project',
      version: 2,
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          // Old format: raw Project object stored directly
          return { project: persistedState, activePatternId: persistedState?.patterns?.[0]?.id || 'p1' };
        }
        if (version === 1) {
          // Drum2 steps were incorrectly set to 16 — extend all tracks to 32
          const state = persistedState as any;
          const patterns = state?.project?.patterns?.map((p: any) => ({
            ...p,
            drum2: p.drum2?.map((track: any) => ({
              ...track,
              steps: track.steps.length < 32
                ? [...track.steps, ...Array.from({ length: 32 - track.steps.length }, () => ({ active: false, velocity: 0.8 }))]
                : track.steps,
            })),
          }));
          return { ...state, project: { ...state.project, patterns } };
        }
        return persistedState as ProjectStore;
      },
    },
  ),
);

// Selectors
export const useActivePattern = () => {
  const project = useProjectStore((s) => s.project);
  const activePatternId = useProjectStore((s) => s.activePatternId);
  return project.patterns.find((p) => p.id === activePatternId) || project.patterns[0];
};

export const useMixer = () => useProjectStore((s) => s.project.mixer);
