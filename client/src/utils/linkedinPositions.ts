import { csvParseRows } from "d3-dsv";

const months = [
  ["january", "jan", "январь", "января", "янв"],
  ["february", "feb", "февраль", "февраля", "фев"],
  ["march", "mar", "март", "марта", "мар"],
  ["april", "apr", "апрель", "апреля", "апр"],
  ["may", "май", "мая"],
  ["june", "jun", "июнь", "июня", "июн"],
  ["july", "jul", "июль", "июля", "июл"],
  ["august", "aug", "август", "августа", "авг"],
  ["september", "sep", "sept", "сентябрь", "сентября", "сен", "сент"],
  ["october", "oct", "октябрь", "октября", "окт"],
  ["november", "nov", "ноябрь", "ноября", "ноя"],
  ["december", "dec", "декабрь", "декабря", "дек"],
];
const yearOnly = /^[1-9]\d{3}$/;

function periodFromExport(value: string) {
  if (yearOnly.test(value)) return value;
  if (/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(value);
    if (Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value) return value;
    return "";
  }

  const numeric = /^([1-9]\d{3})-(\d{2})$/.exec(value);
  const named = /^([\p{L}]+)\.?\s+([1-9]\d{3})$/iu.exec(value);
  const year = numeric?.[1] ?? named?.[2];
  const month = numeric ? Number(numeric[2]) : months.findIndex(names => names.includes(named?.[1].toLowerCase() ?? "")) + 1;
  if (!year || month < 1 || month > 12) return "";
  return `${year}-${String(month).padStart(2, "0")}`;
}

function dateFromPeriod(period: string, end = false) {
  if (!period || period.length === 10) return period;
  const year = period.slice(0, 4);
  const month = period.length === 4 ? (end ? 12 : 1) : Number(period.slice(5));
  const day = end ? new Date(Date.UTC(Number(year), month, 0)).getUTCDate() : 1;
  const estimate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const today = new Date().toISOString().slice(0, 10);
  return end && today.startsWith(period) && today < estimate ? today : estimate;
}

const fields = ["company name", "title", "started on", "finished on"];
export const currentPosition = /^(?:present|настоящее время|по настоящее время|по н\.\s?в\.)$/iu;

export interface LinkedInSource {
  company: string;
  title: string;
  start: string;
  end: string | null;
}

export function workNameKey(value: string) {
  return value.trim().normalize("NFC").replace(/\s+/g, " ").toLowerCase();
}

export function matchLinkedInPosition(position: LinkedInPosition, entry: LinkedInSource & { linkedinSource?: LinkedInSource | null }) {
  const { source } = position;
  const saved = entry.linkedinSource;
  if (saved && saved.company === source.company && saved.title === source.title &&
      saved.start === source.start && saved.end === source.end) return true;

  return workNameKey(entry.company) === source.company && workNameKey(entry.title) === source.title &&
    !!source.start && entry.start.startsWith(source.start) &&
    (source.end === null ? entry.end === null : !!source.end && entry.end?.startsWith(source.end) === true);
}

export function linkedInPosition(id: number, company: string, title: string, originalStart: string, originalEnd: string) {
  const current = !originalEnd || currentPosition.test(originalEnd);
  const source: LinkedInSource = {
    company: workNameKey(company), title: workNameKey(title),
    start: periodFromExport(originalStart), end: current ? null : periodFromExport(originalEnd),
  };
  const start = dateFromPeriod(source.start);
  const end = dateFromPeriod(source.end ?? "", true);
  return {
    id,
    source,
    entry: { company, title, start, end },
    originalStart,
    originalEnd,
    endRequired: !current && !end,
    estimatedDates: Boolean((start && start !== originalStart) || (end && end !== originalEnd)),
  };
}

export function parseLinkedInPositions(csv: string) {
  const rows = csvParseRows(csv.replace(/^\uFEFF/, "")).filter(row => row.some(value => value.trim()));
  const [header, ...positions] = rows;
  const columns = header?.map(value => value.trim().toLowerCase()) ?? [];
  if (fields.some(field => columns.indexOf(field) < 0 || columns.indexOf(field) !== columns.lastIndexOf(field))) {
    throw new Error("Choose the Positions.csv file from your LinkedIn data export.");
  }
  if (!positions.length) throw new Error("There are no positions in this file.");
  const [companyColumn, titleColumn, startColumn, endColumn] = fields.map(field => columns.indexOf(field));

  return positions.map((row, index) => {
    if (row.length !== columns.length) {
      throw new Error(`Position ${index + 1} has missing or extra columns. Choose the original LinkedIn export.`);
    }
    return linkedInPosition(index, row[companyColumn].trim(), row[titleColumn].trim(), row[startColumn].trim(), row[endColumn].trim());
  });
}

export type LinkedInPosition = ReturnType<typeof linkedInPosition>;
