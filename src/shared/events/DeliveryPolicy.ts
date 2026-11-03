/** TKT-M1-007: политика доставки событий. */
export type DeliveryPolicy = 'Immediate' | 'NextTick' | 'AfterScene' | 'WarningThenImpact';

export const EVENT_QUEUE_POLICIES = ['NextTick', 'AfterScene', 'WarningThenImpact'] as const;

export function isQueuePolicy(p: DeliveryPolicy): boolean {
  return (EVENT_QUEUE_POLICIES as readonly string[]).includes(p);
}
