/** TKT-M3-002: сериализуемое состояние потока (§5.3 DEV-SPEC-005). */
export interface RngStreamState {
  readonly algorithm: 'xor-shift-128-plus';
  /** 32-битные слова состояния в hex-строках. */
  readonly s0: string;
  readonly s1: string;
  readonly s2: string;
  readonly s3: string;
  readonly callCount: number;
}
