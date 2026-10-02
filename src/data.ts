import type { CarpetMeta, CarpetState } from "./types";

/** 材料色卡：色号 → 名称 / 线色 / 格内文字色 */
export const PALETTE: Record<string, { name: string; hex: string; text: string }> = {
  R: { name: "深红", hex: "#7c2d12", text: "#ffffff" },
  B: { name: "靛蓝", hex: "#1e3a8a", text: "#ffffff" },
  G: { name: "松石绿", hex: "#0f766e", text: "#ffffff" },
  Y: { name: "土黄", hex: "#c08a2d", text: "#2b1c07" },
  N: { name: "米白", hex: "#e9dfc9", text: "#5b4a2f" },
  W: { name: "褐棕", hex: "#8a5a33", text: "#ffffff" },
};

export const SAMPLES = [
  {
    id: "S1",
    name: "中心花奖章",
    desc: "波斯风格 · 9×7 · 中轴对称",
    rows: [
      "NNNRRRNNN",
      "NNRBBBRNN",
      "NRBGYGBRN",
      "RRBYYYBRR",
      "NRBGYGBRN",
      "NNRBBBRNN",
      "NNNRRRNNN",
    ],
  },
  {
    id: "S2",
    name: "几何回纹",
    desc: "安纳托利亚风格 · 9×7",
    rows: [
      "GGGGGGGGG",
      "GNNNNNNNG",
      "GNYYBYYNG",
      "GNYBRBYNG",
      "GNYYBYYNG",
      "GNNNNNNNG",
      "GGGGGGGGG",
    ],
  },
  {
    id: "S3",
    name: "藏毯云纹",
    desc: "藏毯风格 · 9×7",
    rows: [
      "BBBBBBBBB",
      "BNNNNNNNB",
      "BNYYWYYNB",
      "BNYWWWYNB",
      "BNYYWYYNB",
      "BNNNNNNNB",
      "BBBBBBBBB",
    ],
  },
];

export const CARPETS: CarpetMeta[] = [
  {
    id: "CAR-092",
    origin: "波斯",
    era: "约1960s",
    knotDensity: "38 结/英寸",
    material: "羊毛",
    dyeType: "植物染",
    damages: [
      { id: "d1", label: "左上边缘磨损", cells: [[0, 1], [0, 2], [1, 1]] },
      { id: "d2", label: "中心缺口", cells: [[3, 4]] },
      { id: "d3", label: "右侧褪色区", cells: [[2, 6], [3, 6]] },
    ],
  },
  {
    id: "CAR-117",
    origin: "安纳托利亚",
    era: "约1950s",
    knotDensity: "42 结/英寸",
    material: "羊毛",
    dyeType: "植物染",
    damages: [
      { id: "d1", label: "中心纹样缺口", cells: [[3, 4]] },
      { id: "d2", label: "左下角破损", cells: [[5, 1], [5, 2]] },
      { id: "d3", label: "右边缘裂口", cells: [[2, 8], [3, 8]] },
    ],
  },
  {
    id: "CAR-138",
    origin: "藏毯",
    era: "约1970s",
    knotDensity: "36 结/英寸",
    material: "羊毛",
    dyeType: "矿物染",
    damages: [
      { id: "d1", label: "左上部褪色", cells: [[1, 1], [1, 2]] },
      { id: "d2", label: "左上云纹缺损", cells: [[2, 2]] },
      { id: "d3", label: "右上云纹缺损", cells: [[2, 6]] },
      { id: "d4", label: "底部边缘磨损", cells: [[6, 2], [6, 3]] },
    ],
  },
  {
    id: "CAR-155",
    origin: "高加索",
    era: "约1940s",
    knotDensity: "40 结/英寸",
    material: "毛棉混纺",
    dyeType: "植物染",
    damages: [
      { id: "d1", label: "左上边缘磨损", cells: [[0, 0], [0, 1]] },
      { id: "d2", label: "压轴裂口", cells: [[2, 3], [3, 3]] },
      { id: "d3", label: "右下缺口", cells: [[6, 7]] },
      { id: "d4", label: "中部磨损", cells: [[4, 1], [4, 2]] },
    ],
  },
];

/** 各档案的初始对照台状态（样本、对称轴、工序进度） */
export function buildSeedStates(): Record<string, CarpetState> {
  return {
    "CAR-092": {
      sampleId: "S1",
      axisK: 9,
      needsReconfirm: false,
      works: {
        d1: { status: "已配线", colorCodes: ["N"] },
        d2: { status: "待配线" },
        d3: {
          status: "已完成",
          colorCodes: ["B"],
          record: { colorCodes: ["B"], sampleId: "S1", axisK: 9, finishedAt: "2026-09-28 14:20" },
        },
      },
    },
    "CAR-117": {
      sampleId: "S2",
      axisK: 9,
      needsReconfirm: false,
      works: {
        d1: { status: "待配线" },
        d2: { status: "已配线", colorCodes: ["N"] },
        d3: { status: "待配线" },
      },
    },
    "CAR-138": {
      sampleId: "S3",
      axisK: 9,
      needsReconfirm: false,
      works: {
        d1: { status: "已配线", colorCodes: ["N"] },
        d2: { status: "待配线" },
        d3: { status: "待配线" },
        d4: { status: "待配线" },
      },
    },
    "CAR-155": {
      sampleId: "S1",
      axisK: 7,
      needsReconfirm: false,
      works: {
        d1: { status: "待配线" },
        d2: { status: "待配线" },
        d3: { status: "待配线" },
        d4: { status: "待配线" },
      },
    },
  };
}
