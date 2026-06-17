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
    title: 'Users',
    description: 'The people who have SAP accounts (SAP table USR02).',
    columns: [
      { name: 'id', desc: 'unique user id, e.g. U1001' },
      { name: 'name', desc: 'full name' },
      { name: 'department', desc: 'business unit, e.g. Payments' },
      { name: 'joinedAt', desc: 'join date, YYYY-MM-DD' },
      { name: 'status', desc: 'ACTIVE or INACTIVE' },
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
    title: 'Roles',
    description: 'The SAP roles that can be granted (SAP table AGR_DEFINE).',
    columns: [
      { name: 'id', desc: 'role id, e.g. Z_PAY_CREATE' },
      { name: 'name', desc: 'human-readable name' },
      { name: 'description', desc: 'what the role does' },
      { name: 'area', desc: 'business area, e.g. Payments' },
      { name: 'transactions', desc: 'T-Codes, separated by ;  e.g. F-53;F110' },
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
    title: 'Authorizations',
    description:
      'Authorization objects each role grants (SAP table AGR_1251).',
    columns: [
      { name: 'roleId', desc: 'role id this row belongs to' },
      { name: 'object', desc: 'auth object, e.g. F_BKPF_BUK' },
      { name: 'field', desc: 'field name, e.g. ACTVT' },
      { name: 'value', desc: 'value, e.g. 01' },
      { name: 'tcode', desc: 'transaction code, e.g. F-53' },
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
    title: 'User → Role assignments',
    description:
      'Which user has which role, and when it was last used (SAP table AGR_USERS). Optional but recommended — it powers "why" explanations and dormancy detection.',
    columns: [
      { name: 'userId', desc: 'user id' },
      { name: 'roleId', desc: 'role id' },
      { name: 'assignedAt', desc: 'when granted, YYYY-MM-DD' },
      { name: 'lastUsedAt', desc: 'last use date, or leave empty if never' },
      { name: 'reason', desc: 'optional justification text' },
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
      <h1>Data</h1>
      <p>Bring your own SAP export, or keep exploring with the bundled sample data.</p>
    </div>

    <div class="card info">
      <strong>ℹ️ You don't need to upload anything to use the demo.</strong>
      <p class="muted">
        A realistic sample SAP dataset is already loaded. Use this screen only if you
        want to analyse <em>your own</em> SAP data. Export the four tables below from SAP
        (or download a template, fill it in), then upload them here.
      </p>
    </div>

    <div class="specs">
      @for (s of specs; track s.slot) {
        <div class="card spec" [class.filled]="files[s.slot]">
          <div class="spec-head">
            <div>
              <span class="mono fname">{{ s.file }}</span>
              <span class="badge" [class.req]="s.required">
                {{ s.required ? 'Required' : 'Optional' }}
              </span>
            </div>
            <button class="btn small" (click)="downloadTemplate(s)">⤓ Template</button>
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
            <span class="ex-label">Example</span>
            <code>{{ s.sample[1] }}</code>
          </div>

          <label class="drop" [class.has]="files[s.slot]">
            <input type="file" accept=".csv" (change)="pick(s.slot, $event)" hidden />
            <span class="drop-icon">{{ files[s.slot] ? '✓' : '⤒' }}</span>
            <span>{{ files[s.slot]?.name ?? 'Choose ' + s.file + ' …' }}</span>
          </label>
        </div>
      }
    </div>

    <div class="card actions-card">
      <div class="actions">
        <button class="btn btn-primary" [disabled]="!canUpload() || busy()" (click)="upload()">
          Upload &amp; analyse
        </button>
        <button class="btn" [disabled]="busy()" (click)="reset()">
          Reset to sample data
        </button>
        <span class="muted hint">
          @if (canUpload()) {
            Ready — the 3 required files are selected.
          } @else {
            Select <strong>users</strong>, <strong>roles</strong> and
            <strong>authorizations</strong> to enable upload.
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
      next: (r: unknown) => this.done(`Uploaded. ${summary(r)}`, false),
      error: (e) => this.done(e?.error?.message ?? 'Upload failed.', true),
    });
  }

  reset(): void {
    this.busy.set(true);
    this.message.set(null);
    this.api.reset().subscribe({
      next: (r: unknown) => this.done(`Reset to sample data. ${summary(r)}`, false),
      error: () => this.done('Reset failed.', true),
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
  return `${d['users']} users, ${d['roles']} roles, ${d['authorizations']} authorizations, ${d['sodFindings']} SoD findings.`;
}
