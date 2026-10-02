import { useState } from "react";
import { useStore } from "../store";
import type { Axis, PatternSample } from "../types";
import PatternGrid from "./PatternGrid";

/** 把样本网格包成一个虚拟地毯，供 PatternGrid 预览 */
function previewCarpet(sample: PatternSample) {
  return {
    id: "preview",
    origin: sample.origin,
    era: "",
    knotDensity: "",
    material: "",
    dyeType: "",
    sampleId: sample.id,
    areas: [],
    processes: {},
    needsReconfirm: false,
    reconfirmReason: null,
    reconfirmedAt: null,
  };
}

export default function SampleManager() {
  const { samples, role, updateSample } = useStore();
  const [editingId, setEditingId] = useState<string>(samples[0]?.id ?? "");
  const [draftAxis, setDraftAxis] = useState<Axis | null>(null);

  const editing = samples.find((s) => s.id === editingId) ?? null;
  const axis = draftAxis ?? editing?.axis ?? "vertical";

  const startEdit = (s: PatternSample) => {
    setEditingId(s.id);
    setDraftAxis(s.axis);
  };

  const save = () => {
    if (!editing || !draftAxis) return;
    updateSample({ ...editing, axis: draftAxis, updatedAt: Date.now() });
    setDraftAxis(null);
  };

  const axisLabel = (a: Axis) => (a === "vertical" ? "左右对称（竖直轴）" : "上下对称（水平轴）");

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>纹样管理员</p>
          <h2>样本与对称轴</h2>
        </div>
        {role !== "admin" && (
          <span className="role-hint">仅纹样管理员可更换样本、调整对称轴</span>
        )}
      </div>

      <div className="sample-list">
        {samples.map((s) => (
          <button
            key={s.id}
            className={s.id === editingId ? "active" : ""}
            onClick={() => startEdit(s)}
          >
            <b>{s.id}</b>
            <span>{s.name}</span>
            <em>{axisLabel(s.axis)}</em>
          </button>
        ))}
      </div>

      {editing && (
        <div className="sample-edit">
          <div className="sample-edit-head">
            <div>
              <h3>{editing.name}</h3>
              <p>
                {editing.id} · {editing.origin} · {editing.cols}×{editing.rows} 格
              </p>
            </div>
            <div className="axis-switch">
              <span>对称轴</span>
              <label>
                <input
                  type="radio"
                  name="axis"
                  checked={axis === "vertical"}
                  onChange={() => setDraftAxis("vertical")}
                  disabled={role !== "admin"}
                />
                左右对称
              </label>
              <label>
                <input
                  type="radio"
                  name="axis"
                  checked={axis === "horizontal"}
                  onChange={() => setDraftAxis("horizontal")}
                  disabled={role !== "admin"}
                />
                上下对称
              </label>
              <button
                className="primary"
                onClick={save}
                disabled={role !== "admin" || !draftAxis || draftAxis === editing.axis}
              >
                保存对称轴
              </button>
            </div>
          </div>
          <div className="sample-preview">
            <PatternGrid
              sample={editing}
              carpet={previewCarpet(editing)}
              verifications={{}}
              selectedAreaId={null}
              onSelectArea={() => {}}
            />
          </div>
          {role !== "admin" && (
            <p className="denied-note">
              修复师账号无权修改样本或对称轴；越权提交会被拒绝。
            </p>
          )}
        </div>
      )}
    </section>
  );
}
