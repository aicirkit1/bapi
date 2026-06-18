/**
 * Mock data + types for the Berechtigungskonzept (BRK) screen.
 * ALL data here is synthetic (Mustermann-style demo names, fictional "ACME"
 * org units and IDs) — no real people or systems.
 */

export interface BrkRow {
  id: string;
  name: string;
  archiviert: boolean;
  iteraplanId: string;
  fachlicherPv: string;
  technischerPv: string;
  stell: string; // "#Fach/Tech Stell."
  letzterBearbeiter: string;
}

export interface BrkRight {
  recht: string;
  zielsystem: string;
  beschreibung: string;
}

export interface BrkMember {
  name: string;
  uid: string;
}

export interface BrkDeviation {
  typ: string;
  title: string;
}

export interface AzureApp {
  name: string;
  status: string;
}

export interface BrkDocument {
  name: string;
  size: string;
  uploadedAt: string;
  uploadedBy: string;
}

const P = {
  max: 'Max Mustermann/ACME-IT1 (d100001)',
  erika: 'Erika Musterfrau/ACME-FIN2 (d100002)',
  tom: 'Tom Tester/ACME-OPS3 (d100003)',
  lena: 'Lena Beispiel/ACME-HR5 (d100005)',
  jonas: 'Jonas Probe/ACME-RISK4 (d100006)',
  sara: 'Sara Schablone/ACME-FIN2 (d100007)',
};

export const BRK_ROWS: BrkRow[] = [
  { id: 'zahlungsservice', name: 'DEMO_Zahlungsservice', archiviert: false, iteraplanId: '100201, 100202', fachlicherPv: P.max, technischerPv: P.tom, stell: '6 / 1', letzterBearbeiter: 'd100001' },
  { id: 'konto-api', name: 'DEMO_KontoAPI', archiviert: false, iteraplanId: '100340', fachlicherPv: P.erika, technischerPv: P.max, stell: '2 / 1', letzterBearbeiter: 'd100002' },
  { id: 'reporting', name: 'DEMO_Reporting', archiviert: false, iteraplanId: '100455', fachlicherPv: P.sara, technischerPv: P.jonas, stell: '1 / 1', letzterBearbeiter: 'sa' },
  { id: 'azure-connector', name: 'DEMO_AzureConnector', archiviert: false, iteraplanId: '100512 100513', fachlicherPv: P.tom, technischerPv: P.max, stell: '1 / 1', letzterBearbeiter: 'd100003' },
  { id: 'auditlog', name: 'DEMO_AuditLog', archiviert: true, iteraplanId: '100600', fachlicherPv: P.jonas, technischerPv: P.tom, stell: '1 / 1', letzterBearbeiter: 'sa' },
  { id: 'file-gateway', name: 'DEMO_FileGateway', archiviert: false, iteraplanId: '100711', fachlicherPv: P.lena, technischerPv: P.erika, stell: '1 / 1', letzterBearbeiter: 'sa' },
  { id: 'identity-sync', name: 'DEMO_IdentitySync', archiviert: false, iteraplanId: '100822', fachlicherPv: P.max, technischerPv: P.sara, stell: '2 / 1', letzterBearbeiter: 'd100001' },
  { id: 'payment-hub', name: 'DEMO_PaymentHub', archiviert: false, iteraplanId: '100933, 100934', fachlicherPv: P.erika, technischerPv: P.tom, stell: '5 / 2', letzterBearbeiter: 'd100002' },
  { id: 'risk-engine', name: 'DEMO_RiskEngine', archiviert: false, iteraplanId: '101044', fachlicherPv: P.jonas, technischerPv: P.max, stell: '3 / 1', letzterBearbeiter: 'd100006' },
  { id: 'data-export', name: 'DEMO_DataExport', archiviert: false, iteraplanId: '101155', fachlicherPv: P.sara, technischerPv: P.jonas, stell: '2 / 1', letzterBearbeiter: 'sa' },
  { id: 'notification-svc', name: 'DEMO_NotificationSvc', archiviert: false, iteraplanId: '101266', fachlicherPv: P.tom, technischerPv: P.erika, stell: '1 / 1', letzterBearbeiter: 'd100003' },
  { id: 'archiv-store', name: 'DEMO_ArchivStore', archiviert: false, iteraplanId: '101377', fachlicherPv: P.lena, technischerPv: P.max, stell: '4 / 2', letzterBearbeiter: 'd100005' },
];

