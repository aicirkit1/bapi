import { Injectable, Logger } from '@nestjs/common';
import { SodFinding } from '../common/types';
import { RiskService } from '../risk/risk.service';
import { StoreService } from '../store/store.service';
import { UsersService } from '../users/users.service';
import { AiTools } from './ai-tools';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResult {
  answer: string;
  mode: 'llm' | 'mock';
  grounding: Grounding;
}

/** Events emitted while streaming a chat answer. */
export type StreamEvent =
  | { type: 'token'; text: string }
  | { type: 'tool'; name: string }
  | { type: 'done'; mode: 'llm' | 'mock'; toolsUsed: string[] }
  | { type: 'error'; message: string };

interface Grounding {
  matchedUsers: string[];
  matchedRoles: string[];
  facts: string[];
}

const SYSTEM_PROMPT = `You are the BAPI assistant, an expert on SAP access and role governance for a bank.
You help auditors and administrators understand WHY users have the access they have, and surface risks.
Rules:
- ALWAYS answer in GERMAN (formal "Sie"), regardless of the question's language.
- Answer ONLY from the CONTEXT block provided. Do not invent users, roles, dates or T-Codes.
- If the context does not contain the answer, say so plainly and suggest what data is needed.
- Be concise and precise. Reference roles by id and users by name.
- When relevant, mention Segregation-of-Duties (Funktionstrennung / SoD) risks.`;

const TOOL_SYSTEM_PROMPT = `You are the BAPI assistant, an expert on SAP access and role governance for a bank.
You help auditors and administrators understand WHY users hold access and surface risks.
You have READ-ONLY tools to query the bank's real SAP data — always use them instead of guessing.
Rules:
- ALWAYS answer in GERMAN (formal "Sie"), regardless of the question's language. (Tool names and ids stay as-is.)
- Call tools to fetch the facts you need (users, roles, explanations, SoD risks) before answering.
- Never invent users, roles, dates or T-Codes; rely only on tool results.
- If a tool returns an error or no data, say so plainly.
- Be concise and precise. Reference roles by id and users by name, and flag Funktionstrennung (SoD) risks when relevant.`;

interface AccumulatedToolCall {
  id: string;
  name: string;
  arguments: string;
}

interface OpenAIStreamChunk {
  choices?: Array<{
    delta?: {
      content?: string;
      tool_calls?: Array<{
        index?: number;
        id?: string;
        function?: { name?: string; arguments?: string };
      }>;
    };
  }>;
}

