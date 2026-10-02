import type { Axis, Carpet, ColorInfo, PatternSample } from "./types";

/** 材料色卡（色号 → 色名 / 色值） */
export const COLORS: ColorInfo[] = [
  { no: "A-01", name: "茜红", hex: "#9e2b25" },
  { no: "A-02", name: "靛蓝", hex: "#2b4c7e" },
  { no: "A-03", name: "藤黄", hex: "#d4a017" },
  { no: "A-04", name: "松绿", hex: "#2f6b4f" },
  { no: "A-05", name: "象牙白", hex: "#ece2cb" },
  { no: "A-06", name: "赭石", hex: "#8a5a2b" },
  { no: "A-07", name: "墨褐", hex: "#3b2f2a" },
  { no: "A-08", name: "月白", hex: "#dfe7e6" },
];

export const COLOR_MAP: Record<string, ColorInfo> = Object.fromEntries(
  COLORS.map((c) => [c.no, c])
);

/** 纹样草稿用的单字符 → 色号 */
const KEY_TO_NO: Record<string, string> = {
  R: "A-01",
  B: "A-02",
  Y: "A-03",
  G: "A-04",
  ".": "A-05",
  O: "A-06",
  K: "A-07",
  W: "A-08",
};

function expandGrid(grid: string[][]): string[][] {
  return grid.map((row) => row.map((ch) => KEY_TO_NO[ch] ?? "A-05"));
}

/** 竖直轴：左右镜像。half 为左半（含中轴列），镜像时去掉中轴列再翻转 */
function mirrorVertical(half: string[][]): string[][] {
  return half.map((row) => [...row, ...row.slice(0, -1).reverse()]);
}

/** 水平轴：上下镜像。top 为上半（含中轴行） */
function mirrorHorizontal(top: string[][]): string[][] {
  return [...top, ...top.slice(0, -1).reverse()];
}

/* ---------------- 纹样草稿（只画一半，再镜像） ---------------- */

/** SMP-01 波斯连珠纹 · 竖直轴（15 列 × 11 行） */
function persianHalf(): string[][] {
  const rows = 11;
  const halfCols = 8; // 中轴在第 8 列（下标 7）
  const out: string[][] = [];
  for (let r = 0; r < rows; r++) {
    const line: string[] = [];
    for (let c = 0; c < halfCols; c++) {
      let ch = "R"; // 茜红地
      if (r === 0 || r === rows - 1 || c === 0) ch = "K"; // 墨褐边框
      else if (r === 1 || r === rows - 2 || c === 1) ch = "O"; // 赭石内缘
      else {
        const centerRow = Math.floor(rows / 2);
        const centerCol = halfCols - 1;
        const d = Math.abs(r - centerRow) + Math.abs(c - centerCol);
        if (d === 0) ch = "B"; // 靛蓝心
        else if (d <= 2) ch = "Y"; // 藤黄团花
        else if (d === 3) ch = "B";
        else if (c <= 3 && (r === 2 || r === rows - 3)) ch = "G"; // 松绿角隅
      }
      line.push(ch);
    }
    out.push(line);
  }
  return out;
}

/** SMP-02 安纳托利亚几何纹 · 水平轴（15 列 × 11 行） */
function anatolianHalf(): string[][] {
  const rows = 11;
  const cols = 15;
  const halfRows = 6; // 中轴在第 6 行（下标 5）
  const out: string[][] = [];
  for (let r = 0; r < halfRows; r++) {
    const line: string[] = [];
    for (let c = 0; c < cols; c++) {
      let ch = "R"; // 茜红地
      if (r === 0 || c === 0 || c === cols - 1) ch = "K"; // 墨褐边框
      else if (r === 1 || c === 1 || c === cols - 2) ch = "O"; // 赭石内缘
      else {
        const centerRow = Math.floor(rows / 2);
        const centerCol = Math.floor(cols / 2);
        const d = Math.abs(r - centerRow) + Math.abs(c - centerCol);
        if (d === 0) ch = "Y";
        else if (d <= 2) ch = "B";
        else if (d === 3) ch = "Y";
        else if (r === 3 && (c === 4 || c === cols - 5)) ch = "G";
      }
      line.push(ch);
    }
    out.push(line);
  }
  return out;
}

