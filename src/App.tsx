import { useMemo, useState } from "react";
import { ORIGIN_FILTERS } from "./data";
import { useStore } from "./store";
import CarpetDetail from "./components/CarpetDetail";
import SampleManager from "./components/SampleManager";

type Tab = "bench" | "samples";

export default function App() {
  const { role, setRole, carpets, notice, clearNotice } = useStore();
  const [tab, setTab] = useState<Tab>("bench");
  const [origin, setOrigin] = useState<string>("全部");
  const [selectedId, setSelectedId] = useState<string>(carpets[0]?.id ?? "");

  const filtered = useMemo(
    () => (origin === "全部" ? carpets : carpets.filter((c) => c.origin === origin)),
    [carpets, origin]
  );

  const selected = carpets.find((c) => c.id === selectedId) ?? filtered[0];

  return (
    <main className="app">
      <section className="hero">
        <p>hxyfront-62009 · 纹样对照台</p>
        <h1>地毯修复纹样档案</h1>
        <span>
          每块地毯选定纹样样本与对称轴后，圈出的破损区域自动找到对称参考区，补线按参考区当次色号走；两侧对不上或区域压在轴上时先标待核对。样本与对称轴仅纹样管理员可调整，修复师越权提交将被拒绝。
        </span>
        <div className="role-switch">
          <span>当前身份</span>
          <button
            className={role === "restorer" ? "active" : ""}
            onClick={() => setRole("restorer")}
          >
            修复师
          </button>
          <button
            className={role === "admin" ? "active" : ""}
            onClick={() => setRole("admin")}
          >
            纹样管理员
          </button>
        </div>
      </section>

      {notice && (
        <div className={`notice notice-${notice.type}`} onClick={clearNotice}>
          {notice.text}
          <button className="notice-close" onClick={clearNotice}>
            ×
          </button>
        </div>
      )}

      <div className="tabs">
        <button
          className={tab === "bench" ? "active" : ""}
          onClick={() => setTab("bench")}
        >
          纹样对照台
        </button>
        <button
          className={tab === "samples" ? "active" : ""}
          onClick={() => setTab("samples")}
        >
          样本与对称轴
        </button>
      </div>

      {tab === "bench" ? (
        <section className="workspace">
          <aside className="panel">
            <h2>档案列表</h2>
            <div className="chips">
              <button
                className={origin === "全部" ? "active" : ""}
                onClick={() => setOrigin("全部")}
              >
                全部
              </button>
              {ORIGIN_FILTERS.map((o) => (
                <button
                  key={o}
                  className={origin === o ? "active" : ""}
                  onClick={() => setOrigin(o)}
                >
                  {o}
                </button>
              ))}
            </div>
            <div className="carpet-list">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  className={c.id === selected?.id ? "active" : ""}
                  onClick={() => setSelectedId(c.id)}
                >
                  <b>{c.id}</b>
                  <span>{c.origin}</span>
                  <em>
                    {c.areas.length} 处破损 ·{" "}
                    {c.needsReconfirm ? "需重新确认" : "已确认"}
                  </em>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="empty">该产地暂无档案</p>
              )}
            </div>
          </aside>

          {selected ? (
            <CarpetDetail key={selected.id} carpetId={selected.id} />
          ) : (
            <section className="panel">该产地暂无档案</section>
          )}
        </section>
      ) : (
        <SampleManager />
      )}
    </main>
  );
}
