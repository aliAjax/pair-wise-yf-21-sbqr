import type {
  AreaVerification,
  Axis,
  DamagedArea,
  PatternSample,
} from "./types";

/** 圆内包含的网格单元（单元中心在圆内） */
export function cellsInCircle(
  cx: number,
  cy: number,
  r: number,
  rows: number,
  cols: number
): { r: number; c: number }[] {
  const out: { r: number; c: number }[] = [];
  for (let rr = 0; rr < rows; rr++) {
    for (let cc = 0; cc < cols; cc++) {
      const dx = cc + 0.5 - cx;
      const dy = rr + 0.5 - cy;
      if (dx * dx + dy * dy <= r * r) out.push({ r: rr, c: cc });
    }
  }
  return out;
}

/** 某单元关于对称轴的镜像单元 */
export function mirrorCell(
  cell: { r: number; c: number },
  axis: Axis,
  rows: number,
  cols: number
): { r: number; c: number } {
  if (axis === "vertical") return { r: cell.r, c: cols - 1 - cell.c };
  return { r: rows - 1 - cell.r, c: cell.c };
}

/** 圆心到对称轴的距离 */
function distanceToAxis(
  cx: number,
  cy: number,
  axis: Axis,
  rows: number,
  cols: number
): number {
  if (axis === "vertical") return Math.abs(cx - cols / 2);
  return Math.abs(cy - rows / 2);
}

function cellInArea(cell: { r: number; c: number }, area: DamagedArea): boolean {
  const dx = cell.c + 0.5 - area.cx;
  const dy = cell.r + 0.5 - area.cy;
  return dx * dx + dy * dy <= area.r * area.r;
}

/** 众数色号（参考区当次色号取出现最多者） */
function modalColorNo(
  cells: { r: number; c: number }[],
  grid: string[][]
): string | null {
  const counts = new Map<string, number>();
  for (const cell of cells) {
    const no = grid[cell.r]?.[cell.c];
    if (no) counts.set(no, (counts.get(no) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestN = 0;
  for (const [no, n] of counts) {
    if (n > bestN) {
      best = no;
      bestN = n;
    }
  }
  return best;
}

export const STATUS_LABEL: Record<AreaVerification["status"], string> = {
  ok: "对齐 · 可配线",
  mismatch: "待核对 · 两侧对不上",
  on_axis: "待核对 · 区域压在轴上",
};

/**
 * 核对单个破损区域：
 * 1. 区域压在对称轴上 → on_axis
 * 2. 对称参考区落在另一处破损区（两侧均破损，无完整参考）→ mismatch
 * 3. 参考区与破损区色号不一致 → mismatch
 * 4. 否则对齐，补线色号取参考区当次色号（众数）
 */
export function verifyArea(
  area: DamagedArea,
  sample: PatternSample,
  allAreas: DamagedArea[],
  now = Date.now()
): AreaVerification {
  const { rows, cols, axis, grid } = sample;
  const damagedCells = cellsInCircle(area.cx, area.cy, area.r, rows, cols);

  // 1. 区域压在轴上
  if (distanceToAxis(area.cx, area.cy, axis, rows, cols) < area.r) {
    return {
      areaId: area.id,
      status: "on_axis",
      referenceCells: [],
      damagedCells,
      threadColorNo: null,
      message: "破损区域压在对称轴上，无法取对称参考区，待核对。",
      checkedAt: now,
    };
  }

  const referenceCells = damagedCells.map((cell) =>
    mirrorCell(cell, axis, rows, cols)
  );

  // 2. 参考区落在另一处破损区
  const overlapsOtherDamage = referenceCells.some((cell) =>
    allAreas.some(
      (other) => other.id !== area.id && cellInArea(cell, other)
    )
  );
  if (overlapsOtherDamage) {
    return {
      areaId: area.id,
      status: "mismatch",
      referenceCells,
      damagedCells,
      threadColorNo: null,
      message: "对称参考区本身也破损，两侧对不上，待核对。",
      checkedAt: now,
    };
  }

  // 3. 参考区与破损区色号不一致
  const colorMismatch = damagedCells.some((cell, i) => {
    const ref = referenceCells[i];
    return grid[cell.r]?.[cell.c] !== grid[ref.r]?.[ref.c];
  });
  if (colorMismatch) {
    return {
      areaId: area.id,
      status: "mismatch",
      referenceCells,
      damagedCells,
      threadColorNo: null,
      message: "破损区与参考区色号不一致，两侧对不上，待核对。",
      checkedAt: now,
    };
  }

  // 4. 对齐 → 补线色号取参考区当次色号
  const threadColorNo = modalColorNo(referenceCells, grid);
  return {
    areaId: area.id,
    status: "ok",
    referenceCells,
    damagedCells,
    threadColorNo,
    message: "已对齐，补线按参考区当次色号走。",
    checkedAt: now,
  };
}

/** 核对一块地毯的全部破损区域 */
export function verifyCarpet(
  areas: DamagedArea[],
  sample: PatternSample,
  now = Date.now()
): AreaVerification[] {
  return areas.map((area) => verifyArea(area, sample, areas, now));
}
