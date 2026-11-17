import { GameSession } from './GameSession.js';
import { BattleSim } from './battle/BattleSim.js';
import { WorldRenderer } from './render/world.js';
import { WebRngService } from '../../infrastructure/rng/WebRngService.js';
import { clearSave, hasSave, loadSession, saveSession } from './persistence.js';
import { render, setStageHint, updateLiveHud, type UiState } from './view.js';

const root = document.getElementById('app');
if (!root) throw new Error('Не найден контейнер #app');

let session: GameSession | null = null;
let battle: BattleSim | null = null;
let enemyName: string | null = null;
let screen: 'start' | 'game' = 'start';
let message: { text: string; tone: 'ok' | 'bad' } | null = null;
let saved = hasSave(localStorage);
let toastTimer: number | undefined;
let renderer: WorldRenderer | null = null;

const held = new Set<string>();
const touch = { left: false, right: false, forward: false, back: false, fire: false };

function draw(): void {
  const state: UiState = { session, screen, hasSave: saved, message, enemyName };
  render(root as HTMLElement, state);
  const canvas = root?.querySelector<HTMLCanvasElement>('[data-canvas]');
  renderer = canvas ? new WorldRenderer(canvas) : null;
  if (renderer && session) {
    const view = session.view();
    renderer.draw(
      {
        portId: session.portId,
        status: session.status,
        voyage: view.voyage
          ? { from: session.voyage?.from ?? '', to: session.voyage?.to ?? '', progress: view.voyage.progress }
          : null,
        battle: session.status === 'combat' ? battle : null,
        hullRatio: session.hull / session.maxHull,
      },
      0,
      performance.now() / 1000,
    );
  }
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

function persistIfPossible(): void {
  if (session && (session.status === 'port' || session.status === 'gameover')) persist();
}

function applyResult(result: { ok: boolean; message: string }): void {
  persistIfPossible();
  notify(result.message, result.ok ? 'ok' : 'bad');
}

function newGame(): void {
  session = GameSession.create(`run-${Date.now()}`);
  battle = null;
  enemyName = null;
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
  battle = null;
  enemyName = null;
  screen = 'game';
  message = null;
  draw();
}

function startBattle(): void {
  if (!session) return;
  const setup = session.combatSetup();
  if (!setup) return;
  battle = new BattleSim(
    {
      playerHp: setup.playerHull,
      playerPower: setup.playerPower,
      playerArmor: setup.playerArmor,
      enemyName: setup.enemyName,
      enemyHp: setup.enemyHp,
      enemyPower: setup.enemyPower,
      enemyArmor: setup.enemyArmor,
      turnMultiplier: setup.turnMultiplier,
      reloadMultiplier: setup.reloadMultiplier,
      doctrine: setup.doctrine,
    },
    new WebRngService(`${session.seed}:battle:${session.day}`),
    setup.loot,
  );
  enemyName = setup.enemyName;
  draw();
}

function finishBattle(won: boolean): void {
  if (!session || !battle) return;
  const result = session.finishCombat(won, battle.player.hp);
  battle = null;
  enemyName = null;
  persistIfPossible();
  notify(result.message, result.ok ? 'ok' : 'bad');
}

function setSail(portId: string): void {
  if (!session) return;
  const result = session.setSail(portId);
  if (!result.ok) {
    notify(result.message, 'bad');
    return;
  }
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
      battle = null;
      screen = 'start';
      notify('Сохранение удалено.', 'ok');
      return;
    case 'save': {
      if (!current) {
        notify('Нет активной кампании.', 'bad');
        return;
      }
      if (current.status === 'combat' || current.status === 'sailing') {
        notify('В море и в бою не сохраняемся — дойдите до порта.', 'bad');
        return;
      }
      const ok = persist();
      notify(ok ? 'Кампания сохранена.' : 'Не удалось сохранить кампанию.', ok ? 'ok' : 'bad');
      return;
    }
    case 'menu':
      screen = 'start';
      battle = null;
      enemyName = null;
      draw();
      return;
    default:
      break;
  }

  if (!current) return;

  switch (action) {
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
    case 'recruit': {
      const companion = element.dataset.companion;
      if (companion) applyResult(current.recruit(companion));
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
  if (session && session.status === 'port' && renderer) {
    const canvas = event.target instanceof Element ? event.target.closest('[data-canvas]') : null;
    if (canvas) {
      const portId = renderer.hitTest(event.clientX, event.clientY);
      if (portId && portId !== session.portId) {
        setSail(portId);
        return;
      }
    }
  }
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

function setHeld(name: string, pressed: boolean): void {
  if (pressed) held.add(name);
  else held.delete(name);
}

window.addEventListener('keydown', (event) => {
  if (screen !== 'game') return;
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
    event.preventDefault();
    setHeld(event.code, true);
  }
});

window.addEventListener('keyup', (event) => {
  setHeld(event.code, false);
});

window.addEventListener('blur', () => {
  held.clear();
  touch.left = touch.right = touch.forward = touch.back = touch.fire = false;
});

// Удержание экранных кнопок (мобильные/тач).
root.addEventListener('pointerdown', (event) => {
  const element = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-hold]') : null;
  if (!element) return;
  event.preventDefault();
  const key = element.dataset.hold;
  if (key && key in touch) (touch as unknown as Record<string, boolean>)[key] = true;
});

function releaseTouch(event: PointerEvent): void {
  const element = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-hold]') : null;
  if (!element) return;
  const key = element.dataset.hold;
  if (key && key in touch) (touch as unknown as Record<string, boolean>)[key] = false;
}
root.addEventListener('pointerup', releaseTouch);
root.addEventListener('pointercancel', releaseTouch);
root.addEventListener('pointerleave', releaseTouch);

