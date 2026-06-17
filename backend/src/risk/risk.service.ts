import { Injectable } from '@nestjs/common';
import { Role, Severity, SodFinding } from '../common/types';
import { StoreService } from '../store/store.service';
import { SOD_RULES, SodRule } from './sod-rules';

@Injectable()
export class RiskService {
  constructor(private readonly store: StoreService) {}

  getRules(): SodRule[] {
    return SOD_RULES;
  }

  /** Scan every user against the SoD catalogue and return all violations. */
  findSodViolations(severity?: Severity): SodFinding[] {
    const findings: SodFinding[] = [];

    for (const user of this.store.getUsers()) {
      const roles = this.store.getUserRoles(user.id);

      for (const rule of SOD_RULES) {
        const roleA = this.firstRoleMatching(roles, rule.tcodesA);
        const roleB = this.firstRoleMatching(roles, rule.tcodesB);

        // A genuine conflict needs two *different* roles (or the same role
        // granting both sides) covering each capability.
        if (roleA && roleB) {
          const matchedTcodes = [
            ...this.matchedTcodes(roles, rule.tcodesA),
            ...this.matchedTcodes(roles, rule.tcodesB),
          ];
          findings.push({
            userId: user.id,
            userName: user.name,
            ruleId: rule.id,
            description: rule.description,
            roleA: roleA.id,
            roleB: roleB.id,
            tcodes: [...new Set(matchedTcodes)],
            severity: rule.severity,
          });
        }
      }
    }

    return severity
      ? findings.filter((f) => f.severity === severity)
      : findings;
  }

  findUserSodViolations(userId: string): SodFinding[] {
    return this.findSodViolations().filter((f) => f.userId === userId);
  }

  private firstRoleMatching(roles: Role[], tcodes: string[]): Role | undefined {
    return roles.find((r) => r.transactions.some((t) => tcodes.includes(t)));
  }

  private matchedTcodes(roles: Role[], tcodes: string[]): string[] {
    const all = roles.flatMap((r) => r.transactions);
    return all.filter((t) => tcodes.includes(t));
  }
}
