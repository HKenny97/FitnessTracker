// Free-text set parser. Converts shorthand a lifter types into structured
// sets. Pure and dependency-free so it can be unit-tested under Node.
//
// Grammar (a single line):
//   [exercise name] <set group>[, <set group> ...]
//
// `@` ALWAYS introduces weight; `r<N>` is the ONLY reps-in-reserve marker.
// Because of that there is no ambiguity to resolve by magnitude.
//
//   W x R          one set of R reps at weight W          e.g. 225x5
//   S x R @ W      S sets of R reps at weight W           e.g. 3x8 @185
//   R @ W          one set of R reps at weight W          e.g. 2@225
//   ... r<N>       applies RIR N to the group             e.g. 225x5 r2
//   W x R1/R2/...  weight W, one set per slash-separated rep  e.g. 225x5/5/4
//   R1/R2/... @ W  weight W, one set per slash-separated rep  e.g. 5/5/4@225
//
// `10x10 @135` is ten sets of 10 reps at 135 (S x R @ W), NOT weight 10 — the
// `@weight` is what makes the leading number a set count.
//
// Sanity: a resolved set count > MAX_SETS or rir > MAX_RIR marks the group as
// an error and skips it; the rest of the line still parses.

const MAX_SETS = 20;
const MAX_RIR = 10;

const num = (s) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

// A token that starts the set portion of the line: a number optionally
// followed by an `x`/`*` or `@`. Used to split a leading exercise name off.
const SET_START = /\d+(?:\.\d+)?\s*(?:[xX*]|@|\/|$|\s|,)/;

// reps/weight pair with optional trailing RIR (rN). Captures may be slash lists.
const X_FORM = /^(\d+(?:\.\d+)?)\s*[xX*]\s*(\d+(?:\/\d+)*)(?:\s*@\s*(\d+(?:\.\d+)?))?(?:\s*r\s*(\d+))?$/i;
const AT_FORM = /^(\d+(?:\/\d+)*)\s*@\s*(\d+(?:\.\d+)?)(?:\s*r\s*(\d+))?$/i;

function makeSet(weight, reps, rir) {
  return { weight, reps, rir };
}

// Parses one comma-delimited group into sets, or returns { error } describing
// why it could not be parsed.
function parseGroup(raw) {
  const seg = raw.trim();
  if (!seg) return { sets: [] };

  let m = seg.match(X_FORM);
  if (m) {
    const [, n1, repsField, atWeight, rirRaw] = m;
    const rir = rirRaw != null ? num(rirRaw) : null;
    if (rir != null && rir > MAX_RIR) return { error: `rir ${rir} > ${MAX_RIR}` };
    const reps = repsField.split("/").map(num);

    if (atWeight != null) {
      // S x R @ W  — leading number is a set count.
      const count = num(n1);
      if (count > MAX_SETS) return { error: `set count ${count} > ${MAX_SETS}` };
      const weight = num(atWeight);
      const sets = [];
      for (let i = 0; i < count; i++) {
        for (const r of reps) sets.push(makeSet(weight, r, rir));
      }
      return { sets };
    }
    // W x R[/R...] — leading number is the weight, shared across the rep list.
    const weight = num(n1);
    return { sets: reps.map((r) => makeSet(weight, r, rir)) };
  }

  m = seg.match(AT_FORM);
  if (m) {
    // R[/R...] @ W — reps then weight, one set per rep.
    const [, repsField, weightRaw, rirRaw] = m;
    const rir = rirRaw != null ? num(rirRaw) : null;
    if (rir != null && rir > MAX_RIR) return { error: `rir ${rir} > ${MAX_RIR}` };
    const weight = num(weightRaw);
    const reps = repsField.split("/").map(num);
    return { sets: reps.map((r) => makeSet(weight, r, rir)) };
  }

  return { error: "unparseable" };
}

export function parseSets(input) {
  const text = (input || "").trim();
  const out = { name: null, sets: [], errors: [] };
  if (!text) return out;

  // Split a leading exercise name: everything before the first set token.
  let body = text;
  const startMatch = text.match(SET_START);
  if (startMatch && startMatch.index > 0) {
    out.name = text.slice(0, startMatch.index).trim() || null;
    body = text.slice(startMatch.index);
  } else if (!startMatch) {
    // No set token at all — the whole thing is a name with no sets.
    out.name = text;
    return out;
  }

  for (const group of body.split(",")) {
    if (!group.trim()) continue;
    const res = parseGroup(group);
    if (res.error) out.errors.push({ segment: group.trim(), reason: res.error });
    else out.sets.push(...res.sets);
  }
  return out;
}
