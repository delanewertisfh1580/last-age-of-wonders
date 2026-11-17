import { ARENA, type BattleSim } from '../battle/BattleSim.js';
import { PORTS } from '../campaign.js';

/** Мир в координатах кампании; рендер растягивает его на канвас. */
export const WORLD = { width: 760, height: 600 } as const;

export interface RenderState {
  readonly portId: string;
  readonly status: 'port' | 'sailing' | 'combat' | 'gameover';
  readonly voyage: { readonly from: string; readonly to: string; readonly progress: number } | null;
  readonly battle: BattleSim | null;
  readonly hullRatio: number;
}

interface PortPalette {
  readonly ground: string;
  readonly groundDark: string;
  readonly wall: string;
  readonly wallDark: string;
  readonly roof: string;
  readonly accent: string;
  readonly glow: string;
}

const PALETTES: Readonly<Record<string, PortPalette>> = {
  brasshaven: {
    ground: '#3c4a52',
    groundDark: '#222b31',
    wall: '#6d5a3a',
    wallDark: '#43381f',
    roof: '#a8823f',
    accent: '#e8c964',
    glow: 'rgba(232, 201, 100, 0.55)',
  },
  grainreach: {
    ground: '#4a5a3c',
    groundDark: '#28321f',
    wall: '#7d6a45',
    wallDark: '#4c3f27',
    roof: '#b9955a',
    accent: '#dfe08a',
    glow: 'rgba(223, 224, 138, 0.5)',
  },
  aetherport: {
    ground: '#334a54',
    groundDark: '#1b2b33',
    wall: '#41586b',
    wallDark: '#243440',
    roof: '#7f5fb8',
    accent: '#b9a4f2',
    glow: 'rgba(150, 120, 240, 0.55)',
  },
  ironcove: {
    ground: '#454b55',
    groundDark: '#252a32',
    wall: '#5a5148',
    wallDark: '#332d27',
    roof: '#8c6a4a',
    accent: '#d1664a',
    glow: 'rgba(209, 102, 74, 0.55)',
  },
  veilmarket: {
    ground: '#413a52',
    groundDark: '#241f30',
    wall: '#5b4a63',
    wallDark: '#33283a',
    roof: '#9b6fa8',
    accent: '#e0a3c8',
    glow: 'rgba(224, 163, 200, 0.5)',
  },
};

interface Particle {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  vx: number;
  vy: number;
  kind: 'wake' | 'smoke' | 'spark' | 'splash';
  size: number;
}

interface Tracer {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  life: number;
  hit: boolean;
  from: 'player' | 'enemy';
}

function bezier(a: number, b: number, c: number, t: number): number {
  const u = 1 - t;
  return u * u * a + 2 * u * t * b + t * t * c;
}

/**
 * Изометрический рендерер мира и боя на Canvas2D: анимированное море,
 * города с собственными анимациями, корабль с кильватером, трассы залпов.
 */
