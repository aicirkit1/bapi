/**
 * Deterministic SAP mock-data generator.
 *
 * Produces a realistic-looking dataset (≈90 users, ≈30 roles, thousands of
 * authorization rows) with intentionally planted issues:
 *   - SoD conflicts (create+approve, deal+settle, vendor+pay, post+close, …)
 *   - dormant roles (assigned long ago, not used in years)
 *   - cross-department leftovers (role from a previous department)
 *   - over-privileged users (many roles across areas)
 *
 * Run:  node scripts/generate-seed.mjs   (overwrites data/*.csv)
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
mkdirSync(dataDir, { recursive: true });

// Seeded PRNG (mulberry32) — same output every run.
let _s = 0x9e3779b9;
function rng() {
  _s |= 0;
  _s = (_s + 0x6d2b79f5) | 0;
  let t = Math.imul(_s ^ (_s >>> 15), 1 | _s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
const int = (a, b) => a + Math.floor(rng() * (b - a + 1));

// ---- Role catalogue --------------------------------------------------------
// area, id, name, description, transactions[]
const ROLES = [
  ['Credit', 'Z_CREDIT_VIEW', 'Credit View', 'Read-only access to credit data', ['FD33', 'VKM4']],
  ['Credit', 'Z_CREDIT_APPROVE', 'Credit Approval', 'Approve credit limits', ['VKM1', 'VKM3', 'FD32']],
  ['Credit', 'Z_CREDIT_LIMIT_ADMIN', 'Credit Limit Admin', 'Maintain credit master', ['FD32', 'UKM_BP']],
  ['Payments', 'Z_PAY_VIEW', 'Payment View', 'Display payment documents', ['FB03', 'FBL1N']],
  ['Payments', 'Z_PAY_CREATE', 'Payment Creation', 'Create and post payments', ['F-53', 'F110', 'FB60']],
  ['Payments', 'Z_PAY_APPROVE', 'Payment Approval', 'Approve and release payments', ['FBV0', 'FB02', 'F110S']],
  ['Payments', 'Z_VENDOR_MAINTAIN', 'Vendor Master', 'Maintain vendor master data', ['FK01', 'FK02']],
  ['Risk', 'Z_RISK_ANALYST', 'Risk Analyst', 'Risk reporting and analysis', ['FTR0', 'RM01']],
  ['Risk', 'Z_RISK_MODEL', 'Risk Model Admin', 'Maintain risk models', ['RM02', 'KLNACHT']],
  ['Treasury', 'Z_TREASURY_DEAL', 'Treasury Dealing', 'Create treasury deals', ['TBB1', 'FTR_CREATE']],
  ['Treasury', 'Z_TREASURY_SETTLE', 'Treasury Settlement', 'Settle treasury deals', ['TBB4', 'FTR_SETTLE']],
  ['Treasury', 'Z_TREASURY_VIEW', 'Treasury View', 'Display treasury positions', ['TPM10', 'FTR_VIEW']],
  ['HR', 'Z_HR_ADMIN', 'HR Administration', 'Manage employee master data', ['PA30', 'PA40']],
  ['HR', 'Z_HR_PAYROLL', 'Payroll Processing', 'Run payroll', ['PC00', 'PU01']],
  ['Accounting', 'Z_ACCOUNTING_POST', 'GL Posting', 'Post GL documents', ['FB50', 'F-02']],
  ['Accounting', 'Z_ACCOUNTING_CLOSE', 'Period Close', 'Execute period-end closing', ['F.16', 'FAGLGVTR']],
  ['Accounting', 'Z_ACCOUNTING_VIEW', 'GL View', 'Display GL accounts', ['FAGLL03', 'FS10N']],
  ['IT', 'Z_IT_USER_ADMIN', 'IT User Admin', 'Create and lock SAP users', ['SU01', 'SU10']],
  ['IT', 'Z_IT_ROLE_ADMIN', 'IT Role Admin', 'Maintain authorization roles', ['PFCG', 'SUIM']],
  ['IT', 'Z_IT_BASIS', 'IT Basis Admin', 'SAP Basis administration', ['SM59', 'RZ10']],
  ['IT', 'Z_SAP_ALL', 'SAP_ALL Superuser', 'Unrestricted access via the SAP_ALL profile', ['SAP_ALL', 'SU01', 'SE38']],
  ['IT', 'Z_BASIS_ADMIN', 'Basis Administration', 'Critical system administration', ['SE16', 'SM59', 'SCC4', 'PFCG']],
  ['Compliance', 'Z_COMP_AUDIT', 'Compliance Audit', 'Audit and compliance reporting', ['GRAC', 'NWBC']],
  ['Compliance', 'Z_COMP_MONITOR', 'Compliance Monitor', 'Continuous control monitoring', ['GRFN', 'MSMP']],
  ['Procurement', 'Z_PROC_PO_CREATE', 'PO Creation', 'Create purchase orders', ['ME21N', 'ME51N']],
  ['Procurement', 'Z_PROC_PO_APPROVE', 'PO Approval', 'Approve/release purchase orders', ['ME29N', 'ME28']],
  ['Procurement', 'Z_PROC_VIEW', 'Procurement View', 'Display purchase documents', ['ME23N', 'ME2M']],
  ['Operations', 'Z_OPS_RECONCILE', 'Operations Reconcile', 'Reconcile sub-ledgers', ['FF67', 'FEBA']],
  ['Operations', 'Z_OPS_VIEW', 'Operations View', 'Display operational data', ['FBL3N', 'FAGLB03']],
  ['Sales', 'Z_SALES_ORDER', 'Sales Order', 'Create sales orders', ['VA01', 'VA02']],
  ['Sales', 'Z_SALES_VIEW', 'Sales View', 'Display sales documents', ['VA03', 'VA05']],
];

const DEPARTMENTS = [...new Set(ROLES.map((r) => r[0]))];

// SoD conflict pairs (role A id, role B id) — these plant detectable risks.
const CONFLICT_PAIRS = [
  ['Z_PAY_CREATE', 'Z_PAY_APPROVE'],
  ['Z_TREASURY_DEAL', 'Z_TREASURY_SETTLE'],
  ['Z_VENDOR_MAINTAIN', 'Z_PAY_CREATE'],
  ['Z_ACCOUNTING_POST', 'Z_ACCOUNTING_CLOSE'],
  ['Z_IT_USER_ADMIN', 'Z_IT_ROLE_ADMIN'],
  ['Z_PROC_PO_CREATE', 'Z_PROC_PO_APPROVE'],
  ['Z_HR_ADMIN', 'Z_HR_PAYROLL'],
];

const FIRST = ['Hans', 'Anna', 'Thomas', 'Julia', 'Michael', 'Laura', 'Stefan', 'Sabine', 'Peter', 'Claudia', 'Markus', 'Nicole', 'Andreas', 'Katrin', 'Daniel', 'Sandra', 'Christian', 'Petra', 'Frank', 'Birgit', 'Jens', 'Martina', 'Oliver', 'Susanne', 'Dirk', 'Heike', 'Ralf', 'Monika', 'Uwe', 'Gabriele', 'Jürgen', 'Kerstin', 'Wolfgang', 'Silke', 'Holger', 'Manuela', 'Bernd', 'Andrea', 'Klaus', 'Tanja'];
const LAST = ['Müller', 'Schmidt', 'Weber', 'Becker', 'Fischer', 'Wagner', 'Hoffmann', 'Koch', 'Richter', 'Neumann', 'Braun', 'Zimmermann', 'Krüger', 'Hofmann', 'Schulz', 'Schäfer', 'Bauer', 'Klein', 'Wolf', 'Schröder', 'Lange', 'Krause', 'Meyer', 'Lehmann', 'Schmitz', 'Maier', 'Köhler', 'Herrmann', 'König', 'Walter'];

function isoDate(year, month, day) {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

// ---- Generate users --------------------------------------------------------
const USER_COUNT = 90;
const users = [];
for (let i = 0; i < USER_COUNT; i++) {
  const id = `U${1001 + i}`;
  const name = `${pick(FIRST)} ${pick(LAST)}`;
  const department = DEPARTMENTS[i % DEPARTMENTS.length];
  const joinedAt = isoDate(int(2008, 2023), int(1, 12), int(1, 28));
  const status = rng() < 0.06 ? 'INACTIVE' : 'ACTIVE';
  users.push({ id, name, department, joinedAt, status });
}

const rolesByArea = {};
for (const [area, id] of ROLES.map((r) => [r[0], r[1]])) {
  (rolesByArea[area] ??= []).push(id);
}
const roleArea = Object.fromEntries(ROLES.map((r) => [r[1], r[0]]));

// ---- Generate assignments --------------------------------------------------
const assignments = [];
const has = new Set(); // `${userId}:${roleId}`
const add = (userId, roleId, assignedAt, lastUsedAt, reason) => {
  const key = `${userId}:${roleId}`;
  if (has.has(key)) return;
  has.add(key);
  assignments.push({ userId, roleId, assignedAt, lastUsedAt, reason });
};

const recent = () => isoDate(int(2024, 2025), int(1, 12), int(1, 28));
const old = () => isoDate(int(2017, 2021), int(1, 12), int(1, 28));

for (const u of users) {
  const deptRoles = rolesByArea[u.department] ?? [];
  // 1–N home-department roles.
  const n = int(1, Math.min(3, deptRoles.length));
  const shuffled = [...deptRoles].sort(() => rng() - 0.5);
  for (let k = 0; k < n; k++) {
    const roleId = shuffled[k];
    const dormant = rng() < 0.18;
    add(
      u.id,
      roleId,
      isoDate(int(2012, 2022), int(1, 12), int(1, 28)),
      dormant ? old() : recent(),
      'Standard ' + u.department + ' role.',
    );
  }
  // ~22% carry a leftover role from another department (cross-dept risk + dormant).
  if (rng() < 0.22) {
    const otherArea = pick(DEPARTMENTS.filter((d) => d !== u.department));
    const roleId = pick(rolesByArea[otherArea]);
    add(
      u.id,
      roleId,
      old(),
      old(),
      `Leftover from a previous role in ${otherArea} before transfer to ${u.department}.`,
    );
  }
  // ~10% are over-privileged (extra random roles).
  if (rng() < 0.1) {
    for (let k = 0; k < int(2, 4); k++) {
      const roleId = pick(ROLES)[1];
      add(u.id, roleId, old(), rng() < 0.5 ? old() : recent(), 'Accumulated access.');
    }
  }
}

// Plant explicit SoD conflicts on a set of users (one per pair, spread out).
let planted = 0;
for (const [a, b] of CONFLICT_PAIRS) {
  // 2–3 users per conflict pair.
  for (let c = 0; c < int(2, 3); c++) {
    const u = users[int(0, users.length - 1)];
    add(u.id, a, isoDate(int(2014, 2020), int(1, 12), int(1, 28)), recent(), 'Operational role.');
    add(u.id, b, isoDate(int(2018, 2022), int(1, 12), int(1, 28)), recent(), 'Granted during a reorganisation.');
    planted++;
  }
}

// Plant SAP_ALL superuser access on a handful of users (incl. inactive ones).
const sapAllTargets = [users[6], users[19], users[27], users[48], users[71], users[83]];
for (const u of sapAllTargets) {
  if (!u) continue;
  add(u.id, 'Z_SAP_ALL', isoDate(int(2011, 2019), int(1, 12), int(1, 28)), recent(), 'Emergency firefighter access — never removed.');
}
// Plant BASIS critical access on a few more.
for (const u of [users[12], users[40], users[62]]) {
  if (!u) continue;
  add(u.id, 'Z_BASIS_ADMIN', old(), recent(), 'System administration access.');
}

// ---- Authorizations --------------------------------------------------------
// Map each role's T-Codes to authorization-object rows.
const ACTVT = { view: '03', create: '01', change: '02', close: '16' };
const tcodeObject = (tcode) => {
  if (/^F[-.]?|FB|F110|FBL|FAGL|FS10/.test(tcode)) return 'F_BKPF_BUK';
  if (/^FK/.test(tcode)) return 'F_LFA1_BUK';
  if (/^ME/.test(tcode)) return 'M_BEST_BSA';
  if (/^PA|PC|PU/.test(tcode)) return 'P_ORGIN';
  if (/^SU|PFCG|SUIM/.test(tcode)) return 'S_USER_GRP';
  if (/^TBB|FTR|TPM/.test(tcode)) return 'F_TREA_DEA';
  if (/^VKM|FD|UKM/.test(tcode)) return 'F_KKB_BUKR';
  if (/^VA/.test(tcode)) return 'V_VBAK_VKO';
  if (/^GRAC|GRFN|MSMP|NWBC/.test(tcode)) return 'S_GRC_RUL';
  return 'S_TCODE';
};
const actvtFor = (roleId) => {
  if (/APPROVE|SETTLE/.test(roleId)) return ACTVT.change;
  if (/CREATE|POST|ORDER|DEAL|ADMIN|MAINTAIN|PAYROLL/.test(roleId)) return ACTVT.create;
  if (/CLOSE/.test(roleId)) return ACTVT.close;
  return ACTVT.view;
};

const authorizations = [];
for (const [, id, , , tcodes] of ROLES) {
  for (const tcode of tcodes) {
    authorizations.push({
      roleId: id,
      object: tcodeObject(tcode),
      field: 'ACTVT',
      value: actvtFor(id),
      tcode,
    });
  }
}

// ---- Write CSVs ------------------------------------------------------------
const csv = (rows, headers, map) =>
  [headers.join(','), ...rows.map((r) => map(r).join(','))].join('\n') + '\n';

writeFileSync(
  join(dataDir, 'users.csv'),
  csv(users, ['id', 'name', 'department', 'joinedAt', 'status'], (u) => [u.id, u.name, u.department, u.joinedAt, u.status]),
);
writeFileSync(
  join(dataDir, 'roles.csv'),
  csv(ROLES, ['id', 'name', 'description', 'area', 'transactions'], ([area, id, name, desc, tcodes]) => [id, name, desc, area, tcodes.join(';')]),
);
writeFileSync(
  join(dataDir, 'authorizations.csv'),
  csv(authorizations, ['roleId', 'object', 'field', 'value', 'tcode'], (a) => [a.roleId, a.object, a.field, a.value, a.tcode]),
);
writeFileSync(
  join(dataDir, 'assignments.csv'),
  csv(assignments, ['userId', 'roleId', 'assignedAt', 'lastUsedAt', 'reason'], (a) => [a.userId, a.roleId, a.assignedAt, a.lastUsedAt ?? '', a.reason ?? '']),
);

console.log(
  `Generated: ${users.length} users, ${ROLES.length} roles, ${authorizations.length} authorizations, ${assignments.length} assignments (${planted} planted SoD pairs).`,
);
