// 纹样对照台 · 核心类型定义

/** 对称轴方向：左右对称（竖直轴）/ 上下对称（水平轴） */
export type Axis = "vertical" | "horizontal";

/** 修复师 / 纹样管理员 */
export type Role = "restorer" | "admin";

/** 工序状态：待配线（未开工）/ 配线中 / 已完成 */
export type ThreadStatus = "待配线" | "配线中" | "已完成";

/** 核对结果：对齐可配线 / 两侧对不上 / 区域压在轴上（后两者均待核对） */
export type VerifyStatus = "ok" | "mismatch" | "on_axis";

/** 色卡条目 */
export interface ColorInfo {
  /** 色号，如 A-02 */
  no: string;
  /** 色名，如 靛蓝 */
  name: string;
  /** 颜色值 */
  hex: string;
}

/** 纹样样本 */
export interface PatternSample {
  id: string;
  name: string;
  origin: string;
  axis: Axis;
  rows: number;
  cols: number;
  /** 纹样网格，存色号（no），按轴对称 */
  grid: string[][];
  updatedAt: number;
}

/** 破损区域（以网格单元为单位的圆） */
export interface DamagedArea {
  id: string;
  label: string;
  /** 圆心列（浮点，单元坐标） */
  cx: number;
  /** 圆心行（浮点，单元坐标） */
  cy: number;
  /** 半径（单元） */
  r: number;
}

/** 工序记录 */
export interface ProcessRecord {
  status: ThreadStatus;
  /** 补线色号（取自对称参考区当次色号） */
  threadColorNo: string | null;
  updatedAt: number | null;
  note: string;
}

/** 地毯档案 */
export interface Carpet {
  id: string;
  origin: string;
  era: string;
  knotDensity: string;
  material: string;
  dyeType: string;
  /** 引用的纹样样本 */
  sampleId: string;
  areas: DamagedArea[];
  /** 各破损区域的工序，key = areaId */
  processes: Record<string, ProcessRecord>;
  /** 样本/对称轴变更后需重新确认 */
  needsReconfirm: boolean;
  reconfirmReason: string | null;
  reconfirmedAt: number | null;
}

/** 单个破损区域的核对结果 */
export interface AreaVerification {
  areaId: string;
  status: VerifyStatus;
  /** 参考区单元（镜像后） */
  referenceCells: { r: number; c: number }[];
  /** 破损区单元 */
  damagedCells: { r: number; c: number }[];
  /** 参考区当次色号（取众数） */
  threadColorNo: string | null;
  message: string;
  checkedAt: number;
}

/** 全量核对结果，key = `${carpetId}::${areaId}` */
export type VerificationMap = Record<string, AreaVerification>;

/** 持久化到 localStorage 的完整状态 */
export interface PersistState {
  samples: PatternSample[];
  carpets: Carpet[];
  verifications: VerificationMap;
  role: Role;
}