type Provider = 'openai' | 'anthropic' | 'none';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  private readonly openaiKey = process.env.OPENAI_API_KEY;
  private readonly anthropicKey = process.env.ANTHROPIC_API_KEY;

  /** OpenAI takes precedence when both keys are present. */
  private readonly provider: Provider = this.openaiKey
    ? 'openai'
    : this.anthropicKey
      ? 'anthropic'
      : 'none';

  private readonly model =
    process.env.AI_MODEL ||
    (this.provider === 'openai' ? 'gpt-4o-mini' : 'claude-sonnet-4-6');

  constructor(
    private readonly store: StoreService,
    private readonly risk: RiskService,
    private readonly users: UsersService,
    private readonly tools: AiTools,
  ) {
    this.logger.log(
      this.provider === 'none'
        ? 'No LLM key found — AI chat runs in deterministic mock mode.'
        : `AI chat using ${this.provider} (model: ${this.model}).`,
    );
  }

  async chat(message: string, history: ChatMessage[] = []): Promise<ChatResult> {
    const grounding = this.buildGrounding(message);

    if (this.provider !== 'none') {
      try {
        const answer =
          this.provider === 'openai'
            ? await this.callOpenAI(message, history, grounding)
            : await this.callAnthropic(message, history, grounding);
        return { answer, mode: 'llm', grounding };
      } catch (err) {
        this.logger.warn(
          `LLM call failed, falling back to mock: ${(err as Error).message}`,
        );
      }
    }

    return { answer: this.mockAnswer(message, grounding), mode: 'mock', grounding };
  }

  // ---- Streaming + tool-calling -------------------------------------------

  /**
   * Stream an answer to the client. With OpenAI we run a tool-calling loop: the
   * model decides which read-only tools to call against the bank's data, we run
   * them, and stream the final answer token-by-token. Anthropic and mock modes
   * produce the full answer and emit it as a single chunk so the endpoint
   * behaves uniformly.
   */
  async chatStream(
    message: string,
    history: ChatMessage[],
    emit: (e: StreamEvent) => void,
  ): Promise<void> {
    if (this.provider === 'openai') {
      try {
        await this.streamOpenAIWithTools(message, history, emit);
        return;
      } catch (err) {
        this.logger.warn(
          `Streaming tool loop failed, falling back: ${(err as Error).message}`,
        );
      }
    }

    // Anthropic / mock / fallback: produce the whole answer, emit once.
    const result = await this.chat(message, history);
    emit({ type: 'token', text: result.answer });
    emit({ type: 'done', mode: result.mode, toolsUsed: [] });
  }

  private async streamOpenAIWithTools(
    message: string,
    history: ChatMessage[],
    emit: (e: StreamEvent) => void,
  ): Promise<void> {
    const MAX_STEPS = 6;
    const toolsUsed: string[] = [];

    // OpenAI-shaped message list (allows tool/assistant-with-tool_calls roles).
    const messages: unknown[] = [
      { role: 'system', content: TOOL_SYSTEM_PROMPT },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];

    for (let step = 0; step < MAX_STEPS; step++) {
      const { text, toolCalls } = await this.openAIStreamStep(
        messages,
        (delta) => emit({ type: 'token', text: delta }),
      );

      if (toolCalls.length === 0) {
        emit({ type: 'done', mode: 'llm', toolsUsed });
        return;
      }

      // Record the assistant turn that requested the tools.
      messages.push({
        role: 'assistant',
        content: text || null,
        tool_calls: toolCalls.map((t) => ({
          id: t.id,
          type: 'function',
          function: { name: t.name, arguments: t.arguments },
        })),
      });

      // Execute each requested tool and feed the result back.
      for (const call of toolCalls) {
        emit({ type: 'tool', name: call.name });
        toolsUsed.push(call.name);
        let args: Record<string, unknown> = {};
        try {
          args = call.arguments ? JSON.parse(call.arguments) : {};
        } catch {
          /* leave args empty on malformed JSON */
        }
        const result = await this.tools.execute(call.name, args);
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
    }

    // Safety net if the model keeps calling tools.
    emit({
      type: 'token',
      text: 'I gathered the relevant data but reached the reasoning step limit. Please refine the question.',
    });
    emit({ type: 'done', mode: 'llm', toolsUsed });
  }

  /** One streaming call to OpenAI; forwards text deltas and collects tool calls. */
  private async openAIStreamStep(
    messages: unknown[],
    onToken: (text: string) => void,
  ): Promise<{ text: string; toolCalls: AccumulatedToolCall[] }> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.openaiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        stream: true,
        tools: this.tools.definitions(),
        messages,
      }),
    });

    if (!res.ok || !res.body) {
      throw new Error(`OpenAI API ${res.status}: ${await res.text()}`);
    }

    let text = '';
    const toolCalls: AccumulatedToolCall[] = [];

    for await (const data of sseLines(res.body)) {
      if (data === '[DONE]') break;
      let json: OpenAIStreamChunk;
      try {
        json = JSON.parse(data) as OpenAIStreamChunk;
      } catch {
        continue;
      }
      const delta = json.choices?.[0]?.delta;
      if (!delta) continue;

      if (delta.content) {
        text += delta.content;
        onToken(delta.content);
      }

      for (const tc of delta.tool_calls ?? []) {
        const idx = tc.index ?? 0;
        if (!toolCalls[idx]) {
          toolCalls[idx] = { id: '', name: '', arguments: '' };
        }
        if (tc.id) toolCalls[idx].id = tc.id;
        if (tc.function?.name) toolCalls[idx].name = tc.function.name;
        if (tc.function?.arguments) {
          toolCalls[idx].arguments += tc.function.arguments;
        }
      }
    }

    return { text, toolCalls: toolCalls.filter(Boolean) };
  }

  // ---- Grounding -----------------------------------------------------------

  /** Pull the relevant slice of bank data referenced by the question. */
  private buildGrounding(message: string): Grounding {
    const lower = message.toLowerCase();
    const facts: string[] = [];

    const matchedUsers = this.store
      .getUsers()
      .filter((u) => lower.includes(u.name.toLowerCase()) || lower.includes(u.id.toLowerCase()));

    const matchedRoles = this.store
      .getRoles()
      .filter((r) => lower.includes(r.id.toLowerCase()) || lower.includes(r.name.toLowerCase()));

    for (const user of matchedUsers) {
      const roles = this.store.getUserRoles(user.id);
      facts.push(
        `User ${user.name} (${user.id}), department ${user.department}, status ${user.status}, joined ${user.joinedAt}.`,
      );
      for (const role of roles) {
        const a = this.store
          .getUserAssignments(user.id)
          .find((x) => x.roleId === role.id);
        facts.push(
          `  - holds role ${role.id} (${role.name}, area ${role.area}), assigned ${a?.assignedAt}, last used ${a?.lastUsedAt ?? 'never'}${a?.reason ? `, reason: ${a.reason}` : ''}.`,
        );
      }
      const userFindings = this.risk.findUserSodViolations(user.id);
      for (const f of userFindings) {
        facts.push(`  - SoD risk [${f.severity}] ${f.ruleId}: ${f.description} (roles ${f.roleA} + ${f.roleB}).`);
      }
    }

    for (const role of matchedRoles) {
      const members = this.store.getRoleMembers(role.id);
      facts.push(
        `Role ${role.id} (${role.name}): area ${role.area}, T-Codes ${role.transactions.join(', ')}, held by ${members.length} user(s).`,
      );
    }

    // If the question is about risk in general, include the SoD summary.
    if (/risk|sod|segregation|conflict|fraud/.test(lower)) {
      const findings = this.risk.findSodViolations();
      facts.push(`There are ${findings.length} open SoD findings in total.`);
      for (const f of findings.slice(0, 10)) {
        facts.push(`  - [${f.severity}] ${f.userName} (${f.userId}): ${f.ruleId}.`);
      }
    }

    if (facts.length === 0) {
      const s = this.statsLine();
      facts.push(`No specific user/role recognised in the question. Dataset summary: ${s}`);
    }

    return {
      matchedUsers: matchedUsers.map((u) => u.id),
      matchedRoles: matchedRoles.map((r) => r.id),
      facts,
    };
  }

  private statsLine(): string {
    const findings = this.risk.findSodViolations();
    return `${this.store.getUsers().length} users, ${this.store.getRoles().length} roles, ${this.store.getAuthorizations().length} authorizations, ${findings.length} SoD findings.`;
  }

  // ---- LLM path ------------------------------------------------------------

  /** Render the grounded context + question into a single user turn. */
  private buildPromptMessages(
    message: string,
    history: ChatMessage[],
    grounding: Grounding,
  ): ChatMessage[] {
    const context = `CONTEXT (the bank's SAP data relevant to the question):\n${grounding.facts.join('\n')}`;
    return [
      ...history,
      { role: 'user', content: `${context}\n\nQUESTION: ${message}` },
    ];
  }

  private async callOpenAI(
    message: string,
    history: ChatMessage[],
    grounding: Grounding,
  ): Promise<string> {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...this.buildPromptMessages(message, history, grounding),
    ];

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.openaiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1024,
        temperature: 0.2,
        messages,
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI API ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as {
      choices: Array<{ message?: { content?: string } }>;
    };
    return (data.choices?.[0]?.message?.content ?? '').trim();
  }

  private async callAnthropic(
    message: string,
    history: ChatMessage[],
    grounding: Grounding,
  ): Promise<string> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.anthropicKey as string,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: this.buildPromptMessages(message, history, grounding),
      }),
    });

    if (!res.ok) {
      throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as {
      content: Array<{ type: string; text?: string }>;
    };
    return data.content
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('')
      .trim();
  }

  // ---- Deterministic mock path (offline demo) ------------------------------

  private mockAnswer(message: string, grounding: Grounding): string {
    const lower = message.toLowerCase();

    // "Why does <user> have <role>?"
    if (grounding.matchedUsers.length === 1 && grounding.matchedRoles.length >= 1) {
      const userId = grounding.matchedUsers[0];
      for (const roleId of grounding.matchedRoles) {
        try {
          return this.users.explain(userId, roleId).narrative;
        } catch {
          /* user may not hold that role; continue */
        }
      }
    }

    // Single user, no specific role → profile + risks.
    if (grounding.matchedUsers.length === 1) {
      const userId = grounding.matchedUsers[0];
      const user = this.store.getUser(userId)!;
      const roles = this.store.getUserRoles(userId);
      const findings = this.risk.findUserSodViolations(userId);
      const roleLine = roles.map((r) => `${r.name} (${r.id})`).join(', ') || 'keine Rollen';
      let out = `${user.name} arbeitet in der Abteilung ${user.department} und besitzt: ${roleLine}.`;
      if (findings.length) {
        out += ` ⚠️ ${findings.length} Funktionstrennungsrisiko(en): ${findings
          .map((f) => f.ruleId)
          .join(', ')}.`;
      } else {
        out += ' Keine Funktionstrennungskonflikte festgestellt.';
      }
      return out;
    }

    // Executive-summary / posture question.
    if (/executive|summary|posture|fix first|priorit|overview/.test(lower)) {
      return this.posture();
    }

    // Risk-focused question.
    if (/risk|sod|segregation|conflict|fraud/.test(lower)) {
      return this.describeRisks(this.risk.findSodViolations());
    }

    // Role-focused question.
    if (grounding.matchedRoles.length >= 1) {
      const role = this.store.getRole(grounding.matchedRoles[0])!;
      const members = this.store.getRoleMembers(role.id);
      return `Die Rolle ${role.id} ("${role.name}") gehört zum Bereich ${role.area}, gewährt die T-Codes ${role.transactions.join(', ')} und wird von ${members.length} Benutzer(n) gehalten.`;
    }

    // Fallback help.
    return (
      `Ich kann erklären, warum ein Benutzer eine Rolle besitzt, Rollen für neue Mitarbeitende empfehlen und ` +
      `Funktionstrennungsrisiken (SoD) aufzeigen. Aktueller Datenbestand: ${this.statsLine()} ` +
      `Versuchen Sie: "Warum hat Hans Müller die Rolle Z_CREDIT_APPROVE?" oder "Zeige die Funktionstrennungsrisiken bei Zahlungen".`
    );
  }

  /** A deterministic posture/executive summary for offline (mock) mode. */
  private posture(): string {
    const users = this.store.getUsers();
    const findings = this.risk.findSodViolations();
    const high = findings.filter((f) => f.severity === 'HIGH').length;
    const inactive = users.filter(
      (u) => u.status === 'INACTIVE' && this.store.getUserRoles(u.id).length > 0,
    ).length;
    const sapAll = users.filter((u) =>
      this.store.getUserRoles(u.id).some((r) => r.id === 'Z_SAP_ALL'),
    ).length;

    return (
      `Access-risk posture: ${users.length} users across ${new Set(users.map((u) => u.department)).size} departments. ` +
      `${sapAll} user(s) hold the SAP_ALL superuser profile and ${findings.length} Segregation-of-Duties conflict(s) exist (${high} high severity). ` +
      `${inactive} inactive user(s) still retain active roles. ` +
      `Priorities: (1) revoke SAP_ALL from non-administrators, (2) resolve the high-severity SoD conflicts via four-eyes separation, (3) lock inactive users and strip their roles.`
    );
  }

  private describeRisks(findings: SodFinding[]): string {
    if (!findings.length) return 'No Segregation-of-Duties conflicts were found in the current data.';
    const high = findings.filter((f) => f.severity === 'HIGH');
    const lines = findings
      .map((f) => `• [${f.severity}] ${f.userName}: ${f.description} (${f.roleA} + ${f.roleB})`)
      .join('\n');
    return `Found ${findings.length} SoD conflict(s), ${high.length} high severity:\n${lines}`;
  }
}

/**
 * Async-iterate the `data:` payloads of a Server-Sent-Events stream (the format
 * OpenAI uses for streaming chat completions).
 */
async function* sseLines(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let nl: number;
      while ((nl = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (line.startsWith('data:')) {
          yield line.slice(5).trim();
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
