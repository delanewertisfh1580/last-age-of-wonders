import { describe, expect, it } from 'vitest';
import { GameSession } from '../../src/app/web/GameSession.js';
import { render } from '../../src/app/web/view.js';

function fakeRoot(): HTMLElement {
  return { innerHTML: '' } as unknown as HTMLElement;
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

  it('рисует игровой экран с картой, рынком и HUD', () => {
    const root = fakeRoot();
    const session = GameSession.create('view-1');
    render(root, { session, screen: 'game', hasSave: false, message: null });
    expect(root.innerHTML).toContain('Судовой журнал');
    expect(root.innerHTML).toContain('data-action="travel"');
    expect(root.innerHTML).toContain('data-action="buy"');
    expect(root.innerHTML).toContain('Латунная Гавань');
    expect(root.innerHTML).toContain('<svg');
  });

  it('показывает оверлей боя с тактиками', () => {
    const session = GameSession.create('view-2');
    const route = ['ironcove', 'veilmarket', 'aetherport', 'grainreach'];
    let guard = 0;
    while (session.view().status !== 'combat' && guard < 300) {
      session.travel(route[guard % route.length]);
      guard += 1;
    }
    expect(session.view().status).toBe('combat');
    const root = fakeRoot();
    render(root, { session, screen: 'game', hasSave: true, message: null });
    expect(root.innerHTML).toContain('class="overlay"');
    expect(root.innerHTML).toContain('data-action="strike"');
    expect(root.innerHTML).toContain('Борт о борт');
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
