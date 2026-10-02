import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import { CARPETS, PALETTE, SAMPLES, buildSeedStates } from "./data";
import { axisLabel, checkDamage, type CheckResult } from "./logic";
import { PatternCanvas } from "./PatternCanvas";
import type { CarpetState, Role, WorkState } from "./types";

const STORAGE_KEY = "hxyfront-62009-workbench-v1";
const ORIGINS = ["全部", "波斯", "安纳托利亚", "高加索", "藏毯"];

interface Persisted {
  role: Role;
  filter: string;
  selectedId: string;
  states: Record<string, CarpetState>;
}

function loadPersisted(): Persisted | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Persisted;
    if (!parsed || typeof parsed !== "object" || !parsed.states) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** 以种子数据为底，叠加上次保存的对照台状态 */
function mergeStates(persisted?: Record<string, CarpetState>): Record<string, CarpetState> {
  const seed = buildSeedStates();
  if (!persisted) return seed;
  for (const carpet of CARPETS) {
    const p = persisted[carpet.id];
    if (!p) continue;
    seed[carpet.id] = {
      sampleId: SAMPLES.some((s) => s.id === p.sampleId) ? p.sampleId : seed[carpet.id].sampleId,
      axisK: typeof p.axisK === "number" ? p.axisK : seed[carpet.id].axisK,
      needsReconfirm: Boolean(p.needsReconfirm),
      works: { ...seed[carpet.id].works, ...(p.works ?? {}) },
    };
  }
  return seed;
}

function nowText(): string {
  return new Date().toLocaleString("zh-CN", { hour12: false });
}