function readInput(): { throttle: number; turn: number; fire: boolean } {
  const forward = held.has('KeyW') || held.has('ArrowUp') || touch.forward;
  const back = held.has('KeyS') || held.has('ArrowDown') || touch.back;
  const left = held.has('KeyA') || held.has('ArrowLeft') || touch.left;
  const right = held.has('KeyD') || held.has('ArrowRight') || touch.right;
  return {
    throttle: forward ? 1 : back ? -0.6 : 0,
    turn: right ? 1 : left ? -1 : 0,
    fire: held.has('Space') || touch.fire,
  };
}

let lastTime = performance.now();

function frame(now: number): void {
  const dt = Math.min(0.06, (now - lastTime) / 1000);
  lastTime = now;

  if (screen === 'game' && session) {
    if (session.status === 'sailing') {
      const result = session.tickVoyage(dt);
      if (result === 'ambush') startBattle();
      else if (result === 'arrived') {
        persistIfPossible();
        notify(`Ошвартовались: ${session.view().portName}.`, 'ok');
      } else {
        updateLiveHud(root as HTMLElement, session.hull, session.maxHull, session.voyage?.progress ?? null);
        setStageHint(root as HTMLElement, 'Судно в пути');
      }
    } else if (session.status === 'combat' && battle) {
      battle.update(dt, readInput());
      updateLiveHud(root as HTMLElement, battle.player.hp, battle.player.maxHp, null);
      if (battle.status === 'victory') finishBattle(true);
      else if (battle.status === 'defeat') finishBattle(false);
    }

    if (renderer) {
      renderer.draw(
        {
          portId: session.portId,
          status: session.status,
          voyage: session.voyage
            ? {
                from: session.voyage.from,
                to: session.voyage.to,
                progress: session.voyage.progress,
              }
            : null,
          battle: session.status === 'combat' ? battle : null,
          hullRatio: session.hull / session.maxHull,
        },
        dt,
        now / 1000,
      );
    }
  }
  requestAnimationFrame(frame);
}

draw();
requestAnimationFrame(frame);
