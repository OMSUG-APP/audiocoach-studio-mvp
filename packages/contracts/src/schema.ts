import { z } from 'zod';

export const DrumStepSchema = z.object({
  active: z.boolean(),
  velocity: z.number().int().min(0).max(127),
});

export const BassStepSchema = z.object({
  active: z.boolean(),
  velocity: z.number().int().min(0).max(127),
  note: z.number().int().min(0).max(127),
  tie: z.boolean(),
});

export const DrumLaneSchema = z.enum(['kick', 'snare', 'clap', 'hat', 'openhat', 'rim']);

export const DrumTrackDataSchema = z.object({
  type: z.literal('drum'),
  lanes: z.record(DrumLaneSchema, z.array(DrumStepSchema).length(16)),
});

export const BassTrackDataSchema = z.object({
  type: z.literal('bass'),
  steps: z.array(BassStepSchema).length(16),
});

export const TrackDataSchema = z.discriminatedUnion('type', [
  DrumTrackDataSchema,
  BassTrackDataSchema,
]);

export const PatternSchema = z.object({
  id: z.string(),
  tracks: z.array(TrackDataSchema),
  swing: z.number().min(0).max(1),
  chainNext: z.string().nullable(),
});

export const RegionSchema = z.object({
  id: z.string(),
  patternId: z.string(),
  startBar: z.number().min(0),
  lengthBars: z.number().min(1),
  muted: z.boolean(),
});

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.number(),
  bpm: z.number().int().min(60).max(200),
  key: z.string(),
  patterns: z.array(PatternSchema.nullable()).length(32),
  arrangement: z.array(RegionSchema),
});
