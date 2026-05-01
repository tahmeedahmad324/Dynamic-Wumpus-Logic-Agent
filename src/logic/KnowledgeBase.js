import { formulaToCNFClauses } from './cnf.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function negateLiteral(lit) {
  return lit.startsWith('-') ? lit.slice(1) : '-' + lit;
}

function isTautology(clause) {
  for (const lit of clause) {
    if (clause.includes(negateLiteral(lit))) return true;
  }
  return false;
}

/**
 * Resolve two clauses on every complementary literal pair.
 * Returns an array of resolvents (each resolvent is an array of literals).
 */
function resolveTwo(c1, c2) {
  const resolvents = [];
  for (const lit of c1) {
    const comp = negateLiteral(lit);
    if (c2.includes(comp)) {
      const resolvent = [
        ...c1.filter(l => l !== lit),
        ...c2.filter(l => l !== comp),
      ];
      resolvents.push([...new Set(resolvent)]);
    }
  }
  return resolvents;
}

const MAX_RESOLUTION_STEPS  = 10000;
const MAX_TOTAL_CLAUSES     = 800;

// ─── KnowledgeBase class ─────────────────────────────────────────────────────

export class KnowledgeBase {
  constructor() {
    /** @type {string[][]} Array of CNF clauses, each clause is an array of literals */
    this.clauses = [];
  }

  /**
   * Add a CNF clause to the KB.
   * @param {string[]} clause  Array of literal strings, e.g. ["P_1_2", "-B_0_0"]
   */
  tell(clause) {
    if (!Array.isArray(clause) || clause.length === 0) return;
    const unique = [...new Set(clause)];
    if (isTautology(unique)) return;
    const key = [...unique].sort().join('|');
    const exists = this.clauses.some(c => [...c].sort().join('|') === key);
    if (!exists) {
      this.clauses.push(unique);
    }
  }

  /**
   * Ask whether queryLiteral is entailed by the KB (resolution refutation).
   * To prove queryLiteral, we add its negation to the KB and try to derive ⊥.
   *
   * @param {string} queryLiteral  E.g. "-P_1_2" to prove "no pit at (1,2)"
   * @returns {{ entailed: boolean, steps: number }}
   */
  ask(queryLiteral) {
    const negQuery = negateLiteral(queryLiteral);
    const testClauses = [...this.clauses, [negQuery]];
    const result = this.resolve(testClauses);
    return { entailed: result.contradiction, steps: result.steps };
  }

  /**
   * Convert a formula object to CNF clauses and add them all to the KB.
   * @param {object} formula
   */
  toCNF(formula) {
    const clauses = formulaToCNFClauses(formula);
    for (const c of clauses) this.tell(c);
    return clauses;
  }

  /**
   * Resolution algorithm.
   * Returns { contradiction: boolean, steps: number }.
   * A contradiction means the clause set is unsatisfiable (i.e. the query is entailed).
   *
   * @param {string[][]} initialClauses
   */
  resolve(initialClauses) {
    let steps = 0;

    // Build the working clause set, dropping tautologies and duplicates
    const seen = new Set();
    const clauseSet = [];

    for (const clause of initialClauses) {
      const unique = [...new Set(clause)];
      if (isTautology(unique)) continue;
      const key = [...unique].sort().join('|');
      if (!seen.has(key)) {
        seen.add(key);
        clauseSet.push(unique);
      }
    }

    // Iterate: resolve clause[i] with every clause[j] where j < i
    // Newly derived clauses are appended and will be resolved in later iterations.
    let i = 0;
    while (i < clauseSet.length && steps < MAX_RESOLUTION_STEPS) {
      for (let j = 0; j < i && steps < MAX_RESOLUTION_STEPS; j++) {
        const resolvents = resolveTwo(clauseSet[i], clauseSet[j]);
        steps++;

        for (const r of resolvents) {
          if (r.length === 0) {
            // Empty clause derived — contradiction found
            return { contradiction: true, steps };
          }
          if (!isTautology(r)) {
            const key = [...r].sort().join('|');
            if (!seen.has(key)) {
              seen.add(key);
              clauseSet.push(r);
              if (clauseSet.length > MAX_TOTAL_CLAUSES) {
                // Safety valve — treat as inconclusive
                return { contradiction: false, steps };
              }
            }
          }
        }
      }
      i++;
    }

    return { contradiction: false, steps };
  }
}
