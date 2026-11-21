import { BadRequestException } from "@nestjs/common";
import { cleanCompany } from "./companies";
import { linkedInProfileUrl } from "./linkedin-profile";

export function object(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new BadRequestException("Expected a JSON object.");
  }
  return value as Record<string, unknown>;
}

export function text(value: unknown, label: string, minimum: number, maximum: number): string {
  const clean = typeof value === "string" ? value.trim() : "";
  if (clean.length < minimum || clean.length > maximum || clean.includes("\0")) {
    throw new BadRequestException(`${label} must be ${minimum}–${maximum} characters.`);
  }
  return clean;
}

function date(value: unknown, label: string) {
  if (typeof value === "string" && /^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(value);
    if (Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value) return value;
  }
  throw new BadRequestException(`${label} must be a valid date.`);
}

export function workInput(body: unknown) {
  const input = object(body);
  const company = cleanCompany(text(input.company, "Company", 1, 120));
  const title = text(input.title, "Job title", 1, 120);
  const start = date(input.start, "Start date");
  const end = input.end === null || input.end === "" ? null : date(input.end, "End date");
  const today = new Date().toISOString().slice(0, 10);
  if (start > today || (end && (end < start || end > today))) {
    throw new BadRequestException("Use past or current dates and an end date on or after the start date.");
  }
  return { company, title, start, end };
}

export function colleagueDraftInput(body: unknown) {
  const draft = object(body);
  if (!Array.isArray(draft.history) || draft.history.length < 1 || draft.history.length > 50) {
    throw new BadRequestException("Review between 1 and 50 work history entries.");
  }
  return {
    name: text(draft.name, "Colleague name", 1, 150),
    linkedinProfileUrl: linkedInProfileUrl(draft.linkedinProfileUrl),
    history: draft.history.map(workInput),
  };
}

export function linkedInSourceInput(value: unknown) {
  if (value === undefined) return undefined;
  const source = object(value);
  function period(value: unknown) {
    if (value === "") return value;
    if (typeof value === "string" && /^[1-9]\d{3}(?:-(?:0[1-9]|1[0-2]))?$/.test(value)) return value;
    return date(value, "LinkedIn date");
  }
  return {
    company: cleanCompany(text(source.company, "LinkedIn company", 0, 240)).toLowerCase(),
    title: cleanCompany(text(source.title, "LinkedIn title", 0, 240)).toLowerCase(),
    start: period(source.start),
    end: source.end === null ? null : period(source.end),
  };
}

export const categoryNames = ["technical", "communication", "leadership", "reliability", "teamwork"] as const;

function score(value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 5) {
    throw new BadRequestException("Scores must be whole numbers from 1 to 5.");
  }
  return value;
}

export function ratingInput(body: unknown) {
  const input = object(body);
  const raw = object(input.categories);
  const categories = Object.fromEntries(categoryNames.filter((key) => Object.hasOwn(raw, key))
    .map((key) => [key, score(raw[key])]));
  if (Object.keys(categories).length < 3 || Object.keys(categories).length !== Object.keys(raw).length) {
    throw new BadRequestException("Score at least three of the five categories.");
  }
  return {
    overall: score(input.overall),
    categories,
    feedback: text(input.feedback, "Feedback", 20, 2000),
    anonymous: boolean(input.anonymous),
  };
}

export function boolean(value: unknown) {
  if (typeof value !== "boolean") throw new BadRequestException("Expected a boolean selection.");
  return value;
}

export function pageNumber(value: unknown) {
  if (value === undefined) return 1;
  const page = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : NaN;
  if (!Number.isSafeInteger(page) || page < 1 || page > 100_000) {
    throw new BadRequestException("Use a valid page number.");
  }
  return page;
}

export function searchTerm(value: unknown) {
  if (value === undefined) return "";
  if (typeof value !== "string" || value.length > 120 || value.includes("\0")) {
    throw new BadRequestException("Use a search term of up to 120 characters.");
  }
  return value.trim();
}
