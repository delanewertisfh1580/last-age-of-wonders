import { PORTS } from './campaign.js';
import { STANCES, type GameSession, type GameView, type GoodView } from './GameSession.js';

export interface UiState {
  readonly session: GameSession | null;
  readonly screen: 'start' | 'game';
  readonly hasSave: boolean;
  readonly message: { readonly text: string; readonly tone: 'ok' | 'bad' } | null;
}

function money(value: number): string {
  return value.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
}

function pct(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
}

function bar(value: number, max: number, tone: 'hull' | 'cargo'): string {
  return `<span class="bar bar--${tone}"><span class="bar__fill" style="width:${pct(value, max)}%"></span></span>`;
}

const ROUTES: readonly (readonly [string, string])[] = [
  ['brasshaven', 'aetherport'],
  ['brasshaven', 'grainreach'],
  ['aetherport', 'ironcove'],
  ['grainreach', 'veilmarket'],
  ['ironcove', 'veilmarket'],
  ['veilmarket', 'brasshaven'],
];

function startScreen(hasSave: boolean): string {
  return `
  <section class="screen start">
    <div class="start__glow" aria-hidden="true"></div>
    <header class="start__brand">
      <span class="eyebrow">Вертикальный срез · торговый капитан</span>
      <h1>Наука<br />против <em>Магии</em></h1>
      <p class="lead">
        Латунь и эфир делят одно море. Вы — капитан вольного судна: покупайте сырьё там,
        где его избыток, продавайте там, где голод, и не дайте пиратам пустить корпус на щепы.
      </p>
      <div class="start__actions">
        <button class="btn btn--primary" data-action="new">Новая кампания</button>
        <button class="btn" data-action="continue" ${hasSave ? '' : 'disabled'}>Продолжить</button>
      </div>
      ${hasSave ? '<button class="link-btn" data-action="delete">удалить сохранение</button>' : ''}
    </header>
    <aside class="start__howto">
      <h2>Как играть</h2>
      <ol>
        <li><span>01</span> Открывайте рынок в порту и смотрите, где товар дёшев.</li>
        <li><span>02</span> Переходите между портами — каждый день в море повышает риск.</li>
        <li><span>03</span> В бою выбирайте тактику: залп, абордаж или уклонение.</li>
        <li><span>04</span> Чините корпус и расширяйте трюм, пока золото позволяет.</li>
      </ol>
      <p class="start__hint">Прогресс сохраняется в браузере автоматически после каждого действия.</p>
    </aside>
  </section>`;
}

function hud(view: GameView): string {
  return `
  <header class="hud">
    <div class="hud__brand">
      <span class="hud__mark">⚙</span>
      <div>
        <span class="hud__title">Наука против Магии</span>
        <span class="hud__sub">день ${view.day} · ${view.portName}</span>
      </div>
    </div>
    <div class="hud__stats">
      <div class="stat">
        <span class="stat__label">Золото</span>
        <span class="stat__value">${money(view.money)}</span>
      </div>
      <div class="stat stat--wide">
        <span class="stat__label">Корпус ${view.hull}/${view.maxHull}</span>
        ${bar(view.hull, view.maxHull, 'hull')}
      </div>
      <div class="stat stat--wide">
        <span class="stat__label">Трюм ${view.cargoUsed}/${view.cargoCapacity}</span>
        ${bar(view.cargoUsed, view.cargoCapacity, 'cargo')}
      </div>
      <div class="stat">
        <span class="stat__label">P&amp;L</span>
        <span class="stat__value ${view.profit >= 0 ? 'is-ok' : 'is-bad'}">${view.profit >= 0 ? '+' : ''}${money(view.profit)}</span>
      </div>
      <div class="stat">
        <span class="stat__label">Потоплено</span>
        <span class="stat__value">${view.sunk}</span>
      </div>
    </div>
    <div class="hud__actions">
      <button class="btn btn--ghost" data-action="save">Сохранить</button>
      <button class="btn btn--ghost" data-action="menu">Меню</button>
    </div>
  </header>`;
}

