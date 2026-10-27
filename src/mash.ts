const ROWS = ["1234567890", "qwertyuiop", "asdfghjkl", "zxcvbnm"];

const POS = new Map<string, { row: number; col: number }>();
ROWS.forEach((chars, row) => {
  for (let col = 0; col < chars.length; col++) POS.set(chars[col]!, { row, col });
});

const VOWELS = /[aeiouy]/;
const DEFAULT_THRESHOLD = 0.7;

export type MashSignal =
  /** 4+ keys typed in order along a keyboard row: "asdf", "qwerty", "lkjhgf" */
  | "keyboard-run"
  /** The same short unit repeated 3+ times: "ababab", "xyxyxy" */
  | "repeated-pattern"
  /** One character dominates the input: "aaaab" */
  | "character-repetition"
  /** Nearly every keypress is next to the previous one: "asdsa" */
  | "adjacent-keys"
  /** 5+ letters without a single vowel: "sdkjfhsdf" */
  | "no-vowels"
  /** Long input built from very few distinct characters: "aabbaabb" */
  | "low-variety";

export interface MashAnalysis {
  mash: boolean;
  /** 0 (clean) to 1 (certain mash) */
  score: number;
  signals: MashSignal[];
}

/** Length of the longest run of keys typed in one direction along a keyboard row. */
function longestKeyboardRun(token: string): number {
  let best = 1;
  let run = 1;
  let dir = 0;
  for (let i = 1; i < token.length; i++) {
    const a = POS.get(token[i - 1]!);
    const b = POS.get(token[i]!);
    const step = a && b && a.row === b.row ? b.col - a.col : NaN;
    if (step === 1 || step === -1) {
      run = step === dir ? run + 1 : 2;
      dir = step;
    } else {
      run = 1;
      dir = 0;
    }
    if (run > best) best = run;
  }
  return best;
}

/** Fraction of consecutive key pairs that sit next to each other on a row. */
function adjacencyRatio(token: string): number {
  let adjacent = 0;
  for (let i = 1; i < token.length; i++) {
    const a = POS.get(token[i - 1]!);
    const b = POS.get(token[i]!);
    if (a && b && a.row === b.row && Math.abs(a.col - b.col) === 1) adjacent++;
  }
  return adjacent / (token.length - 1);
}

/** True when the token is one unit repeated 3+ times ("ababab", "aaaa"). */
function isRepeatedPattern(token: string): boolean {
  for (let unit = 1; unit * 3 <= token.length; unit++) {
    if (token.length % unit !== 0) continue;
    if (token.slice(0, unit).repeat(token.length / unit) === token) return true;
  }
  return false;
}

function maxCharFrequency(token: string): number {
  const counts = new Map<string, number>();
  let max = 0;
  for (const ch of token) {
    const n = (counts.get(ch) ?? 0) + 1;
    counts.set(ch, n);
    if (n > max) max = n;
  }
  return max;
}

function scoreToken(token: string): { score: number; signals: MashSignal[] } {
  const signals: MashSignal[] = [];
  let score = 0;
  const add = (value: number, signal: MashSignal) => {
    signals.push(signal);
    if (value > score) score = value;
  };

  const len = token.length;
  if (len < 3) return { score, signals };

  // A 4-key run only counts when it IS the token ("asdf"), not when it sits
  // inside a word ("erty" in "liberty", "trew" in "strew"). 5+ keys always count.
  const run = longestKeyboardRun(token);
  if (run >= 5 || (run === len && len >= 4)) add(1, "keyboard-run");
  else if (run === len && len === 3) add(0.6, "keyboard-run"); // "qwe", "asd"

  if (len >= 4 && isRepeatedPattern(token)) add(1, "repeated-pattern");
  if (len >= 5 && maxCharFrequency(token) / len >= 0.7) add(0.9, "character-repetition");
  // 0.85 keeps words like "brewer" (0.8) below the line.
  if (len >= 5 && adjacencyRatio(token) >= 0.85) add(0.8, "adjacent-keys");

  const letters = token.replace(/[^a-z]/g, "");
  if (letters.length >= 5 && !VOWELS.test(letters)) add(0.8, "no-vowels");

  if (len >= 7 && new Set(token).size / len <= 0.3) add(0.7, "low-variety");

  return { score, signals };
}

/**
 * Scores how likely the input is keyboard-mashed gibberish rather than a
 * genuine name, word, or identifier. Looks only at a-z and 0-9; any mashed
 * word marks the whole input.
 *
 * @example
 * analyzeMash("asdf");
 * // { mash: true, score: 1, signals: ["keyboard-run"] }
 * analyzeMash("Salman");
 * // { mash: false, score: 0, signals: [] }
 */
export function analyzeMash(input: string): MashAnalysis {
  const tokens = String(input).toLowerCase().match(/[a-z0-9]+/g) ?? [];
  let score = 0;
  const signals = new Set<MashSignal>();
  for (const token of tokens) {
    const result = scoreToken(token);
    if (result.score > 0) {
      for (const signal of result.signals) signals.add(signal);
      if (result.score > score) score = result.score;
    }
  }
  return { mash: score >= DEFAULT_THRESHOLD, score, signals: [...signals] };
}

/**
 * True when the input looks like keyboard mashing ("asdf", "sdkjfhsdf", "aaaa").
 *
 * @example
 * isMash("asdfasdf");   // true
 * isMash("John Smith"); // false
 */
export function isMash(input: string, threshold: number = DEFAULT_THRESHOLD): boolean {
  return analyzeMash(input).score >= threshold;
}

/** The mash score alone: 0 (clean) to 1 (certain mash). */
export function mashScore(input: string): number {
  return analyzeMash(input).score;
}
