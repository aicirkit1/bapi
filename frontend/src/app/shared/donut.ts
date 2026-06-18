import { Component, computed, input } from '@angular/core';

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

/** A small, dependency-free SVG donut chart with a centered total + legend. */
@Component({
  selector: 'app-donut',
  template: `
    <div class="donut">
      <svg viewBox="0 0 42 42" class="ring">
        <circle class="track" cx="21" cy="21" r="15.9155" />
        @for (a of arcs(); track a.label) {
          <circle
            class="seg"
            cx="21"
            cy="21"
            r="15.9155"
            [attr.stroke]="a.color"
            [attr.stroke-dasharray]="a.dash"
            [attr.stroke-dashoffset]="a.offset"
          />
        }
        <text x="21" y="20.5" class="total">{{ total() }}</text>
        <text x="21" y="25.5" class="cap">{{ caption() }}</text>
      </svg>
      <div class="legend">
        @for (s of segments(); track s.label) {
          <div class="row">
            <span class="dot" [style.background]="s.color"></span>
            <span class="lbl">{{ s.label }}</span>
            <span class="val">{{ s.value }}</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .donut {
        display: flex;
        align-items: center;
        gap: 18px;
      }
      .ring {
        width: 130px;
        height: 130px;
        flex-shrink: 0;
        transform: rotate(-90deg);
      }
      .track {
        fill: none;
        stroke: var(--surface-2);
        stroke-width: 4;
      }
      .seg {
        fill: none;
        stroke-width: 4;
        stroke-linecap: round;
        transition: stroke-dasharray 0.6s ease;
      }
      .total {
        font-size: 9px;
        font-weight: 700;
        text-anchor: middle;
        fill: var(--text);
        transform: rotate(90deg);
        transform-origin: 21px 21px;
      }
      .cap {
        font-size: 2.4px;
        text-anchor: middle;
        fill: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.3px;
        transform: rotate(90deg);
        transform-origin: 21px 21px;
      }
      .legend {
        display: flex;
        flex-direction: column;
        gap: 7px;
        min-width: 0;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
      }
      .dot {
        width: 10px;
        height: 10px;
        border-radius: 3px;
        flex-shrink: 0;
      }
      .lbl {
        color: var(--text-muted);
        white-space: nowrap;
      }
      .val {
        margin-left: auto;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
      }
    `,
  ],
})
export class DonutComponent {
  readonly segments = input.required<DonutSegment[]>();
  readonly caption = input<string>('Gesamt');

  protected readonly total = computed(() =>
    this.segments().reduce((s, x) => s + x.value, 0),
  );

  protected readonly arcs = computed(() => {
    const total = this.total() || 1;
    let acc = 0;
    return this.segments()
      .filter((s) => s.value > 0)
      .map((s) => {
        const frac = (s.value / total) * 100;
        const arc = {
          label: s.label,
          color: s.color,
          dash: `${frac} ${100 - frac}`,
          offset: 100 - acc,
        };
        acc += frac;
        return arc;
      });
  });
}
