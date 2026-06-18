import { Injectable } from '@nestjs/common';
import { StoreService } from '../store/store.service';

interface SyncStep {
  key: string;
  label: string;
  table: string;
}

export interface SyncStepStatus extends SyncStep {
  status: 'PENDING' | 'RUNNING' | 'DONE';
  count?: number;
}

export interface SyncJob {
  jobId: string;
  startedAt: number;
  steps: SyncStep[];
}

/** ~ms each step appears to take, so the UI shows a believable progression. */
const STEP_MS = 650;

@Injectable()
export class SyncService {
  private jobs = new Map<string, SyncJob>();
  private seq = 0;

  constructor(private readonly store: StoreService) {}

  start(): { jobId: string } {
    const jobId = `sync_${++this.seq}_${Date.now()}`;
    this.jobs.set(jobId, {
      jobId,
      startedAt: Date.now(),
      steps: [
        { key: 'users', label: 'USR02-Benutzer importiert', table: 'USR02' },
        { key: 'assignments', label: 'AGR_USERS-Rollenzuweisungen importiert', table: 'AGR_USERS' },
        { key: 'authorizations', label: 'AGR_1251-Berechtigungen importiert', table: 'AGR_1251' },
        { key: 'roles', label: 'AGR_DEFINE-Rollen importiert', table: 'AGR_DEFINE' },
        { key: 'transactions', label: 'TSTCT-Transaktionen importiert', table: 'TSTCT' },
        { key: 'critical', label: 'Kritische Zugriffsregeln geladen', table: 'SACF' },
        { key: 'risk', label: 'Risikoanalyse abgeschlossen', table: '—' },
      ],
    });
    return { jobId };
  }

  status(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    const elapsed = Date.now() - job.startedAt;
    const completed = Math.floor(elapsed / STEP_MS);

    const counts: Record<string, number> = {
      users: this.store.getUsers().length,
      assignments: this.store.getAssignments().length,
      authorizations: this.store.getAuthorizations().length,
      roles: this.store.getRoles().length,
      transactions: new Set(
        this.store.getRoles().flatMap((r) => r.transactions),
      ).size,
      critical: 5,
      risk: 0,
    };

    const steps: SyncStepStatus[] = job.steps.map((step, i) => {
      let status: SyncStepStatus['status'] = 'PENDING';
      if (i < completed) status = 'DONE';
      else if (i === completed) status = 'RUNNING';
      return {
        ...step,
        status,
        count: status === 'DONE' ? counts[step.key] : undefined,
      };
    });

    const done = completed >= job.steps.length;
    const progress = Math.min(
      100,
      Math.round((Math.min(completed, job.steps.length) / job.steps.length) * 100),
    );

    return { jobId, done, progress, steps };
  }
}
