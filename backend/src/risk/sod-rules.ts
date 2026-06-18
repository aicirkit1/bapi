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
      'Ein Benutzer kann ausgehende Zahlungen sowohl erstellen als auch freigeben — ein klassisches Betrugsrisiko.',
    severity: 'HIGH',
    tcodesA: ['F-53', 'F110', 'FB60'],
    tcodesB: ['FBV0', 'FB02', 'F110S'],
  },
  {
    id: 'TREASURY_DEAL_AND_SETTLE',
    description:
      'Ein Benutzer kann Treasury-Geschäfte sowohl anlegen als auch abwickeln — keine Vier-Augen-Kontrolle.',
    severity: 'HIGH',
    tcodesA: ['TBB1', 'FTR_CREATE'],
    tcodesB: ['TBB4', 'FTR_SETTLE'],
  },
  {
    id: 'VENDOR_MAINTAIN_AND_PAY',
    description:
      'Ein Benutzer kann Lieferantenstammdaten pflegen und Zahlungen erstellen — ermöglicht die Zahlung an einen selbst angelegten Lieferanten.',
    severity: 'MEDIUM',
    tcodesA: ['FK01', 'FK02'],
    tcodesB: ['F-53', 'F110', 'FB60'],
  },
  {
    id: 'GL_POST_AND_CLOSE',
    description:
      'Ein Benutzer kann sowohl Hauptbuchbelege buchen als auch den Periodenabschluss durchführen.',
    severity: 'MEDIUM',
    tcodesA: ['FB50', 'F-02'],
    tcodesB: ['F.16', 'FAGLGVTR'],
  },
  {
    id: 'IT_USER_AND_ROLE_ADMIN',
    description:
      'Ein Benutzer kann sowohl SAP-Benutzer anlegen als auch Berechtigungsrollen pflegen — kann sich jede Berechtigung selbst erteilen.',
    severity: 'HIGH',
    tcodesA: ['SU01', 'SU10'],
    tcodesB: ['PFCG', 'SUIM'],
  },
  {
    id: 'PROCUREMENT_CREATE_AND_APPROVE',
    description:
      'Ein Benutzer kann Bestellungen sowohl anlegen als auch freigeben — ermöglicht nicht autorisierte Ausgaben.',
    severity: 'HIGH',
    tcodesA: ['ME21N', 'ME51N'],
    tcodesB: ['ME29N', 'ME28'],
  },
  {
    id: 'HR_ADMIN_AND_PAYROLL',
    description:
      'Ein Benutzer kann sowohl Personalstammdaten pflegen als auch die Gehaltsabrechnung ausführen — kann einen selbst angelegten Mitarbeiter bezahlen.',
    severity: 'MEDIUM',
    tcodesA: ['PA30', 'PA40'],
    tcodesB: ['PC00', 'PU01'],
  },
];
