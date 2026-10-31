/**
 * High-Precision Playback Clock with Latency Compensation & Drift Interpolation
 * Runs at native display refresh rate (60Hz / 120Hz ProMotion) for silky-smooth lyric animation
 */

export class PlaybackClock {
  private basePosition: number = 0;
  private lastSyncPerfTime: number = 0;
  private isPlaying: boolean = false;
  private manualOffsetMs: number = 0;

  /**
   * Called when new sync packet arrives from macOS AppleScript or local player
   */
  public sync(remotePosition: number, playing: boolean, latencyMs: number = 180) {
    const now = performance.now();
    this.isPlaying = playing;

    if (!playing) {
      this.basePosition = remotePosition;
      this.lastSyncPerfTime = now;
      return;
    }

    // Add latency compensation (time elapsed during AppleScript execution)
    const correctedPosition = remotePosition + latencyMs / 1000;

    if (this.lastSyncPerfTime === 0) {
      this.basePosition = correctedPosition;
      this.lastSyncPerfTime = now;
      return;
    }

    // Calculate currently estimated position
    const currentEst = this.basePosition + (now - this.lastSyncPerfTime) / 1000;
    const diff = correctedPosition - currentEst;

    // If drift is large (> 400ms), snap to corrected position
    if (Math.abs(diff) > 0.4) {
      this.basePosition = correctedPosition;
      this.lastSyncPerfTime = now;
    } else {
      // Soft drift nudge: gently blend 35% of the drift to eliminate any visual micro-stutter
      this.basePosition += diff * 0.35;
      this.lastSyncPerfTime = now;
    }
  }

  /**
   * Reset clock
   */
  public reset(position: number = 0, playing: boolean = false) {
    this.basePosition = position;
    this.lastSyncPerfTime = performance.now();
    this.isPlaying = playing;
  }

  public setManualOffset(offsetMs: number) {
    this.manualOffsetMs = offsetMs;
  }

  public getManualOffset(): number {
    return this.manualOffsetMs;
  }

  /**
   * High-precision instantaneous position sampled right now
   */
  public now(): number {
    const offsetSec = this.manualOffsetMs / 1000;
    if (!this.isPlaying || this.lastSyncPerfTime === 0) {
      return Math.max(0, this.basePosition + offsetSec);
    }
    const elapsed = (performance.now() - this.lastSyncPerfTime) / 1000;
    return Math.max(0, this.basePosition + elapsed + offsetSec);
  }
}

export const globalClock = new PlaybackClock();
