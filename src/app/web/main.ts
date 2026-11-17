import { GameSession, type Stance } from './GameSession.js';
import { clearSave, hasSave, loadSession, saveSession } from './persistence.js';
import { render, type UiState } from './view.js';

const root = document.getElementById('app');
if (!root) throw new Error('Не найден контейнер #app');

let session: GameSession | null = null;
let screen: 'start' | 'game' = 'start';
let message: { text: string; tone: 'ok' | 'bad' } | null = null;
let saved = hasSave(localStorage);
let toastTimer: number | undefined;

function draw(): void {
  const state: UiState = { session, screen, hasSave: saved, message };
  render(root as HTMLElement, state);
}

function notify(text: string, tone: 'ok' | 'bad'): void {
  message = { text, tone };
  draw();
  if (toastTimer !== undefined) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    message = null;
    draw();
  }, 3800);
}

function persist(): boolean {
  if (!session) return false;
  const result = saveSession(localStorage, session);
  if (result.ok) saved = true;
  return result.ok;
}

function applyResult(result: { ok: boolean; message: string }): void {
  persist();
  notify(result.message, result.ok ? 'ok' : 'bad');
}

function newGame(): void {
  session = GameSession.create(`run-${Date.now()}`);
  screen = 'game';
  message = null;
  persist();
  draw();
}

function continueGame(): void {
  const loaded = loadSession(localStorage);
  if (!loaded.ok) {
    saved = false;
    notify('Сохранение не прочитано — начните новую кампанию.', 'bad');
    return;
  }
  session = loaded.value;
  screen = 'game';
  message = null;
  draw();
}

function handleAction(action: string, element: HTMLElement): void {
  const current = session;
  switch (action) {
    case 'new':
    case 'restart':
      newGame();
      return;
    case 'continue':
      continueGame();
      return;
    case 'delete':
      clearSave(localStorage);
      saved = false;
      session = null;
      screen = 'start';
      notify('Сохранение удалено.', 'ok');
      return;
    case 'save':
      if (!current) {
        notify('Нет активной кампании.', 'bad');
        return;
      }
      {
        const ok = persist();
        notify(ok ? 'Кампания сохранена.' : 'Не удалось сохранить кампанию.', ok ? 'ok' : 'bad');
      }
      return;
    case 'menu':
      screen = 'start';
      draw();
      return;
    default:
      break;
  }

  if (!current) return;

  switch (action) {
    case 'travel': {
      const portId = element.dataset.port;
      if (portId) applyResult(current.travel(portId));
      return;
    }
    case 'buy': {
      const goodId = element.dataset.good;
      const qty = Number(element.dataset.qty ?? 1);
      if (goodId) applyResult(current.buy(goodId, qty));
      return;
    }
    case 'sell': {
      const goodId = element.dataset.good;
      const qty = Number(element.dataset.qty ?? 1);
      if (goodId) applyResult(current.sell(goodId, qty));
      return;
    }
    case 'repair':
      applyResult(current.repair());
      return;
    case 'upgrade':
      applyResult(current.upgradeCargo());
      return;
    case 'strike': {
      const stance = element.dataset.stance as Stance | undefined;
      if (stance) applyResult(current.strike(stance));
      return;
    }
    default:
      return;
  }
}

function actionElement(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element ? target.closest<HTMLElement>('[data-action]') : null;
}

root.addEventListener('click', (event) => {
  const element = actionElement(event.target);
  if (!element) return;
  handleAction(element.dataset.action ?? '', element);
});

root.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const element = actionElement(event.target);
  if (!element || element.tagName === 'BUTTON') return;
  event.preventDefault();
  handleAction(element.dataset.action ?? '', element);
});

draw();
