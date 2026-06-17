import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AccessGraph } from '../../core/models';

interface SimNode {
  id: string;
  type: 'user' | 'role';
  label: string;
  group: string;
  band?: string;
  members?: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

const W = 1000;
const H = 640;
const BAND_COLORS: Record<string, string> = {
  LOW: '#2f9e44',
  MEDIUM: '#e8920c',
  HIGH: '#f1641e',
  CRITICAL: '#d6336c',
};

@Component({
  selector: 'app-graph',
  imports: [FormsModule],
  template: `
    <div class="page-head row">
      <div>
        <h1>Access Graph</h1>
        <p>
          Every user (circle, coloured by risk) linked to the roles they hold
          (diamonds). Hover to trace access; click to drill in.
        </p>
      </div>
      <select class="input dept" [(ngModel)]="department" (ngModelChange)="reload()">
        <option value="">All departments</option>
        @for (d of departments(); track d) {
          <option [value]="d">{{ d }}</option>
        }
      </select>
    </div>

    <div class="card canvas-card">
      <svg
        [attr.viewBox]="'0 0 ' + W + ' ' + H"
        class="canvas"
        [class.ready]="ready()"
      >
        <!-- links -->
        @for (l of links(); track $index) {
          <line
            [attr.x1]="l.a.x" [attr.y1]="l.a.y"
            [attr.x2]="l.b.x" [attr.y2]="l.b.y"
            class="link"
            [class.dim]="hovered() && !l.active"
            [class.active]="l.active"
            [class.dormant]="l.dormant"
            [class.cross]="l.crossDept"
          />
        }
        <!-- nodes -->
        @for (n of nodes(); track n.id) {
          @if (n.type === 'role') {
            <rect
              [attr.x]="n.x - n.r" [attr.y]="n.y - n.r"
              [attr.width]="n.r * 2" [attr.height]="n.r * 2"
              [attr.transform]="'rotate(45 ' + n.x + ' ' + n.y + ')'"
              class="node role"
              [class.dim]="isDimmed(n.id)"
              (mouseenter)="hovered.set(n.id)"
              (mouseleave)="hovered.set(null)"
              (click)="open(n)"
            />
          } @else {
            <circle
              [attr.cx]="n.x" [attr.cy]="n.y" [attr.r]="n.r"
              class="node user"
              [attr.fill]="color(n)"
              [class.dim]="isDimmed(n.id)"
              (mouseenter)="hovered.set(n.id)"
              (mouseleave)="hovered.set(null)"
              (click)="open(n)"
            />
          }
        }
        <!-- labels for hovered node + neighbours -->
        @for (n of labelled(); track n.id) {
          <text [attr.x]="n.x" [attr.y]="n.y - n.r - 4" class="label">
            {{ n.label }}
          </text>
        }
      </svg>

      <div class="legend">
        <span class="li"><i class="sw" style="background:#d6336c"></i>Critical</span>
        <span class="li"><i class="sw" style="background:#f1641e"></i>High</span>
        <span class="li"><i class="sw" style="background:#e8920c"></i>Medium</span>
        <span class="li"><i class="sw" style="background:#2f9e44"></i>Low risk user</span>
        <span class="li"><i class="sw diamond"></i>Role</span>
        <span class="li"><i class="ln dormant"></i>Dormant link</span>
        <span class="li"><i class="ln cross"></i>Cross-department</span>
      </div>
    </div>
  `,
  styles: [
    `
      .row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
      }
      .dept {
        max-width: 220px;
      }
      .canvas-card {
        padding: 0;
        overflow: hidden;
      }
      .canvas {
        width: 100%;
        height: auto;
        display: block;
        background: radial-gradient(circle at 30% 20%, #fcfcff, #eef0f8 75%);
        opacity: 0;
        transition: opacity 0.45s ease;
      }
      .canvas.ready {
        opacity: 1;
      }
      .link {
        stroke: #c8ccdb;
        stroke-width: 0.7;
        opacity: 0.5;
        transition: opacity 0.15s ease;
      }
      .link.dormant {
        stroke-dasharray: 3 3;
        stroke: #d9a441;
      }
      .link.cross {
        stroke: #c98bd6;
      }
      .link.dim {
        opacity: 0.06;
      }
      .link.active {
        opacity: 0.95;
        stroke-width: 1.4;
        stroke: var(--primary);
      }
      .node {
        cursor: pointer;
        transition: opacity 0.15s ease;
      }
      .node.user {
        stroke: #fff;
        stroke-width: 1.2;
      }
      .node.role {
        fill: #3b3a8c;
        stroke: #fff;
        stroke-width: 1;
      }
      .node.dim {
        opacity: 0.12;
      }
      .node:hover {
        stroke: #111;
        stroke-width: 1.6;
      }
      .label {
        font-size: 9px;
        font-weight: 600;
        text-anchor: middle;
        fill: var(--text);
        paint-order: stroke;
        stroke: #fff;
        stroke-width: 2.4px;
        pointer-events: none;
      }
      .legend {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        padding: 12px 18px;
        border-top: 1px solid var(--border);
        font-size: 12px;
        color: var(--text-muted);
      }
      .li {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .sw {
        width: 11px;
        height: 11px;
        border-radius: 50%;
        display: inline-block;
      }
      .sw.diamond {
        background: #3b3a8c;
        border-radius: 2px;
        transform: rotate(45deg);
      }
      .ln {
        width: 16px;
        height: 0;
        border-top: 2px solid #c8ccdb;
        display: inline-block;
      }
      .ln.dormant {
        border-top: 2px dashed #d9a441;
      }
      .ln.cross {
        border-top: 2px solid #c98bd6;
      }
    `,
  ],
})
export class GraphComponent {
  protected readonly W = W;
  protected readonly H = H;

  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  protected department = '';
  protected readonly departments = signal<string[]>([]);
  protected readonly nodes = signal<SimNode[]>([]);
  protected readonly hovered = signal<string | null>(null);