function App() {
  const [persisted] = useState(loadPersisted);
  const [role, setRole] = useState<Role>(persisted?.role === "admin" ? "admin" : "repairer");
  const [filter, setFilter] = useState(persisted?.filter ?? "全部");
  const [selectedId, setSelectedId] = useState(() =>
    persisted?.selectedId && CARPETS.some((c) => c.id === persisted.selectedId)
      ? persisted.selectedId
      : CARPETS[0].id
  );
  const [states, setStates] = useState<Record<string, CarpetState>>(() => mergeStates(persisted?.states));
  const [selectedDamage, setSelectedDamage] = useState<string | null>(null);
  const [pendingSample, setPendingSample] = useState<string | null>(null);
  const [pendingAxis, setPendingAxis] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ type: "ok" | "err" | "info"; text: string } | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  // 关掉页面再打开，样本、对称轴、核对结果（由二者推出）与工序进度都还在
  useEffect(() => {
    const data: Persisted = { role, filter, selectedId, states };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [role, filter, selectedId, states]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 8000);
    return () => clearTimeout(timer);
  }, [notice]);

  const addLog = (text: string) =>
    setLogs((prev) => [`${new Date().toLocaleTimeString("zh-CN", { hour12: false })}　${text}`, ...prev].slice(0, 8));

  const carpet = CARPETS.find((c) => c.id === selectedId)!;
  const state = states[selectedId];
  const sample = SAMPLES.find((s) => s.id === state.sampleId)!;
  const cols = sample.rows[0].length;

  const checks = useMemo(() => {
    const map: Record<string, CheckResult> = {};
    for (const d of carpet.damages) {
      map[d.id] = checkDamage(d, state.axisK, sample, carpet.damages);
    }
    return map;
  }, [carpet, state.axisK, sample]);

  const metrics = useMemo(() => {
    let review = 0;
    let waitThread = 0;
    let done = 0;
    let reconfirm = 0;
    for (const c of CARPETS) {
      const st = states[c.id];
      const smp = SAMPLES.find((s) => s.id === st.sampleId)!;
      for (const d of c.damages) {
        if (!checkDamage(d, st.axisK, smp, c.damages).ok) review += 1;
        const work = st.works[d.id];
        if (work?.status === "待配线") waitThread += 1;
        if (work?.status === "已完成") done += 1;
      }
      if (st.needsReconfirm) reconfirm += 1;
    }
    return { review, waitThread, done, reconfirm };
  }, [states]);

  const filteredCarpets = filter === "全部" ? CARPETS : CARPETS.filter((c) => c.origin === filter);

  const selectCarpet = (id: string) => {
    setSelectedId(id);
    setSelectedDamage(null);
    setPendingSample(null);
    setPendingAxis(null);
  };

  /** 换样本 / 改对称轴：仅纹样管理员可提交，修复师越权提交会被拒绝 */
  const submitConfig = () => {
    const nextSample = pendingSample ?? state.sampleId;
    const nextAxis = pendingAxis ?? state.axisK;
    if (nextSample === state.sampleId && nextAxis === state.axisK) {
      setPendingSample(null);
      setPendingAxis(null);
      return;
    }
    if (role !== "admin") {
      setNotice({ type: "err", text: "已拒绝：更换纹样样本或调整对称轴仅纹样管理员可操作，修复师越权提交无效。" });
      addLog(`越权拦截：修复师提交 ${carpet.id} 的样本/对称轴变更，已拒绝`);
      setPendingSample(null);
      setPendingAxis(null);
      return;
    }
    setStates((prev) => {
      const cur = prev[selectedId];
      const works: Record<string, WorkState> = {};
      for (const [did, w] of Object.entries(cur.works)) {
        // 未开工（已配线）的工序退回待配线；施工中、已完成保留原状
        works[did] = w.status === "已配线" ? { status: "待配线" } : w;
      }
      return {
        ...prev,
        [selectedId]: { ...cur, sampleId: nextSample, axisK: nextAxis, needsReconfirm: true, works },
      };
    });
    setNotice({
      type: "info",
      text: "样本/对称轴已变更：档案转入待重新确认，未开工工序退回待配线，已完成工序保留当时记录。",
    });
    addLog(`管理员变更 ${carpet.id}：样本 ${nextSample}、轴位「${axisLabel(nextAxis)}」，档案待重新确认`);
    setPendingSample(null);
    setPendingAxis(null);
  };

  const confirmArchive = () => {
    setStates((prev) => ({ ...prev, [selectedId]: { ...prev[selectedId], needsReconfirm: false } }));
    setNotice({ type: "ok", text: `${carpet.id} 档案已重新确认，可按当前样本与对称轴继续施工。` });
    addLog(`${carpet.id} 档案已重新确认`);
  };

  /** 工序推进：待配线 → 已配线 → 施工中 → 已完成（完成时留存当时记录） */
  const advanceWork = (damageId: string) => {
    const work = state.works[damageId];
    const check = checks[damageId];
    if (work.status === "待配线" && !check.ok) return;

    const next: WorkState =
      work.status === "待配线"
        ? { status: "已配线", colorCodes: check.colorCodes }
        : work.status === "已配线"
          ? { ...work, status: "施工中" }
          : work.status === "施工中"
            ? {
                status: "已完成",
                colorCodes: work.colorCodes,
                record: {
                  colorCodes: work.colorCodes ?? [],
                  sampleId: state.sampleId,
                  axisK: state.axisK,
                  finishedAt: nowText(),
                },
              }
            : work;
    if (next === work) return;

    setStates((prev) => ({
      ...prev,
      [selectedId]: { ...prev[selectedId], works: { ...prev[selectedId].works, [damageId]: next } },
    }));
    const label = carpet.damages.find((d) => d.id === damageId)?.label ?? damageId;
    if (next.status === "已配线") addLog(`${carpet.id}「${label}」按参考区配线：${next.colorCodes?.join("、")}`);
    if (next.status === "施工中") addLog(`${carpet.id}「${label}」开工补线`);
    if (next.status === "已完成") addLog(`${carpet.id}「${label}」完成，已留存当时记录`);
  };

  const configDirty =
    (pendingSample !== null && pendingSample !== state.sampleId) ||
    (pendingAxis !== null && pendingAxis !== state.axisK);
  const shownSample = pendingSample ?? state.sampleId;
  const shownAxis = pendingAxis ?? state.axisK;
  const selectedRefs = selectedDamage ? checks[selectedDamage].refs : [];

  return (
    <main className="app">
      <header className="hero">
        <div className="hero-top">
          <div>
            <p>hxyfront-62009 · 手工地毯修复</p>
            <h1>纹样对照台</h1>
            <span>
              选定纹样样本与对称轴后，圈出的破损区域自动找到对称参考区，补线按参考区当次色号走；
              两侧对不上或区域压在轴上时先标待核对。
            </span>
          </div>
          <div className="role-box">
            <small>当前身份</small>
            <div className="role-switch">
              <button className={role === "admin" ? "on" : ""} onClick={() => setRole("admin")}>
                纹样管理员
              </button>
              <button className={role === "repairer" ? "on" : ""} onClick={() => setRole("repairer")}>
                修复师
              </button>
            </div>
            <em>{role === "admin" ? "可更换样本、调整对称轴" : "可执行配线/补线工序；样本与对称轴变更将被拒绝"}</em>
          </div>
        </div>
      </header>

      {notice && (
        <div className={`notice ${notice.type}`} onClick={() => setNotice(null)}>
          {notice.text}
          <span className="notice-close">点击关闭</span>
        </div>
      )}

      <section className="metrics">
        <article><small>待核对区域</small><strong>{metrics.review}</strong></article>
        <article><small>待配线工序</small><strong>{metrics.waitThread}</strong></article>
        <article><small>已完成工序</small><strong>{metrics.done}</strong></article>
        <article><small>待重新确认档案</small><strong>{metrics.reconfirm}</strong></article>
      </section>

      <div className="layout">
        <aside className="panel side">
          <h2>档案列表</h2>
          <div className="chips">
            {ORIGINS.map((o) => (
              <button key={o} className={filter === o ? "on" : ""} onClick={() => setFilter(o)}>
                {o}
              </button>
            ))}
          </div>
          <div className="archive-list">
            {filteredCarpets.map((c) => {
              const st = states[c.id];
              const smp = SAMPLES.find((s) => s.id === st.sampleId)!;
              const reviewCount = c.damages.filter((d) => !checkDamage(d, st.axisK, smp, c.damages).ok).length;
              return (
                <button
                  key={c.id}
                  className={`archive-item ${c.id === selectedId ? "on" : ""}`}
                  onClick={() => selectCarpet(c.id)}
                >
                  <b>{c.id}</b>
                  <span>{c.origin} · {c.era} · {c.damages.length} 处破损</span>
                  <i>
                    {st.needsReconfirm && <em className="tag warn">待重新确认</em>}
                    {reviewCount > 0 && <em className="tag review">待核对 {reviewCount}</em>}
                  </i>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="panel workbench">
          <div className="archive-head">
            <div>
              <p>当前档案</p>
              <h2>
                {carpet.id}
                {state.needsReconfirm && <em className="tag warn">待重新确认</em>}
              </h2>
            </div>
            <dl className="meta">
              <div><dt>产地</dt><dd>{carpet.origin}</dd></div>
              <div><dt>年代</dt><dd>{carpet.era}</dd></div>
              <div><dt>结密度</dt><dd>{carpet.knotDensity}</dd></div>
              <div><dt>材质</dt><dd>{carpet.material}</dd></div>
              <div><dt>染色类型</dt><dd>{carpet.dyeType}</dd></div>
            </dl>
          </div>

          {state.needsReconfirm && (
            <div className="banner">
              <span>样本或对称轴已变更，本档案需重新确认：未开工工序已退回待配线，已完成工序保留当时记录。</span>
              <button className="primary" onClick={confirmArchive}>核对无误，确认档案</button>
            </div>
          )}

          <div className="admin-bar">
            <label>
              <span>纹样样本</span>
              <select value={shownSample} onChange={(e) => setPendingSample(e.target.value)}>
                {SAMPLES.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}（{s.desc}）</option>
                ))}
              </select>
            </label>
            <label className="axis-control">
              <span>对称轴：{axisLabel(shownAxis)}</span>
              <input
                type="range"
                min={1}
                max={2 * cols - 1}
                step={1}
                value={shownAxis}
                onChange={(e) => setPendingAxis(Number(e.target.value))}
              />
            </label>
            <div className="admin-actions">
              <button className="primary" disabled={!configDirty} onClick={submitConfig}>提交变更</button>
              {role !== "admin" && <em className="lock">仅纹样管理员可提交，越权将被拒绝</em>}
            </div>
          </div>

          <div className="bench">
            <div className="canvas-wrap">
              <PatternCanvas
                sample={sample}
                axisK={state.axisK}
                damages={carpet.damages}
                selectedId={selectedDamage}
                refs={selectedRefs}
                onSelect={setSelectedDamage}
              />
              <ul className="legend">
                <li><i className="sw damage" />破损区（红框，点击选中）</li>
                <li><i className="sw ref" />对称参考区（绿框）</li>
                <li><i className="sw axis" />对称轴（红虚线）</li>
              </ul>
            </div>

            <div className="damage-panel">
              <h3>破损区域与工序</h3>
              {carpet.damages.map((d, i) => {
                const check = checks[d.id];
                const work = state.works[d.id];
                return (
                  <article
                    key={d.id}
                    className={`damage-card ${selectedDamage === d.id ? "on" : ""}`}
                    onClick={() => setSelectedDamage(d.id)}
                  >
                    <header>
                      <b>#{i + 1} {d.label}</b>
                      {check.ok ? <em className="tag ok">可配线</em> : <em className="tag review">待核对</em>}
                    </header>
                    <p className="cells">{d.cells.length} 格 · 行 {d.cells.map(([r]) => r + 1).join("/")}，列 {d.cells.map(([, c]) => c + 1).join("/")}</p>
                    {check.ok ? (
                      <p className="ref-line">
                        参考区当次色号：
                        {check.colorCodes.map((code) => (
                          <span key={code} className="code-chip">
                            <i style={{ background: PALETTE[code].hex }} />
                            {code}·{PALETTE[code].name}
                          </span>
                        ))}
                      </p>
                    ) : (
                      <p className="warn-line">⚠ {check.reason}</p>
                    )}
                    <div className="work-row" onClick={(e) => e.stopPropagation()}>
                      <em className={`tag st-${work.status}`}>工序：{work.status}</em>
                      {work.status === "待配线" && (
                        <button
                          disabled={!check.ok}
                          title={check.ok ? "按参考区当次色号配线" : "待核对区域暂不能配线"}
                          onClick={() => advanceWork(d.id)}
                        >
                          按参考区配线
                        </button>
                      )}
                      {work.status === "已配线" && (
                        <>
                          <span className="work-codes">已配 {work.colorCodes?.join("、")}</span>
                          <button onClick={() => advanceWork(d.id)}>开工补线</button>
                        </>
                      )}
                      {work.status === "施工中" && (
                        <>
                          <span className="work-codes">沿用 {work.colorCodes?.join("、")}</span>
                          <button onClick={() => advanceWork(d.id)}>完成补线</button>
                        </>
                      )}
                    </div>
                    {work.status === "已完成" && work.record && (
                      <div className="record">
                        当时记录：色号 {work.record.colorCodes.join("、")} ｜ 样本{" "}
                        {SAMPLES.find((s) => s.id === work.record!.sampleId)?.name ?? work.record.sampleId} ｜ 轴位「
                        {axisLabel(work.record.axisK)}」｜ {work.record.finishedAt}
                        {(work.record.sampleId !== state.sampleId || work.record.axisK !== state.axisK) && (
                          <em>（档案配置此后有变更，以上为当时留存）</em>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>

          <div className="below">
            <section className="palette-panel">
              <h3>材料色卡</h3>
              <div className="palette-grid">
                {Object.entries(PALETTE).map(([code, p]) => (
                  <span key={code} className="code-chip lg">
                    <i style={{ background: p.hex }} />
                    {code}·{p.name}
                  </span>
                ))}
              </div>
            </section>
            <section className="log-panel">
              <h3>操作记录</h3>
              {logs.length === 0 ? (
                <p className="empty">暂无操作。变更样本/对称轴、推进工序、确认档案都会记在这里。</p>
              ) : (
                <ul>{logs.map((l, i) => <li key={i}>{l}</li>)}</ul>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

export default App;
