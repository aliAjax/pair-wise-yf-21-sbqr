import { useMemo, useState } from "react";
import { COLOR_MAP } from "../data";
import { useStore, verifyKey } from "../store";
import type { ThreadStatus } from "../types";
import PatternGrid from "./PatternGrid";

const FLOW: ThreadStatus[] = ["待配线", "配线中", "已完成"];

export default function CarpetDetail({ carpetId }: { carpetId: string }) {
  const {
    carpets,
    samples,
    verifications,
    role,
    assignCarpetSample,
    updateProcess,
    reverifyArea,
    reverifyCarpet,
    reconfirmCarpet,
  } = useStore();
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);

  const carpet = carpets.find((c) => c.id === carpetId);
  const sample = samples.find((s) => s.id === carpet?.sampleId);

  const areaVerifications = useMemo(() => {
    if (!carpet) return {};
    const map: Record<string, (typeof verifications)[string]> = {};
    for (const area of carpet.areas) {
      const v = verifications[verifyKey(carpet.id, area.id)];
      if (v) map[area.id] = v;
    }
    return map;
  }, [carpet, verifications]);

  if (!carpet || !sample) {
    return <section className="panel">未选择档案</section>;
  }

  const axisLabel = sample.axis === "vertical" ? "左右对称（竖直轴）" : "上下对称（水平轴）";
  const doneCount = carpet.areas.filter(
    (a) => carpet.processes[a.id]?.status === "已完成"
  ).length;

  return (
    <section className="panel detail-panel">
      <div className="heading">
        <div>
          <p>纹样对照台</p>
          <h2>
            {carpet.id} · {carpet.origin}
          </h2>
        </div>
        <div className="detail-head-actions">
          <span className="axis-badge">对称轴：{axisLabel}</span>
          <button onClick={() => reverifyCarpet(carpet.id)}>全部重新核对</button>
        </div>
      </div>

      <div className="carpet-meta">
        <span>年代：{carpet.era}</span>
        <span>结密度：{carpet.knotDensity}</span>
        <span>材质：{carpet.material}</span>
        <span>染色：{carpet.dyeType}</span>
        <span>
          工序进度：{doneCount}/{carpet.areas.length}
        </span>
      </div>

      <div className="sample-row">
        <label>
          <span>纹样样本</span>
          <select
            value={sample.id}
            disabled={role !== "admin"}
            onChange={(e) => {
              if (role !== "admin") return;
              assignCarpetSample(carpet.id, e.target.value);
            }}
          >
            {samples.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} · {s.name}（{s.origin}）
              </option>
            ))}
          </select>
        </label>
        {role !== "admin" && (
          <p className="denied-note">
            更换样本仅纹样管理员可操作；修复师越权提交会被拒绝。
          </p>
        )}
      </div>

      {carpet.needsReconfirm && (
        <div className="reconfirm-banner">
          <div>
            <b>档案需重新确认</b>
            <span>{carpet.reconfirmReason ?? "样本或对称轴已变更"}。</span>
            <span className="stale-note">
              原核对结果保留但已标记过期；未开工工序已退回待配线，已完成工序保留当时记录。
            </span>
          </div>
          <button className="primary" onClick={() => reconfirmCarpet(carpet.id)}>
            重新确认
          </button>
        </div>
      )}

      <div className="bench-grid">
        <PatternGrid
          sample={sample}
          carpet={carpet}
          verifications={areaVerifications}
          selectedAreaId={selectedAreaId}
          onSelectArea={setSelectedAreaId}
        />
        <div className="legend">
          <p className="legend-title">图例</p>
          <p><i className="dot dot-damage" />破损区（红圈）</p>
          <p><i className="dot dot-ref" />对称参考区（绿圈）</p>
          <p><i className="dot dot-axis" />对称轴（虚线）</p>
          <p className="legend-hint">点击区域可定位核对</p>
        </div>
      </div>

      <div className="area-list">
        {carpet.areas.map((area) => {
          const v = areaVerifications[area.id];
          const proc = carpet.processes[area.id];
          const color = v?.threadColorNo ? COLOR_MAP[v.threadColorNo] : null;
          const isSel = selectedAreaId === area.id;
          const statusClass =
            v?.status === "ok"
              ? "ok"
              : v?.status === "on_axis"
                ? "on-axis"
                : v?.status === "mismatch"
                  ? "mismatch"
                  : "pending";
          return (
            <article
              key={area.id}
              className={`area-card ${isSel ? "selected" : ""}`}
              onClick={() => setSelectedAreaId(area.id)}
            >
              <header>
                <b className="area-tag">{area.id}</b>
                <h3>{area.label}</h3>
                <span className={`verify-badge ${statusClass}`}>
                  {v
                    ? v.status === "ok"
                      ? "对齐 · 可配线"
                      : v.status === "on_axis"
                        ? "待核对 · 压在轴上"
                        : "待核对 · 对不上"
                    : "未核对"}
                </span>
              </header>

              <p className="area-msg">{v?.message ?? "尚未核对，点击「核对」生成对称参考区。"}</p>

              <div className="thread-row">
                <span className="thread-label">补线色号（参考区当次）</span>
                {color ? (
                  <span className="swatch">
                    <i style={{ background: color.hex }} />
                    {color.no} · {color.name}
                  </span>
                ) : (
                  <span className="swatch empty">待核对后确定</span>
                )}
              </div>

              <div className="proc-row">
                <span className={`proc-status ${proc.status}`}>{proc.status}</span>
                <div className="proc-actions">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      reverifyArea(carpet.id, area.id);
                    }}
                  >
                    {v ? "重新核对" : "核对"}
                  </button>
                  {proc.status === "待配线" && (
                    <button
                      className="primary"
                      disabled={v?.status !== "ok"}
                      title={v?.status !== "ok" ? "待核对，暂不能配线" : ""}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateProcess(carpet.id, area.id, { status: "配线中" });
                      }}
                    >
                      开始配线
                    </button>
                  )}
                  {proc.status === "配线中" && (
                    <button
                      className="primary"
                      disabled={v?.status !== "ok"}
                      title={v?.status !== "ok" ? "待核对，暂不能完成" : ""}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateProcess(carpet.id, area.id, { status: "已完成" });
                      }}
                    >
                      完成配线
                    </button>
                  )}
                  {proc.status === "已完成" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateProcess(carpet.id, area.id, { status: "配线中" });
                      }}
                    >
                      回退工序
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
