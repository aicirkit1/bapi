import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  AD_GROUPS,
  AZURE_APPS,
  BRK_RIGHTS,
  BRK_ROWS,
  BrkRight,
  DEMO_KEY,
  DEVIATIONS,
  DETAIL_TABS,
  DetailTabKey,
  DOCUMENTS,
  FACHLICHE_MEMBERS,
  TECHNISCHE_MEMBERS,
  ALL_PEOPLE,
} from './brk-data';
import { BrkIconComponent } from './brk-icon';

@Component({
  selector: 'app-brk-detail',
  imports: [FormsModule, BrkIconComponent],
  template: `
    <!-- header -->
    <div class="head">
      <div class="title">
        <span class="pencil"><brk-icon name="pencil" [size]="18" /></span>
        Berechtigungskonzept <em>bearbeiten</em>: {{ brkName }}
      </div>
      <button class="more"><brk-icon name="dots" [size]="16" /> Weitere Aktionen</button>
    </div>

    <div class="info-banner">
      <span class="i"><brk-icon name="info" [size]="18" /></span>
      Es gibt einen offenen Aktualisierungs-Workflow zu diesem Berechtigungskonzept
      <a href="javascript:void(0)">-&gt;Zu den offenen Attestierungen gehen</a>
    </div>

    <div class="layout">
      <!-- inner tab rail -->
      <nav class="rail">
        @for (t of tabs; track t.key) {
          <button class="tab" [class.active]="tab() === t.key" (click)="tab.set(t.key)">
            <span class="t-ico"><brk-icon [name]="t.icon" [size]="18" /></span> {{ t.label }}
          </button>
        }
      </nav>

      <!-- tab content -->
      <section class="panel">
        @switch (tab()) {
          @case ('stammdaten') {
            <h2>Stammdaten</h2>
            <label class="mfield"><span class="ml">IT Asset Name *</span><input [value]="brkName" /></label>
            <label class="mfield"><span class="ml">IT Asset Kurzbeschreibung</span><input value="88KSTest122errtert" /></label>
            <label class="mfield"><span class="ml">Iteraplan ID *</span><textarea rows="2">123321
3453453</textarea></label>
            <div class="row-field">
              <label class="mfield grow"><span class="ml">Notes Ablageort *</span><input value="https://www.schwaebisch-hall.de/" /></label>
              <button class="icon-btn"><brk-icon name="arrow-right" [size]="18" /></button>
            </div>
            <div class="foot"><button class="btn-ghost">Speichern</button></div>
          }

          @case ('stellvertreter') {
            <h2>Stellvertreter</h2>
            <div class="search big"><span class="s"><brk-icon name="search" [size]="18" /></span><input placeholder="Suchen" /></div>

            <div class="sub-card">
              <div class="sc-title">fachliche Stellvertreter</div>
              <label class="mfield with-action">
                <span class="ml">Mitglieder</span>
                <span class="mval">{{ fachliche().length }} Elemente ausgewählt</span>
                <a class="aendern" (click)="openMembers('fachliche')">Ändern</a>
              </label>
              <div class="members">
                <div class="m-label">Mitglieder</div>
                @for (m of fachliche(); track m.uid) {
                  <div class="m-row">{{ m.name }} ({{ m.uid }})</div>
                }
              </div>
            </div>

            <div class="sub-card">
              <div class="sc-title">technische Stellvertreter</div>
              <label class="mfield with-action">
                <span class="ml">Mitglieder</span>
                <span class="mval">{{ technische()[0]?.name }} ({{ technische()[0]?.uid }})</span>
                <a class="aendern" (click)="openMembers('technische')">Ändern</a>
              </label>
            </div>
          }

          @case ('berechtigungen') {
            <div class="panel-head">
              <h2>BRK-Berechtigungen <span class="info-dot"><brk-icon name="info" [size]="15" /></span></h2>
              <button class="btn-orange"><brk-icon name="link" [size]="15" /> Link kopieren</button>
            </div>
            <div class="search big"><span class="s"><brk-icon name="search" [size]="18" /></span><input placeholder="Suchen" /></div>
            <table class="grid">
              <thead><tr><th>Recht</th><th>Zielsystem</th><th>Beschreibung</th><th></th></tr></thead>
              <tbody>
                @for (r of rights; track r.recht) {
                  <tr>
                    <td>{{ r.recht }}</td>
                    <td class="muted">{{ r.zielsystem }}</td>
                    <td class="desc">{{ r.beschreibung }}</td>
                    <td class="ar"><button class="btn-edit" (click)="openRight(r)">Bearbeiten</button></td>
                  </tr>
                }
              </tbody>
            </table>
            <div class="foot gap">
              <button class="btn-ghost">Berechtigungen importieren</button>
              <button class="btn-ghost">Berechtigung erstellen</button>
              <button class="btn-ghost">Bearbeiten und Details</button>
            </div>
          }

          @case ('abweichungen') {
            <div class="panel-head">
              <h2>Abweichungen <span class="info-dot"><brk-icon name="info" [size]="15" /></span></h2>
              <button class="btn-orange"><brk-icon name="link" [size]="15" /> Link kopieren</button>
            </div>
            @for (d of deviations; track d.typ) {
              <div class="dev-row">
                <input type="checkbox" />
                <div class="dev-text"><div class="dev-typ">{{ d.typ }}</div><div>{{ d.title }}</div></div>
                <button class="btn-edit">Bearbeiten</button>
              </div>
            }
            <div class="foot gap">
              <button class="btn-ghost" disabled>Ausgewählte entfernen</button>
              <button class="btn-ghost">Neue Abweichung dokumentieren</button>
            </div>
          }

          @case ('pam') {
            <h2>PAM</h2>
            <div class="hint">
              <span class="i"><brk-icon name="info" [size]="18" /></span>
              <div>
                <strong>Hinweis</strong>
                <p>Dieser Prozess unterstützt Sie bei der Erstellung der notwendigen AD-Gruppen für PAM</p>
                <p><strong>SharedSafe, SupportUser, ApiUser und ggf. PamUseCase:</strong><br />
                1. Erstellen der rollenbezogenen AD-Gruppen<br />
                2. Erstellen der notwendigen Objekte in PAM und Autorisieren der AD-Gruppen oder deren Mitglieder in PAM.</p>
              </div>
            </div>
            <div class="search big"><span class="s"><brk-icon name="search" [size]="18" /></span><input placeholder="Suchen" /></div>
            <div class="list-label">ADGroups</div>
            @for (g of adGroups; track g) {
              <div class="link-row">{{ g }}</div>
            }
            <div class="foot gap">
              <button class="btn-ghost">SharedSafe</button>
              <button class="btn-ghost">SupportUser</button>
              <button class="btn-ghost">ApiUser</button>
            </div>
          }

          @case ('azure') {
            <h2>Azure</h2>
            <div class="hint">
              <span class="i"><brk-icon name="info" [size]="18" /></span>
              <div><strong>Hinweis</strong>
                <p>Übersicht der vorhandenen Azure Applikationen zu diesem BRK.</p></div>
            </div>
            <div class="search big"><span class="s"><brk-icon name="search" [size]="18" /></span><input placeholder="Suchen" /></div>
            <table class="grid">
              <thead><tr><th>Azure App</th><th class="ar">Status</th></tr></thead>
              <tbody>
                @for (a of azureApps; track a.name) {
                  <tr><td class="link">{{ a.name }}</td><td class="ar">{{ a.status }}</td></tr>
                }
              </tbody>
            </table>
            <div class="foot"><button class="btn-ghost">Azure App-Registrierung erstellen</button></div>
          }

          @case ('dokumente') {
            <div class="info-banner inner">
              <span class="i"><brk-icon name="info" [size]="18" /></span>
              Lade die BRK-Dokumente hoch (max. 10MB) und schließe den Workflow-Schritt ab.
            </div>
            <div class="panel-head">
              <h2>BRK-Dokumente <span class="info-dot"><brk-icon name="info" [size]="15" /></span></h2>
              <button class="btn-orange"><brk-icon name="link" [size]="15" /> Link kopieren</button>
            </div>
            <div class="search big"><span class="s"><brk-icon name="search" [size]="18" /></span><input placeholder="Suchen" /></div>
            <table class="grid">
              <thead><tr><th><input type="checkbox" /></th><th>Dateiname</th><th>Größe</th><th>Hochgeladen am</th><th>Hochgeladen von</th><th>Aktion</th></tr></thead>
              <tbody>
                @for (d of documents; track d.name) {
                  <tr>
                    <td><input type="checkbox" /></td>
                    <td>{{ d.name }}</td><td>{{ d.size }}</td>
                    <td>{{ d.uploadedAt }}</td><td>{{ d.uploadedBy }}</td>
                    <td class="acts"><span class="dl"><brk-icon name="download" [size]="17" /></span><span class="del"><brk-icon name="trash" [size]="17" /></span></td>
                  </tr>
                }
              </tbody>
            </table>
            <div class="pager">
              <span>Einträge pro Seite:</span><select><option>20</option></select>
              <span>1 – 1 von 1</span>
            </div>
            <div class="foot gap">
              <button class="btn-ghost">Dokumente hochladen</button>
              <button class="btn-ghost" disabled>Dokumente herunterladen</button>
            </div>
          }
        }
      </section>
    </div>

    <!-- ===== Drawer: Berechtigungen bearbeiten ===== -->
    @if (rightDrawer(); as r) {
      <div class="backdrop" (click)="rightDrawer.set(null)"></div>
      <aside class="drawer">
        <div class="d-head">Berechtigungen bearbeiten <button class="x" (click)="rightDrawer.set(null)"><brk-icon name="close" [size]="18" /></button></div>
        <div class="d-tab">Stammdaten</div>
        <div class="d-body">
          <div class="d-section">Editierbare Felder</div>
          <div class="radios">
            <label><input type="radio" name="krit" checked /> Nicht kritisch</label>
            <label><input type="radio" name="krit" /> kritisch</label>
          </div>
          <div class="radios">
            <label><input type="radio" name="priv" checked /> Nicht privilegiert</label>
            <label><input type="radio" name="priv" /> privilegiert</label>
          </div>
          <label class="mfield"><span class="ml">Recht *</span><input [value]="r.recht" /></label>
          <label class="mfield"><span class="ml">Zielsystem *</span><input [value]="r.zielsystem" /></label>
          <label class="mfield"><span class="ml">Beschreibung *</span><input [value]="r.beschreibung" /></label>
          <label class="mfield sel"><span class="ml">Informationseigentümer (PK) *</span><span class="mval">SHF-SHF</span><span class="c">▾</span></label>
          <label class="mfield sel"><span class="ml">bankfachliches Funktionstrennungs-Merkmal (SoD) *</span><span class="mval">nicht relevant (BF)</span><span class="c">▾</span></label>
          <label class="mfield sel"><span class="ml">Nicht-bankfachliches Funktionstrennungs-Merkmal (SoD) *</span><span class="mval">nicht relevant (NBF)</span><span class="c">▾</span></label>
          <label class="mfield"><span class="ml">Weitere Freigeber</span><input value="nein" /></label>
          <label class="mfield"><span class="ml">Rollenname</span><input value="SHF-GB-SHSHF-G" /></label>
          <label class="mfield"><span class="ml">Vergabebeschränkungen</span><input value="keine" /></label>
          <label class="mfield"><span class="ml">Besonderheiten</span><textarea rows="2">Rücksprache mit QS erforderlich in Bezug auf Funktionstrennung nicht-bankfachlich.</textarea></label>
          <label class="mfield"><span class="ml">Weitere Funktionstrennungsvorgaben</span><input value="keine" /></label>

          <div class="d-section ro">Nur lesbare Felder</div>
          <div class="ro-grid">
            <div><span class="rok">Berechtigungskonzept</span><span class="rov">{{ brkName }}</span></div>
            <div><span class="rok">IT-Asset-ID*</span><span class="rov">100201, 100202</span></div>
            <div><span class="rok">IT-Asset*</span><span class="rov">{{ brkName }}</span></div>
            <div><span class="rok">Schlüssel*</span><span class="rov">{{ key }}</span></div>
          </div>
        </div>
        <div class="d-foot"><button class="btn-blue" (click)="rightDrawer.set(null)">Speichern</button></div>
      </aside>
    }

    <!-- ===== Drawer: Eigenschaft (Mitglieder) bearbeiten ===== -->
    @if (memberDrawer()) {
      <div class="backdrop" (click)="memberDrawer.set(false)"></div>
      <aside class="drawer wide">
        <div class="d-head">Eigenschaft bearbeiten<div class="sub-h">Mitglieder</div><button class="x" (click)="memberDrawer.set(false)"><brk-icon name="close" [size]="18" /></button></div>
        <div class="d-body">
          <div class="search big in-drawer"><span class="s"><brk-icon name="search" [size]="18" /></span><input placeholder="Suchen" /></div>
          <table class="grid select">
            <thead><tr><th class="cb"><input type="checkbox" [checked]="false" /></th><th>Anzeigename</th></tr></thead>
            <tbody>
              @for (p of people; track p.uid) {
                <tr (click)="toggle(p.uid)">
                  <td class="cb"><input type="checkbox" [checked]="picked().has(p.uid)" /></td>
                  <td>{{ p.name }} ({{ p.uid }})</td>
                </tr>
              }
            </tbody>
          </table>
          <div class="pager"><span>Einträge pro Seite:</span><select><option>20</option></select><span>1 – 20 von 6803</span>
            <span class="nav"><button disabled>|◁</button><button disabled>◁</button><button>▷</button><button>▷|</button></span>
          </div>
        </div>
        <div class="d-foot between">
          <div class="left-acts">
            <button class="btn-ghost sm"><brk-icon name="check" [size]="14" /> Ausgewählte anzeigen ({{ picked().size }})</button>
            <button class="btn-ghost sm" (click)="clearPicked()"><brk-icon name="close" [size]="14" /> Alle abwählen</button>
          </div>
          <button class="btn-blue" (click)="memberDrawer.set(false)">Auswählen</button>
        </div>
      </aside>
    }
  `,
  styleUrl: './brk-detail.scss',
})
export class BrkDetailComponent {
  private readonly route = inject(ActivatedRoute);

