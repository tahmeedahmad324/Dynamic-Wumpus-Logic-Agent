/**
 * CNF Conversion Utilities for Propositional Logic
 *
 * Formula node structure:
 *   { type: 'lit',     value: 'P_1_2' }           — literal (value may start with '-' for negated)
 *   { type: 'not',     operand: formula }           — negation
 *   { type: 'and',     left: formula, right: formula }
 *   { type: 'or',      left: formula, right: formula }
 *   { type: 'implies', left: formula, right: formula }
 *   { type: 'iff',     left: formula, right: formula }
 */

/** Step 1 — Eliminate biconditionals: A ⟺ B → (A ⇒ B) ∧ (B ⇒ A) */
export function eliminateBiconditionals(f) {
  switch (f.type) {
    case 'iff':
      return eliminateBiconditionals({
        type: 'and',
        left:  { type: 'implies', left: f.left,  right: f.right },
        right: { type: 'implies', left: f.right, right: f.left  },
      });
    case 'implies':
      return { type: 'implies', left: eliminateBiconditionals(f.left), right: eliminateBiconditionals(f.right) };
    case 'and':
      return { type: 'and', left: eliminateBiconditionals(f.left), right: eliminateBiconditionals(f.right) };
    case 'or':
      return { type: 'or',  left: eliminateBiconditionals(f.left), right: eliminateBiconditionals(f.right) };
    case 'not':
      return { type: 'not', operand: eliminateBiconditionals(f.operand) };
    default:
      return f; // 'lit'
  }
}

/** Step 2 — Eliminate implications: A ⇒ B → ¬A ∨ B */
export function eliminateImplications(f) {
  switch (f.type) {
    case 'implies':
      return eliminateImplications({
        type: 'or',
        left:  { type: 'not', operand: f.left },
        right: f.right,
      });
    case 'and':
      return { type: 'and', left: eliminateImplications(f.left), right: eliminateImplications(f.right) };
    case 'or':
      return { type: 'or',  left: eliminateImplications(f.left), right: eliminateImplications(f.right) };
    case 'not':
      return { type: 'not', operand: eliminateImplications(f.operand) };
    default:
      return f; // 'lit'
  }
}

/** Step 3 — Push negations inward (De Morgan's laws + double-negation elimination) */
export function pushNegationsInward(f) {
  if (f.type !== 'not') {
    switch (f.type) {
      case 'and':
        return { type: 'and', left: pushNegationsInward(f.left), right: pushNegationsInward(f.right) };
      case 'or':
        return { type: 'or',  left: pushNegationsInward(f.left), right: pushNegationsInward(f.right) };
      default:
        return f; // 'lit'
    }
  }

  // f is a 'not' node — push it inward
  const inner = f.operand;
  switch (inner.type) {
    case 'not':
      // ¬¬A → A
      return pushNegationsInward(inner.operand);
    case 'and':
      // ¬(A ∧ B) → ¬A ∨ ¬B
      return pushNegationsInward({
        type: 'or',
        left:  { type: 'not', operand: inner.left  },
        right: { type: 'not', operand: inner.right },
      });
    case 'or':
      // ¬(A ∨ B) → ¬A ∧ ¬B
      return pushNegationsInward({
        type: 'and',
        left:  { type: 'not', operand: inner.left  },
        right: { type: 'not', operand: inner.right },
      });
    case 'lit': {
      // ¬literal — flip sign
      const v = inner.value;
      return { type: 'lit', value: v.startsWith('-') ? v.slice(1) : '-' + v };
    }
    default:
      return { type: 'not', operand: pushNegationsInward(inner) };
  }
}

/** Step 4 — Distribute OR over AND: (A ∧ B) ∨ C → (A ∨ C) ∧ (B ∨ C) */
export function distributeOrOverAnd(f) {
  switch (f.type) {
    case 'and':
      return { type: 'and', left: distributeOrOverAnd(f.left), right: distributeOrOverAnd(f.right) };
    case 'or': {
      const left  = distributeOrOverAnd(f.left);
      const right = distributeOrOverAnd(f.right);
      if (left.type === 'and') {
        return distributeOrOverAnd({
          type: 'and',
          left:  { type: 'or', left: left.left,  right },
          right: { type: 'or', left: left.right, right },
        });
      }
      if (right.type === 'and') {
        return distributeOrOverAnd({
          type: 'and',
          left:  { type: 'or', left, right: right.left  },
          right: { type: 'or', left, right: right.right },
        });
      }
      return { type: 'or', left, right };
    }
    default:
      return f; // 'lit'
  }
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function extractClauseLiterals(f) {
  if (f.type === 'lit') return [f.value];
  if (f.type === 'or')  return [...extractClauseLiterals(f.left), ...extractClauseLiterals(f.right)];
  throw new Error(`Unexpected node type in CNF clause: ${f.type}`);
}

function extractAllClauses(f) {
  if (f.type === 'and') return [...extractAllClauses(f.left), ...extractAllClauses(f.right)];
  return [extractClauseLiterals(f)]; // single clause (lit or or)
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Convert a formula object to an array of CNF clauses.
 * Each clause is an array of literal strings (e.g. ["P_1_2", "-B_0_0"]).
 */
export function formulaToCNFClauses(formula) {
  let f = eliminateBiconditionals(formula);
  f = eliminateImplications(f);
  f = pushNegationsInward(f);
  f = distributeOrOverAnd(f);
  return extractAllClauses(f);
}
