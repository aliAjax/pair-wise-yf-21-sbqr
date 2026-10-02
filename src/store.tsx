import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { buildCarpets, buildSamples } from "./data";
import type {
  AreaVerification,
  Axis,
  Carpet,
  PatternSample,
  PersistState,
  Role,
  ThreadStatus,
  VerificationMap,
} from "./types";
import { verifyCarpet } from "./verification";

const STORAGE_KEY = "carpet-pattern-bench-v1";

interface Notice {
  type: "error" | "success" | "info";
  text: string;
}

interface Store {
  role: Role;
  setRole: (r: Role) => void;
  samples: PatternSample[];
  carpets: Carpet[];
  verifications: VerificationMap;
  notice: Notice | null;
  clearNotice: () => void;
  // 纹样管理员操作
  updateSample: (sample: PatternSample) => void;
  assignCarpetSample: (carpetId: string, sampleId: string) => void;
  // 修复师操作
  updateProcess: (
    carpetId: string,
    areaId: string,
    patch: { status?: ThreadStatus; note?: string }
  ) => void;
  reverifyArea: (carpetId: string, areaId: string) => void;
  reverifyCarpet: (carpetId: string) => void;
  reconfirmCarpet: (carpetId: string) => void;
}

const StoreContext = createContext<Store | null>(null);

function loadState(): PersistState {
  const fallback: PersistState = {
    samples: buildSamples(),
    carpets: buildCarpets(),
    verifications: {},
    role: "restorer",
  };
  let state: PersistState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      state = fallback;
    } else {
      const parsed = JSON.parse(raw) as Partial<PersistState>;
      state = {
        samples: parsed.samples ?? fallback.samples,
        carpets: parsed.carpets ?? fallback.carpets,
        verifications: parsed.verifications ?? fallback.verifications,
        role: parsed.role ?? fallback.role,
      };
    }
  } catch {
    state = fallback;
  }
  // 首次使用（无核对结果）时，按当前样本自动核对全部档案
  if (Object.keys(state.verifications).length === 0) {
    const verifications: VerificationMap = {};
    for (const carpet of state.carpets) {
      const sample = state.samples.find((s) => s.id === carpet.sampleId);
      if (!sample) continue;
      for (const result of verifyCarpet(carpet.areas, sample)) {
        verifications[verifyKey(carpet.id, result.areaId)] = result;
      }
    }
    state = { ...state, verifications };
  }
  return state;
}

function verifyKey(carpetId: string, areaId: string) {
  return `${carpetId}::${areaId}`;
}

