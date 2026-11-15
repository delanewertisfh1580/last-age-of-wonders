import { describe, it, expect } from 'vitest';
import { AjvSchemaValidator } from '../../src/infrastructure/content/AjvSchemaValidator.js';
import { loadSchemasFromContentRoot } from '../../src/bootstrap/LoadSchemas.js';

function makeValidator(): AjvSchemaValidator {
  const validator = new AjvSchemaValidator();
  const schemas = loadSchemasFromContentRoot('content');
  if (schemas.ok) {
    for (const [name, schema] of Object.entries(schemas.value)) validator.registerSchema(name, schema);
  }
  return validator;
}

const validGood = {
  id: 'coal',
  display_name_key: 'good.coal.name',
  tier: 'raw',
  origin: 'science',
  tags: ['flammable'],
  base_price_policy_id: 'pc-coal',
  contraband_in: [],
  unit_mass_policy_id: 'mass-coal',
};

const io = { good_id: 'coal', quantity_policy_id: 'qty-1' };

describe('TKT-M5-001: схемы экономики', () => {
  it('AC01: валидный good валиден', () => {
    expect(makeValidator().validate('good-definition', validGood).ok).toBe(true);
  });

  it('AC02: лишнее поле → Err (additionalProperties:false)', () => {
    expect(makeValidator().validate('good-definition', { ...validGood, price: 42 }).ok).toBe(false);
  });

  it('conversion if/then: оба policy-поля → Ok', () => {
    const conv = {
      id: 'c',
      display_name_key: 'recipe.c.name',
      kind: 'conversion',
      inputs: [io],
      outputs: [io],
      origin_tags: ['science', 'magic'],
      duration_policy_id: 'd',
      loss_fraction_policy_id: 'l',
      risk_policy_id: 'r',
    };
    expect(makeValidator().validate('recipe-definition', conv).ok).toBe(true);
  });

  it('conversion без loss/risk → Err (then-ветка)', () => {
    const conv = {
      id: 'c',
      display_name_key: 'recipe.c.name',
      kind: 'conversion',
      inputs: [io],
      outputs: [io],
      origin_tags: ['science', 'magic'],
      duration_policy_id: 'd',
    };
    expect(makeValidator().validate('recipe-definition', conv).ok).toBe(false);
  });

  it('non-conversion без loss/risk → Ok (if-ветка не применяется)', () => {
    const prod = {
      id: 'p',
      display_name_key: 'recipe.p.name',
      kind: 'production',
      inputs: [io],
      outputs: [io],
      origin_tags: ['science'],
      duration_policy_id: 'd',
    };
    expect(makeValidator().validate('recipe-definition', prod).ok).toBe(true);
  });

  it('market-state: валидный снимок Ок, отрицательный quantity → Err', () => {
    const v = makeValidator();
    const snapshot = {
      market_id: 'market-steam-capital',
      inventories: { coal: { quantity: 10, reserved: 2 } },
      prices: { coal: { current: 12.5, trend: 0, last_tick: 3 } },
      player_impact: { coal: { sold_total: 0, bought_total: 5 } },
      knowledge: { visited: {}, hearsay: {} },
    };
    expect(v.validate('market-state', snapshot).ok).toBe(true);
    const bad = {
      ...snapshot,
      inventories: { coal: { quantity: -1, reserved: 0 } },
    };
    expect(v.validate('market-state', bad).ok).toBe(false);
  });
});
