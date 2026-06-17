import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AccessGraph,
  AnalyticsOverview,
  AuditReport,
  ChatMessage,
  ChatResult,
  ConnectorCatalogue,
  Finding,
  FindingStatus,
  FindingsSummary,
  Health,
  Role,
  RoleDetail,
  RoleExplanation,
  RoleRecommendation,
  SapConnection,
  SodFinding,
  SodRule,
  Stats,
  StreamEvent,
  SyncStatus,
  User,
  UserRiskScore,
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBase;

  // Meta
  health(): Observable<Health> {
    return this.http.get<Health>(`${this.base}/health`);
  }
  stats(): Observable<Stats> {
    return this.http.get<Stats>(`${this.base}/stats`);
  }

  // Users
  users(q?: string, department?: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.base}/users`, {
      params: clean({ q, department }),
    });
  }
  user(id: string): Observable<User> {
    return this.http.get<User>(`${this.base}/users/${id}`);
  }
  explain(userId: string, roleId: string): Observable<RoleExplanation> {
    return this.http.get<RoleExplanation>(
      `${this.base}/users/${userId}/explain`,
      { params: { roleId } },
    );
  }
  recommend(userId: string): Observable<RoleRecommendation[]> {
    return this.http.get<RoleRecommendation[]>(`${this.base}/users/recommend`, {
      params: { userId },
    });
  }

  // Roles
  roles(q?: string, area?: string): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.base}/roles`, {
      params: clean({ q, area }),
    });
  }
  role(id: string): Observable<RoleDetail> {
    return this.http.get<RoleDetail>(`${this.base}/roles/${id}`);
  }

  // SAP onboarding flow
  connections(): Observable<SapConnection[]> {
    return this.http.get<SapConnection[]>(`${this.base}/sap/connections`);
  }
  createConnection(dto: Partial<SapConnection> & { password?: string }): Observable<SapConnection> {
    return this.http.post<SapConnection>(`${this.base}/sap/connections`, dto);
  }
  createDemoConnection(): Observable<SapConnection> {
    return this.http.post<SapConnection>(`${this.base}/sap/connections/demo`, {});
  }
  testConnection(id: string): Observable<SapConnection> {
    return this.http.post<SapConnection>(
      `${this.base}/sap/connections/${id}/test`,
      {},
    );
  }
  connectors(): Observable<ConnectorCatalogue> {
    return this.http.get<ConnectorCatalogue>(`${this.base}/sap/connectors`);
  }
  startSync(): Observable<{ jobId: string }> {
    return this.http.post<{ jobId: string }>(`${this.base}/sap/sync/start`, {});
  }
  syncStatus(jobId: string): Observable<SyncStatus> {
    return this.http.get<SyncStatus>(`${this.base}/sap/sync/${jobId}/status`);
  }

  // Findings (unified risk)
  findings(params: {
    severity?: string;
    riskType?: string;
    status?: string;
    q?: string;
  }): Observable<Finding[]> {
    return this.http.get<Finding[]>(`${this.base}/findings`, {
      params: clean(params),
    });
  }
  findingsSummary(): Observable<FindingsSummary> {
    return this.http.get<FindingsSummary>(`${this.base}/findings/summary`);
  }
  finding(id: string): Observable<Finding> {
    return this.http.get<Finding>(`${this.base}/findings/${id}`);
  }
  findingAction(id: string, status: FindingStatus): Observable<Finding> {
    return this.http.post<Finding>(`${this.base}/findings/${id}/action`, {
      status,
    });
  }

  // Analytics
  overview(): Observable<AnalyticsOverview> {
    return this.http.get<AnalyticsOverview>(`${this.base}/analytics/overview`);
  }
  riskScores(): Observable<UserRiskScore[]> {
    return this.http.get<UserRiskScore[]>(`${this.base}/analytics/risk-scores`);
  }
  userScore(userId: string): Observable<UserRiskScore> {
    return this.http.get<UserRiskScore>(
      `${this.base}/analytics/risk-scores/${userId}`,
    );
  }
  graph(department?: string): Observable<AccessGraph> {
    return this.http.get<AccessGraph>(`${this.base}/analytics/graph`, {
      params: clean({ department }),
    });
  }
  auditReport(): Observable<AuditReport> {
    return this.http.get<AuditReport>(`${this.base}/analytics/audit-report`);
  }

  // Risk
  sod(severity?: string): Observable<SodFinding[]> {
    return this.http.get<SodFinding[]>(`${this.base}/risk/sod`, {
      params: clean({ severity }),
    });
  }
  rules(): Observable<SodRule[]> {
    return this.http.get<SodRule[]>(`${this.base}/risk/rules`);
  }

  // AI
  chat(message: string, history: ChatMessage[] = []): Observable<ChatResult> {
    return this.http.post<ChatResult>(`${this.base}/ai/chat`, {
      message,
      history,
    });
  }

  /**
   * Stream a chat answer via Server-Sent Events. Uses the native fetch reader
   * (HttpClient does not expose a progressive byte stream). `onEvent` fires for
   * every token / tool / done / error event.
   */
  async chatStream(
    message: string,
    history: ChatMessage[],
    onEvent: (e: StreamEvent) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const res = await fetch(`${this.base}/ai/chat/stream`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message, history }),
      signal,
    });
    if (!res.ok || !res.body) {
      throw new Error(`Stream failed: ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let nl: number;
      while ((nl = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (line.startsWith('data:')) {
          const payload = line.slice(5).trim();
          if (!payload) continue;
          try {
            onEvent(JSON.parse(payload) as StreamEvent);
          } catch {
            /* ignore malformed frame */
          }
        }
      }
    }
  }

  // Data
  reset(): Observable<unknown> {
    return this.http.post(`${this.base}/data/reset`, {});
  }
  upload(form: FormData): Observable<unknown> {
    return this.http.post(`${this.base}/data/upload`, form);
  }
}

function clean(obj: Record<string, string | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v) out[k] = v;
  }
  return out;
}
