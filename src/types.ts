/** 纹样样本：rows 为色号字符组成的网格，每行等长 */
export interface PatternSample {
  id: string;
  name: string;
  desc: string;
  rows: string[];
}

/** 破损区域：cells 为 [行, 列]（从 0 计） */
export interface DamageRegion {
  id: string;
  label: string;
  cells: [number, number][];
}

/** 档案静态信息（不随对照台操作变化） */
export interface CarpetMeta {
  id: string;
  origin: string;
  era: string;
  knotDensity: string;
  material: string;
  dyeType: string;
  damages: DamageRegion[];
}

export type WorkStatus = "待配线" | "已配线" | "施工中" | "已完成";

/** 已完成工序的当时记录：档案配置再改也不回写 */
export interface WorkRecord {
  colorCodes: string[];
  sampleId: string;
  axisK: number;
  finishedAt: string;
}

export interface WorkState {
  status: WorkStatus;
  /** 当次配线色号（已配线 / 施工中 / 已完成时存在） */
  colorCodes?: string[];
  record?: WorkRecord;
}

/** 每块地毯在对照台上的可变状态（会被持久化） */
export interface CarpetState {
  sampleId: string;
  /** 对称轴位置，以半格为单位：轴心 x = axisK / 2（格） */
  axisK: number;
  needsReconfirm: boolean;
  works: Record<string, WorkState>;
}

export type Role = "admin" | "repairer";
