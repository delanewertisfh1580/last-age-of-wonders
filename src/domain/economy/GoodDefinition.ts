import type { Brand } from '../brand/Brand.js';

/**
 * TKT-M5-002: GoodDefinition из §5.1 DEV-SPEC-020.
 * ECON-INV-02: в типе нет числовых полей цены/количества — только ссылки на политики (data-driven).
 */

/** Branded идентификатор товара. */
export type GoodId = string & Brand<'GoodId'> & { readonly __good?: true };

export type GoodTier = 'raw' | 'intermediate' | 'final' | 'contraband' | 'strategic';

export type GoodOrigin = 'science' | 'magic' | 'hybrid' | 'neutral';

export type GoodTag =
  | 'perishable'
  | 'ritual-warded'
  | 'sealed'
  | 'bulky'
  | 'volatile'
  | 'flammable';

export interface GoodDefinition {
  readonly id: GoodId;
  readonly displayNameKey: string; // 'good.coal.name'
  readonly tier: GoodTier;
  readonly origin: GoodOrigin;
  readonly tags: readonly GoodTag[];
  readonly basePricePolicyId: string; // политика базовой цены (data-driven)
  readonly contrabandIn: readonly string[]; // id узлов/фракций, где товар запрещён
  readonly unitMassPolicyId: string; // масса единицы для CargoCapacityPort
}
