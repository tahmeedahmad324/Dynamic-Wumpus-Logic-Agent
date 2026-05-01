# Dynamic Wumpus Logic Agent

A **web-based AI agent** that navigates a randomised Wumpus World grid using a
**Propositional Logic Knowledge Base** and **Resolution Refutation** — entirely
in the browser with React + Vite. No backend, no external logic libraries.

---

## Live Demo

> _Add your deployed URL here (e.g. Vercel / Netlify)_

---

## Screenshots

> _Add screenshots here after running the app locally._

---

## Features

| Feature | Details |
|---------|---------|
| Configurable grid | User sets Rows × Columns (3–12) |
| Random hazards | ~15 % pits + 1 wumpus placed each new episode |
| Propositional KB | Maintains CNF clauses; updated on every cell visit |
| Resolution Refutation | Proves cell safety before each move |
| Full CNF pipeline | Biconditional → Implication → De Morgan → Distribution |
| Auto-run mode | Agent steps every 800 ms |
| Metrics dashboard | Inference steps, percepts, position, status |
| Colour-coded grid | Gray / Green / Yellow / Orange / Red cells |

---

## How to Run Locally

```bash
npm install
npm run dev
```

Then open <http://localhost:5173> in your browser.

To build for production:

```bash
npm run build
npm run preview
```

---

## Project Structure

```
src/
  logic/
    cnf.js              # CNF conversion helpers (steps 1–4)
    KnowledgeBase.js    # KB class: tell(), ask(), resolve()
    Agent.js            # Agent state, step(), navigation
  components/
    Grid.jsx            # Colour-coded grid renderer
    Controls.jsx        # Inputs, New Game, Step, Auto-Run
    MetricsDashboard.jsx
  App.jsx
  main.jsx
  App.css
```

---

## How the Resolution Refutation Engine Works

The agent uses **Resolution Refutation** to prove whether a cell is safe:

1. **Query**: "Is cell (r, c) safe?" → prove `¬P_r_c` AND `¬W_r_c`
2. **Negation**: Add the negated query (`P_r_c`) as a unit clause to a **copy** of the KB
3. **Resolution**: Iteratively pick pairs of clauses that share complementary
   literals (e.g. `P_1_2` and `¬P_1_2`), compute the **resolvent** (the clause
   with that literal removed from both), and add it to the working set
4. **Result**: If the **empty clause (⊥)** is derived, the original query is
   **entailed** → cell is proven safe. If no new clauses can be derived → not
   entailed (cell status unknown / risky)

```
KB ∧ ¬α ⊢ ⊥   ⟹   KB ⊨ α
```

---

## CNF Conversion (Four Steps)

Given a formula such as `B_0_0 ⟺ (P_1_0 ∨ P_0_1)`:

| Step | Operation | Example |
|------|-----------|---------|
| 1 | **Eliminate biconditionals** `A ⟺ B → (A ⇒ B) ∧ (B ⇒ A)` | `(B ⇒ P₁∨P₂) ∧ (P₁∨P₂ ⇒ B)` |
| 2 | **Eliminate implications** `A ⇒ B → ¬A ∨ B` | `(¬B ∨ P₁∨P₂) ∧ (¬P₁∧¬P₂ ∨ B)` (after De Morgan on left of ⇒) |
| 3 | **Push negations inward** (De Morgan's laws, double-negation) | Negations reach only literals |
| 4 | **Distribute OR over AND** `(A ∧ B) ∨ C → (A∨C) ∧ (B∨C)` | Final CNF: list of clauses |

---

## Agent Navigation Strategy

| Priority | Action |
|----------|--------|
| 1 | Move to an **adjacent unvisited cell proven safe** by KB |
| 2 | Move to any **adjacent unvisited cell** (risky, if no safe option) |
| 3 | BFS through visited cells to the **nearest safe unvisited** cell |
| 4 | BFS through visited cells to the **nearest any unvisited** cell |
| — | No moves available → declare **Won** (all non-hazard cells visited) |

---

## LinkedIn Post

> _Add your LinkedIn post link here._

---

## License

MIT
