import { PALETTE } from "./data";
import type { CellRef } from "./logic";
import type { DamageRegion, PatternSample } from "./types";

interface Props {
  sample: PatternSample;
  axisK: number;
  damages: DamageRegion[];
  selectedId: string | null;
  refs: CellRef[];
  onSelect: (damageId: string) => void;
}

const CELL = 38;
const PAD_L = 10;
const PAD_T = 26;
const PAD_R = 10;
const PAD_B = 10;

/** 纹样局部标记图：样本网格 + 对称轴 + 破损区/参考区标注 */
export function PatternCanvas({ sample, axisK, damages, selectedId, refs, onSelect }: Props) {
  const rows = sample.rows.length;
  const cols = sample.rows[0].length;
  const width = PAD_L + cols * CELL + PAD_R;
  const height = PAD_T + rows * CELL + PAD_B;
  const axisX = PAD_L + (axisK / 2) * CELL;

  const damageIndexAt = (r: number, c: number) =>
    damages.findIndex((d) => d.cells.some(([rr, cc]) => rr === r && cc === c));

  const refSet = new Set(refs.map(({ row, col }) => `${row},${col}`));
  const labelX = Math.max(34, Math.min(width - 34, axisX));

  return (
    <svg
      className="canvas"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="纹样局部标记图"
    >
      {/* 列号 */}
      {Array.from({ length: cols }, (_, c) => (
        <text
          key={`col-${c}`}
          x={PAD_L + c * CELL + CELL / 2}
          y={PAD_T - 8}
          textAnchor="middle"
          className="col-label"
        >
          {c + 1}
        </text>
      ))}

      {/* 纹样格 */}
      {sample.rows.map((row, r) =>
        row.split("").map((code, c) => {
          const palette = PALETTE[code];
          const di = damageIndexAt(r, c);
          return (
            <g
              key={`${r}-${c}`}
              onClick={di >= 0 ? () => onSelect(damages[di].id) : undefined}
              style={di >= 0 ? { cursor: "pointer" } : undefined}
            >
              <rect
                x={PAD_L + c * CELL + 0.5}
                y={PAD_T + r * CELL + 0.5}
                width={CELL - 1}
                height={CELL - 1}
                rx={3}
                fill={palette?.hex ?? "#cccccc"}
              />
              <text
                x={PAD_L + c * CELL + CELL / 2}
                y={PAD_T + r * CELL + CELL / 2 + 4}
                textAnchor="middle"
                className="cell-code"
                fill={palette?.text ?? "#333333"}
              >
                {code}
              </text>
            </g>
          );
        })
      )}

      {/* 对称参考区（选中破损区的镜像） */}
      {refs.map(({ row, col }) => (
        <rect
          key={`ref-${row}-${col}`}
          x={PAD_L + col * CELL + 2.5}
          y={PAD_T + row * CELL + 2.5}
          width={CELL - 5}
          height={CELL - 5}
          rx={4}
          className="ref-cell"
        />
      ))}

      {/* 破损区标注 */}
      {damages.map((d, i) => {
        const selected = d.id === selectedId;
        return (
          <g key={d.id} onClick={() => onSelect(d.id)} style={{ cursor: "pointer" }}>
            {d.cells.map(([r, c]) => (
              <rect
                key={`${r}-${c}`}
                x={PAD_L + c * CELL + 2.5}
                y={PAD_T + r * CELL + 2.5}
                width={CELL - 5}
                height={CELL - 5}
                rx={4}
                className={selected ? "damage-cell selected" : "damage-cell"}
              />
            ))}
            {/* 区域序号钉在首格左上角 */}
            <circle
              cx={PAD_L + d.cells[0][1] * CELL + 8}
              cy={PAD_T + d.cells[0][0] * CELL + 8}
              r={8}
              className={selected ? "damage-pin selected" : "damage-pin"}
            />
            <text
              x={PAD_L + d.cells[0][1] * CELL + 8}
              y={PAD_T + d.cells[0][0] * CELL + 11.5}
              textAnchor="middle"
              className="damage-pin-text"
            >
              {i + 1}
            </text>
          </g>
        );
      })}

      {/* 对称轴 */}
      <line
        x1={axisX}
        y1={PAD_T - 4}
        x2={axisX}
        y2={height - PAD_B + 2}
        className="axis-line"
      />
      <text x={labelX} y={12} textAnchor="middle" className="axis-label">
        对称轴
      </text>

      {/* 选中参考区提示：避免 lint 报 refSet 未使用，同时给参考区加角标 */}
      {[...refSet].map((key) => {
        const [r, c] = key.split(",").map(Number);
        return (
          <text
            key={`ref-tag-${key}`}
            x={PAD_L + c * CELL + CELL - 6}
            y={PAD_T + r * CELL + 11}
            textAnchor="middle"
            className="ref-tag"
          >
            参
          </text>
        );
      })}
    </svg>
  );
}
