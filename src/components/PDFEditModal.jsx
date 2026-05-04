import { useState } from 'react';
import { X, Plus, Trash2, FileDown, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

export function PDFEditModal({ auditData, url, onClose, onGenerate, isGenerating }) {
  const [draft, setDraft] = useState(JSON.parse(JSON.stringify(auditData)));
  const [openSection, setOpenSection] = useState('summary');

  const toggle = (id) => setOpenSection(openSection === id ? null : id);

  const setDimField = (dimIndex, field, value) =>
    setDraft((prev) => ({
      ...prev,
      dimensions: prev.dimensions.map((d, i) => i === dimIndex ? { ...d, [field]: value } : d),
    }));

  const setObs = (dimIndex, obsIndex, value) =>
    setDraft((prev) => ({
      ...prev,
      dimensions: prev.dimensions.map((d, i) =>
        i === dimIndex
          ? { ...d, observations: d.observations.map((o, j) => j === obsIndex ? value : o) }
          : d
      ),
    }));

  const addObs = (dimIndex) =>
    setDraft((prev) => ({
      ...prev,
      dimensions: prev.dimensions.map((d, i) =>
        i === dimIndex ? { ...d, observations: [...(d.observations || []), ''] } : d
      ),
    }));

  const removeObs = (dimIndex, obsIndex) =>
    setDraft((prev) => ({
      ...prev,
      dimensions: prev.dimensions.map((d, i) =>
        i === dimIndex
          ? { ...d, observations: d.observations.filter((_, j) => j !== obsIndex) }
          : d
      ),
    }));

  const setIssueField = (issueIndex, field, value) =>
    setDraft((prev) => ({
      ...prev,
      criticalIssues: prev.criticalIssues.map((iss, i) =>
        i === issueIndex ? { ...iss, [field]: value } : iss
      ),
    }));

  const setImprovField = (impIndex, field, value) =>
    setDraft((prev) => ({
      ...prev,
      improvements: prev.improvements.map((imp, i) =>
        i === impIndex ? { ...imp, [field]: value } : imp
      ),
    }));

  const setSigField = (field, value) =>
    setDraft((prev) => ({
      ...prev,
      signatureRecommendation: { ...prev.signatureRecommendation, [field]: value },
    }));

  // ── New STEP-5 helpers ──
  const setExecSummary = (value) =>
    setDraft((prev) => ({ ...prev, executiveSummary: value }));

  const setDimNarrative = (di, value) =>
    setDraft((prev) => ({
      ...prev,
      dimensions: prev.dimensions.map((d, i) => i === di ? { ...d, narrative: value } : d),
    }));

  const setDimQuickWin = (di, qi, value) =>
    setDraft((prev) => ({
      ...prev,
      dimensions: prev.dimensions.map((d, i) => i === di
        ? { ...d, quickWins: (d.quickWins || []).map((w, j) => j === qi ? value : w) }
        : d),
    }));
  const addDimQuickWin = (di) =>
    setDraft((prev) => ({
      ...prev,
      dimensions: prev.dimensions.map((d, i) => i === di
        ? { ...d, quickWins: [...(d.quickWins || []), ''] }
        : d),
    }));
  const removeDimQuickWin = (di, qi) =>
    setDraft((prev) => ({
      ...prev,
      dimensions: prev.dimensions.map((d, i) => i === di
        ? { ...d, quickWins: (d.quickWins || []).filter((_, j) => j !== qi) }
        : d),
    }));

  const setDimAction = (di, ai, field, value) =>
    setDraft((prev) => ({
      ...prev,
      dimensions: prev.dimensions.map((d, i) => i === di
        ? {
            ...d,
            prioritizedActions: (d.prioritizedActions || []).map((a, j) =>
              j === ai ? { ...a, [field]: value } : a
            ),
          }
        : d),
    }));
  const addDimAction = (di) =>
    setDraft((prev) => ({
      ...prev,
      dimensions: prev.dimensions.map((d, i) => i === di
        ? {
            ...d,
            prioritizedActions: [
              ...(d.prioritizedActions || []),
              { action: '', effort: 'Medium', impact: 'Medium', estimatedTrafficLift: '' },
            ],
          }
        : d),
    }));
  const removeDimAction = (di, ai) =>
    setDraft((prev) => ({
      ...prev,
      dimensions: prev.dimensions.map((d, i) => i === di
        ? { ...d, prioritizedActions: (d.prioritizedActions || []).filter((_, j) => j !== ai) }
        : d),
    }));

  const setCompetitorBenchmark = (value) =>
    setDraft((prev) => ({
      ...prev,
      competitorInsights: { ...(prev.competitorInsights || { gaps: [] }), benchmark: value },
    }));
  const setCompetitorGap = (gi, value) =>
    setDraft((prev) => ({
      ...prev,
      competitorInsights: {
        ...(prev.competitorInsights || { benchmark: '' }),
        gaps: (prev.competitorInsights?.gaps || []).map((g, j) => j === gi ? value : g),
      },
    }));
  const addCompetitorGap = () =>
    setDraft((prev) => ({
      ...prev,
      competitorInsights: {
        ...(prev.competitorInsights || { benchmark: '' }),
        gaps: [...(prev.competitorInsights?.gaps || []), ''],
      },
    }));
  const removeCompetitorGap = (gi) =>
    setDraft((prev) => ({
      ...prev,
      competitorInsights: {
        ...(prev.competitorInsights || { benchmark: '' }),
        gaps: (prev.competitorInsights?.gaps || []).filter((_, j) => j !== gi),
      },
    }));

  const setRoadmapItem = (phase, ri, value) =>
    setDraft((prev) => ({
      ...prev,
      roadmap: {
        ...(prev.roadmap || { thirtyDay: [], sixtyDay: [], ninetyDay: [] }),
        [phase]: (prev.roadmap?.[phase] || []).map((it, j) => j === ri ? value : it),
      },
    }));
  const addRoadmapItem = (phase) =>
    setDraft((prev) => ({
      ...prev,
      roadmap: {
        ...(prev.roadmap || { thirtyDay: [], sixtyDay: [], ninetyDay: [] }),
        [phase]: [...(prev.roadmap?.[phase] || []), ''],
      },
    }));
  const removeRoadmapItem = (phase, ri) =>
    setDraft((prev) => ({
      ...prev,
      roadmap: {
        ...(prev.roadmap || { thirtyDay: [], sixtyDay: [], ninetyDay: [] }),
        [phase]: (prev.roadmap?.[phase] || []).filter((_, j) => j !== ri),
      },
    }));

  const setTool = (ti, value) =>
    setDraft((prev) => ({
      ...prev,
      toolRecommendations: (prev.toolRecommendations || []).map((t, j) => j === ti ? value : t),
    }));
  const addTool = () =>
    setDraft((prev) => ({ ...prev, toolRecommendations: [...(prev.toolRecommendations || []), ''] }));
  const removeTool = (ti) =>
    setDraft((prev) => ({
      ...prev,
      toolRecommendations: (prev.toolRecommendations || []).filter((_, j) => j !== ti),
    }));

  const inputCls = 'w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500';
  const textareaCls = `${inputCls} resize-none`;
  const labelCls = 'text-xs text-slate-400 block mb-1.5 font-medium';

  const Section = ({ id, title, children }) => (
    <div className="border border-slate-700 rounded-xl overflow-hidden mb-3">
      <button
        onClick={() => toggle(id)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-800/80 hover:bg-slate-700/80 transition-colors text-left"
      >
        <span className="text-white font-semibold text-sm">{title}</span>
        {openSection === id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>
      {openSection === id && <div className="p-5 bg-slate-900/50 space-y-4">{children}</div>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-6">
      <div className="w-full max-w-2xl bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl my-auto">

        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-white">Edit Report Before Export</h2>
            <p className="text-slate-400 text-xs mt-1 truncate max-w-md">
              {url} · Review and adjust any field, then generate the 16-page PDF
            </p>
          </div>
          <button onClick={onClose} className="ml-4 p-1.5 hover:bg-slate-700 rounded-lg transition-colors shrink-0">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[65vh] overflow-y-auto space-y-1 custom-scrollbar">

          {/* Overall score */}
          <Section id="summary" title="Summary">
            <div>
              <label className={labelCls}>Overall Score (0–100)</label>
              <input
                type="number" min={0} max={100}
                value={draft.overallScore}
                onChange={(e) => setDraft((p) => ({ ...p, overallScore: Number(e.target.value) }))}
                className="w-24 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-xl font-bold text-center focus:outline-none focus:border-cyan-500"
              />
            </div>
          </Section>

          {/* Dimensions */}
          {draft.dimensions.map((dim, di) => (
            <Section key={dim.id} id={`dim-${di}`} title={`${dim.dimension}. ${dim.name} — ${dim.score}/100`}>
              <div className="flex items-end gap-4">
                <div>
                  <label className={labelCls}>Score</label>
                  <input
                    type="number" min={0} max={100}
                    value={dim.score}
                    onChange={(e) => setDimField(di, 'score', Number(e.target.value))}
                    className="w-20 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-lg font-bold text-center focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="flex-1">
                  <label className={labelCls}>Confidence</label>
                  <select
                    value={dim.confidence || 'medium'}
                    onChange={(e) => setDimField(di, 'confidence', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Observations</label>
                {(dim.observations || []).map((obs, oi) => (
                  <div key={oi} className="flex gap-2 mb-2">
                    <textarea
                      value={obs}
                      onChange={(e) => setObs(di, oi, e.target.value)}
                      rows={2}
                      className={`${textareaCls} flex-1`}
                    />
                    <button
                      onClick={() => removeObs(di, oi)}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors mt-0.5 shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addObs(di)}
                  className="flex items-center gap-1.5 text-xs font-medium text-cyan-400 hover:bg-cyan-400/10 px-2 py-1.5 rounded-lg transition-colors"
                >
                  <Plus size={12} /> Add Observation
                </button>
              </div>

              <div>
                <label className={labelCls}>Narrative (2-3 paragraphs)</label>
                <textarea
                  value={dim.narrative || ''}
                  onChange={(e) => setDimNarrative(di, e.target.value)}
                  rows={5}
                  className={textareaCls}
                />
              </div>

              <div>
                <label className={labelCls}>Quick Wins</label>
                {(dim.quickWins || []).map((win, qi) => (
                  <div key={qi} className="flex gap-2 mb-2">
                    <textarea
                      value={win}
                      onChange={(e) => setDimQuickWin(di, qi, e.target.value)}
                      rows={1}
                      className={`${textareaCls} flex-1`}
                    />
                    <button
                      onClick={() => removeDimQuickWin(di, qi)}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors mt-0.5 shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addDimQuickWin(di)}
                  className="flex items-center gap-1.5 text-xs font-medium text-cyan-400 hover:bg-cyan-400/10 px-2 py-1.5 rounded-lg transition-colors"
                >
                  <Plus size={12} /> Add Quick Win
                </button>
              </div>

              <div>
                <label className={labelCls}>Prioritised Actions</label>
                {(dim.prioritizedActions || []).map((a, ai) => (
                  <div key={ai} className="border border-slate-700 rounded-lg p-3 mb-2 space-y-2 bg-slate-900/30">
                    <div className="flex gap-2">
                      <textarea
                        value={a.action || ''}
                        onChange={(e) => setDimAction(di, ai, 'action', e.target.value)}
                        rows={2}
                        placeholder="Action description"
                        className={`${textareaCls} flex-1`}
                      />
                      <button
                        onClick={() => removeDimAction(di, ai)}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors mt-0.5 shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <select
                        value={a.effort || 'Medium'}
                        onChange={(e) => setDimAction(di, ai, 'effort', e.target.value)}
                        className={inputCls}
                      >
                        <option value="Low">Effort: Low</option>
                        <option value="Medium">Effort: Medium</option>
                        <option value="High">Effort: High</option>
                      </select>
                      <select
                        value={a.impact || 'Medium'}
                        onChange={(e) => setDimAction(di, ai, 'impact', e.target.value)}
                        className={inputCls}
                      >
                        <option value="Low">Impact: Low</option>
                        <option value="Medium">Impact: Medium</option>
                        <option value="High">Impact: High</option>
                      </select>
                      <input
                        value={a.estimatedTrafficLift || ''}
                        onChange={(e) => setDimAction(di, ai, 'estimatedTrafficLift', e.target.value)}
                        placeholder="+5-15% over 90d"
                        className={inputCls}
                      />
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => addDimAction(di)}
                  className="flex items-center gap-1.5 text-xs font-medium text-cyan-400 hover:bg-cyan-400/10 px-2 py-1.5 rounded-lg transition-colors"
                >
                  <Plus size={12} /> Add Action
                </button>
              </div>
            </Section>
          ))}

          {/* Executive Summary (top-level) */}
          <Section id="exec-summary" title="Executive Summary">
            <div>
              <label className={labelCls}>Narrative (3-5 paragraphs separated by blank lines)</label>
              <textarea
                value={draft.executiveSummary || ''}
                onChange={(e) => setExecSummary(e.target.value)}
                rows={8}
                className={textareaCls}
              />
            </div>
          </Section>

          {/* Competitor Gap Analysis */}
          <Section id="competitor" title="Competitor Gap Analysis">
            <div>
              <label className={labelCls}>Industry Benchmark (one sentence)</label>
              <textarea
                value={draft.competitorInsights?.benchmark || ''}
                onChange={(e) => setCompetitorBenchmark(e.target.value)}
                rows={2}
                className={textareaCls}
              />
            </div>
            <div>
              <label className={labelCls}>Identified Gaps</label>
              {(draft.competitorInsights?.gaps || []).map((gap, gi) => (
                <div key={gi} className="flex gap-2 mb-2">
                  <textarea
                    value={gap}
                    onChange={(e) => setCompetitorGap(gi, e.target.value)}
                    rows={2}
                    className={`${textareaCls} flex-1`}
                  />
                  <button
                    onClick={() => removeCompetitorGap(gi)}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors mt-0.5 shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={addCompetitorGap}
                className="flex items-center gap-1.5 text-xs font-medium text-cyan-400 hover:bg-cyan-400/10 px-2 py-1.5 rounded-lg transition-colors"
              >
                <Plus size={12} /> Add Gap
              </button>
            </div>
          </Section>

          {/* Roadmap */}
          <Section id="roadmap" title="30 / 60 / 90 Day Roadmap">
            {[
              { key: 'thirtyDay', label: '0–30 Days' },
              { key: 'sixtyDay', label: '31–60 Days' },
              { key: 'ninetyDay', label: '61–90 Days' },
            ].map((phase) => (
              <div key={phase.key}>
                <label className={labelCls}>{phase.label}</label>
                {(draft.roadmap?.[phase.key] || []).map((item, ri) => (
                  <div key={ri} className="flex gap-2 mb-2">
                    <textarea
                      value={item}
                      onChange={(e) => setRoadmapItem(phase.key, ri, e.target.value)}
                      rows={1}
                      className={`${textareaCls} flex-1`}
                    />
                    <button
                      onClick={() => removeRoadmapItem(phase.key, ri)}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors mt-0.5 shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addRoadmapItem(phase.key)}
                  className="flex items-center gap-1.5 text-xs font-medium text-cyan-400 hover:bg-cyan-400/10 px-2 py-1.5 rounded-lg transition-colors mb-3"
                >
                  <Plus size={12} /> Add {phase.label} item
                </button>
              </div>
            ))}
          </Section>

          {/* Tool Recommendations */}
          <Section id="tools" title="Tool Recommendations">
            {(draft.toolRecommendations || []).map((tool, ti) => (
              <div key={ti} className="flex gap-2 mb-2">
                <textarea
                  value={tool}
                  onChange={(e) => setTool(ti, e.target.value)}
                  rows={2}
                  placeholder='e.g. "Screaming Frog — crawl audit to surface missing canonicals"'
                  className={`${textareaCls} flex-1`}
                />
                <button
                  onClick={() => removeTool(ti)}
                  className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors mt-0.5 shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button
              onClick={addTool}
              className="flex items-center gap-1.5 text-xs font-medium text-cyan-400 hover:bg-cyan-400/10 px-2 py-1.5 rounded-lg transition-colors"
            >
              <Plus size={12} /> Add Tool
            </button>
          </Section>

          {/* Critical Issues */}
          {draft.criticalIssues?.length > 0 && (
            <Section id="issues" title="Critical Issues">
              {draft.criticalIssues.map((issue, ii) => (
                <div key={ii} className="space-y-3 pb-4 border-b border-slate-700/50 last:border-0 last:pb-0">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Issue {ii + 1}</p>
                  <div>
                    <label className={labelCls}>Title</label>
                    <input value={issue.title} onChange={(e) => setIssueField(ii, 'title', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Description</label>
                    <textarea value={issue.description} onChange={(e) => setIssueField(ii, 'description', e.target.value)} rows={2} className={textareaCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Fix</label>
                    <textarea value={issue.fix} onChange={(e) => setIssueField(ii, 'fix', e.target.value)} rows={2} className={textareaCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Code Snippet (optional)</label>
                    <textarea value={issue.codeSnippet || ''} onChange={(e) => setIssueField(ii, 'codeSnippet', e.target.value)} rows={3} className={`${textareaCls} font-mono text-xs text-cyan-300`} />
                  </div>
                </div>
              ))}
            </Section>
          )}

          {/* Improvements */}
          {draft.improvements?.length > 0 && (
            <Section id="improvements" title="Prioritised Improvements">
              {draft.improvements.map((item, ii) => (
                <div key={ii} className="space-y-2 pb-3 border-b border-slate-700/50 last:border-0 last:pb-0">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">#{item.rank || ii + 1}</p>
                  <div>
                    <label className={labelCls}>Title</label>
                    <input value={item.title} onChange={(e) => setImprovField(ii, 'title', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Description</label>
                    <textarea value={item.description} onChange={(e) => setImprovField(ii, 'description', e.target.value)} rows={2} className={textareaCls} />
                  </div>
                </div>
              ))}
            </Section>
          )}

          {/* Signature Rec */}
          {draft.signatureRecommendation && (
            <Section id="sig" title="Signature Recommendation">
              <div>
                <label className={labelCls}>Title</label>
                <input value={draft.signatureRecommendation.title || ''} onChange={(e) => setSigField('title', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <textarea value={draft.signatureRecommendation.description || ''} onChange={(e) => setSigField('description', e.target.value)} rows={3} className={textareaCls} />
              </div>
              <div>
                <label className={labelCls}>Code Snippet (optional)</label>
                <textarea value={draft.signatureRecommendation.codeSnippet || ''} onChange={(e) => setSigField('codeSnippet', e.target.value)} rows={3} className={`${textareaCls} font-mono text-xs text-cyan-300`} />
              </div>
            </Section>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 flex items-center justify-between gap-4">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-slate-400 border border-slate-600 hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onGenerate(draft)}
            disabled={isGenerating}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-7 py-2.5 rounded-lg text-sm font-semibold hover:from-cyan-400 hover:to-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating
              ? <><Loader2 size={16} className="animate-spin" /> Generating…</>
              : <><FileDown size={16} /> Generate & Download PDF</>
            }
          </button>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
      `}</style>
    </div>
  );
}
