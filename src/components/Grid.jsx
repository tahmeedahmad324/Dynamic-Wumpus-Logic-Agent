import React from 'react';
import { CELL_UNKNOWN, CELL_VISITED, CELL_SAFE, CELL_CURRENT, CELL_HAZARD } from '../logic/Agent.js';

const CELL_COLORS = {
  [CELL_UNKNOWN]: '#9ca3af',  // gray-400
  [CELL_VISITED]: '#fbbf24',  // amber-400  (yellow)
  [CELL_SAFE]:    '#4ade80',  // green-400
  [CELL_CURRENT]: '#f97316',  // orange-500
  [CELL_HAZARD]:  '#ef4444',  // red-500
};

const CELL_LABELS = {
  [CELL_UNKNOWN]: '',
  [CELL_VISITED]: '',
  [CELL_SAFE]:    '✓',
  [CELL_CURRENT]: '🤖',
  [CELL_HAZARD]:  '☠',
};

export default function Grid({ grid, rows, cols, position }) {
  if (!grid || grid.length === 0) return null;

  const cellSize = Math.max(40, Math.min(72, Math.floor(560 / Math.max(rows, cols))));
  const fontSize = Math.max(12, Math.floor(cellSize * 0.45));

  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          borderCollapse: 'collapse',
          margin: '0 auto',
          tableLayout: 'fixed',
        }}
      >
        <tbody>
          {grid.map((row, r) => (
            <tr key={r}>
              {row.map((cellState, c) => {
                const isCurrent = position.r === r && position.c === c;
                const state = isCurrent ? CELL_CURRENT : cellState;
                const bg    = CELL_COLORS[state] ?? CELL_COLORS[CELL_UNKNOWN];
                const label = CELL_LABELS[state] ?? '';

                return (
                  <td
                    key={c}
                    title={`(${r}, ${c})`}
                    style={{
                      width:           cellSize,
                      height:          cellSize,
                      minWidth:        cellSize,
                      backgroundColor: bg,
                      border:          '2px solid #1f2937',
                      textAlign:       'center',
                      verticalAlign:   'middle',
                      fontSize:        fontSize,
                      fontWeight:      'bold',
                      color:           '#1f2937',
                      cursor:          'default',
                      userSelect:      'none',
                      transition:      'background-color 0.3s ease',
                      borderRadius:    4,
                    }}
                  >
                    {label}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legend */}
      <div
        style={{
          display:        'flex',
          flexWrap:       'wrap',
          gap:            '10px',
          justifyContent: 'center',
          marginTop:      16,
        }}
      >
        {[
          { color: CELL_COLORS[CELL_UNKNOWN], label: 'Unknown' },
          { color: CELL_COLORS[CELL_SAFE],    label: 'Proven Safe' },
          { color: CELL_COLORS[CELL_VISITED], label: 'Visited' },
          { color: CELL_COLORS[CELL_CURRENT], label: 'Agent' },
          { color: CELL_COLORS[CELL_HAZARD],  label: 'Pit / Wumpus' },
        ].map(({ color, label }) => (
          <span
            key={label}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <span
              style={{
                display:         'inline-block',
                width:           18,
                height:          18,
                backgroundColor: color,
                border:          '1px solid #374151',
                borderRadius:    3,
              }}
            />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
