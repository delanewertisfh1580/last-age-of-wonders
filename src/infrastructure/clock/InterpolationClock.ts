/** TKT-M3-022: InterpolationClock — alpha ∈ [0,1), deltaMs для рендера. */
export class InterpolationClock {
  private alphaValue = 0;
  private deltaMsValue = 0;
  private lastTickMs: number | null = null;
  private lastUpdateMs: number | null = null;

  constructor(
    private readonly tickMs: number,
    private readonly nowFn: () => number = () => performance.now(),
  ) {}

  /** Вызывается на каждом игровом такте. */
  markTick(nowMs?: number): void {
    this.lastTickMs = nowMs ?? this.nowFn();
  }

  /** Вызывается перед каждым кадром рендера. */
  update(nowMs?: number): void {
    const now = nowMs ?? this.nowFn();
    if (this.lastUpdateMs === null) {
      this.deltaMsValue = 0;
    } else {
      const raw = now - this.lastUpdateMs;
      // AC09: deltaMs растёт монотонно между тиками (не убывает).
      this.deltaMsValue = Math.max(this.deltaMsValue, raw);
    }
    this.lastUpdateMs = now;

    if (this.lastTickMs === null) {
      this.alphaValue = 0;
      return;
    }
    const rawAlpha = (now - this.lastTickMs) / this.tickMs;
    // AC08: alpha ∈ [0,1): берём дробную часть при переполнении.
    this.alphaValue = rawAlpha >= 1 ? rawAlpha % 1 : Math.max(0, rawAlpha);
  }

  get alpha(): number {
    return Math.min(Math.max(this.alphaValue, 0), 0.999999);
  }

  get deltaMs(): number {
    return this.deltaMsValue;
  }
}
