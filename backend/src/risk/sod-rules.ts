import { Severity } from '../common/types';

/**
 * A Segregation-of-Duties rule: two capabilities that must not be held by the
 * same user. Each capability is matched by a set of T-Codes.
 *
 * For the MVP rules live in code; in the Pilot phase this catalogue moves to a
 * configurable, bank-specific store.
 */
export interface SodRule {
  id: string;
  description: string;
  severity: Severity;
  /** T-Codes representing the first conflicting capability. */
  tcodesA: string[];
  /** T-Codes representing the second conflicting capability. */
  tcodesB: string[];
}

export const SOD_RULES: SodRule[] = [
  {
    id: 'PAYMENT_CREATE_AND_APPROVE',
    description:
      'A user can both create and approve outgoing payments — a classic fraud risk.',
    severity: 'HIGH',
    tcodesA: ['F-53', 'F110', 'FB60'],
    tcodesB: ['FBV0', 'FB02', 'F110S'],
  },
  {
    id: 'TREASURY_DEAL_AND_SETTLE',
    description:
      'A user can both create and settle treasury deals — no four-eyes control.',
    severity: 'HIGH',
    tcodesA: ['TBB1', 'FTR_CREATE'],
    tcodesB: ['TBB4', 'FTR_SETTLE'],
  },
  {
    id: 'VENDOR_MAINTAIN_AND_PAY',
    description:
      'A user can maintain vendor master data and create payments — enables paying a self-created vendor.',
    severity: 'MEDIUM',
    tcodesA: ['FK01', 'FK02'],
    tcodesB: ['F-53', 'F110', 'FB60'],
  },
  {
    id: 'GL_POST_AND_CLOSE',
    description:
      'A user can both post GL documents and run period-end closing.',
    severity: 'MEDIUM',
    tcodesA: ['FB50', 'F-02'],
    tcodesB: ['F.16', 'FAGLGVTR'],
  },
  {
    id: 'IT_USER_AND_ROLE_ADMIN',
    description:
      'A user can both create SAP users and maintain authorization roles — can self-grant any access.',
    severity: 'HIGH',
    tcodesA: ['SU01', 'SU10'],
    tcodesB: ['PFCG', 'SUIM'],
  },
  {
    id: 'PROCUREMENT_CREATE_AND_APPROVE',
    description:
      'A user can both create and approve purchase orders — enables unauthorised spend.',
    severity: 'HIGH',
    tcodesA: ['ME21N', 'ME51N'],
    tcodesB: ['ME29N', 'ME28'],
  },
  {
    id: 'HR_ADMIN_AND_PAYROLL',
    description:
      'A user can both maintain employee master data and run payroll — can pay a self-created employee.',
    severity: 'MEDIUM',
    tcodesA: ['PA30', 'PA40'],
    tcodesB: ['PC00', 'PU01'],
  },
];
