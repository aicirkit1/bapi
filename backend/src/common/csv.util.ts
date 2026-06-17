/**
 * Minimal, dependency-free CSV parser.
 *
 * Supports a header row, comma delimiters and double-quoted fields
 * (with escaped "" quotes). Good enough for the SAP export format used
 * by the platform; swap for `csv-parse` if richer dialects are needed.
 */
export function parseCsv(content: string): Record<string, string>[] {
  const rows = splitRows(content.trim());
  if (rows.length === 0) return [];

  const headers = parseLine(rows[0]).map((h) => h.trim());
  const records: Record<string, string>[] = [];

  for (let i = 1; i < rows.length; i++) {
    if (rows[i].trim() === '') continue;
    const cells = parseLine(rows[i]);
    const record: Record<string, string> = {};
    headers.forEach((h, idx) => {
      record[h] = (cells[idx] ?? '').trim();
    });
    records.push(record);
  }
  return records;
}

function splitRows(content: string): string[] {
  // Split on newlines that are not inside quotes.
  const rows: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const ch of content) {
    if (ch === '"') inQuotes = !inQuotes;
    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\n') {
        rows.push(current);
        current = '';
      }
      continue;
    }
    current += ch;
  }
  if (current !== '') rows.push(current);
  return rows;
}

function parseLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      cells.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells;
}