export const BRK_RIGHTS: BrkRight[] = [
  { recht: 'Auditor', zielsystem: 'nicht angebunden', beschreibung: 'dürfen die Logs auswerten' },
  { recht: 'Benutzermanager', zielsystem: 'nicht angebunden', beschreibung: 'dürfen neue Benutzer anlegen, die zweistufige Authentifizierung für bestimmte Benutzer verpflichtend vorgeben und vorhandene Benutzer bearbeiten und löschen.' },
  { recht: 'Dateianfragen verwalten', zielsystem: 'nicht angebunden', beschreibung: 'Verwalten von Dateianfragen auf Verzeichnisebene.' },
  { recht: 'Dateien und Ordner bearbeiten', zielsystem: 'nicht angebunden', beschreibung: 'Schreibrecht auf Verzeichnisebene.' },
  { recht: 'Leseberechtigung', zielsystem: 'nicht angebunden', beschreibung: 'Leserecht auf Verzeichnisebene.' },
  { recht: 'Administrator', zielsystem: 'ACME-AD', beschreibung: 'Vollzugriff auf alle Funktionen und Einstellungen.' },
  { recht: 'Freigeber Zahlung', zielsystem: 'ACME-PAY', beschreibung: 'Freigabe von Zahlungen oberhalb des Limits.' },
];

export const FACHLICHE_MEMBERS: BrkMember[] = [
  { name: 'Max Mustermann/ACME-IT1', uid: 'd100001' },
  { name: 'Erika Musterfrau/ACME-FIN2', uid: 'd100002' },
  { name: 'Tom Tester/ACME-OPS3', uid: 'd100003' },
  { name: 'Lena Beispiel/ACME-HR5', uid: 'd100005' },
  { name: 'Jonas Probe/ACME-RISK4', uid: 'd100006' },
  { name: 'Sara Schablone/ACME-FIN2', uid: 'd100007' },
];

export const TECHNISCHE_MEMBERS: BrkMember[] = [
  { name: 'Tom Tester/ACME-OPS3', uid: 'd100003' },
];

export const ALL_PEOPLE: BrkMember[] = [
  { name: 'Max Mustermann/ACME-IT1', uid: 'd100001' },
  { name: 'Erika Musterfrau/ACME-FIN2', uid: 'd100002' },
  { name: 'Tom Tester/ACME-OPS3', uid: 'd100003' },
  { name: 'Demo Nutzer A/ACME-IT1', uid: 'd100004' },
  { name: 'Lena Beispiel/ACME-HR5', uid: 'd100005' },
  { name: 'Jonas Probe/ACME-RISK4', uid: 'd100006' },
  { name: 'Sara Schablone/ACME-FIN2', uid: 'd100007' },
  { name: 'Demo Nutzer B/ACME-OPS3', uid: 'd100008' },
  { name: 'Klara Vorlage/ACME-FIN2', uid: 'd100009' },
  { name: 'Felix Fiktiv/ACME-IT1', uid: 'd100010' },
  { name: 'Nina Notiz/ACME-HR5', uid: 'd100011' },
  { name: 'Paul Platzhalter/ACME-RISK4', uid: 'd100012' },
  { name: 'Demo Nutzer C/ACME-OPS3', uid: 'd100013' },
  { name: 'Mara Muster/ACME-IT1', uid: 'd100014' },
];

export const DEVIATIONS: BrkDeviation[] = [
  { typ: 'Abweichungstyp #01', title: 'Keine IAM-Anbindung' },
  { typ: 'Abweichungstyp #02', title: 'Nicht vollständige IAM-Anbindung' },
];

export const AD_GROUPS: string[] = [
  'ApiUser-acme-demo-001_payment-hub',
  'SupportUser-acme-demo-001_payment-hub',
  'SharedSafe-acme-demo-001_payment-hub',
];

export const AZURE_APPS: AzureApp[] = [
  { name: 'brk_demo-0000-1111-2222__DEMO_Zahlungsservice_20260101_0900', status: 'Registriert' },
  { name: 'brk_demo-0000-1111-2222__DEMO_Zahlungsservice_Test_20260105_1330', status: 'Registriert' },
];

export const DOCUMENTS: BrkDocument[] = [
  { name: 'Berechtigungsmatrix.xlsx', size: '24 KB', uploadedAt: '01.06.2026 10:15:02', uploadedBy: 'Max Mustermann' },
  { name: 'BRK_Konzept_v2.pdf', size: '512 KB', uploadedAt: '03.06.2026 14:48:20', uploadedBy: 'Erika Musterfrau' },
];

export const DEMO_KEY = '00000000-demo-4000-a000-0000deadbeef';

export const DETAIL_TABS = [
  { key: 'stammdaten', label: 'Stammdaten', icon: 'clipboard' },
  { key: 'stellvertreter', label: 'Stellvertreter', icon: 'users' },
  { key: 'berechtigungen', label: 'Berechtigungen', icon: 'shield' },
  { key: 'abweichungen', label: 'Abweichungen', icon: 'diff' },
  { key: 'pam', label: 'PAM', icon: 'lock' },
  { key: 'azure', label: 'Azure', icon: 'cloud' },
  { key: 'dokumente', label: 'Dokumente', icon: 'folder' },
] as const;

export type DetailTabKey = (typeof DETAIL_TABS)[number]['key'];
