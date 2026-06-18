import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BrkChatComponent } from './brk-chat';
import { BrkIconComponent } from './brk-icon';

/**
 * The BRK app chrome: page title + left sub-navigation (Meine / Alle BRKs).
 * Fixed full-height layout — only the inner table/panel scrolls.
 */
@Component({
  selector: 'app-brk-shell',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    BrkIconComponent,
    BrkChatComponent,
  ],
  template: `
    <div class="brk">
      <h1 class="page-title">Berechtigungskonzept (BRK)</h1>

      <div class="body">
        <aside class="subnav">
          <a routerLink="/brk/mine" routerLinkActive="active" class="sub">
            <span class="i"><brk-icon name="user" /></span> Meine BRKs
          </a>
          <a routerLink="/brk/all" routerLinkActive="active" class="sub">
            <span class="i"><brk-icon name="list" /></span> Alle BRKs
          </a>
        </aside>

        <section class="content">
          <router-outlet />
        </section>
      </div>

      <app-brk-chat />
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }
      .brk {
        background: #eef1f5;
        height: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        font-family: 'Segoe UI', Roboto, Arial, sans-serif;
        color: #2b2b2b;
      }
      .page-title {
        flex: 0 0 auto;
        font-size: 24px;
        font-weight: 500;
        color: #2f3a4a;
        margin: 20px 26px 14px;
        letter-spacing: -0.01em;
      }
      .body {
        flex: 1;
        min-height: 0;
        display: flex;
        gap: 18px;
        padding: 0 22px 22px;
      }
      .subnav {
        width: 220px;
        flex-shrink: 0;
        background: #fff;
        border: 1px solid #e1e5ee;
        border-radius: 6px;
        height: max-content;
        overflow: hidden;
        box-shadow: 0 1px 2px rgba(20, 23, 40, 0.04);
      }
      .sub {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 16px;
        font-size: 14px;
        color: #44505f;
        cursor: pointer;
        border-bottom: 1px solid #eef0f5;
      }
      .sub:last-child {
        border-bottom: 0;
      }
      .sub .i {
        display: inline-flex;
        opacity: 0.85;
      }
      .sub:hover {
        background: #f5f7fb;
      }
      .sub.active {
        background: #1f6fd6;
        color: #fff;
        font-weight: 600;
      }
      .content {
        flex: 1;
        min-width: 0;
        min-height: 0;
        display: flex;
      }
    `,
  ],
})
export class BrkShellComponent {}
