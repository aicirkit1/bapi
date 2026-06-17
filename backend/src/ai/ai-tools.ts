import { Injectable } from '@nestjs/common';
import { RiskService } from '../risk/risk.service';
import { StoreService } from '../store/store.service';
import { UsersService } from '../users/users.service';

/**
 * The tool layer the LLM uses to query the bank's SAP data on its own, instead
 * of us pre-baking a fixed context. Each tool is a small, read-only function
 * over the existing services. Definitions are exposed in OpenAI function-calling
 * format; `execute()` dispatches a call by name.
 */

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ToolCallResult {
  name: string;
  args: Record<string, unknown>;
  result: unknown;
}

@Injectable()
export class AiTools {
  constructor(
    private readonly store: StoreService,
    private readonly risk: RiskService,
    private readonly users: UsersService,
  ) {}

  /** OpenAI-format tool definitions advertised to the model. */
  definitions(): ToolDefinition[] {
    return [
      def(
        'search_users',
        'Search users by name, id or department. Returns matching users with their department and role count.',
        {
          query: {
            type: 'string',
            description: 'Name, user id or department to search for.',
          },
        },
        [],
      ),
      def(
        'get_user',
        'Get a single user with all their assigned roles, assignment dates and last-used dates.',
        { userId: { type: 'string', description: 'User id, e.g. U1001.' } },
        ['userId'],
      ),
      def(
        'explain_role',
        'Explain WHY a user holds a specific role: original reason, how long since last use, and whether it looks like a leftover.',
        {
          userId: { type: 'string' },
          roleId: { type: 'string' },
        },
        ['userId', 'roleId'],
      ),
      def(
        'recommend_roles',
        'Recommend roles for a user based on what peers in the same department hold (new-joiner provisioning).',
        { userId: { type: 'string' } },
        ['userId'],
      ),
      def(
        'get_role',
        'Get a role with its authorization objects, T-Codes and the members who hold it.',
        { roleId: { type: 'string', description: 'Role id, e.g. Z_PAY_APPROVE.' } },
        ['roleId'],
      ),
      def(
        'find_sod_risks',
        'Find Segregation-of-Duties conflicts. Optionally filter by userId or severity (LOW|MEDIUM|HIGH).',
        {
          userId: { type: 'string', description: 'Optional user id filter.' },
          severity: {
            type: 'string',
            enum: ['LOW', 'MEDIUM', 'HIGH'],
            description: 'Optional severity filter.',
          },
        },
        [],
      ),
    ];
  }

  async execute(name: string, args: Record<string, unknown>): Promise<unknown> {
    const str = (v: unknown) => (typeof v === 'string' ? v : undefined);
    switch (name) {
      case 'search_users': {
        const q = (str(args['query']) ?? '').toLowerCase();
        return this.store
          .getUsers()
          .filter(
            (u) =>
              !q ||
              u.name.toLowerCase().includes(q) ||
              u.id.toLowerCase().includes(q) ||
              u.department.toLowerCase().includes(q),
          )
          .slice(0, 25)
          .map((u) => ({
            id: u.id,
            name: u.name,
            department: u.department,
            status: u.status,
            roleCount: this.store.getUserRoles(u.id).length,
          }));
      }
      case 'get_user': {
        const id = str(args['userId']);
        if (!id) return { error: 'userId is required' };
        const user = this.store.getUser(id);
        if (!user) return { error: `User ${id} not found` };
        return {
          ...user,
          roles: this.store.getUserAssignments(id).map((a) => {
            const role = this.store.getRole(a.roleId);
            return {
              id: a.roleId,
              name: role?.name,
              area: role?.area,
              assignedAt: a.assignedAt,
              lastUsedAt: a.lastUsedAt,
              reason: a.reason,
            };
          }),
        };
      }
      case 'explain_role': {
        const userId = str(args['userId']);
        const roleId = str(args['roleId']);
        if (!userId || !roleId) return { error: 'userId and roleId are required' };
        try {
          return this.users.explain(userId, roleId);
        } catch (e) {
          return { error: (e as Error).message };
        }
      }
      case 'recommend_roles': {
        const userId = str(args['userId']);
        if (!userId) return { error: 'userId is required' };
        try {
          return this.users.recommend(userId);
        } catch (e) {
          return { error: (e as Error).message };
        }
      }
      case 'get_role': {
        const roleId = str(args['roleId']);
        if (!roleId) return { error: 'roleId is required' };
        const role = this.store.getRole(roleId);
        if (!role) return { error: `Role ${roleId} not found` };
        return {
          ...role,
          authorizations: this.store.getRoleAuthorizations(roleId),
          members: this.store.getRoleMembers(roleId).map((uid) => {
            const u = this.store.getUser(uid);
            return { id: uid, name: u?.name };
          }),
        };
      }
      case 'find_sod_risks': {
        const userId = str(args['userId']);
        const severity = str(args['severity']) as
          | 'LOW'
          | 'MEDIUM'
          | 'HIGH'
          | undefined;
        let findings = this.risk.findSodViolations(severity);
        if (userId) findings = findings.filter((f) => f.userId === userId);
        return findings;
      }
      default:
        return { error: `Unknown tool: ${name}` };
    }
  }
}

function def(
  name: string,
  description: string,
  properties: Record<string, unknown>,
  required: string[],
): ToolDefinition {
  return {
    type: 'function',
    function: {
      name,
      description,
      parameters: {
        type: 'object',
        properties,
        required,
        additionalProperties: false,
      },
    },
  };
}