/** 样本/对称轴变更后：引用它的档案需重新确认；未开工工序退回待配线，已完成保留当时记录 */
function applySampleChange(
  carpets: Carpet[],
  verifications: VerificationMap,
  sampleId: string,
  reason: string
): { carpets: Carpet[]; verifications: VerificationMap } {
  const affected = new Set(
    carpets.filter((c) => c.sampleId === sampleId).map((c) => c.id)
  );
  const nextCarpets = carpets.map((c) => {
    if (!affected.has(c.id)) return c;
    const processes = { ...c.processes };
    for (const area of c.areas) {
      const p = processes[area.id];
      if (p && p.status !== "已完成") {
        processes[area.id] = { ...p, status: "待配线", threadColorNo: null };
      }
    }
    return {
      ...c,
      needsReconfirm: true,
      reconfirmReason: reason,
      processes,
    };
  });
  // 仅清除受影响档案的核对结果（其余保留），重新确认时再重算
  const nextVerifications: VerificationMap = {};
  for (const [key, value] of Object.entries(verifications)) {
    const carpetId = key.split("::")[0];
    if (!affected.has(carpetId)) nextVerifications[key] = value;
  }
  return { carpets: nextCarpets, verifications: nextVerifications };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistState>(() => loadState());
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // 存储失败时忽略
    }
  }, [state]);

  const clearNotice = useCallback(() => setNotice(null), []);

  const setRole = useCallback((r: Role) => {
    setState((s) => ({ ...s, role: r }));
    setNotice({
      type: "info",
      text: r === "admin" ? "已切换为纹样管理员" : "已切换为修复师",
    });
  }, []);

  const updateSample = useCallback(
    (sample: PatternSample) => {
      setState((s) => {
        if (s.role !== "admin") {
          setNotice({
            type: "error",
            text: "越权操作已拒绝：仅纹样管理员可更换样本或调整对称轴。",
          });
          return s;
        }
        const prev = s.samples.find((x) => x.id === sample.id);
        const axisChanged = prev && prev.axis !== sample.axis;
        const reason = axisChanged
          ? "对称轴已变更，档案需重新确认"
          : "纹样样本已更新，档案需重新确认";
        const { carpets, verifications } = applySampleChange(
          s.carpets,
          s.verifications,
          sample.id,
          reason
        );
        setNotice({
          type: "success",
          text: `样本 ${sample.id} 已保存，引用它的档案已标记重新确认。`,
        });
        return {
          ...s,
          samples: s.samples.map((x) => (x.id === sample.id ? sample : x)),
          carpets,
          verifications,
        };
      });
    },
    []
  );

  const assignCarpetSample = useCallback(
    (carpetId: string, sampleId: string) => {
      setState((s) => {
        if (s.role !== "admin") {
          setNotice({
            type: "error",
            text: "越权操作已拒绝：仅纹样管理员可更换样本或调整对称轴。",
          });
          return s;
        }
        const target = s.samples.find((x) => x.id === sampleId);
        const carpets = s.carpets.map((c) => {
          if (c.id !== carpetId) return c;
          const processes = { ...c.processes };
          for (const area of c.areas) {
            const p = processes[area.id];
            if (p && p.status !== "已完成") {
              processes[area.id] = { ...p, status: "待配线", threadColorNo: null };
            }
          }
          return {
            ...c,
            sampleId,
            needsReconfirm: true,
            reconfirmReason: `已更换样本为 ${target?.name ?? sampleId}，档案需重新确认`,
            processes,
          };
        });
        // 清除该档案的旧核对结果
        const verifications: VerificationMap = {};
        for (const [key, value] of Object.entries(s.verifications)) {
          if (!key.startsWith(`${carpetId}::`)) verifications[key] = value;
        }
        setNotice({
          type: "success",
          text: `档案 ${carpetId} 已更换样本，需重新确认。`,
        });
        return { ...s, carpets, verifications };
      });
    },
    []
  );

  const updateProcess = useCallback(
    (
      carpetId: string,
      areaId: string,
      patch: { status?: ThreadStatus; note?: string }
    ) => {
      setState((s) => {
        const carpets = s.carpets.map((c) => {
          if (c.id !== carpetId) return c;
          const prev = c.processes[areaId];
          if (!prev) return c;
          return {
            ...c,
            processes: {
              ...c.processes,
              [areaId]: {
                ...prev,
                status: patch.status ?? prev.status,
                note: patch.note ?? prev.note,
                updatedAt: Date.now(),
              },
            },
          };
        });
        return { ...s, carpets };
      });
    },
    []
  );

  const reverifyArea = useCallback((carpetId: string, areaId: string) => {
    setState((s) => {
      const carpet = s.carpets.find((c) => c.id === carpetId);
      const sample = s.samples.find((x) => x.id === carpet?.sampleId);
      if (!carpet || !sample) return s;
      const area = carpet.areas.find((a) => a.id === areaId);
      if (!area) return s;
      const [result] = verifyCarpet([area], sample);
      return {
        ...s,
        verifications: {
          ...s.verifications,
          [verifyKey(carpetId, areaId)]: result,
        },
      };
    });
  }, []);

  const reverifyCarpet = useCallback((carpetId: string) => {
    setState((s) => {
      const carpet = s.carpets.find((c) => c.id === carpetId);
      const sample = s.samples.find((x) => x.id === carpet?.sampleId);
      if (!carpet || !sample) return s;
      const results = verifyCarpet(carpet.areas, sample);
      const verifications = { ...s.verifications };
      results.forEach((r) => {
        verifications[verifyKey(carpetId, r.areaId)] = r;
      });
      return { ...s, verifications };
    });
  }, []);

  const reconfirmCarpet = useCallback((carpetId: string) => {
    setState((s) => {
      const carpet = s.carpets.find((c) => c.id === carpetId);
      const sample = s.samples.find((x) => x.id === carpet?.sampleId);
      if (!carpet || !sample) return s;
      const results = verifyCarpet(carpet.areas, sample);
      const verifications = { ...s.verifications };
      results.forEach((r) => {
        verifications[verifyKey(carpetId, r.areaId)] = r;
      });
      const carpets = s.carpets.map((c) =>
        c.id === carpetId
          ? {
              ...c,
              needsReconfirm: false,
              reconfirmReason: null,
              reconfirmedAt: Date.now(),
            }
          : c
      );
      setNotice({
        type: "success",
        text: `档案 ${carpetId} 已重新确认，核对结果已更新。`,
      });
      return { ...s, carpets, verifications };
    });
  }, []);

  const value = useMemo<Store>(
    () => ({
      role: state.role,
      setRole,
      samples: state.samples,
      carpets: state.carpets,
      verifications: state.verifications,
      notice,
      clearNotice,
      updateSample,
      assignCarpetSample,
      updateProcess,
      reverifyArea,
      reverifyCarpet,
      reconfirmCarpet,
    }),
    [
      state,
      notice,
      setRole,
      clearNotice,
      updateSample,
      assignCarpetSample,
      updateProcess,
      reverifyArea,
      reverifyCarpet,
      reconfirmCarpet,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore 必须在 StoreProvider 内使用");
  return ctx;
}

export { verifyKey };
export type { Axis };
