/**
 * Monotonic Smooth Playback Clock with Zero-Jitter Rate Steering
 * Guarantees time NEVER steps backwards while playing, eliminating repeating lyrics & micro-stutters.
 */

export class PlaybackClock {
  private basePosition: number = 0;
  private lastSyncPerfTime: number = 0;
  private isPlaying: boolean = false;
  private manualOffsetMs: number = 0;
  private lastReturnedTime: number = 0;

  /**
   * Called when new sync packet arrives from macOS AppleScript or local player
   */
  public sync(remotePosition: number, playing: boolean, latencyMs: number = 180) {
    const now = performance.now();
    this.isPlaying = playing;

    if (!playing) {
      this.basePosition = remotePosition;
      this.lastSyncPerfTime = now;
      this.lastReturnedTime = remotePosition;
      return;
    }

    // Add latency compensation (time elapsed during AppleScript execution)
    const correctedPosition = remotePosition + latencyMs / 1000;

    if (this.lastSyncPerfTime === 0) {
      this.basePosition = correctedPosition;
      this.lastSyncPerfTime = now;
      this.lastReturnedTime = correctedPosition;
      return;
    }

    const currentEst = this.basePosition + (now - this.lastSyncPerfTime) / 1000;
    const diff = correctedPosition - currentEst;

    // Detect explicit user seek (backward jump > 1.5s or forward jump > 2.0s)
    if (diff < -1.5 || diff > 2.0) {
      this.basePosition = correctedPosition;
      this.lastSyncPerfTime = now;
      this.lastReturnedTime = correctedPosition;
      return;
    }

    // Gentle rate steering:
    // If incoming is slightly ahead, advance basePosition by 30% of gap.
    // If incoming is slightly behind, DO NOT rewind basePosition (which causes repeating lyrics)!
    // Instead, gently absorb the gap over time without moving backwards.
    if (diff > 0.05) {
      this.basePosition += diff * 0.3;
      this.lastSyncPerfTime = now;
    } else if (diff < -0.3) {
      // Significantly ahead (>300ms), gently decelerate base
      this.basePosition += diff * 0.15;
      this.lastSyncPerfTime = now;
    }
  }

  /**
   * Reset clock (called on track switch or explicit manual seek)
   */
  public reset(position: number = 0, playing: boolean = false) {
    this.basePosition = position;
    this.lastSyncPerfTime = performance.now();
    this.isPlaying = playing;
    this.lastReturnedTime = position;
  }

  public setManualOffset(offsetMs: number) {
    this.manualOffsetMs = offsetMs;
  }

  public getManualOffset(): number {
    return this.manualOffsetMs;
  }

  /**
   * High-precision instantaneous position sampled right now.
   * Strictly monotonic while playing: NEVER decreases between consecutive frames!
   */
  public now(): number {
    const offsetSec = this.manualOffsetMs / 1000;

    if (!this.isPlaying || this.lastSyncPerfTime === 0) {
      const t = Math.max(0, this.basePosition + offsetSec);
      this.lastReturnedTime = t;
      return t;
    }

    const elapsed = (performance.now() - this.lastSyncPerfTime) / 1000;
    let t = Math.max(0, this.basePosition + elapsed + offsetSec);

    // Monotonicity guarantee: while playing, time can NEVER jump backwards
    if (t < this.lastReturnedTime) {
      t = this.lastReturnedTime;
    } else {
      this.lastReturnedTime = t;
    }

    return t;
  }
}

export const globalClock = new PlaybackClock();
