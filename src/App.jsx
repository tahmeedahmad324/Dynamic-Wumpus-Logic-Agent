import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Agent } from './logic/Agent.js';
import Grid             from './components/Grid.jsx';
import Controls         from './components/Controls.jsx';
import MetricsDashboard from './components/MetricsDashboard.jsx';
import './App.css';

export default function App() {
  const [rows, setRows] = useState(5);
  const [cols, setCols] = useState(5);
  const [autoRun, setAutoRun]       = useState(false);
  const [displayState, setDisplay]  = useState(null);

  const agentRef = useRef(null);

  // Snapshot helper — must be called after every mutation to agentRef
  const snapshot = useCallback(() => {
    setDisplay(agentRef.current.getState());
  }, []);

  // ── Initialise on mount ────────────────────────────────────────────────────
  useEffect(() => {
    agentRef.current = new Agent(rows, cols);
    snapshot();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── New game ───────────────────────────────────────────────────────────────
  const handleNewGame = useCallback(() => {
    setAutoRun(false);
    agentRef.current = new Agent(rows, cols);
    snapshot();
  }, [rows, cols, snapshot]);

  // ── Single step ────────────────────────────────────────────────────────────
  const handleStep = useCallback(() => {
    if (!agentRef.current || agentRef.current.status !== 'exploring') return;
    agentRef.current.step();
    snapshot();
  }, [snapshot]);

  // ── Auto-run ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!autoRun) return;
    const id = setInterval(() => {
      if (!agentRef.current || agentRef.current.status !== 'exploring') {
        setAutoRun(false);
        return;
      }
      agentRef.current.step();
      setDisplay(agentRef.current.getState());
    }, 800);
    return () => clearInterval(id);
  }, [autoRun]);

  const gameOver = displayState && displayState.status !== 'exploring';

  return (
    <div className="app-root">
      {/* Header */}
      <header className="app-header">
        <h1>🧠 Dynamic Wumpus Logic Agent</h1>
        <p>Propositional KB · Resolution Refutation · CNF Inference</p>
      </header>

      <div className="app-body">
        {/* Left sidebar */}
        <aside className="sidebar">
          <Controls
            rows={rows}
            cols={cols}
            onRowsChange={setRows}
            onColsChange={setCols}
            onNewGame={handleNewGame}
            onStep={handleStep}
            autoRun={autoRun}
            onAutoRunToggle={() => setAutoRun(v => !v)}
            disabled={gameOver}
          />
          <MetricsDashboard state={displayState} />
        </aside>

        {/* Grid */}
        <main className="grid-area">
          {displayState ? (
            <Grid
              grid={displayState.grid}
              rows={displayState.rows}
              cols={displayState.cols}
              position={displayState.position}
            />
          ) : (
            <p style={{ color: '#94a3b8' }}>Initialising…</p>
          )}
        </main>
      </div>
    </div>
  );
}