/** SMP-03 藏毯云纹 · 竖直轴（15 列 × 11 行） */
function tibetanHalf(): string[][] {
  const rows = 11;
  const halfCols = 8;
  const out: string[][] = [];
  for (let r = 0; r < rows; r++) {
    const line: string[] = [];
    for (let c = 0; c < halfCols; c++) {
      let ch = "B"; // 靛蓝地
      if (r === 0 || r === rows - 1 || c === 0) ch = "K";
      else if (r === 1 || r === rows - 2 || c === 1) ch = "O";
      else {
        const centerRow = Math.floor(rows / 2);
        const centerCol = halfCols - 1;
        const d = Math.abs(r - centerRow) + Math.abs(c - centerCol);
        if (d === 0) ch = "Y";
        else if (d <= 2) ch = "G";
        else if (d === 3) ch = "Y";
        else if ((r === 3 || r === rows - 4) && (c === 3 || c === 4)) ch = "W"; // 月白云纹
      }
      line.push(ch);
    }
    out.push(line);
  }
  return out;
}

function makeSample(
  id: string,
  name: string,
  origin: string,
  axis: Axis,
  half: string[][]
): PatternSample {
  const grid = axis === "vertical" ? mirrorVertical(half) : mirrorHorizontal(half);
  return {
    id,
    name,
    origin,
    axis,
    rows: grid.length,
    cols: grid[0].length,
    grid: expandGrid(grid),
    updatedAt: Date.now(),
  };
}

export function buildSamples(): PatternSample[] {
  return [
    makeSample("SMP-01", "波斯连珠纹", "波斯", "vertical", persianHalf()),
    makeSample("SMP-02", "安纳托利亚几何纹", "安纳托利亚", "horizontal", anatolianHalf()),
    makeSample("SMP-03", "藏毯云纹", "藏毯", "vertical", tibetanHalf()),
  ];
}

/* ---------------- 地毯档案 ---------------- */

function proc(status: Carpet["processes"][string]["status"], color: string | null, note = "") {
  return { status, threadColorNo: color, updatedAt: null, note };
}

export function buildCarpets(): Carpet[] {
  return [
    {
      id: "CAR-092",
      origin: "波斯",
      era: "约1960s",
      knotDensity: "42 结/cm²",
      material: "羊毛",
      dyeType: "植物染",
      sampleId: "SMP-01",
      areas: [
        { id: "D1", label: "中轴边缘磨损", cx: 7.5, cy: 3.5, r: 1.5 },
        { id: "D2", label: "右侧团花缺口", cx: 3.5, cy: 5.5, r: 1.4 },
      ],
      processes: {
        D1: proc("待配线", null, "压在对称轴上，待核对"),
        D2: proc("已完成", "A-01", "参考区茜红，已补线"),
      },
      needsReconfirm: false,
      reconfirmReason: null,
      reconfirmedAt: null,
    },
    {
      id: "CAR-117",
      origin: "安纳托利亚",
      era: "约1950s",
      knotDensity: "36 结/cm²",
      material: "羊毛",
      dyeType: "植物染",
      sampleId: "SMP-02",
      areas: [
        { id: "D1", label: "上方边廓破损", cx: 5.5, cy: 2.5, r: 1.4 },
        { id: "D2", label: "下方对应破损", cx: 5.5, cy: 8.5, r: 1.4 },
        { id: "D3", label: "右侧几何纹褪色", cx: 10.5, cy: 3.5, r: 1.2 },
      ],
      processes: {
        D1: proc("配线中", null, "两侧均破损，待核对"),
        D2: proc("待配线", null, "待核对"),
        D3: proc("已完成", "A-02", "参考区靛蓝，已补线"),
      },
      needsReconfirm: false,
      reconfirmReason: null,
      reconfirmedAt: null,
    },
    {
      id: "CAR-138",
      origin: "藏毯",
      era: "约1970s",
      knotDensity: "48 结/cm²",
      material: "羊毛",
      dyeType: "植物染",
      sampleId: "SMP-03",
      areas: [
        { id: "D1", label: "左侧云纹褪色", cx: 3.5, cy: 6.5, r: 1.3 },
        { id: "D2", label: "中轴局部磨损", cx: 7.5, cy: 4.5, r: 1.4 },
        { id: "D3", label: "右上角云纹缺口", cx: 11.5, cy: 2.5, r: 1.2 },
      ],
      processes: {
        D1: proc("已完成", "A-02", "参考区靛蓝，已补线"),
        D2: proc("待配线", null, "压在轴上，待核对"),
        D3: proc("配线中", "A-02", "参考区靛蓝"),
      },
      needsReconfirm: false,
      reconfirmReason: null,
      reconfirmedAt: null,
    },
  ];
}

/** 按产地筛选档案用的产地列表 */
export const ORIGIN_FILTERS = ["波斯", "安纳托利亚", "藏毯"];
