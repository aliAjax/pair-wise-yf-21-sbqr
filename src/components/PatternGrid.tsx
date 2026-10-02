import { COLOR_MAP } from "../data";
import type { AreaVerification, Carpet, PatternSample } from "../types";

const CELL = 30;

interface Props {
  sample: PatternSample;
  carpet: Carpet;
  verifications: Record<string, AreaVerification>;
  selectedAreaId: string | null;
  onSelectArea: (id: string) => void;
}

function mirrorCircle(
  cx: number,
  cy: number,
  axis: "vertical" | "horizontal",
  rows: number,
  cols: number
): { cx: number; cy: number } {
  if (axis === "vertical") return { cx: cols - cx, cy };
  return { cx, cy: rows - cy };
}

export default function PatternGrid({
  sample,
  carpet,
  verifications,
  selectedAreaId,
  onSelectArea,
}: Props) {
  const { rows, cols, axis, grid } = sample;
  const w = cols * CELL;
  const h = rows * CELL;

  const axisX = axis === "vertical" ? (cols / 2) * CELL : null;
  const axisY = axis === "horizontal" ? (rows / 2) * CELL : null;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="pattern-grid"
      role="img"
      aria-label={`${sample.name}纹样对照图`}
    >
      {/* 网格单元 */}
      {grid.map((row, r) =>
        row.map((no, c) => {
          const color = COLOR_MAP[no]?.hex ?? "#eee";
          return (
            <rect
              key={`${r}-${c}`}
              x={c * CELL}
              y={r * CELL}
              width={CELL}
              height={CELL}
              fill={color}
              stroke="rgba(0,0,0,0.08)"
              strokeWidth={1}
            />
          );
        })
      )}

      {/* 参考区单元高亮 */}
      {carpet.areas.map((area) => {
        const v = verifications[area.id];
        if (!v || v.status !== "ok") return null;
        return v.referenceCells.map((cell) => (
          <rect
            key={`ref-${area.id}-${cell.r}-${cell.c}`}
            x={cell.c * CELL + 2}
            y={cell.r * CELL + 2}
            width={CELL - 4}
            height={CELL - 4}
            fill="none"
            stroke="#0f766e"
            strokeWidth={2}
            rx={3}
          />
        ));
      })}

      {/* 对称轴 */}
      {axisX !== null && (
        <line
          x1={axisX}
          y1={0}
          x2={axisX}
          y2={h}
          stroke="#7c2d12"
          strokeWidth={2}
          strokeDasharray="6 4"
        />
      )}
      {axisY !== null && (
        <line
          x1={0}
          y1={axisY}
          x2={w}
          y2={axisY}
          stroke="#7c2d12"
          strokeWidth={2}
          strokeDasharray="6 4"
        />
      )}

      {/* 参考区圆 */}
      {carpet.areas.map((area) => {
        const v = verifications[area.id];
        if (!v || v.status !== "ok") return null;
        const m = mirrorCircle(area.cx, area.cy, axis, rows, cols);
        return (
          <circle
            key={`refc-${area.id}`}
            cx={m.cx * CELL}
            cy={m.cy * CELL}
            r={area.r * CELL}
            fill="rgba(15,118,110,0.10)"
            stroke="#0f766e"
            strokeWidth={2}
            strokeDasharray="5 4"
          />
        );
      })}

      {/* 破损区圆 + 标签 */}
      {carpet.areas.map((area) => {
        const v = verifications[area.id];
        const isSel = selectedAreaId === area.id;
        const stroke =
          v?.status === "ok"
            ? "#0f766e"
            : v?.status === "on_axis"
              ? "#b45309"
              : v?.status === "mismatch"
                ? "#b91c1c"
                : "#7c2d12";
        return (
          <g
            key={area.id}
            onClick={() => onSelectArea(area.id)}
            style={{ cursor: "pointer" }}
          >
            <circle
              cx={area.cx * CELL}
              cy={area.cy * CELL}
              r={area.r * CELL}
              fill={isSel ? "rgba(124,45,18,0.18)" : "rgba(124,45,18,0.10)"}
              stroke={stroke}
              strokeWidth={isSel ? 3 : 2}
            />
            <text
              x={area.cx * CELL}
              y={area.cy * CELL + 4}
              textAnchor="middle"
              fontSize={13}
              fontWeight={700}
              fill="#fff"
              stroke="#000"
              strokeWidth={3}
              paintOrder="stroke"
            >
              {area.id}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
