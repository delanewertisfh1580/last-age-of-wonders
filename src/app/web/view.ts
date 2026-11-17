import { COMPANIONS } from './companions.js';
import type { GameSession, GameView, GoodView } from './GameSession.js';

export interface UiState {
  readonly session: GameSession | null;
  readonly screen: 'start' | 'game';
  readonly hasSave: boolean;
  readonly message: { readonly text: string; readonly tone: 'ok' | 'bad' } | null;
  readonly enemyName?: string | null;
}

function money(value: number): string {
  return value.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
}

function pct(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
}

function bar(value: number, max: number, tone: 'hull' | 'cargo'): string {
  return `<span class="bar bar--${tone}"><span class="bar__fill" data-bar="${tone}" style="width:${pct(value, max)}%"></span></span>`;
}

function startScreen(hasSave: boolean): string {
  return `
  <section class="screen start">
    <div class="start__glow" aria-hidden="true"></div>
    <header class="start__brand">
      <span class="eyebrow">Изометрическая кампания · торговый капитан</span>
      <h1>Наука<br />против <em>Магии</em></h1>
      <p class="lead">
        Латунь и эфир делят одно море. Пять живых городов, ночные доки, паруса и порох:
        ведите судно между портами, торгуйте, нанимайте команду и уходите от пиратских залпов.
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
        <li><span>01</span> На рынке ищите товар, который в этом порту дёшев, а в другом — в цене.</li>
        <li><span>02</span> Клик по городу на карте — судно выходит в море. Переход занимает день.</li>
        <li><span>03</span> В бою руль на A/D, ход на W/S, бортовой залп — Пробел. Стреляет только тот борт, что смотрит на врага.</li>
        <li><span>04</span> Напарники меняют бой: штурман ускоряет руль, канонир — перезарядку, лекарь удешевляет ремонт.</li>
      </ol>
      <p class="start__hint">Прогресс сохраняется в браузере автоматически в порту.</p>
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
        <span class="stat__value" data-hud="money">${money(view.money)}</span>
      </div>
      <div class="stat stat--wide">
        <span class="stat__label">Корпус <span data-hud="hull-text">${view.hull}/${view.maxHull}</span></span>
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

function stage(view: GameView, enemyName: string | null | undefined): string {
  const sailing = view.status === 'sailing' && view.voyage;
  const combat = view.status === 'combat';
  return `
  <div class="stage">
    <canvas class="stage__canvas" data-canvas aria-label="Изометрическая карта моря"></canvas>
    <div class="stage__hint" data-stage-hint>
      ${sailing ? 'Судно в пути' : combat ? 'Бой' : 'Клик по городу — идти туда'}
    </div>
    ${
      sailing && view.voyage
        ? `<div class="voyage">
            <span class="voyage__label">Курс: ${view.voyage.fromName} → ${view.voyage.toName}</span>
            <span class="bar bar--cargo voyage__bar"><span class="bar__fill" data-voyage-bar style="width:${pct(view.voyage.progress, 1)}%"></span></span>
            <span class="voyage__note">${view.voyage.danger ? 'В тумане слышны барабаны…' : 'Море спокойно'}</span>
          </div>`
        : ''
    }
    ${
      combat
        ? `<div class="battle-banner">
            <span class="eyebrow">Бой</span>
            <strong>${enemyName ?? 'Пираты'}</strong>
            <span class="battle-banner__hint">A/D — руль · W/S — ход · Пробел — залп</span>
          </div>
          <div class="touch-controls">
            <button class="touch" data-hold="left">◀</button>
            <button class="touch" data-hold="right">▶</button>
            <button class="touch" data-hold="back">▽</button>
            <button class="touch" data-hold="forward">△</button>
            <button class="touch touch--fire" data-hold="fire">🔥 Залп</button>
          </div>`
        : ''
    }
  </div>`;
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
          <button class="chip" data-action="buy" data-good="${good.id}" data-qty="1" ${maxBuy < 1 ? 'disabled' : ''}>+1</button>
          <button class="chip" data-action="buy" data-good="${good.id}" data-qty="5" ${maxBuy < 5 ? 'disabled' : ''}>+5</button>
          <button class="chip chip--sell" data-action="sell" data-good="${good.id}" data-qty="1" ${good.qty < 1 ? 'disabled' : ''}>−1</button>
          <button class="chip chip--sell" data-action="sell" data-good="${good.id}" data-qty="${good.qty}" ${good.qty < 1 ? 'disabled' : ''}>всё</button>
        </td>
      </tr>`;
    })
    .join('');
}

