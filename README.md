# keyboard-mash

Detect keyboard-mashed gibberish — `asdf`, `qwerty`, `sdkjfhsdf`, `aaaa` — in names, signup forms, and lead data, in JavaScript, TypeScript, and Node.js.

- Zero dependencies, tiny, tree-shakeable
- TypeScript-first with full type definitions
- Tuned against real words that fool naive checks (`retro`, `sassy`, `mama`, `couscous`)
- Works in Node, browsers, and edge runtimes

## Install

```sh
npm install keyboard-mash
```

## Detect gibberish input

```ts
import { isMash, mashScore, analyzeMash } from "keyboard-mash";

isMash("asdf");        // true
isMash("sdkjfhsdf");   // true
isMash("John Smith");  // false
isMash("Salman");      // false

analyzeMash("asdfasdf");
// { mash: true, score: 0.8, signals: ["adjacent-keys"] }

analyzeMash("Jane Smith");
// { mash: false, score: 0, signals: [] }
```

Any mashed word marks the whole input, so `"John asdfasdf"` is flagged.

## Scores and thresholds

`mashScore` returns 0 (clean) to 1 (certain mash). `isMash` flags input at
0.7 by default; pass your own threshold to be stricter or more lenient:

```ts
mashScore("qwe");        // 0.6 — suspicious, but too short to be sure
isMash("qwe");           // false at the default threshold
isMash("qwe", 0.5);      // true — stricter
```

## What it looks for

| Signal | Example |
| --- | --- |
| `keyboard-run` | 4+ keys in order along a keyboard row: `asdf`, `qwerty`, `lkjhgf` |
| `repeated-pattern` | one unit repeated 3+ times: `ababab`, `aaaa` |
| `character-repetition` | one character dominating: `aaaab` |
| `adjacent-keys` | nearly every keypress next to the previous one: `asdsa` |
| `no-vowels` | 5+ letters, no vowel: `sdkjfhsdf` |
| `low-variety` | long input, few distinct characters: `aabbaabb` |

## Why not just a regex?

A blocklist (`asdf`, `qwerty`, `test`) misses everything it hasn't seen:
reversed runs (`lkjhgf`), repeats (`asdfasdf`), and random consonant mashes
(`sdkjfhsdf`). Scoring the *mechanics* of mashing — key adjacency, repetition,
character variety — catches those while letting `sassy`, `mama`, `liberty`,
and `Mississippi` through. The heuristics flag 4 of the 236k words in the
English dictionary (0.002%), and the test suite pins the near-misses down.

## Limitations

Latin letters and digits only — input in other scripts (اردو, кириллица) is
never flagged. Strings under 3 characters are too short to judge and score 0.

## API

| Function | Returns |
| --- | --- |
| `isMash(input, threshold?)` | `boolean` (default threshold 0.7) |
| `mashScore(input)` | `number` from 0 to 1 |
| `analyzeMash(input)` | `{ mash, score, signals }` |

## License

MIT