function map(view: GameView): string {
  const current = PORTS.find((port) => port.id === view.portId);
  const routes = ROUTES.map(([from, to]) => {
    const a = PORTS.find((port) => port.id === from);
    const b = PORTS.find((port) => port.id === to);
    if (!a || !b) return '';
    const active = from === view.portId || to === view.portId;
    return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="route${active ? ' route--active' : ''}" />`;
  }).join('');

  const ports = view.ports
    .map((port) => {
      const canTravel = view.status === 'port' && !port.current;
      return `
      <g class="port${port.current ? ' port--current' : ''}${canTravel ? ' port--target' : ''}"
         ${canTravel ? `data-action="travel" data-port="${port.id}"` : ''}
         tabindex="${canTravel ? '0' : '-1'}" role="${canTravel ? 'button' : 'presentation'}">
        <circle class="port__halo" cx="${port.x}" cy="${port.y}" r="26" />
        <circle class="port__dot" cx="${port.x}" cy="${port.y}" r="${port.current ? 8 : 5.5}" />
        <text class="port__name" x="${port.x}" y="${port.y - 20}" text-anchor="middle">${port.name}</text>
        <text class="port__tag" x="${port.x}" y="${port.y + 24}" text-anchor="middle">${port.tagline}</text>
      </g>`;
    })
    .join('');

  return `
  <section class="panel map-panel">
    <div class="panel__head">
      <h2>Море Латуни и Эфира</h2>
      <span class="panel__note">${current ? current.tagline : ''}</span>
    </div>
    <svg class="map" viewBox="0 0 760 600" role="img" aria-label="Карта портов">
      <defs>
        <radialGradient id="seaGlow" cx="50%" cy="45%" r="65%">
          <stop offset="0%" stop-color="#16344a" />
          <stop offset="100%" stop-color="#0a121c" />
        </radialGradient>
        <pattern id="graticule" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M48 0H0V48" fill="none" stroke="rgba(201,162,39,0.10)" stroke-width="1" />
        </pattern>
      </defs>
      <rect width="760" height="600" fill="url(#seaGlow)" />
      <rect width="760" height="600" fill="url(#graticule)" />
      ${routes}
      ${ports}
      ${
        current
          ? `<g class="ship-marker">
              <circle cx="${current.x}" cy="${current.y}" r="15" />
              <text x="${current.x}" y="${current.y + 5}" text-anchor="middle">⚓</text>
            </g>`
          : ''
      }
    </svg>
    <p class="map__legend">Клик по порту — идти туда. Каждый переход занимает день и может привести к бою.</p>
  </section>`;
}

function goodsRows(view: GameView): string {
  return view.goods
    .map((good: GoodView) => {
      const maxBuy = Math.max(0, Math.min(good.stock, view.cargoCapacity - view.cargoUsed));
      return `
      <tr>
        <td class="goods__name"><span class="goods__icon">${good.icon}</span>${good.name}</td>
        <td class="num">${good.stock}</td>
        <td class="num price-buy">${money(good.buy)}</td>
        <td class="num price-sell">${money(good.sell)}</td>
        <td class="num">${good.qty}</td>
        <td class="goods__actions">
          <button class="chip" data-action="buy" data-good="${good.id}" data-qty="1" ${maxBuy < 1 ? 'disabled' : ''}>Купить 1</button>
          <button class="chip" data-action="buy" data-good="${good.id}" data-qty="5" ${maxBuy < 5 ? 'disabled' : ''}>Купить 5</button>
          <button class="chip chip--sell" data-action="sell" data-good="${good.id}" data-qty="1" ${good.qty < 1 ? 'disabled' : ''}>Продать 1</button>
          <button class="chip chip--sell" data-action="sell" data-good="${good.id}" data-qty="${good.qty}" ${good.qty < 1 ? 'disabled' : ''}>Всё</button>
        </td>
      </tr>`;
    })
    .join('');
}

function portPanel(view: GameView): string {
  return `
  <section class="panel port-panel">
    <div class="panel__head">
      <h2>${view.portName}</h2>
      <span class="panel__note">${view.tagline}</span>
    </div>
    <table class="goods">
      <thead>
        <tr>
          <th>Товар</th>
          <th class="num">Склад</th>
          <th class="num">Купить</th>
          <th class="num">Сдать</th>
          <th class="num">Трюм</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${goodsRows(view)}</tbody>
    </table>
    <div class="port-actions">
      <button class="btn" data-action="repair" ${view.repairCost === 0 ? 'disabled' : ''}>
        Ремонт корпуса${view.repairCost > 0 ? ` · ${money(view.repairCost)}` : ''}
      </button>
      <button class="btn" data-action="upgrade" ${view.upgradeCost === 0 ? 'disabled' : ''}>
        ${view.upgradeCost === 0 ? 'Трюм максимален' : `Расширить трюм · ${money(view.upgradeCost)}`}
      </button>
    </div>
  </section>`;
}

function logPanel(view: GameView): string {
  const entries = view.log
    .map((line) => `<li>${line}</li>`)
    .join('');
  return `
  <section class="panel log-panel">
    <div class="panel__head">
      <h2>Судовой журнал</h2>
      <span class="panel__note">день ${view.day}</span>
    </div>
    <ul class="log">${entries}</ul>
  </section>`;
}

function combatOverlay(view: GameView): string {
  const encounter = view.encounter;
  if (!encounter) return '';
  const stances = STANCES.map(
    (stance) => `
      <button class="stance" data-action="strike" data-stance="${stance.id}">
        <span class="stance__label">${stance.label}</span>
        <span class="stance__hint">${stance.hint}</span>
      </button>`,
  ).join('');
  return `
  <div class="overlay">
    <section class="combat card">
      <span class="eyebrow">Бой · раунд ${encounter.round} · ${encounter.phaseLabel}</span>
      <h2>${encounter.enemyName}</h2>
      <div class="combat__ships">
        <div class="ship-card">
          <span class="ship-card__name">Ваше судно</span>
          <span class="ship-card__hp">${encounter.playerHp} / ${view.maxHull}</span>
          ${bar(encounter.playerHp, view.maxHull, 'hull')}
        </div>
        <span class="combat__vs">⚔</span>
        <div class="ship-card ship-card--enemy">
          <span class="ship-card__name">Пираты</span>
          <span class="ship-card__hp">${encounter.enemyHp} / ${encounter.enemyMaxHp}</span>
          ${bar(encounter.enemyHp, encounter.enemyMaxHp, 'hull')}
        </div>
      </div>
      <div class="stances">${stances}</div>
      <p class="combat__loot">За победу: ~${money(encounter.loot)} золота трофеев.</p>
    </section>
  </div>`;
}

function gameoverOverlay(view: GameView): string {
  if (view.status !== 'gameover') return '';
  return `
  <div class="overlay">
    <section class="card gameover">
      <span class="eyebrow">Кампания завершена</span>
      <h2>Корпус разбит</h2>
      <p class="lead">Судно легло на дно на ${view.day}-й день. Трофеев за рейс: ${view.sunk} побед, итог ${view.profit >= 0 ? '+' : ''}${money(view.profit)} золота.</p>
      <div class="gameover__actions">
        <button class="btn btn--primary" data-action="restart">Новая кампания</button>
        <button class="btn" data-action="menu">В меню</button>
      </div>
    </section>
  </div>`;
}

function gameScreen(view: GameView): string {
  return `
  <section class="screen game">
    ${hud(view)}
    <div class="board">
      ${map(view)}
      ${portPanel(view)}
      ${logPanel(view)}
    </div>
    ${combatOverlay(view)}
    ${gameoverOverlay(view)}
  </section>`;
}

function toast(state: UiState): string {
  if (!state.message) return '';
  return `<div class="toast toast--${state.message.tone}">${state.message.text}</div>`;
}

export function render(root: HTMLElement, state: UiState): void {
  if (state.screen === 'start' || !state.session) {
    root.innerHTML = `${startScreen(state.hasSave)}${toast(state)}`;
    return;
  }
  root.innerHTML = `${gameScreen(state.session.view())}${toast(state)}`;
}