function portPanel(view: GameView): string {
  if (view.status !== 'port') return '';
  return `
  <section class="panel market-panel">
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
        Ремонт${view.repairCost > 0 ? ` · ${money(view.repairCost)}` : ''}
      </button>
      <button class="btn" data-action="upgrade" ${view.upgradeCost === 0 ? 'disabled' : ''}>
        ${view.upgradeCost === 0 ? 'Трюм максимален' : `Трюм +4 · ${money(view.upgradeCost)}`}
      </button>
    </div>
  </section>`;
}

function crewPanel(view: GameView): string {
  const cards = COMPANIONS.map((companion) => {
    const entry = view.companions.find((item) => item.id === companion.id);
    const owned = entry?.owned ?? false;
    return `
      <li class="crew${owned ? ' crew--owned' : ''}">
        <span class="crew__icon">${companion.icon}</span>
        <div class="crew__body">
          <span class="crew__name">${companion.name}</span>
          <span class="crew__perk">${companion.perk}</span>
        </div>
        ${
          owned
            ? '<span class="crew__badge">в команде</span>'
            : `<button class="chip" data-action="recruit" data-companion="${companion.id}" ${entry?.affordable ? '' : 'disabled'}>${companion.cost}</button>`
        }
      </li>`;
  }).join('');
  return `
  <section class="panel crew-panel">
    <div class="panel__head">
      <h2>Команда</h2>
      <span class="panel__note">${view.companions.filter((item) => item.owned).length} / ${COMPANIONS.length}</span>
    </div>
    <ul class="crew-list">${cards}</ul>
  </section>`;
}

function logPanel(view: GameView): string {
  const entries = view.log.map((line) => `<li>${line}</li>`).join('');
  return `
  <section class="panel log-panel">
    <div class="panel__head">
      <h2>Судовой журнал</h2>
      <span class="panel__note">день ${view.day}</span>
    </div>
    <ul class="log">${entries}</ul>
  </section>`;
}

function gameoverOverlay(view: GameView): string {
  if (view.status !== 'gameover') return '';
  return `
  <div class="overlay">
    <section class="card gameover">
      <span class="eyebrow">Кампания завершена</span>
      <h2>Корпус разбит</h2>
      <p class="lead">Судно легло на дно на ${view.day}-й день. Побед: ${view.sunk}. Итог: ${view.profit >= 0 ? '+' : ''}${money(view.profit)} золота.</p>
      <div class="gameover__actions">
        <button class="btn btn--primary" data-action="restart">Новая кампания</button>
        <button class="btn" data-action="menu">В меню</button>
      </div>
    </section>
  </div>`;
}

function gameScreen(view: GameView, enemyName: string | null | undefined): string {
  return `
  <section class="screen game">
    ${hud(view)}
    ${stage(view, enemyName)}
    <div class="dock${view.status === 'port' ? '' : ' dock--solo'}">
      ${portPanel(view)}
      ${view.status === 'port' ? crewPanel(view) : ''}
      ${logPanel(view)}
    </div>
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
  root.innerHTML = `${gameScreen(state.session.view(), state.enemyName)}${toast(state)}`;
}

/** Точечное обновление HUD во время плавания/боя — без полного ререндера. */
export function updateLiveHud(root: HTMLElement, hull: number, maxHull: number, voyageProgress: number | null): void {
  const hullText = root.querySelector<HTMLElement>('[data-hud="hull-text"]');
  if (hullText) hullText.textContent = `${hull}/${maxHull}`;
  const barFill = root.querySelector<HTMLElement>('[data-bar="hull"]');
  if (barFill) barFill.style.width = `${pct(hull, maxHull)}%`;
  if (voyageProgress !== null) {
    const voyageBar = root.querySelector<HTMLElement>('[data-voyage-bar]');
    if (voyageBar) voyageBar.style.width = `${Math.round(Math.min(1, Math.max(0, voyageProgress)) * 100)}%`;
  }
}

/** Убирает подсказку «клик по городу», когда сессия уже в море. */
export function setStageHint(root: HTMLElement, text: string): void {
  const hint = root.querySelector<HTMLElement>('[data-stage-hint]');
  if (hint) hint.textContent = text;
}
