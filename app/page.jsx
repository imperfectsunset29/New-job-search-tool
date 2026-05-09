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
  const [coverLetter, setCoverLetter] = useState('');
  const [coverLetterLoading, setCoverLetterLoading] = useState(false);
  const [coverLetterTone, setCoverLetterTone] = useState('professional');
  const [coverLetterNotes, setCoverLetterNotes] = useState('');
  const [whyHereAnswer, setWhyHereAnswer] = useState('');
  const [whyHereLoading, setWhyHereLoading] = useState(false);
  const [whyHereQuestion, setWhyHereQuestion] = useState('Why do you want to work here?');
  const [whyHereTone, setWhyHereTone] = useState('conversational');
  const [whyHereLength, setWhyHereLength] = useState('');
  const [neutralSaving, setNeutralSaving] = useState(false);
  const [neutralSaved, setNeutralSaved] = useState(false);
  const [neutralRestoring, setNeutralRestoring] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [coherenceSuggestions, setCoherenceSuggestions] = useState([]);
  const [coherenceBlocks, setCoherenceBlocks] = useState([]);
  const [coherenceLoading, setCoherenceLoading] = useState(false);
  const [coherenceAccepted, setCoherenceAccepted] = useState({});
  const [coherenceApplying, setCoherenceApplying] = useState(false);
  const [coherenceDone, setCoherenceDone] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('notionPageUrl') || 'https://www.notion.so/iamvalentina/Valentina-Calvache-Senior-Content-Designer-3574ee47dcf580e1a5d8d14b80c04626';
    if (saved) setPageUrl(saved);
  }, []);

  async function analyze() {
    setLoading(true);
    setError('');
    setSuggestions([]);
    setDone(false);
    setTab('changes');
    setCoverLetter('');
    setWhyHereAnswer('');
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

  async function generateCoverLetter() {
    setCoverLetterLoading(true);
    setError('');
    const res = await fetch('/api/cover-letter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeText, jobDescription: jobDesc, tone: coverLetterTone, notes: coverLetterNotes }),
    });
    const data = await res.json();
    if (res.ok) setCoverLetter(data.coverLetter);
    else setError(data.error);
    setCoverLetterLoading(false);
  }

  async function generateWhyHere() {
    setWhyHereLoading(true);
    setError('');
    const res = await fetch('/api/why-here', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeText, jobDescription: jobDesc, question: whyHereQuestion, tone: whyHereTone, maxChars: whyHereLength ? parseInt(whyHereLength) : null }),
    });
    const data = await res.json();
    if (res.ok) setWhyHereAnswer(data.answer);
    else setError(data.error);
    setWhyHereLoading(false);
  }

  async function downloadCoverLetter() {
    const res = await fetch('/api/download-cover-letter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coverLetter }),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cover_letter.docx';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function applyToNotion() {
    setApplying(true);
    setError('');
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suggestions, accepted }),
    }).catch(() => {});

    const res = await fetch('/api/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks, suggestions, accepted }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to apply to Notion' }));
      setError(err.error);
    } else {
      setDone(true);
    }
    setApplying(false);
  }

  async function download() {
    const res = await fetch('/api/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeText, suggestions, accepted }),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resume_optimized.docx';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function saveNeutral() {
    setNeutralSaving(true);
    setNeutralSaved(false);
    const res = await fetch('/api/snapshot-neutral', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageUrl }),
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('neutralSnapshot', JSON.stringify(data.blocks));
      setNeutralSaved(true);
      setTimeout(() => setNeutralSaved(false), 3000);
    } else {
      setError(data.error);
    }
    setNeutralSaving(false);
  }

  async function restoreNeutral() {
    setNeutralRestoring(true);
    const stored = localStorage.getItem('neutralSnapshot');
    if (!stored) {
      setError('No neutral snapshot saved yet. Click "Save as neutral" first.');
      setNeutralRestoring(false);
      setShowRestoreConfirm(false);
      return;
    }
    const res = await fetch('/api/restore-neutral', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks: JSON.parse(stored) }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error);
    }
    setNeutralRestoring(false);
    setShowRestoreConfirm(false);
  }

  async function runCoherencePass() {
    setCoherenceLoading(true);
    setCoherenceSuggestions([]);
    setCoherenceDone(false);
    setError('');
    const res = await fetch('/api/coherence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageUrl }),
    });
    const data = await res.json();
    if (res.ok) {
      setCoherenceSuggestions(data.suggestions);
      setCoherenceBlocks(data.blocks);
      setCoherenceAccepted(Object.fromEntries(data.suggestions.map((_, i) => [i, true])));
    } else {
      setError(data.error);
    }
    setCoherenceLoading(false);
  }

  async function applyCoherence() {
    setCoherenceApplying(true);
    setError('');
    const res = await fetch('/api/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks: coherenceBlocks, suggestions: coherenceSuggestions, accepted: coherenceAccepted }),
    });
    if (res.ok) setCoherenceDone(true);
    else {
      const d = await res.json().catch(() => ({ error: 'Failed to apply' }));
      setError(d.error);
    }
    setCoherenceApplying(false);
  }

  const acceptedCount = Object.values(accepted).filter(Boolean).length;
  const previewSegments = resumeText ? buildPreview(resumeText, suggestions, accepted) : [];

  return (
    <main className="main">
      <h1>Resume Optimizer</h1>
      <div className="inputs">
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
        <div className="baseline-actions">
          <button className="btn-secondary" onClick={saveNeutral} disabled={neutralSaving || !pageUrl}>
            {neutralSaving ? 'Saving...' : neutralSaved ? 'Saved ✓' : 'Save as neutral'}
          </button>
          {!showRestoreConfirm ? (
            <button className="btn-secondary btn-restore" onClick={() => setShowRestoreConfirm(true)} disabled={neutralRestoring || !pageUrl}>
              Restore to neutral
            </button>
          ) : (
            <span className="restore-confirm">
              This will overwrite your Notion resume.
              <button className="btn-confirm" onClick={restoreNeutral} disabled={neutralRestoring}>
                {neutralRestoring ? 'Restoring...' : 'Confirm'}
              </button>
              <button className="btn-cancel" onClick={() => setShowRestoreConfirm(false)}>Cancel</button>
            </span>
          )}
        </div>
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
              <button className={`tab ${tab === 'cover-letter' ? 'tab-active' : ''}`} onClick={() => setTab('cover-letter')}>
                Cover Letter
              </button>
              <button className={`tab ${tab === 'why-here' ? 'tab-active' : ''}`} onClick={() => setTab('why-here')}>
                Why here?
              </button>
            </div>
            <div className="action-buttons">
              <button className="btn-notion" onClick={applyToNotion} disabled={applying || acceptedCount === 0}>
                {applying ? 'Applying...' : `Apply to Notion (${acceptedCount})`}
              </button>
              <button className="btn-download" onClick={download} disabled={acceptedCount === 0}>
                Download .docx
              </button>
            </div>
          </div>

          {tab === 'changes' && suggestions.map((s, i) => (
            <div key={i} className={`card ${accepted[i] ? (s.type === 'cut' ? 'accepted-cut' : 'accepted') : 'rejected'}`}>
              <div className="card-header">
                <div className="card-header-left">
                  {s.type === 'cut' && <span className="cut-badge">✂ Cut</span>}
                  <span className="section-tag">{s.section}</span>
                </div>
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
                  <span className="diff-label">{s.type === 'cut' ? 'Trimmed' : 'After'}</span>
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

          {tab === 'cover-letter' && (
            <div className="cover-letter-tab">
              <div className="guidelines-field">
                <label className="guidelines-label">Guidelines</label>
                <p className="guidelines-hint">Tell Claude what to focus on, what to avoid, or anything specific about your story.</p>
                <textarea
                  className="guidelines-input"
                  placeholder="e.g. Lead with my experience managing cross-functional teams. Don't mention the agency work. Keep it to 3 short paragraphs. Reference that I transitioned from engineering into design."
                  value={coverLetterNotes}
                  onChange={e => setCoverLetterNotes(e.target.value)}
                  rows={5}
                  disabled={coverLetterLoading}
                />
              </div>
              <div className="tone-selector">
                {['professional', 'conversational', 'enthusiastic', 'edgy'].map(t => (
                  <button
                    key={t}
                    className={`tone-btn ${coverLetterTone === t ? 'tone-btn-active' : ''}`}
                    onClick={() => setCoverLetterTone(t)}
                    disabled={coverLetterLoading}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
              <button className="btn-primary" onClick={generateCoverLetter} disabled={coverLetterLoading}>
                {coverLetterLoading ? 'Generating...' : coverLetter ? 'Regenerate' : 'Generate Cover Letter'}
              </button>
              {coverLetter && (
                <>
                  <textarea
                    className="cover-letter-body"
                    value={coverLetter}
                    onChange={e => setCoverLetter(e.target.value)}
                    rows={20}
                  />
                  <button className="btn-download" onClick={downloadCoverLetter}>
                    Download .docx
                  </button>
                </>
              )}
            </div>
          )}

          {tab === 'why-here' && (
            <div className="why-here-tab">
              <div className="field">
                <label>Interview question</label>
                <input
                  type="text"
                  value={whyHereQuestion}
                  onChange={e => setWhyHereQuestion(e.target.value)}
                  disabled={whyHereLoading}
                />
              </div>
              <div className="field">
                <label>Target length in characters <span style={{fontWeight: 'normal', color: '#888'}}>(optional)</span></label>
                <input
                  type="number"
                  min="50"
                  placeholder="e.g. 500"
                  value={whyHereLength}
                  onChange={e => setWhyHereLength(e.target.value)}
                  disabled={whyHereLoading}
                />
              </div>
              <div className="tone-selector">
                {['professional', 'conversational', 'enthusiastic', 'edgy'].map(t => (
                  <button
                    key={t}
                    className={`tone-btn ${whyHereTone === t ? 'tone-btn-active' : ''}`}
                    onClick={() => setWhyHereTone(t)}
                    disabled={whyHereLoading}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
              <button className="btn-primary" onClick={generateWhyHere} disabled={whyHereLoading || !whyHereQuestion.trim()}>
                {whyHereLoading ? 'Generating...' : whyHereAnswer ? 'Regenerate' : 'Generate answer'}
              </button>
              {whyHereAnswer && (
                <textarea
                  className="cover-letter-body"
                  value={whyHereAnswer}
                  onChange={e => setWhyHereAnswer(e.target.value)}
                  rows={10}
                />
              )}
            </div>
          )}

          {tab !== 'cover-letter' && tab !== 'why-here' && (
            <div className="action-buttons full-width">
              <button className="btn-notion" onClick={applyToNotion} disabled={applying || acceptedCount === 0}>
                {applying ? 'Applying...' : `Apply to Notion (${acceptedCount})`}
              </button>
              <button className="btn-download" onClick={download} disabled={acceptedCount === 0}>
                Download .docx
              </button>
            </div>
          )}
          {done && <p className="success">Changes applied to Notion!</p>}
        </div>
      )}
      <div className="coherence-section">
        <div className="coherence-header">
          <div>
            <h2 className="coherence-title">Coherence pass</h2>
            <p className="coherence-desc">Reconciles tonal inconsistencies from piecemeal edits into a unified voice — without changing any facts.</p>
          </div>
          <button className="btn-secondary" onClick={runCoherencePass} disabled={coherenceLoading || !pageUrl}>
            {coherenceLoading ? 'Analyzing...' : 'Run coherence pass'}
          </button>
        </div>
        {coherenceSuggestions.length > 0 && (
          <>
            {coherenceSuggestions.map((s, i) => (
              <div key={i} className={`card ${coherenceAccepted[i] ? 'accepted' : 'rejected'}`}>
                <div className="card-header">
                  <div className="card-header-left">
                    <span className="section-tag">{s.section}</span>
                  </div>
                  <button
                    className={coherenceAccepted[i] ? 'btn-reject' : 'btn-accept'}
                    onClick={() => setCoherenceAccepted(a => ({ ...a, [i]: !a[i] }))}
                  >
                    {coherenceAccepted[i] ? 'Reject' : 'Accept'}
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
            <button className="btn-notion" onClick={applyCoherence} disabled={coherenceApplying || !Object.values(coherenceAccepted).some(Boolean)}>
              {coherenceApplying ? 'Applying...' : 'Apply to Notion'}
            </button>
            {coherenceDone && <p className="success">Coherence pass applied to Notion!</p>}
          </>
        )}
      </div>
    </main>
  );
}