export class WorldRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;
  private particles: Particle[] = [];
  private tracers: Tracer[] = [];
  private lastShip = { x: 0, y: 0 };

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas2D недоступен');
    this.ctx = ctx;
  }

  private syncSize(): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = this.canvas.clientWidth || 900;
    const height = this.canvas.clientHeight || 620;
    const pixelWidth = Math.round(width * dpr);
    const pixelHeight = Math.round(height * dpr);
    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
    }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = width;
    this.height = height;
    this.scale = Math.min(width / WORLD.width, height / WORLD.height);
    this.offsetX = (width - WORLD.width * this.scale) / 2;
    this.offsetY = (height - WORLD.height * this.scale) / 2;
  }

  private project(x: number, y: number): { x: number; y: number } {
    return {
      x: this.offsetX + x * this.scale,
      y: this.offsetY + y * this.scale * 0.74,
    };
  }

  /** Экранные координаты порта — для клика и подсказок. */
  portScreen(portId: string): { x: number; y: number } | null {
    const port = PORTS.find((entry) => entry.id === portId);
    if (!port) return null;
    return this.project(port.x, port.y);
  }

  hitTest(clientX: number, clientY: number): string | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    let best: { id: string; distance: number } | null = null;
    for (const port of PORTS) {
      const screen = this.project(port.x, port.y);
      const distance = Math.hypot(screen.x - x, screen.y - y - 24 * this.scale);
      if (distance < 78 * this.scale && (!best || distance < best.distance)) {
        best = { id: port.id, distance };
      }
    }
    return best?.id ?? null;
  }

  draw(state: RenderState, dt: number, now: number): void {
    this.syncSize();
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    if (state.status === 'combat' && state.battle) {
      this.drawBattle(state.battle, dt, now);
      return;
    }
    this.drawSea(now);
    this.drawRoutes(state, now);
    this.drawCities(state, now);
    const ship = this.shipPosition(state);
    this.drawShip(ship.x, ship.y, ship.heading, now, state.hullRatio, state.voyage ? 1 : 0);
    this.spawnWake(state, ship, dt);
    this.drawParticles(dt);
  }

  private drawSea(now: number): void {
    const ctx = this.ctx;
    const gradient = ctx.createRadialGradient(
      this.width * 0.5,
      this.height * 0.42,
      40,
      this.width * 0.5,
      this.height * 0.5,
      Math.max(this.width, this.height) * 0.8,
    );
    gradient.addColorStop(0, '#16344a');
    gradient.addColorStop(1, '#070d15');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = '#7fc4c0';
    ctx.lineWidth = 1;
    for (let row = 0; row < 26; row += 1) {
      const y = this.offsetY + row * 24 * this.scale;
      ctx.beginPath();
      for (let x = 0; x <= this.width; x += 18) {
        const wobble = Math.sin(x * 0.02 + now * 0.8 + row * 0.9) * 3;
        const yy = y + wobble;
        if (x === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    ctx.restore();

    // блики на воде
    ctx.save();
    for (let i = 0; i < 18; i += 1) {
      const phase = now * 0.35 + i * 1.7;
      const x = this.width * (0.05 + ((i * 0.137 + now * 0.01) % 0.9));
      const y = this.height * (0.1 + ((i * 0.231 + now * 0.008) % 0.8));
      ctx.globalAlpha = 0.06 + 0.05 * Math.sin(phase);
      ctx.fillStyle = '#bfeee9';
      ctx.beginPath();
      ctx.ellipse(x, y, 26, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawRoutes(state: RenderState, now: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.lineWidth = Math.max(1, 1.2 * this.scale);
    for (const [fromId, toId] of [
      ['brasshaven', 'aetherport'],
      ['brasshaven', 'grainreach'],
      ['aetherport', 'ironcove'],
      ['grainreach', 'veilmarket'],
      ['ironcove', 'veilmarket'],
      ['veilmarket', 'brasshaven'],
    ] as const) {
      const from = PORTS.find((p) => p.id === fromId);
      const to = PORTS.find((p) => p.id === toId);
      if (!from || !to) continue;
      const active =
        from.id === state.portId ||
        to.id === state.portId ||
        (state.voyage !== null && ((state.voyage.from === fromId && state.voyage.to === toId) || (state.voyage.from === toId && state.voyage.to === fromId)));
      ctx.strokeStyle = active ? 'rgba(232, 201, 100, 0.55)' : 'rgba(201, 162, 39, 0.16)';
      ctx.setLineDash([6, 10]);
      ctx.lineDashOffset = active ? -now * 26 : 0;
      const a = this.project(from.x, from.y);
      const b = this.project(to.x, to.y);
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2 - 46 * this.scale;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(midX, midY, b.x, b.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawCities(state: RenderState, now: number): void {
    const ctx = this.ctx;
    for (const port of PORTS) {
      const palette = PALETTES[port.id];
      const point = this.project(port.x, port.y);
      const scale = this.scale;
      const isCurrent = port.id === state.portId && state.status !== 'sailing';
      const canSail = state.status === 'port' && port.id !== state.portId;

      ctx.save();
      ctx.translate(point.x, point.y);

      // остров
      if (isCurrent) {
        ctx.save();
        ctx.globalAlpha = 0.25 + 0.12 * Math.sin(now * 2);
        ctx.fillStyle = palette.glow;
        ctx.beginPath();
        ctx.ellipse(0, 0, 108 * scale, 42 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      this.drawIsland(palette, scale, now, port.id);

      // подпись порта
      ctx.textAlign = 'center';
      ctx.font = `${Math.round(13 * scale + 2)}px Georgia, serif`;
      ctx.fillStyle = isCurrent ? '#e6f5f2' : '#e7ddc8';
      ctx.fillText(port.name, 0, 58 * scale);
      ctx.font = `${Math.round(9 * scale + 1)}px system-ui, sans-serif`;
      ctx.fillStyle = canSail ? 'rgba(232, 201, 100, 0.9)' : 'rgba(143, 160, 176, 0.7)';
      ctx.fillText(canSail ? 'идти сюда →' : port.tagline, 0, 74 * scale);
      ctx.restore();
    }
  }

  private drawIsland(palette: PortPalette, scale: number, now: number, portId: string): void {
    const ctx = this.ctx;
    const halfW = 92 * scale;
    const halfH = 30 * scale;
    const depth = 22 * scale;

    // вода вокруг острова
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = 'rgba(191, 238, 233, 0.35)';
    ctx.lineWidth = 1;
    for (let ring = 0; ring < 3; ring += 1) {
      const spread = (10 + ring * 12) * scale + Math.sin(now * 1.6 + ring) * 3 * scale;
      ctx.beginPath();
      ctx.ellipse(0, 0, halfW + spread, halfH + spread * 0.4, 0, 0, Math.PI * 2);
      ctx.globalAlpha = 0.16 - ring * 0.04;
      ctx.stroke();
    }
    ctx.restore();

    // боковые стенки
    ctx.beginPath();
    ctx.moveTo(-halfW, 0);
    ctx.lineTo(0, halfH);
    ctx.lineTo(0, halfH + depth);
    ctx.lineTo(-halfW, depth);
    ctx.closePath();
    ctx.fillStyle = palette.wallDark;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, halfH);
    ctx.lineTo(halfW, 0);
    ctx.lineTo(halfW, depth);
    ctx.lineTo(0, halfH + depth);
    ctx.closePath();
    ctx.fillStyle = palette.groundDark;
    ctx.fill();

    // верхняя площадка
    ctx.beginPath();
    ctx.moveTo(0, -halfH);
    ctx.lineTo(halfW, 0);
    ctx.lineTo(0, halfH);
    ctx.lineTo(-halfW, 0);
    ctx.closePath();
    ctx.fillStyle = palette.ground;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    switch (portId) {
      case 'brasshaven':
        this.drawBrasshaven(palette, scale, now);
        break;
      case 'grainreach':
        this.drawGrainreach(palette, scale, now);
        break;
      case 'aetherport':
        this.drawAetherport(palette, scale, now);
        break;
      case 'ironcove':
        this.drawIroncove(palette, scale, now);
        break;
      default:
        this.drawVeilmarket(palette, scale, now);
        break;
    }
  }

  private isoBox(
    x: number,
    y: number,
    w: number,
    d: number,
    h: number,
    palette: PortPalette,
    roof = true,
  ): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x, y - h - d);
    ctx.lineTo(x + w, y - h);
    ctx.lineTo(x, y - h + d);
    ctx.lineTo(x - w, y - h);
    ctx.closePath();
    ctx.fillStyle = roof ? palette.roof : palette.wall;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - w, y - h);
    ctx.lineTo(x, y - h + d);
    ctx.lineTo(x, y + d);
    ctx.lineTo(x - w, y);
    ctx.closePath();
    ctx.fillStyle = palette.wall;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y - h + d);
    ctx.lineTo(x + w, y - h);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x, y + d);
    ctx.closePath();
    ctx.fillStyle = palette.wallDark;
    ctx.fill();
  }

  private drawBrasshaven(palette: PortPalette, s: number, now: number): void {
    const ctx = this.ctx;
    this.isoBox(-14 * s, 4 * s, 28 * s, 12 * s, 18 * s, palette);
    this.isoBox(22 * s, -2 * s, 18 * s, 9 * s, 26 * s, palette);
    this.isoBox(-46 * s, -4 * s, 16 * s, 8 * s, 22 * s, palette);

    // дым из труб
    for (let i = 0; i < 3; i += 1) {
      const baseX = (i === 0 ? -14 : i === 1 ? 22 : -46) * s;
      const baseY = -30 * s + i * 2;
      for (let puff = 0; puff < 4; puff += 1) {
        const t = (now * 0.28 + puff * 0.25 + i * 0.12) % 1;
        ctx.globalAlpha = (1 - t) * 0.4;
        ctx.fillStyle = '#c9d4da';
        ctx.beginPath();
        ctx.arc(baseX + Math.sin(t * 5 + i) * 6 * s, baseY - t * 46 * s, (5 + t * 10) * s, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // вращающийся механизм у причала
    ctx.save();
    ctx.translate(52 * s, 6 * s);
    ctx.rotate(now * 0.9);
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 2 * s;
    ctx.globalAlpha = 0.85;
    for (let tooth = 0; tooth < 8; tooth += 1) {
      const angle = (tooth / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 8 * s, Math.sin(angle) * 5 * s);
      ctx.lineTo(Math.cos(angle) * 15 * s, Math.sin(angle) * 9 * s);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawGrainreach(palette: PortPalette, s: number, now: number): void {
    const ctx = this.ctx;
    this.isoBox(-30 * s, 2 * s, 26 * s, 11 * s, 15 * s, palette);
    this.isoBox(18 * s, 4 * s, 20 * s, 9 * s, 12 * s, palette);

    // мельница
    ctx.save();
    ctx.translate(-2 * s, -30 * s);
    ctx.rotate(now * 0.8);
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 2.4 * s;
    for (let blade = 0; blade < 4; blade += 1) {
      const angle = (blade / 4) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle) * 26 * s, Math.sin(angle) * 26 * s);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 3.4 * s, 0, Math.PI * 2);
    ctx.fillStyle = palette.accent;
    ctx.fill();
    ctx.restore();

    // колосья
    ctx.strokeStyle = 'rgba(223, 224, 138, 0.55)';
    ctx.lineWidth = 1.2 * s;
    for (let row = 0; row < 6; row += 1) {
      const sway = Math.sin(now * 1.4 + row) * 2.2 * s;
      const x = (-60 + row * 9) * s;
      ctx.beginPath();
      ctx.moveTo(x, 12 * s);
      ctx.quadraticCurveTo(x + sway, 2 * s, x + sway * 1.8, -6 * s);
      ctx.stroke();
    }
  }

  private drawAetherport(palette: PortPalette, s: number, now: number): void {
    const ctx = this.ctx;
    this.isoBox(-6 * s, 6 * s, 24 * s, 10 * s, 20 * s, palette);
    this.isoBox(34 * s, 0, 14 * s, 7 * s, 15 * s, palette);

    // парящие кристаллы
    for (let i = 0; i < 3; i += 1) {
      const bob = Math.sin(now * 1.1 + i * 1.7) * 5 * s;
      const x = (-34 + i * 22) * s;
      const y = (-32 - i * 8) * s + bob;
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = palette.accent;
      ctx.beginPath();
      ctx.moveTo(x, y - 9 * s);
      ctx.lineTo(x + 5 * s, y);
      ctx.lineTo(x, y + 9 * s);
      ctx.lineTo(x - 5 * s, y);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.arc(x, y, 13 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // пульсирующее кольцо
    ctx.save();
    ctx.strokeStyle = palette.glow;
    ctx.lineWidth = 1.6 * s;
    ctx.globalAlpha = 0.3 + 0.25 * Math.sin(now * 1.7);
    ctx.beginPath();
    ctx.ellipse(6 * s, -14 * s, 26 * s, 10 * s, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private drawIroncove(palette: PortPalette, s: number, now: number): void {
    const ctx = this.ctx;
    this.isoBox(-26 * s, 2 * s, 22 * s, 10 * s, 17 * s, palette);
    this.isoBox(16 * s, 4 * s, 18 * s, 8 * s, 13 * s, palette);

    // кран
    const swing = Math.sin(now * 0.7) * 0.35;
    ctx.save();
    ctx.translate(46 * s, -6 * s);
    ctx.rotate(swing);
    ctx.strokeStyle = '#8b8f96';
    ctx.lineWidth = 2.4 * s;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -42 * s);
    ctx.lineTo(24 * s, -42 * s);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(24 * s, -42 * s);
    ctx.lineTo(24 * s, -22 * s);
    ctx.stroke();
    ctx.restore();

    // искры
    for (let i = 0; i < 5; i += 1) {
      const t = (now * 1.6 + i * 0.37) % 1;
      ctx.globalAlpha = (1 - t) * 0.9;
      ctx.fillStyle = palette.accent;
      ctx.beginPath();
      ctx.arc(-6 * s + Math.sin(t * 8 + i) * 14 * s, -2 * s - t * 18 * s, 1.8 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawVeilmarket(palette: PortPalette, s: number, now: number): void {
    const ctx = this.ctx;
    // шатры
    ctx.fillStyle = palette.roof;
    for (let i = 0; i < 3; i += 1) {
      const x = (-34 + i * 26) * s;
      const y = (-6 + (i % 2) * 8) * s;
      ctx.beginPath();
      ctx.moveTo(x, y - 20 * s);
      ctx.lineTo(x + 16 * s, y - 2 * s);
      ctx.lineTo(x - 16 * s, y - 2 * s);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = palette.wall;
    ctx.fillRect(-14 * s, -4 * s, 30 * s, 10 * s);

    // качающиеся фонари
    for (let i = 0; i < 4; i += 1) {
      const sway = Math.sin(now * 1.3 + i * 1.9) * 3.5 * s;
      const x = (-40 + i * 22) * s;
      const y = -34 * s;
      ctx.strokeStyle = 'rgba(120, 110, 130, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + sway, y + 12 * s);
      ctx.stroke();
      ctx.globalAlpha = 0.7 + 0.3 * Math.sin(now * 2 + i);
      ctx.fillStyle = palette.accent;
      ctx.beginPath();
      ctx.arc(x + sway, y + 14 * s, 3 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      ctx.arc(x + sway, y + 14 * s, 9 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  private shipPosition(state: RenderState): { x: number; y: number; heading: number } {
    if (state.voyage) {
      const from = PORTS.find((p) => p.id === state.voyage?.from);
      const to = PORTS.find((p) => p.id === state.voyage?.to);
      if (from && to) {
        const t = state.voyage.progress;
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2 - 52;
        const x = bezier(from.x, midX, to.x, t);
        const y = bezier(from.y, midY, to.y, t);
        const nextX = bezier(from.x, midX, to.x, Math.min(1, t + 0.02));
        const nextY = bezier(from.y, midY, to.y, Math.min(1, t + 0.02));
        return { x, y, heading: Math.atan2(nextY - y, nextX - x) };
      }
    }
    const port = PORTS.find((p) => p.id === state.portId);
    return { x: (port?.x ?? 120) + 30, y: (port?.y ?? 240) + 12, heading: 0.25 };
  }

  private drawShip(
    x: number,
    y: number,
    heading: number,
    now: number,
    hullRatio: number,
    wakeAmount: number,
  ): void {
    const ctx = this.ctx;
    const point = this.project(x, y);
    const s = this.scale * 0.9;
    const screenAngle = Math.atan2(Math.sin(heading) * 0.74, Math.cos(heading));
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(screenAngle);
    ctx.scale(s, s);

    const bob = Math.sin(now * 1.8) * 1.2;
    ctx.translate(0, bob);

    // тень
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#02121a';
    ctx.beginPath();
    ctx.ellipse(0, 7, 22, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // корпус
    const hullGradient = ctx.createLinearGradient(0, -8, 0, 8);
    hullGradient.addColorStop(0, '#8a6b3f');
    hullGradient.addColorStop(1, '#3b2c1a');
    ctx.fillStyle = hullRatio < 0.35 ? '#5c3a2c' : hullGradient;
    ctx.beginPath();
    ctx.moveTo(-22, -5);
    ctx.quadraticCurveTo(0, -10, 22, -4);
    ctx.lineTo(17, 6);
    ctx.quadraticCurveTo(0, 10, -18, 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(232, 201, 100, 0.5)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // мачта и парус
    ctx.strokeStyle = '#d8cba8';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.lineTo(0, -26);
    ctx.stroke();

    const billow = Math.sin(now * 2.2) * 2.2;
    ctx.fillStyle = 'rgba(238, 231, 210, 0.92)';
    ctx.beginPath();
    ctx.moveTo(0, -25);
    ctx.quadraticCurveTo(13 + billow, -17, 1, -8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(232, 201, 100, 0.85)';
    ctx.beginPath();
    ctx.moveTo(0, -25);
    ctx.quadraticCurveTo(13 + billow, -17, 1, -8);
    ctx.closePath();
    ctx.globalAlpha = 0.25;
    ctx.fill();
    ctx.globalAlpha = 1;

    // флаг
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.lineTo(0, -33);
    ctx.stroke();
    ctx.fillStyle = '#e8c964';
    ctx.beginPath();
    ctx.moveTo(0, -33);
    ctx.lineTo(7 + Math.sin(now * 3) * 1.5, -30.5);
    ctx.lineTo(0, -28);
    ctx.closePath();
    ctx.fill();

    if (wakeAmount > 0) {
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = '#bfeee9';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-20, 4);
      ctx.lineTo(-34, 9);
      ctx.moveTo(-20, 0);
      ctx.lineTo(-33, 3);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  private spawnWake(
    state: RenderState,
    ship: { x: number; y: number; heading: number },
    dt: number,
  ): void {
    if (!state.voyage) {
      this.lastShip = { x: ship.x, y: ship.y };
      return;
    }
    const moved = Math.hypot(ship.x - this.lastShip.x, ship.y - this.lastShip.y);
    this.lastShip = { x: ship.x, y: ship.y };
    if (moved > 0.35 && Math.random() < Math.min(1, dt * 26)) {
      this.particles.push({
        x: ship.x - Math.cos(ship.heading) * 22,
        y: ship.y - Math.sin(ship.heading) * 22,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 4,
        life: 1,
        maxLife: 1,
        kind: 'wake',
        size: 5 + Math.random() * 4,
      });
    }
  }

  private drawParticles(dt: number): void {
    const ctx = this.ctx;
    ctx.save();
    for (const particle of this.particles) {
      particle.life -= dt * 0.9;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      const point = this.project(particle.x, particle.y);
      const alpha = Math.max(0, particle.life / particle.maxLife);
      if (particle.kind === 'wake') {
        ctx.globalAlpha = alpha * 0.4;
        ctx.strokeStyle = '#bfeee9';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(point.x, point.y, particle.size * this.scale, particle.size * 0.4 * this.scale, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (particle.kind === 'splash') {
        ctx.globalAlpha = alpha * 0.75;
        ctx.fillStyle = '#d8f6f2';
        ctx.beginPath();
        ctx.arc(point.x, point.y, particle.size * this.scale * (1.4 - alpha * 0.4), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    this.particles = this.particles.filter((particle) => particle.life > 0);
    ctx.restore();
  }

  // ── Бой ───────────────────────────────────────────────────────

  private battleProject(x: number, y: number): { x: number; y: number } {
    const scale = Math.min((this.width - 24) / ARENA.width, (this.height - 60) / (ARENA.height * 0.78));
    const offsetX = (this.width - ARENA.width * scale) / 2;
    const offsetY = (this.height - ARENA.height * 0.78 * scale) / 2 + 10;
    return { x: offsetX + x * scale, y: offsetY + y * scale * 0.78 };
  }

  private battleScale(): number {
    return Math.min((this.width - 24) / ARENA.width, (this.height - 60) / (ARENA.height * 0.78));
  }

  private drawBattle(sim: BattleSim, dt: number, now: number): void {
    this.drawSea(now);
    const ctx = this.ctx;
    const scale = this.battleScale();

    // граница арены
    const topLeft = this.battleProject(ARENA.margin, ARENA.margin);
    const bottomRight = this.battleProject(ARENA.width - ARENA.margin, ARENA.height - ARENA.margin);
    ctx.save();
    ctx.strokeStyle = 'rgba(232, 201, 100, 0.22)';
    ctx.setLineDash([10, 12]);
    ctx.lineWidth = 1;
    ctx.strokeRect(
      topLeft.x,
      topLeft.y,
      bottomRight.x - topLeft.x,
      bottomRight.y - topLeft.y,
    );
    ctx.restore();

    for (const shot of sim.drainShots()) {
      const from = this.battleProject(shot.x1, shot.y1);
      const to = this.battleProject(shot.x2, shot.y2);
      this.tracers.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y, life: 1, hit: shot.hit, from: shot.from });
      this.particles.push({
        x: shot.x2,
        y: shot.y2,
        vx: 0,
        vy: 0,
        life: 1,
        maxLife: 1,
        kind: 'splash',
        size: shot.hit ? 9 : 5,
      });
    }

    this.drawBattleShip(sim.player, 'player', now, scale);
    this.drawBattleShip(sim.enemy, 'enemy', now, scale);

    // трассы залпов
    ctx.save();
    for (const tracer of this.tracers) {
      tracer.life -= dt * 2.6;
      const alpha = Math.max(0, tracer.life);
      if (alpha <= 0) continue;
      const gradient = ctx.createLinearGradient(tracer.x1, tracer.y1, tracer.x2, tracer.y2);
      gradient.addColorStop(0, `rgba(255, 236, 176, ${alpha})`);
      gradient.addColorStop(1, tracer.hit ? `rgba(226, 106, 74, ${alpha * 0.7})` : `rgba(200, 230, 240, ${alpha * 0.4})`);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = tracer.from === 'player' ? 2.4 : 2;
      ctx.setLineDash([2, 7]);
      ctx.beginPath();
      ctx.moveTo(tracer.x1, tracer.y1);
      ctx.lineTo(tracer.x2, tracer.y2);
      ctx.stroke();
      if (tracer.hit) {
        ctx.setLineDash([]);
        ctx.globalAlpha = alpha * 0.7;
        ctx.fillStyle = '#f0c07a';
        ctx.beginPath();
        ctx.arc(tracer.x2, tracer.y2, 9 * (1.2 - alpha), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    this.tracers = this.tracers.filter((tracer) => tracer.life > 0);
    ctx.restore();

    this.drawParticles(dt);

    // индикатор сектора залпа у игрока
    const playerPoint = this.battleProject(sim.player.x, sim.player.y);
    const ready = sim.player.reload <= 0;
    const inArc = sim.enemyInArc();
    ctx.save();
    ctx.translate(playerPoint.x, playerPoint.y);
    ctx.rotate(Math.atan2(Math.sin(sim.player.heading) * 0.78, Math.cos(sim.player.heading)));
    ctx.strokeStyle = ready && inArc ? 'rgba(232, 201, 100, 0.55)' : 'rgba(143, 160, 176, 0.25)';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([5, 6]);
    for (const side of [1, -1]) {
      ctx.beginPath();
      ctx.arc(0, 0, 92 * scale * 0.9, side === 1 ? 0.9 : Math.PI - 0.9, side === 1 ? Math.PI - 0.9 : Math.PI + 0.9);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawBattleShip(
    ship: { x: number; y: number; heading: number; hp: number; maxHp: number; reload: number; reloadTime: number },
    side: 'player' | 'enemy',
    now: number,
    scale: number,
  ): void {
    const ctx = this.ctx;
    const point = this.battleProject(ship.x, ship.y);
    const screenAngle = Math.atan2(Math.sin(ship.heading) * 0.78, Math.cos(ship.heading));
    const size = scale * (side === 'player' ? 1.5 : 1.35);
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(screenAngle);
    ctx.scale(size, size);

    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#02121a';
    ctx.beginPath();
    ctx.ellipse(0, 8, 24, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = side === 'player' ? '#8a6b3f' : '#6a3f39';
    ctx.beginPath();
    ctx.moveTo(-24, -6);
    ctx.quadraticCurveTo(0, -11, 24, -5);
    ctx.lineTo(19, 7);
    ctx.quadraticCurveTo(0, 11, -20, 7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = side === 'player' ? 'rgba(232, 201, 100, 0.6)' : 'rgba(209, 102, 74, 0.7)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.strokeStyle = '#d8cba8';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, -3);
    ctx.lineTo(0, -30);
    ctx.stroke();
    const billow = Math.sin(now * 2.4 + ship.x * 0.01) * 2.4;
    ctx.fillStyle = side === 'player' ? 'rgba(238, 231, 210, 0.92)' : 'rgba(215, 190, 178, 0.85)';
    ctx.beginPath();
    ctx.moveTo(0, -29);
    ctx.quadraticCurveTo(15 + billow, -19, 1, -9);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // полоски корпуса и перезарядки над кораблём
    const barWidth = 74 * scale * 0.9;
    const barY = point.y - 58 * scale;
    ctx.save();
    ctx.fillStyle = 'rgba(8, 15, 23, 0.7)';
    ctx.fillRect(point.x - barWidth / 2, barY, barWidth, 5);
    ctx.fillStyle = side === 'player' ? '#58c7c0' : '#d1664a';
    ctx.fillRect(point.x - barWidth / 2, barY, barWidth * Math.max(0, ship.hp / ship.maxHp), 5);
    ctx.fillStyle = 'rgba(8, 15, 23, 0.7)';
    ctx.fillRect(point.x - barWidth / 2, barY + 8, barWidth, 3);
    ctx.fillStyle = 'rgba(232, 201, 100, 0.85)';
    const reloadRatio = ship.reload <= 0 ? 1 : 1 - ship.reload / ship.reloadTime;
    ctx.fillRect(point.x - barWidth / 2, barY + 8, barWidth * Math.max(0, Math.min(1, reloadRatio)), 3);
    ctx.restore();
  }
}
