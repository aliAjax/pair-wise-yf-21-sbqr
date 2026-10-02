import type { DamageRegion, PatternSample } from "./types";

export interface CellRef {
  row: number;
  col: number;
}

export interface CheckResult {
  ok: boolean;
  onAxis: boolean;
  reason?: string;
  /** 对称参考区格子（可配线时完整，否则可能为空/部分） */
  refs: CellRef[];
  /** 参考区当次色号（去重，保持出现顺序） */
  colorCodes: string[];
}

/** 轴心穿过的列（0 起）；轴落在列边界上时返回 null */
export function axisColumn(axisK: number): number | null {
  return axisK % 2 === 1 ? (axisK - 1) / 2 : null;
}

/** 列 c 关于轴 axisK 的镜像列 */
export function mirrorCol(col: number, axisK: number): number {
  return axisK - 1 - col;
}

/** 轴位的人话描述（列号从 1 计） */
export function axisLabel(axisK: number): string {
  return axisK % 2 === 0
    ? `第 ${axisK / 2} 列与第 ${axisK / 2 + 1} 列之间`
    : `穿过第 ${(axisK + 1) / 2} 列正中`;
}

/**
 * 核对破损区域：
 * - 区域压在对称轴上 → 待核对
 * - 镜像参考区超出图幅或与破损区重叠（两侧对不上）→ 待核对
 * - 否则可配线，补线色号取参考区当次色号
 */
export function checkDamage(
  damage: DamageRegion,
  axisK: number,
  sample: PatternSample,
  damages: DamageRegion[]
): CheckResult {
  const cols = sample.rows[0].length;
  const axCol = axisColumn(axisK);

  if (axCol !== null && damage.cells.some(([, c]) => c === axCol)) {
    return {
      ok: false,
      onAxis: true,
      reason: "破损区域压在对称轴上，无法取对称参考，需人工核对",
      refs: [],
      colorCodes: [],
    };
  }

  const damaged = new Set<string>();
  for (const d of damages) {
    for (const [r, c] of d.cells) damaged.add(`${r},${c}`);
  }

  const refs: CellRef[] = [];
  for (const [r, c] of damage.cells) {
    const mc = mirrorCol(c, axisK);
    if (mc < 0 || mc >= cols) {
      return { ok: false, onAxis: false, reason: "对称参考区超出图幅，两侧对不上，需人工核对", refs, colorCodes: [] };
    }
    if (damaged.has(`${r},${mc}`)) {
      return { ok: false, onAxis: false, reason: "对称参考区与破损区重叠，两侧对不上，需人工核对", refs, colorCodes: [] };
    }
    refs.push({ row: r, col: mc });
  }

  const colorCodes: string[] = [];
  for (const { row, col } of refs) {
    const code = sample.rows[row][col];
    if (!colorCodes.includes(code)) colorCodes.push(code);
  }
  return { ok: true, onAxis: false, refs, colorCodes };
}
