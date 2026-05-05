'use client';
import { useState, useEffect } from 'react';

function buildPreview(resumeText, suggestions, accepted) {
  const replacements = [];
  suggestions.forEach((s, i) => {
    if (!accepted[i] || !s.original) return;
    const idx = resumeText.indexOf(s.original);
    if (idx === -1) return;
    replacements.push({ start: idx, end: idx + s.original.length, original: s.original, suggested: s.suggested });
  });
  replacements.sort((a, b) => a.start - b.start);
  const segments = [];
  let cursor = 0;
  for (const r of replacements) {
    if (r.start < cursor) continue;
    if (r.start > cursor) segments.push({ type: 'plain', text: resumeText.slice(cursor, r.start) });
    segments.push({ type: 'change', original: r.original, suggested: r.suggested });
    cursor = r.end;
  }
  if (cursor < resumeText.length) segments.push({ type: 'plain', text: resumeText.slice(cursor) });
  return segments;
}

export default function Home() {
  const [pageUrl, setPageUrl] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [accepted, setAccepted] = useState({});
  const [resumeText, setResumeText] = useState('');
  const [blocks, setBlocks] = useState([]);
  const [done, setDone] = useState(false);
  const [tab, setTab] = useState('changes');

  useEffect(() => {
    const saved = localStorage.getItem('notionPageUrl');
    if (saved) setPageUrl(saved);
  }, []);

  async function analyze() {
    setLoading(true);
    setError('');
    setSuggestions([]);
    setDone(false);
    setTab('changes');
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageUrl, jobDescription: jobDesc }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuggestions(data.suggestions);
      setResumeText(data.resumeText);
      setBlocks(data.blocks);
      setAccepted(Object.fromEntries(data.suggestions.map((_, i) => [i, true])));
      localStorage.setItem('notionPageUrl', pageUrl);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function finish() {
    setApplying(true);
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suggestions, accepted }),
    }).catch(() => {});

    const [applyRes, downloadRes] = await Promise.all([
      fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks, suggestions, accepted }),
      }),
      fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, suggestions, accepted }),
      }),
    ]);

    if (!applyRes.ok) {
      const err = await applyRes.json().catch(() => ({ error: 'Failed to apply to Notion' }));
      setError(err.error);
    }

    const blob = await downloadRes.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resume_optimized.docx';
    a.click();
    URL.revokeObjectURL(url);
    setApplying(false);
    setDone(true);
  }

  const acceptedCount = Object.values(accepted).filter(Boolean).length;
  const previewSegments = resumeText ? buildPreview(resumeText, suggestions, accepted) : [];

  return (
    <main className="main">
      <h1>Resume Optimizer</h1>
      <div className="inputs">
        <div className="field">
          <label>Notion Page URL</label>
          <input
            type="text"
            placeholder="https://www.notion.so/Your-Resume-abc123..."
            value={pageUrl}
            onChange={e => setPageUrl(e.target.value)}
          />
          <small>Share the page with your "Resume Optimizer" integration first</small>
        </div>
        <div className="field">
          <label>Job Description</label>
          <textarea
            placeholder="Paste the full job description..."
            value={jobDesc}
            onChange={e => setJobDesc(e.target.value)}
            rows={8}
          />
        </div>
        <button className="btn-primary" onClick={analyze} disabled={loading || !pageUrl || !jobDesc}>
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>
        {error && <p className="error">{error}</p>}
      </div>

      {suggestions.length > 0 && (
        <div className="results">
          <div className="results-header">
            <div className="tabs">
              <button className={`tab ${tab === 'changes' ? 'tab-active' : ''}`} onClick={() => setTab('changes')}>
                Changes ({suggestions.length})
              </button>
              <button className={`tab ${tab === 'preview' ? 'tab-active' : ''}`} onClick={() => setTab('preview')}>
                Resume Preview
              </button>
            </div>
            <button className="btn-download" onClick={finish} disabled={applying || acceptedCount === 0}>
              {applying ? 'Applying...' : `Apply to Notion & Download (${acceptedCount})`}
            </button>
          </div>

          {tab === 'changes' && suggestions.map((s, i) => (
            <div key={i} className={`card ${accepted[i] ? 'accepted' : 'rejected'}`}>
              <div className="card-header">
                <span className="section-tag">{s.section}</span>
                <button
                  className={accepted[i] ? 'btn-reject' : 'btn-accept'}
                  onClick={() => setAccepted(a => ({ ...a, [i]: !a[i] }))}
                >
                  {accepted[i] ? 'Reject' : 'Accept'}
                </button>
              </div>
              <p className="reason">{s.reason}</p>
              <div className="diff">
                <div className="before">
                  <span className="diff-label">Before</span>
                  <p>{s.original}</p>
                </div>
                <div className="after">
                  <span className="diff-label">After</span>
                  <p>{s.suggested}</p>
                </div>
              </div>
            </div>
          ))}

          {tab === 'preview' && (
            <div className="resume-preview">
              <div className="preview-legend">
                <span className="legend-removed">Removed</span>
                <span className="legend-added">Added</span>
                <span className="legend-unchanged">Unchanged</span>
              </div>
              <div className="resume-body">
                {previewSegments.map((seg, i) =>
                  seg.type === 'plain' ? (
                    <span key={i}>{seg.text}</span>
                  ) : (
                    <span key={i}>
                      <span className="removed">{seg.original}</span>
                      <span className="added">{seg.suggested}</span>
                    </span>
                  )
                )}
              </div>
            </div>
          )}

          <button className="btn-download full-width" onClick={finish} disabled={applying || acceptedCount === 0}>
            {applying ? 'Applying...' : `Apply to Notion & Download (${acceptedCount})`}
          </button>
          {done && <p className="success">Done! Changes applied to Notion and .docx downloaded.</p>}
        </div>
      )}
    </main>
  );
}
