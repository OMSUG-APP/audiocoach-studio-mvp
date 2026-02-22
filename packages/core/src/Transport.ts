import { Pattern } from '@sequencer/contracts';

export class Transport {
  private _bpm: number = 120;
  private _swing: number = 0;
  private _chain: string[] = [];
  private _currentPatternIndex: number = 0;
  private _isPlaying: boolean = false;

  constructor() {}

  get bpm() { return this._bpm; }
  get swing() { return this._swing; }
  get chain() { return this._chain; }
  get isPlaying() { return this._isPlaying; }
  get currentPatternId(): string | null {
    if (this._chain.length === 0) return null;
    return this._chain[this._currentPatternIndex];
  }

  play() {
    this._isPlaying = true;
  }

  stop() {
    this._isPlaying = false;
    this._currentPatternIndex = 0;
  }

  setBpm(bpm: number) {
    this._bpm = Math.max(1, bpm);
  }

  setSwing(swing: number) {
    this._swing = Math.max(0, Math.min(1, swing));
  }

  setChain(patternIds: string[]) {
    this._chain = patternIds;
    this._currentPatternIndex = 0;
  }

  /**
   * Advances to the next pattern in the chain.
   * Loops back to the start if at the end.
   */
  advancePattern() {
    if (this._chain.length === 0) return;
    this._currentPatternIndex = (this._currentPatternIndex + 1) % this._chain.length;
  }
}
