import { describe, expect, it } from 'vitest';
import { GameSession } from '../../src/app/web/GameSession.js';
import { render } from '../../src/app/web/view.js';

function fakeRoot(): HTMLElement {
  return { innerHTML: '' } as unknown as HTMLElement;
}

const ROUTE = ['ironcove', 'veilmarket', 'aetherport', 'grainreach'] as const;

function forceCombat(session: GameSession): void {
  let guard = 0;
  while (session.view().status !== 'combat' && guard < 200) {
    if (session.status === 'sailing') {
      session.tickVoyage(10);
      continue;
    }
    if (session.status === 'combat') return;
    session.setSail(ROUTE[guard % ROUTE.length]);
    guard += 1;
  }
}

describe('web view', () => {
  it('рисует экран старта с кнопками', () => {
    const root = fakeRoot();
    render(root, { session: null, screen: 'start', hasSave: false, message: null });
    expect(root.innerHTML).toContain('Наука');
    expect(root.innerHTML).toContain('data-action="new"');
    expect(root.innerHTML).toContain('data-action="continue"');
    expect(root.innerHTML).toContain('disabled');
  });

  it('рисует игровой экран с канвасом, рынком и командой', () => {
    const root = fakeRoot();
    const session = GameSession.create('view-1');
    render(root, { session, screen: 'game', hasSave: false, message: null });
    expect(root.innerHTML).toContain('data-canvas');
    expect(root.innerHTML).toContain('Судовой журнал');
    expect(root.innerHTML).toContain('Команда');
    expect(root.innerHTML).toContain('data-action="buy"');
    expect(root.innerHTML).toContain('data-action="recruit"');
    expect(root.innerHTML).toContain('Латунная Гавань');
  });

  it('показывает прогресс плавания', () => {
    const session = GameSession.create('view-3');
    session.setSail('grainreach');
    const root = fakeRoot();
    render(root, { session, screen: 'game', hasSave: true, message: null });
    expect(root.innerHTML).toContain('data-voyage-bar');
    expect(root.innerHTML).toContain('Латунная Гавань → Хлебный Берег');
  });

  it('показывает боевой баннер и органы управления', () => {
    const session = GameSession.create('view-2');
    forceCombat(session);
    expect(session.view().status).toBe('combat');
    const root = fakeRoot();
    render(root, { session, screen: 'game', hasSave: true, message: null, enemyName: '«Пепельный Шкив»' });
    expect(root.innerHTML).toContain('battle-banner');
    expect(root.innerHTML).toContain('data-hold="fire"');
    expect(root.innerHTML).toContain('«Пепельный Шкив»');
  });

  it('показывает тост-сообщение', () => {
    const root = fakeRoot();
    render(root, {
      session: null,
      screen: 'start',
      hasSave: false,
      message: { text: 'Кампания сохранена.', tone: 'ok' },
    });
    expect(root.innerHTML).toContain('toast--ok');
    expect(root.innerHTML).toContain('Кампания сохранена.');
  });
});
