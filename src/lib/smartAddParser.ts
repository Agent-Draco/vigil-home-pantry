export interface SmartAddDraft {
  name: string;
  category: string;
  expiryDate?: string;
  manufacturingDate?: string;
}

const CATEGORY_RULES: Array<[RegExp, string]> = [
  [/milk|cheese|yogurt|butter/i, "Dairy"],
  [/egg/i, "Protein"],
  [/bread|bun|roll/i, "Bakery"],
  [/chicken|beef|meat/i, "Meat"],
  [/salmon|fish/i, "Seafood"],
  [/apple|banana|orange|fruit/i, "Fruits"],
  [/rice|pasta|grain/i, "Grains"],
  [/juice|soda|water|drink/i, "Beverages"],
];

const DATE_PATTERN = "(\\d{4}[./-]\\d{1,2}[./-]\\d{1,2}|\\d{1,2}[./-]\\d{1,2}[./-]\\d{2,4})";

const normalizeDate = (value: string) => {
  const parts = value.split(/[./-]/).map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return undefined;

  const [first, second, third] = parts;
  let day: number;
  let month: number;
  let year: number;
  if (first > 31) {
    year = first;
    month = second;
    day = third;
  } else if (second > 12) {
    month = first;
    day = second;
    year = third;
  } else {
    day = first;
    month = second;
    year = third;
  }
  if (year < 100) year += 2000;

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const extractDate = (text: string, label: string) => {
  const match = text.match(new RegExp(`${label}[^0-9]*${DATE_PATTERN}`, "i"));
  return match?.[1] ? normalizeDate(match[1]) : undefined;
};

export const parseSmartAddText = (rawText: string): SmartAddDraft => {
  const text = rawText.replace(/\s+/g, " ").trim();
  const withoutDates = text
    .replace(new RegExp(`(?:exp|expiry|expires|best before|mfg|mfd|manufactured)[^0-9]*${DATE_PATTERN}`, "gi"), "")
    .replace(/\b(quantity|qty|pack|pcs?)\s*[:x]?\s*\d+\b/gi, "")
    .trim();
  const name = (withoutDates.split(/[|,;\n]/)[0] || "Pantry item")
    .replace(/^(item|product|name)\s*[:=-]\s*/i, "")
    .trim()
    .slice(0, 80);
  const category = CATEGORY_RULES.find(([rule]) => rule.test(name))?.[1] || "Pantry";

  return {
    name: name || "Pantry item",
    category,
    expiryDate: extractDate(text, "(?:exp|expiry|expires|best before)"),
    manufacturingDate: extractDate(text, "(?:mfg|mfd|manufactured)"),
  };
};

export const parseSmartAddImage = async (file: Blob): Promise<SmartAddDraft> => {
  const { data } = await import("tesseract.js").then(({ default: tesseract }) => tesseract.recognize(file, "eng"));
  return parseSmartAddText(data.text);
};