  protected readonly tabs = DETAIL_TABS;
  protected readonly tab = signal<DetailTabKey>('stammdaten');

  protected readonly rights = BRK_RIGHTS;
  protected readonly deviations = DEVIATIONS;
  protected readonly adGroups = AD_GROUPS;
  protected readonly azureApps = AZURE_APPS;
  protected readonly documents = DOCUMENTS;
  protected readonly people = ALL_PEOPLE;

  protected readonly fachliche = signal(FACHLICHE_MEMBERS);
  protected readonly technische = signal(TECHNISCHE_MEMBERS);

  protected readonly rightDrawer = signal<BrkRight | null>(null);
  protected readonly memberDrawer = signal(false);
  protected readonly picked = signal<Set<string>>(
    new Set(FACHLICHE_MEMBERS.map((m) => m.uid)),
  );

  protected readonly key = DEMO_KEY;
  protected readonly brkName =
    BRK_ROWS.find((r) => r.id === this.route.snapshot.paramMap.get('id'))?.name ??
    'DEMO_Zahlungsservice';

  openRight(r: BrkRight): void {
    this.rightDrawer.set(r);
  }
  openMembers(_which: 'fachliche' | 'technische'): void {
    this.memberDrawer.set(true);
  }
  toggle(uid: string): void {
    this.picked.update((s) => {
      const n = new Set(s);
      n.has(uid) ? n.delete(uid) : n.add(uid);
      return n;
    });
  }
  clearPicked(): void {
    this.picked.set(new Set());
  }
}
