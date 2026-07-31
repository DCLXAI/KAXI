// P0-6. The grounded answer path renumbered citation markers to match the
// sources it kept, and left any marker it could not map exactly as written:
//
//   return mapped ? `[${mapped}]` : citation;
//
// That is worse than a dangling reference. When the model wrote [1] and [3] but
// declared usedSourceIndexes=[3], source 3 was renumbered to [1] — and the
// original [1], whose document was dropped from the sources list, stayed [1].
// The answer then showed two [1] markers, and the claim that had been supported
// by document 1 silently pointed at document 3 instead. A reader checking the
// citation would find a real, current, official-looking source that says
// something else.
//
// So an unmappable marker is not repaired here. It means the generation
// contradicted itself — it cited what it did not declare — and the answer is
// downgraded to invalid_generation rather than shown with its numbering
// quietly corrected. For a product that tells people which documents their visa
// depends on, an answer we cannot vouch for is worth less than no answer.

const CITATION_MARKER = /\[(\d+)]/g;

export interface CitationAudit {
  /** Marker numbers present in the answer text, ascending, de-duplicated. */
  citedIndexes: number[];
  /** How many sources the answer will actually be shown with. */
  sourceCount: number;
  /** Cited markers with no corresponding entry in that source list. */
  invalidIndexes: number[];
  /** True when every marker resolves to a source. */
  valid: boolean;
}

/** Marker numbers found in the text, ascending and de-duplicated. */
export function citedIndexes(answer: string): number[] {
  const found = new Set<number>();
  for (const match of answer.matchAll(CITATION_MARKER)) {
    found.add(Number(match[1]));
  }
  return [...found].sort((left, right) => left - right);
}

/**
 * Checks an answer against the source list it will be rendered with.
 *
 * Deliberately takes a count rather than the sources themselves: this runs after
 * renumbering, when the only thing that matters is whether every marker falls
 * inside the list the reader will see. [0] and negative-looking markers are
 * invalid for the same reason [5] is with two sources — there is nothing there.
 */
export function auditCitations(answer: string, sourceCount: number): CitationAudit {
  const cited = citedIndexes(answer);
  const invalidIndexes = cited.filter((index) => index < 1 || index > sourceCount);
  return {
    citedIndexes: cited,
    sourceCount,
    invalidIndexes,
    valid: invalidIndexes.length === 0,
  };
}

export interface RemapResult {
  answer: string;
  /**
   * Markers the model wrote that it did not declare in usedSourceIndexes.
   *
   * Non-empty means the generation is self-contradictory, and the caller must
   * downgrade rather than render. It is returned instead of thrown because the
   * caller already has a well-defined "unavailable" response to fall back to.
   */
  unmapped: number[];
}

/**
 * Renumbers citation markers from the model's source ordering to the ordering of
 * the sources actually kept.
 *
 * `usedSourceIndexes` is the model's own declaration of what it cited, and the
 * kept sources are built from it in the same order, so position i in that array
 * becomes marker i+1.
 */
export function remapCitations(answer: string, usedSourceIndexes: number[]): RemapResult {
  const citationMap = new Map(usedSourceIndexes.map((sourceIndex, index) => [sourceIndex, index + 1]));
  const unmapped = new Set<number>();

  const remapped = answer.replace(CITATION_MARKER, (marker, rawIndex: string) => {
    const original = Number(rawIndex);
    const mapped = citationMap.get(original);
    if (!mapped) {
      // Recorded, and left alone. There is no correct number to put here, and
      // rewriting it to any of the surviving sources would attribute the claim
      // to a document that does not make it. The caller discards this answer.
      unmapped.add(original);
      return marker;
    }
    return `[${mapped}]`;
  });

  return { answer: remapped, unmapped: [...unmapped].sort((left, right) => left - right) };
}
