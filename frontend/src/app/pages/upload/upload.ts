import { Component, inject, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';

type Slot = 'users' | 'roles' | 'authorizations' | 'assignments';

interface FileSpec {
  slot: Slot;
  file: string;
  required: boolean;
  title: string;
  description: string;
  columns: { name: string; desc: string }[];
  /** Header + a couple of example rows used for the downloadable template. */
  sample: string[];
}

const SPECS: FileSpec[] = [
  {
    slot: 'users',
    file: 'users.csv',
    required: true,
    title: 'Benutzer',
    description: 'Die Personen mit SAP-Konten (SAP-Tabelle USR02).',
    columns: [
      { name: 'id', desc: 'eindeutige Benutzer-ID, z. B. U1001' },
      { name: 'name', desc: 'vollständiger Name' },
      { name: 'department', desc: 'Geschäftsbereich, z. B. Payments' },
      { name: 'joinedAt', desc: 'Eintrittsdatum, JJJJ-MM-TT' },
      { name: 'status', desc: 'ACTIVE oder INACTIVE' },
    ],
    sample: [
      'id,name,department,joinedAt,status',
      'U1001,Hans Müller,Credit,2015-03-01,ACTIVE',
      'U1002,Anna Schmidt,Payments,2017-09-15,ACTIVE',
    ],
  },
  {
    slot: 'roles',
    file: 'roles.csv',
    required: true,
    title: 'Rollen',
    description: 'Die SAP-Rollen, die zugewiesen werden können (SAP-Tabelle AGR_DEFINE).',
    columns: [
      { name: 'id', desc: 'Rollen-ID, z. B. Z_PAY_CREATE' },
      { name: 'name', desc: 'lesbarer Name' },
      { name: 'description', desc: 'was die Rolle bewirkt' },
      { name: 'area', desc: 'Geschäftsbereich, z. B. Payments' },
      { name: 'transactions', desc: 'T-Codes, getrennt durch ;  z. B. F-53;F110' },
    ],
    sample: [
      'id,name,description,area,transactions',
      'Z_PAY_CREATE,Payment Creation,Create and post payments,Payments,F-53;F110;FB60',
      'Z_PAY_APPROVE,Payment Approval,Approve and release payments,Payments,FBV0;FB02',
    ],
  },
  {
    slot: 'authorizations',
    file: 'authorizations.csv',
    required: true,
    title: 'Berechtigungen',
    description:
      'Berechtigungsobjekte, die jede Rolle gewährt (SAP-Tabelle AGR_1251).',
    columns: [
      { name: 'roleId', desc: 'Rollen-ID, zu der diese Zeile gehört' },
      { name: 'object', desc: 'Berechtigungsobjekt, z. B. F_BKPF_BUK' },
      { name: 'field', desc: 'Feldname, z. B. ACTVT' },
      { name: 'value', desc: 'Wert, z. B. 01' },
      { name: 'tcode', desc: 'Transaktionscode, z. B. F-53' },
    ],
    sample: [
      'roleId,object,field,value,tcode',
      'Z_PAY_CREATE,F_BKPF_BUK,ACTVT,01,F-53',
      'Z_PAY_APPROVE,F_BKPF_BUK,ACTVT,02,FBV0',
    ],
  },
  {
    slot: 'assignments',
    file: 'assignments.csv',
    required: false,
    title: 'Benutzer → Rollen-Zuordnungen',
    description:
      'Welcher Benutzer welche Rolle hat und wann sie zuletzt verwendet wurde (SAP-Tabelle AGR_USERS). Optional, aber empfohlen — sie ermöglicht "Warum"-Erläuterungen und die Erkennung inaktiver Berechtigungen.',
    columns: [
      { name: 'userId', desc: 'Benutzer-ID' },
      { name: 'roleId', desc: 'Rollen-ID' },
      { name: 'assignedAt', desc: 'wann zugewiesen, JJJJ-MM-TT' },
      { name: 'lastUsedAt', desc: 'Datum der letzten Nutzung, oder leer lassen, falls nie' },
      { name: 'reason', desc: 'optionaler Begründungstext' },
    ],
    sample: [
      'userId,roleId,assignedAt,lastUsedAt,reason',
      'U1001,Z_PAY_CREATE,2018-04-12,2024-03-01,Payments operations role.',
      'U1002,Z_PAY_APPROVE,2019-02-01,,Granted during 2019 reorganisation.',
    ],
  },
];

@Component({
  selector: 'app-upload',
  template: `
    <div class="page-head">
      <h1>Daten</h1>
      <p>Bringen Sie Ihren eigenen SAP-Export mit oder erkunden Sie weiter mit den mitgelieferten Beispieldaten.</p>
    </div>

    <div class="card info">
      <strong>ℹ️ Sie müssen nichts hochladen, um die Demo zu nutzen.</strong>
      <p class="muted">
        Ein realistischer SAP-Beispieldatensatz ist bereits geladen. Verwenden Sie diese Ansicht nur, wenn Sie
        <em>Ihre eigenen</em> SAP-Daten analysieren möchten. Exportieren Sie die vier folgenden Tabellen aus SAP
        (oder laden Sie eine Vorlage herunter und füllen Sie sie aus) und laden Sie sie anschließend hier hoch.
      </p>
    </div>

    <div class="specs">
      @for (s of specs; track s.slot) {
        <div class="card spec" [class.filled]="files[s.slot]">
          <div class="spec-head">
            <div>
              <span class="mono fname">{{ s.file }}</span>
              <span class="badge" [class.req]="s.required">
                {{ s.required ? 'Erforderlich' : 'Optional' }}
              </span>
            </div>
            <button class="btn small" (click)="downloadTemplate(s)">⤓ Vorlage</button>
          </div>
          <p class="desc">{{ s.description }}</p>

          <table class="cols">
            <tbody>
              @for (c of s.columns; track c.name) {
                <tr>
                  <td class="mono cname">{{ c.name }}</td>
                  <td class="muted">{{ c.desc }}</td>
                </tr>
              }
            </tbody>
          </table>

          <div class="example">
            <span class="ex-label">Beispiel</span>
            <code>{{ s.sample[1] }}</code>
          </div>

          <label class="drop" [class.has]="files[s.slot]">
            <input type="file" accept=".csv" (change)="pick(s.slot, $event)" hidden />
            <span class="drop-icon">{{ files[s.slot] ? '✓' : '⤒' }}</span>
            <span>{{ files[s.slot]?.name ?? s.file + ' auswählen …' }}</span>
          </label>
        </div>
      }
    </div>

    <div class="card actions-card">
      <div class="actions">
        <button class="btn btn-primary" [disabled]="!canUpload() || busy()" (click)="upload()">
          Hochladen &amp; analysieren
        </button>
        <button class="btn" [disabled]="busy()" (click)="reset()">
          Auf Beispieldaten zurücksetzen
        </button>
        <span class="muted hint">
          @if (canUpload()) {
            Bereit — die 3 erforderlichen Dateien sind ausgewählt.
          } @else {
            Wählen Sie <strong>users</strong>, <strong>roles</strong> und
            <strong>authorizations</strong> aus, um den Upload zu aktivieren.
          }
        </span>
      </div>
      @if (message(); as m) {
        <div class="result" [class.error]="isError()">{{ m }}</div>
      }
    </div>
  `,
  styles: [
    `
      .info {
        margin-bottom: 16px;
        border-left: 4px solid var(--primary);
      }
      .info p {
        margin: 6px 0 0;
      }
      .specs {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
      .spec {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .spec.filled {
        border-color: var(--primary);
      }
      .spec-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .fname {
        font-weight: 700;
        font-size: 14px;
      }
      .badge {
        margin-left: 8px;
        font-size: 11px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 999px;
        background: var(--surface-2);
        color: var(--text-muted);
      }
      .badge.req {
        background: var(--high-soft);
        color: var(--high);
      }
      .small {
        padding: 5px 11px;
        font-size: 13px;
      }
      .desc {
        margin: 0;
        font-size: 13px;
        color: var(--text-muted);
        line-height: 1.5;
      }
      .cols {
        width: 100%;
      }
      .cols td {
        padding: 5px 8px;
        border-bottom: 1px solid var(--border);
        font-size: 13px;
        vertical-align: top;
      }
      .cname {
        font-weight: 600;
        white-space: nowrap;
        width: 110px;
      }
      .example {
        background: var(--surface-2);
        border-radius: var(--radius-sm);
        padding: 10px;
        overflow-x: auto;
      }
      .ex-label {
        display: block;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--text-muted);
        font-weight: 700;
        margin-bottom: 4px;
      }
      .example code {
        font-family: var(--mono);
        font-size: 12px;
        white-space: pre;
      }
      .drop {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px;
        border: 1.5px dashed var(--border);
        border-radius: var(--radius-sm);
        cursor: pointer;
        font-size: 13px;
        margin-top: auto;
        transition: all 0.12s ease;
      }
      .drop:hover {
        border-color: var(--primary);
        background: var(--surface-2);
      }
      .drop.has {
        border-style: solid;
        border-color: var(--primary);
        background: var(--primary-soft);
        color: var(--primary);
        font-weight: 600;
      }
      .drop-icon {
        font-size: 16px;
      }
      .actions-card {
        margin-top: 16px;
      }
      .actions {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }
      .hint {
        font-size: 13px;
      }
      .result {
        margin-top: 14px;
        padding: 12px 14px;
        border-radius: var(--radius-sm);
        background: var(--low-soft);
        color: var(--low);
        font-weight: 500;
      }
      .result.error {
        background: var(--high-soft);
        color: var(--high);
      }
      @media (max-width: 820px) {
        .specs {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class UploadComponent {
  private readonly api = inject(ApiService);

  protected readonly specs = SPECS;
  protected files: Partial<Record<Slot, File>> = {};
  protected readonly busy = signal(false);
  protected readonly message = signal<string | null>(null);
  protected readonly isError = signal(false);

  pick(slot: Slot, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.files = { ...this.files, [slot]: file };
  }

  downloadTemplate(spec: FileSpec): void {
    const blob = new Blob([spec.sample.join('\n') + '\n'], {
      type: 'text/csv',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = spec.file;
    a.click();
    URL.revokeObjectURL(url);
  }

  canUpload(): boolean {
    return !!(this.files.users && this.files.roles && this.files.authorizations);
  }

  upload(): void {
    const form = new FormData();
    for (const slot of ['users', 'roles', 'authorizations', 'assignments'] as Slot[]) {
      const f = this.files[slot];
      if (f) form.append(slot, f, f.name);
    }
    this.busy.set(true);
    this.message.set(null);
    this.api.upload(form).subscribe({
      next: (r: unknown) => this.done(`Hochgeladen. ${summary(r)}`, false),
      error: (e) => this.done(e?.error?.message ?? 'Upload fehlgeschlagen.', true),
    });
  }

  reset(): void {
    this.busy.set(true);
    this.message.set(null);
    this.api.reset().subscribe({
      next: (r: unknown) => this.done(`Auf Beispieldaten zurückgesetzt. ${summary(r)}`, false),
      error: () => this.done('Zurücksetzen fehlgeschlagen.', true),
    });
  }

  private done(msg: string, error: boolean): void {
    this.busy.set(false);
    this.isError.set(error);
    this.message.set(msg);
  }
}

function summary(r: unknown): string {
  const d = r as Record<string, number>;
  if (!d || typeof d['users'] !== 'number') return '';
  return `${d['users']} Benutzer, ${d['roles']} Rollen, ${d['authorizations']} Berechtigungen, ${d['sodFindings']} Funktionstrennungsbefunde.`;
}
