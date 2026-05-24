// Resolves a typed/shorthand exercise name to a library entry. Supports
// whole-query aliases (e.g. "ohp" -> Overhead Press) and token synonyms
// (e.g. "oh" -> overhead, "db" -> dumbbell) so partial shorthand resolves.
// Pure (no DOM) so it can be unit-tested under Node.
import { EXERCISE_ALIASES, NAME_TOKEN_SYNONYMS } from "./rp.js";
import { normalizeName } from "./ui.js";

// Expand each whitespace token through NAME_TOKEN_SYNONYMS (expansions may be
// multi-word), returning the flattened token list.
function expandTokens(q) {
  return q
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((tok) => (NAME_TOKEN_SYNONYMS[tok] || tok).split(/\s+/));
}

// Returns the matched library entry, or null on no match / ambiguity (the
// caller should fall back to the picker in that case).
export function resolveExerciseName(query, lib) {
  let q = normalizeName(query);
  if (!q) return null;

  // 1. Whole-query alias → continue matching against its canonical name.
  if (EXERCISE_ALIASES[q]) q = normalizeName(EXERCISE_ALIASES[q]);

  // 2. Exact name match.
  const exact = lib.find((e) => normalizeName(e.name) === q);
  if (exact) return exact;

  // 3. Exact match on the token-expanded phrase (resolves "oh press" →
  //    "overhead press" → "Overhead Press" even when several names contain
  //    both tokens).
  const tokens = expandTokens(q);
  const expandedPhrase = tokens.join(" ");
  if (expandedPhrase !== q) {
    const exactExpanded = lib.find((e) => normalizeName(e.name) === expandedPhrase);
    if (exactExpanded) return exactExpanded;
  }

  // 4. Every expanded token present in the name; unique match only.
  const allTokens = lib.filter((e) => {
    const n = normalizeName(e.name);
    return tokens.every((t) => n.includes(t));
  });
  if (allTokens.length === 1) return allTokens[0];
  if (allTokens.length > 1) return null;

  // 5. Unique raw-substring fallback.
  const contains = lib.filter((e) => normalizeName(e.name).includes(q));
  return contains.length === 1 ? contains[0] : null;
}