  private raw: AccessGraph = { nodes: [], links: [] };
  private adjacency = new Map<string, Set<string>>();
  private nodeById = new Map<string, SimNode>();
  protected readonly ready = signal(false);

  constructor() {
    this.api.overview().subscribe((o) =>
      this.departments.set(o.byDepartment.map((b) => b.department).sort()),
    );
    this.reload();
  }

  reload(): void {
    this.ready.set(false);
    this.api.graph(this.department || undefined).subscribe((g) => {
      this.raw = g;
      this.build(g);
      this.runLayout();
      this.ready.set(true);
    });
  }

  private build(g: AccessGraph): void {
    this.adjacency = new Map();
    this.nodeById = new Map();
    const n = g.nodes.length || 1;
    const sim: SimNode[] = g.nodes.map((node, i) => {
      // Seed on a circle so the layout unfolds deterministically.
      const angle = (i / n) * Math.PI * 2;
      const radius = node.type === 'role' ? 90 : 230;
      const s: SimNode = {
        id: node.id,
        type: node.type,
        label: node.label,
        group: node.group,
        band: node.band,
        members: node.members,
        x: W / 2 + Math.cos(angle) * radius,
        y: H / 2 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        r: node.type === 'role' ? 7 : 5,
      };
      this.nodeById.set(s.id, s);
      this.adjacency.set(s.id, new Set());
      return s;
    });
    for (const l of g.links) {
      this.adjacency.get(l.source)?.add(l.target);
      this.adjacency.get(l.target)?.add(l.source);
    }
    this.nodes.set(sim);
  }

  /**
   * Run the whole force-directed layout off-screen, then render the settled
   * result once. This avoids the on-screen jitter of an animated simulation —
   * the graph simply appears already laid out (and fades in via CSS).
   */
  private runLayout(): void {
    const sim = this.nodes();
    const ITERATIONS = 320;
    const repK = 1400;
    const springK = 0.05;
    const L = 64;
    const centerK = 0.02;

    for (let step = 0; step < ITERATIONS; step++) {
      // Cooling factor: strong early, near-zero at the end so it comes to rest.
      const alpha = (1 - step / ITERATIONS) ** 1.5;

      // Repulsion (O(n²) — fine for ≤ ~130 nodes).
      for (let i = 0; i < sim.length; i++) {
        const a = sim[i];
        for (let j = i + 1; j < sim.length; j++) {
          const b = sim[j];
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 1) d2 = 1;
          const d = Math.sqrt(d2);
          const f = (repK / d2) * alpha;
          const fx = (dx / d) * f;
          const fy = (dy / d) * f;
          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        }
      }

      // Link springs.
      for (const l of this.raw.links) {
        const a = this.nodeById.get(l.source);
        const b = this.nodeById.get(l.target);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = (d - L) * springK * alpha;
        const fx = (dx / d) * f;
        const fy = (dy / d) * f;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }

      // Centering + integrate with heavy damping (no overshoot).
      for (const node of sim) {
        node.vx += (W / 2 - node.x) * centerK * alpha;
        node.vy += (H / 2 - node.y) * centerK * alpha;
        node.vx *= 0.8;
        node.vy *= 0.8;
        node.x += node.vx;
        node.y += node.vy;
      }
    }

    // Fit the settled layout neatly inside the viewport, then render once.
    this.fitToViewport(sim);
    this.nodes.set([...sim]);
  }

  /** Scale & translate the final positions to fill the canvas with a margin. */
  private fitToViewport(sim: SimNode[]): void {
    if (sim.length === 0) return;
    const pad = 40;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of sim) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x);
      maxY = Math.max(maxY, n.y);
    }
    const spanX = maxX - minX || 1;
    const spanY = maxY - minY || 1;
    const scale = Math.min((W - 2 * pad) / spanX, (H - 2 * pad) / spanY);
    const offX = (W - spanX * scale) / 2;
    const offY = (H - spanY * scale) / 2;
    for (const n of sim) {
      n.x = offX + (n.x - minX) * scale;
      n.y = offY + (n.y - minY) * scale;
      n.vx = 0;
      n.vy = 0;
    }
  }

  // ---- interaction ---------------------------------------------------------

  protected readonly links = computed(() => {
    // Read nodes() so links recompute every simulation frame.
    this.nodes();
    const h = this.hovered();
    const out: Array<{
      a: SimNode;
      b: SimNode;
      active: boolean;
      dormant: boolean;
      crossDept: boolean;
    }> = [];
    for (const l of this.raw.links) {
      const a = this.nodeById.get(l.source);
      const b = this.nodeById.get(l.target);
      if (!a || !b) continue;
      out.push({
        a,
        b,
        active: !!h && (l.source === h || l.target === h),
        dormant: l.dormant,
        crossDept: l.crossDept,
      });
    }
    return out;
  });

  protected isDimmed(id: string): boolean {
    const h = this.hovered();
    if (!h) return false;
    if (id === h) return false;
    return !this.adjacency.get(h)?.has(id);
  }

  protected readonly labelled = computed<SimNode[]>(() => {
    const h = this.hovered();
    if (!h) return [];
    const ids = new Set<string>([h, ...(this.adjacency.get(h) ?? [])]);
    return this.nodes().filter((n) => ids.has(n.id));
  });

  protected color(n: SimNode): string {
    return BAND_COLORS[n.band ?? 'LOW'] ?? BAND_COLORS['LOW'];
  }

  protected open(n: SimNode): void {
    this.router.navigate([n.type === 'user' ? '/users' : '/roles', n.id]);
  }
}
