// Phase 2 — Stream 2D: Index coverage test.
//
// Static analysis: every `ctx.db.query(...).withIndex(...)` call in the
// `convex/` directory must reference an index name that's declared on
// the corresponding table in `convex/schema.ts`. The test parses the
// schema and the function files (excluding _generated/), extracts all
// `withIndex("name", ...)` calls, and asserts each one is declared.
//
// This is the "no unindexed queries" guard from the Phase 2 plan.

import { expect, test } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const CONVEX_DIR = join(__dirname, "..", "..", "convex");
const SCHEMA_PATH = join(CONVEX_DIR, "schema.ts");

function readFile(path: string): string {
  return readFileSync(path, "utf-8");
}

function listTsFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === "_generated" || entry === "_tests" || entry === "_lib") {
        continue;
      }
      listTsFiles(full, acc);
    } else if (entry.endsWith(".ts")) {
      acc.push(full);
    }
  }
  return acc;
}

/** Extracts every `tableName: defineTable({...}).index("a").index("b")`
 *  chain from schema.ts and returns the table name + the names of every
 *  `.index("name", ...)` call chained on it. */
function parseSchemaIndexNames(): Map<string, Set<string>> {
  const source = readFile(SCHEMA_PATH);
  const result = new Map<string, Set<string>>();

  // Match: `tableName: defineTable({...stuff...})[.index("name", ...)]+`
  // The body inside `{...}` may contain nested `{}` (e.g., in object-typed
  // fields with literal unions), so we use a balanced-brace scan instead
  // of a regex for the body.
  const tableStart = /(\w+):\s*defineTable\(\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = tableStart.exec(source)) !== null) {
    const tableName = m[1];
    // Scan from the opening `{` to find its matching `}`.
    let depth = 1;
    let i = m.index + m[0].length;
    while (i < source.length && depth > 0) {
      const ch = source[i];
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
      i++;
    }
    // i is now just past the matching `}`. Capture up to the next `,` or `;`
    // that terminates the table chain at the schema's top level (heuristic:
    // we capture the next ~600 chars and let the index regex find them).
    const tail = source.slice(i, i + 800);
    const indexNames = new Set<string>();
    const indexRegex = /\.index\(\s*["'](\w+)["']/g;
    let im: RegExpExecArray | null;
    while ((im = indexRegex.exec(tail)) !== null) {
      indexNames.add(im[1]);
    }
    result.set(tableName, indexNames);
  }
  return result;
}

/** Extracts every `ctx.db.query("tableName").withIndex("indexName", ...)`
 *  call from a TypeScript file. Also catches variations like
 *  `ctx.db.query("tableName" as "issues")` by stripping the "as ..." part.
 *
 *  Whitespace (including newlines) is allowed between `ctx.db` and `.query`
 *  because Convex code commonly splits the chain across lines.
 */
function parseUsedIndexes(source: string): Array<{ table: string; index: string }> {
  const out: Array<{ table: string; index: string }> = [];
  // Match: ctx.db ... .query("table") ... .withIndex("index", ...)
  // We split into two regexes for clarity.
  const queryRegex =
    /ctx\s*\.\s*db\s*\.\s*query\s*\(\s*["']([\w]+)["'](?:\s+as\s+[^\)]+)?\s*\)/g;
  const indexRegex = /\.withIndex\s*\(\s*["'](\w+)["']/g;

  const queryMatches: Array<{ idx: number; table: string }> = [];
  let qm: RegExpExecArray | null;
  while ((qm = queryRegex.exec(source)) !== null) {
    queryMatches.push({ idx: qm.index, table: qm[1] });
  }
  const indexMatches: Array<{ idx: number; index: string }> = [];
  let im: RegExpExecArray | null;
  while ((im = indexRegex.exec(source)) !== null) {
    indexMatches.push({ idx: im.index, index: im[1] });
  }
  // Pair: for each .withIndex, find the closest preceding .query in the same statement.
  for (const idx of indexMatches) {
    const preceding = queryMatches
      .filter((q) => q.idx < idx.idx)
      .sort((a, b) => b.idx - a.idx)[0];
    if (preceding) {
      out.push({ table: preceding.table, index: idx.index });
    }
  }
  return out;
}

test("every .withIndex() call in convex/ has a matching .index() declaration in schema.ts", () => {
  const declared = parseSchemaIndexNames();
  const tsFiles = listTsFiles(CONVEX_DIR);
  const violations: string[] = [];

  for (const file of tsFiles) {
    const source = readFile(file);
    const used = parseUsedIndexes(source);
    for (const { table, index } of used) {
      const indexesForTable = declared.get(table);
      if (!indexesForTable) {
        violations.push(
          `${file.replace(CONVEX_DIR, "convex")}: table "${table}" not in schema.ts`,
        );
        continue;
      }
      if (!indexesForTable.has(index)) {
        violations.push(
          `${file.replace(CONVEX_DIR, "convex")}: index "${index}" not declared on table "${table}"`,
        );
      }
    }
  }

  if (violations.length > 0) {
    throw new Error(
      `Found ${violations.length} unindexed query violation(s):\n  ${violations.join("\n  ")}`,
    );
  }

  // Sanity: the test exercises at least 1 index (catches the case where
  // the regex is broken and reports zero violations on a broken setup).
  const totalUsed = tsFiles.reduce(
    (acc, f) => acc + parseUsedIndexes(readFile(f)).length,
    0,
  );
  expect(totalUsed).toBeGreaterThan(0);
});
