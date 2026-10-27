import { describe, expect, it } from "vitest";
import { analyzeMash, isMash, mashScore } from "../src/index";

describe("isMash — gibberish", () => {
  it.each([
    "asdf",
    "qwerty",
    "QWERTY",
    "hjkl",
    "zxcvbn",
    "lkjhgf", // reverse run
    "12345",
    "asdfasdf", // keyboard run inside repeat
    "ababab",
    "aaaa",
    "aaaab",
    "aabbaabb",
    "sdkjfhsdf", // no vowels
    "asdsa", // adjacent keys, not a straight run
  ])("flags %j", (input) => {
    expect(isMash(input)).toBe(true);
  });

  it("flags input when any word is mashed", () => {
    expect(isMash("John asdfasdf")).toBe(true);
  });
});

describe("isMash — genuine input", () => {
  it.each([
    "Salman",
    "John Doe",
    "Muhammad Ali",
    "Nguyen",
    "O'Brien",
    "hello world",
    "banana",
    "retro", // 3 of 4 pairs are adjacent keys
    "sassy", // repeated letters
    "lull", // one letter dominates
    "mama", // repeated unit, but only twice
    "couscous", // repeated unit, but only twice
    "liberty", // contains the keyboard run "erty"
    "poverty", // contains the keyboard run "erty"
    "brewer", // 4 of 5 key pairs are adjacent
    "strew", // contains the reverse keyboard run "trew"
    "strewn",
    "Mississippi", // long, few distinct letters
    "2020", // year, not "20" mashed
    "test",
    "someone@example.com",
  ])("passes %j", (input) => {
    expect(isMash(input)).toBe(false);
  });

  it("returns false for empty and non-Latin input", () => {
    expect(isMash("")).toBe(false);
    expect(isMash("سلمان ساجد")).toBe(false);
  });
});

describe("mashScore", () => {
  it("gives short runs a suspicious but sub-threshold score", () => {
    expect(mashScore("qwe")).toBe(0.6);
    expect(isMash("qwe")).toBe(false);
    expect(isMash("qwe", 0.5)).toBe(true); // stricter threshold opt-in
  });

  it("is 0 for clean input and 1 for certain mash", () => {
    expect(mashScore("Salman")).toBe(0);
    expect(mashScore("asdf")).toBe(1);
  });
});

describe("analyzeMash", () => {
  it("names the signals that fired", () => {
    expect(analyzeMash("asdf")).toEqual({
      mash: true,
      score: 1,
      signals: ["keyboard-run"],
    });
    expect(analyzeMash("sdkjfhsdf").signals).toContain("no-vowels");
    expect(analyzeMash("ababab").signals).toContain("repeated-pattern");
    expect(analyzeMash("aaaab").signals).toContain("character-repetition");
    expect(analyzeMash("aabbaabb").signals).toContain("low-variety");
    expect(analyzeMash("asdsa").signals).toContain("adjacent-keys");
  });

  it("reports clean input with an empty signal list", () => {
    expect(analyzeMash("Jane Smith")).toEqual({ mash: false, score: 0, signals: [] });
  });
});
