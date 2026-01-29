"use client";

import { useState, useEffect } from 'react';
import { useNav } from '@/context/NavContext';
import DashboardView from '@/components/DashboardView';
import ReferencesView from '@/components/ReferencesView';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function Home() {
  const [url, setUrl] = useState('');
  const [points, setPoints] = useState('');
  const [region, setRegion] = useState('Global');
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState({}); // Tracking individual evaluations
  const [evaluatingGoogle, setEvaluatingGoogle] = useState({}); // Tracking Google search evaluations
  const [evaluatingOSS, setEvaluatingOSS] = useState({}); // Tracking GPT-OSS evaluations
  const [evaluatingAll, setEvaluatingAll] = useState(false);
  const [provider, setProvider] = useState('gemini'); // Current selected provider for standard checks
  const [ossEvalResults, setOssEvalResults] = useState({}); // GPT-OSS results (OpenRouter)
  const [result, setResult] = useState(null);
  const [evalResults, setEvalResults] = useState({}); // Individual prompt results
  const [googleEvalResults, setGoogleEvalResults] = useState({}); // Google Grounded results
  const [report, setReport] = useState(null); // Full report results
  const [hoveredDetail, setHoveredDetail] = useState(null); // For the hover report
  const [selectedDetail, setSelectedDetail] = useState(null); // For the persistent modal
  const [toasts, setToasts] = useState([]); // For notifications
  const [error, setError] = useState(null);
  const [manualPromptText, setManualPromptText] = useState('');
  const [bulkPromptText, setBulkPromptText] = useState('');
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [expandedReferences, setExpandedReferences] = useState({});
  const { activeView, setActiveView } = useNav();

  // If we get a result but haven't run the full audit yet, 
  // we might want the user to click Dashboard to see the empty state 
  // or auto-calculate based on what we have.

  const addToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const handleAddManualPrompt = () => {
    if (!manualPromptText.trim()) return;

    const newPrompt = {
      prompt_text: manualPromptText,
      intent_category: "Manual Custom",
      id: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` // Unique ID
    };

    setResult(prev => ({
      ...prev,
      prompts: [newPrompt, ...prev.prompts]
    }));

    setManualPromptText('');
    addToast("Custom prompt added!", "success");
  };

  const handleAnalyze = async () => {
    if (!url && !points) {
      setError("Please provide at least a URL or manual points.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setEvalResults({});
    setGoogleEvalResults({});
    setReport(null);
    addToast("Initializing Global Analysis...", "info");

    try {
      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, points, region }),
      });

      if (!response.ok) {
        let errorMessage = 'Analysis failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch {
          errorMessage = `Analysis failed: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Assign unique IDs to all prompts from backend
      const promptsWithIds = data.prompts.map((p, idx) => ({
        ...p,
        id: `generated-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`
      }));

      setResult({
        ...data,
        prompts: promptsWithIds
      });
      addToast("✅ Analysis complete! Generated " + data.prompts.length + " test prompts.", "success");

      // Auto-trigger full comparative audit for ALL prompts
      addToast("🚀 Starting automatic 3-model comparison (Batch Mode)...", "info");
      handleBatchEvaluate(promptsWithIds, data.company_profile);
    } catch (err) {
      setError(err.message);
      addToast("❌ Analysis failed: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleBatchEvaluate = async (prompts, companyProfile) => {
    // Helper to run a batch for a specific provider
    const runBatch = async (provider, checkType) => {
      const promptIds = prompts.map(p => p.id);

      // Update loading states
      const updateLoading = (isLoading) => {
        const updates = {};
        promptIds.forEach(id => updates[id] = isLoading);
        if (checkType === 'google') setEvaluatingGoogle(prev => ({ ...prev, ...updates }));
        else if (checkType === 'oss') setEvaluatingOSS(prev => ({ ...prev, ...updates }));
        else setEvaluating(prev => ({ ...prev, ...updates }));
      };

      updateLoading(true);

      try {
        const response = await fetch(`${API_BASE_URL}/evaluate-all`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_profile: companyProfile,
            prompts: prompts,
            use_google_search: checkType === 'google',
            provider: checkType === 'oss' ? 'openrouter' : provider
          }),
        });

        if (!response.ok) throw new Error(`Batch ${checkType} failed`);
        const reportData = await response.json();

        // Map results back to prompt IDs based on index
        const newResults = {};
        reportData.model_results.forEach((res, idx) => {
          if (prompts[idx]) {
            newResults[prompts[idx].id] = res;
          }
        });

        if (checkType === 'google') setGoogleEvalResults(prev => ({ ...prev, ...newResults }));
        else if (checkType === 'oss') setOssEvalResults(prev => ({ ...prev, ...newResults }));
        else setEvalResults(prev => ({ ...prev, ...newResults }));

        return reportData;
      } catch (err) {
        console.error(err);
        addToast(`Batch evaluation failed for ${checkType}`, "error");
        return null;
      } finally {
        updateLoading(false);
      }
    };

    // Trigger all 3 batches in parallel
    addToast("🚀 Dispatching parallel batch requests...", "info");
    const [standardRes, ossRes, googleRes] = await Promise.all([
      runBatch('gemini', 'standard'),
      runBatch('openrouter', 'oss'),
      runBatch('gemini', 'google')
    ]);

    // Calculate composite report if we have results
    const validReports = [standardRes, ossRes, googleRes].filter(r => r !== null);
    if (validReports.length > 0) {
      const avgScore = validReports.reduce((acc, r) => acc + r.overall_score, 0) / validReports.length;

      // Use the 'standard' report as base for findings/tips, but update the score to the composite
      // Prefer Google Search findings if available as they are grounded
      const baseReport = googleRes || standardRes || validReports[0];

      const compositeReport = {
        ...baseReport,
        overall_score: Math.round(avgScore * 10) / 10,
        is_composite: true,
        provider_count: validReports.length
      };

      setReport(compositeReport);
      addToast(`✅ Composite Audit Complete! Score: ${compositeReport.overall_score}`, "success");
    }
  };

  const handleEvaluatePrompt = async (prompt, promptId, checkType = 'standard') => {
    // checkType can be 'standard', 'google', or 'oss'

    if (checkType === 'google') {
      setEvaluatingGoogle(prev => ({ ...prev, [promptId]: true }));
      addToast("Launching Google AI Search Check...", "success");
    } else if (checkType === 'oss') {
      setEvaluatingOSS(prev => ({ ...prev, [promptId]: true }));
      addToast("Sending prompt to Claude 3.5 Sonnet...", "info");
    } else {
      setEvaluating(prev => ({ ...prev, [promptId]: true }));
      addToast(`Sending prompt to ${provider === 'gemini' ? 'Gemini' : 'Cerebras'}...`, "info");
    }

    try {
      const response = await fetch(`${API_BASE_URL}/evaluate-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_profile: result.company_profile,
          prompt: prompt,
          use_google_search: checkType === 'google',
          provider: checkType === 'oss' ? 'openrouter' : provider
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Evaluation failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch {
          errorMessage = `Evaluation failed: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (checkType === 'google') {
        setGoogleEvalResults(prev => ({ ...prev, [promptId]: data }));
      } else if (checkType === 'oss') {
        setOssEvalResults(prev => ({ ...prev, [promptId]: data }));
      } else {
        setEvalResults(prev => ({ ...prev, [promptId]: data }));
      }
    } catch (err) {
      console.error('Evaluation error:', err);
      let errorLabel = 'Check';
      if (checkType === 'google') errorLabel = 'Google Search';
      else if (checkType === 'oss') errorLabel = 'GPT-OSS';
      else errorLabel = provider;

      addToast(`${errorLabel} check failed: ${err.message}`, 'error');
    } finally {
      if (checkType === 'google') {
        setEvaluatingGoogle(prev => ({ ...prev, [promptId]: false }));
      } else if (checkType === 'oss') {
        setEvaluatingOSS(prev => ({ ...prev, [promptId]: false }));
      } else {
        setEvaluating(prev => ({ ...prev, [promptId]: false }));
      }
    }
  };

  const handleEvaluateAllModels = async (prompt, promptId) => {
    Promise.allSettled([
      handleEvaluatePrompt(prompt, promptId, 'standard'),
      handleEvaluatePrompt(prompt, promptId, 'oss'),
      handleEvaluatePrompt(prompt, promptId, 'google')
    ]);
  };

  const handleRefreshPrompts = async () => {
    setRefreshing(true);
    addToast("Generating new set of prompts...", "info");
    try {
      const response = await fetch(`${API_BASE_URL}/refresh-prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.company_profile),
      });

      if (!response.ok) throw new Error("Failed to refresh prompts");

      const data = await response.json();

      // Assign unique IDs to refreshed prompts
      const promptsWithIds = data.map((p, idx) => ({
        ...p,
        id: `refreshed-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`
      }));

      setResult(prev => ({ ...prev, prompts: promptsWithIds }));
      setEvalResults({});
      setGoogleEvalResults({});
      addToast("✅ Prompts refreshed!", "success");
    } catch (err) {
      addToast("❌ Refresh failed: " + err.message, "error");
    } finally {
      setRefreshing(false);
    }
  };

  const handleBulkImport = async () => {
    if (!bulkPromptText.trim()) return;

    const prompts = bulkPromptText.split('\n').filter(p => p.trim());
    try {
      const response = await fetch(`${API_BASE_URL}/bulk-import-prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompts }),
      });

      if (!response.ok) throw new Error("Failed to import prompts");

      const data = await response.json();

      // Assign unique IDs to bulk imported prompts
      const promptsWithIds = data.map((p, idx) => ({
        ...p,
        id: `bulk-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`
      }));

      setResult(prev => ({
        ...prev,
        prompts: [...promptsWithIds, ...prev.prompts]
      }));
      setBulkPromptText('');
      setShowBulkImport(false);
      addToast(`✅ Imported ${data.length} prompts!`, "success");
    } catch (err) {
      addToast("❌ Import failed: " + err.message, "error");
    }
  };

  const handleEvaluateAll = async () => {
    setEvaluatingAll(true);
    try {
      await handleBatchEvaluate(result.prompts, result.company_profile);
    } catch (err) {
      console.error('Full audit error:', err);
      addToast("❌ Full audit failed: " + err.message, "error");
    } finally {
      setEvaluatingAll(false);
    }
  };

  if (activeView === 'references') {
    return (
      <ReferencesView
        prompts={result?.prompts || []}
        evalResults={evalResults}
        googleEvalResults={googleEvalResults}
        ossEvalResults={ossEvalResults}
      />
    );
  }

  if (activeView === 'dashboard') {
    return (
      <DashboardView
        report={report}
        companyProfile={result?.company_profile}
        setActiveView={setActiveView}
      />
    );
  }

  return (
    <main>
      <img src="/ethosh-logo.png" alt="Ethosh Logo" className="top-right-logo" />
      <header>
        <h1>GEO Analytics</h1>
        <p className="subtitle">
          Optimize your company&apos;s visibility in AI search results using generative engine optimization.
        </p>
      </header>

      <div className="input-group">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>Company Website</label>
          <input
            type="text"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>Manual Points (Optional)</label>
          <textarea
            placeholder="Key offerings, unique selling points, or target audience..."
            rows={4}
            value={points}
            onChange={(e) => setPoints(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>Target Region</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            >
              <option value="Global">Global</option>
              <option value="North America">North America</option>
              <option value="Europe">Europe</option>
              <option value="Asia">Asia</option>
              <option value="India">India</option>
              <option value="Middle East">Middle East</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>Prompt Generation Model</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            >
              <option value="gemini">Gemini</option>
              {/* Future: Add more generation models here */}
            </select>
            <p style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '4px' }}>Model used to create the test questions. Audit always checks ALL 3.</p>
          </div>
        </div>

        <button onClick={handleAnalyze} disabled={loading} style={{ marginTop: '12px' }}>
          {loading ? 'Analyzing...' : 'Start Analysis'}
        </button>

        {error && (
          <div style={{ color: '#ef4444', fontSize: '0.875rem', textAlign: 'center', marginTop: '8px' }}>
            {error}
          </div>
        )}
      </div>

      {result && (
        <section className="results-container">
          <div className="company-info" style={{ border: 'none', padding: 0 }}>
            <div>
              <div className="company-name">{result.company_name}</div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <div className="industry-badge">{result.industry}</div>
                <div className="industry-badge" style={{ background: '#f1f5f9', color: 'var(--primary)' }}>🌍 {result.company_profile.region}</div>
              </div>
            </div>
            <button
              className="secondary-btn"
              onClick={handleEvaluateAll}
              disabled={evaluatingAll}
            >
              {evaluatingAll ? 'Evaluating All...' : 'Run Full Visibility Audit'}
            </button>
          </div>

          {report && (
            <div className="report-card" style={{ textAlign: 'center', padding: '32px' }}>
              <h2 style={{ fontSize: '1.5rem', color: 'var(--accent)', marginBottom: '16px' }}>
                ✅ Full Visibility Audit Complete!
              </h2>
              <p style={{ color: '#64748b', marginBottom: '24px', fontSize: '1rem' }}>
                Your comprehensive report is ready with a score of <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{report.overall_score}/100</span>
              </p>
              <button
                onClick={() => setActiveView('dashboard')}
                style={{
                  background: 'var(--primary)',
                  border: 'none',
                  padding: '12px 32px',
                  fontSize: '1rem',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  color: 'white',
                  fontWeight: '600'
                }}
              >
                📊 View Full Report in Dashboard
              </button>
            </div>
          )}

          <div style={{ marginBottom: '32px', background: '#f8fafc', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚡</span> Test Your Own Prompt
            </h3>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                placeholder="Enter a custom query (e.g., 'Best enterprise VR solutions for manufacturing')"
                value={manualPromptText}
                onChange={(e) => setManualPromptText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddManualPrompt()}
                style={{ flex: 1 }}
              />
              <button onClick={handleAddManualPrompt} className="secondary-btn" style={{ whiteSpace: 'nowrap', background: 'var(--primary)', borderColor: 'var(--primary)', color: 'white' }}>
                + Add Prompt
              </button>
              <button
                onClick={() => setShowBulkImport(!showBulkImport)}
                className="secondary-btn"
                style={{ whiteSpace: 'nowrap' }}
              >
                {showBulkImport ? 'Cancel Bulk' : 'Bulk Import'}
              </button>
            </div>

            {showBulkImport && (
              <div style={{ marginTop: '16px', animation: 'fadeIn 0.3s ease' }}>
                <textarea
                  placeholder="Paste multiple prompts here, one per line..."
                  rows={5}
                  value={bulkPromptText}
                  onChange={(e) => setBulkPromptText(e.target.value)}
                  style={{ width: '100%', marginBottom: '12px' }}
                />
                <button onClick={handleBulkImport} className="secondary-btn" style={{ background: 'var(--accent)', border: 'none', color: 'white' }}>
                  Import Prompts
                </button>
              </div>
            )}
          </div>

          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Suggested AI Test Prompts</h3>
              <p style={{ color: '#64748b' }}>Use these prompts to see how AI models perceive your brand.</p>
            </div>
            <button
              className="secondary-btn"
              onClick={handleRefreshPrompts}
              disabled={refreshing}
              style={{ padding: '8px 16px', fontSize: '0.8rem' }}
            >
              {refreshing ? 'Refreshing...' : '🔄 Refresh Prompts'}
            </button>
          </div>

          <div className="prompt-grid">
            {result.prompts.map((p, index) => (
              <div
                key={p.id || index}
                className="prompt-card"
                onMouseEnter={() => setHoveredDetail({ ...p, promptId: p.id })}
                onMouseLeave={() => setHoveredDetail(null)}
                onClick={() => setSelectedDetail({ ...p, promptId: p.id })}
              >
                <div className="view-hint">Hover to preview | Click for persistent view</div>
                <span className="category-label">{p.intent_category}</span>
                <p className="prompt-text">"{p.prompt_text}"</p>

                <div
                  style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => handleEvaluateAllModels(p, p.id)}
                    className="secondary-btn"
                    style={{ width: '100%', marginBottom: '12px', fontSize: '0.8rem', padding: '12px', background: 'var(--primary)', border: 'none', color: 'white' }}
                    disabled={evaluating[p.id] || evaluatingOSS[p.id] || evaluatingGoogle[p.id]}
                  >
                    🚀 Run Comparative Audit
                  </button>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleEvaluatePrompt(p, p.id, 'google')}
                      disabled={evaluatingGoogle[p.id]}
                      style={{ flex: 1, padding: '8px', fontSize: '0.7rem', background: googleEvalResults[p.id] ? '#dcfce7' : 'var(--accent)', color: googleEvalResults[p.id] ? '#15803d' : 'white', border: googleEvalResults[p.id] ? '1px solid #bbf7d0' : 'none' }}
                    >
                      {evaluatingGoogle[p.id] ? '...' : (googleEvalResults[p.id] ? 'Google Search ✓' : 'Google Search Check')}
                    </button>
                    {/* Minimalist individual rerun buttons */}
                    <button onClick={() => handleEvaluatePrompt(p, p.id, 'standard')} style={{ padding: '8px', width: '40px', background: '#f1f5f9', color: '#64748b', fontSize: '0.7rem' }}>G</button>
                    <button onClick={() => handleEvaluatePrompt(p, p.id, 'oss')} style={{ padding: '8px', width: '40px', background: '#f1f5f9', color: '#64748b', fontSize: '0.7rem' }}>O</button>
                  </div>

                  {/* References Section */}
                  {(() => {
                    const allSources = [
                      ...(evalResults[p.id]?.sources || []).map(s => ({ ...s, provider: 'Gemini' })),
                      ...(ossEvalResults[p.id]?.sources || []).map(s => ({ ...s, provider: 'Claude' })),
                      ...(googleEvalResults[p.id]?.sources || []).map(s => ({ ...s, provider: 'Google AI' }))
                    ];

                    if (allSources.length === 0) return null;

                    return (
                      <div className="references-section" style={{ marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedReferences(prev => ({ ...prev, [p.id]: !prev[p.id] }));
                          }}
                          className="secondary-btn"
                          style={{
                            width: '100%',
                            fontSize: '0.75rem',
                            padding: '8px',
                            background: '#f8fafc',
                            display: 'flex',
                            justifyContent: 'space-between'
                          }}
                        >
                          <span>📚 References / Visited Sites</span>
                          <span>{allSources.length}</span>
                        </button>

                        {expandedReferences[p.id] && (
                          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                            {allSources.map((source, idx) => (
                              <a
                                key={idx}
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="source-item"
                                style={{ fontSize: '0.7rem', padding: '12px' }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                  <span style={{ fontWeight: 700, color: source.provider === 'Claude' ? '#c2410c' : source.provider === 'Google AI' ? 'var(--accent)' : 'var(--primary)' }}>
                                    {source.provider}
                                  </span>
                                </div>
                                <div style={{ color: '#1e293b', fontWeight: 500 }}>{source.title || 'Cited Resource'}</div>
                                <span className="source-url" style={{ fontSize: '0.65rem', color: '#64748b' }}>{source.url}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {(evalResults[p.id] || googleEvalResults[p.id] || ossEvalResults[p.id]) && (
                  <div className="eval-result-box" style={{ animation: 'fadeIn 0.3s ease', padding: '16px', fontSize: '0.8rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 500 }}>Gemini Rank:</span>
                        <span className={`rank-badge ${evalResults[p.id]?.evaluation?.recommendation_rank ? '' : 'missing'}`} style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
                          {evalResults[p.id]?.evaluation?.recommendation_rank || 'N/A'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 500 }}>Claude Rank:</span>
                        <span className={`rank-badge ${ossEvalResults[p.id]?.evaluation?.recommendation_rank ? '' : 'missing'}`} style={{ fontSize: '0.8rem', padding: '4px 10px', background: '#ffedd5', color: '#c2410c' }}>
                          {ossEvalResults[p.id]?.evaluation?.recommendation_rank || 'N/A'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 500 }}>Google Rank:</span>
                        <span className={`rank-badge ${googleEvalResults[p.id]?.evaluation?.recommendation_rank ? '' : 'missing'}`} style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
                          {googleEvalResults[p.id]?.evaluation?.recommendation_rank || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )
      }

      {
        hoveredDetail && !selectedDetail && (
          <div className="hover-detail-panel" style={{ animation: 'slideRight 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}>
            <div className="modal-section">
              <span className="modal-label" style={{ color: 'var(--primary)' }}>Quick Preview: {hoveredDetail.intent_category}</span>
              <p className="modal-text" style={{ fontStyle: 'italic', fontSize: '0.95rem', color: '#334155', fontWeight: 500 }}>"{hoveredDetail.prompt_text}"</p>
            </div>

            <div className="modal-section" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <span className="modal-label" style={{ color: 'var(--primary)' }}>Gemini Output</span>
                  {evalResults[hoveredDetail.promptId] ? (
                    <div className="response-full" style={{ padding: '16px', fontSize: '0.85rem', maxHeight: '150px', overflowY: 'auto' }}>
                      {evalResults[hoveredDetail.promptId].response_text}
                    </div>
                  ) : <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Not analyzed</p>}
                </div>
                <div>
                  <span className="modal-label" style={{ color: '#c2410c' }}>Claude Output</span>
                  {ossEvalResults[hoveredDetail.promptId] ? (
                    <div className="response-full" style={{ padding: '16px', fontSize: '0.85rem', borderLeft: '3px solid #f97316', background: '#fff7ed', maxHeight: '150px', overflowY: 'auto' }}>
                      {ossEvalResults[hoveredDetail.promptId].response_text}
                    </div>
                  ) : <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Not analyzed</p>}
                </div>
                <div>
                  <span className="modal-label" style={{ color: 'var(--accent)' }}>Google AI Search Output</span>
                  {googleEvalResults[hoveredDetail.promptId] ? (
                    <div className="response-full" style={{ padding: '16px', fontSize: '0.85rem', borderLeft: '3px solid var(--accent)', background: '#f0fdfa', maxHeight: '150px', overflowY: 'auto' }}>
                      {googleEvalResults[hoveredDetail.promptId].response_text}
                    </div>
                  ) : <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Not analyzed</p>}
                </div>
              </div>
            </div>
          </div>
        )
      }

      {
        selectedDetail && (
          <div className="modal-backdrop" onClick={() => { setSelectedDetail(null); setShowDetails(false); }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="close-btn" onClick={() => { setSelectedDetail(null); setShowDetails(false); }}>&times;</button>

              <div className="modal-section">
                <span className="modal-label" style={{ color: 'var(--primary)' }}>Detailed Analysis: {selectedDetail.intent_category}</span>
                <p className="modal-text" style={{ fontStyle: 'italic', fontSize: '1.4rem', fontWeight: 600, color: '#0f172a' }}>"{selectedDetail.prompt_text}"</p>
              </div>

              <div className="modal-section" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '32px' }}>
                {/* LAYER 1: Executive Summary & Leaderboard */}
                <div className="summary-container" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '24px' }}>
                  {/* Gemini Summary */}
                  <div className="summary-card">
                    <div className="stat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <span className="modal-label" style={{ marginBottom: 0, color: 'var(--primary)' }}>Gemini Summary</span>
                      {evalResults[selectedDetail.promptId] ? (
                        <span className={`rank-badge ${evalResults[selectedDetail.promptId]?.evaluation?.recommendation_rank ? '' : 'missing'}`}>
                          Rank: {evalResults[selectedDetail.promptId]?.evaluation?.recommendation_rank || 'N/A'}
                        </span>
                      ) : <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Pending Check</span>}
                    </div>

                    {evalResults[selectedDetail.promptId] && (
                      <>
                        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span className={`sentiment-dot sentiment-${evalResults[selectedDetail.promptId].evaluation.sentiment}`} />
                            {evalResults[selectedDetail.promptId].evaluation.sentiment}
                          </div>
                          <div>Accuracy: {Math.round(evalResults[selectedDetail.promptId].evaluation.accuracy_score * 100)}%</div>
                        </div>
                        <div className="leaderboard-box">
                          <span className="modal-label" style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Market Leaders</span>
                          {evalResults[selectedDetail.promptId]?.evaluation?.competitor_ranks?.length > 0 ? (
                            evalResults[selectedDetail.promptId].evaluation.competitor_ranks.slice(0, 3).map((comp, idx) => (
                              <div key={idx} className="leaderboard-item">
                                <span className="rank-number" style={{ color: 'var(--primary)', fontWeight: 700 }}>#{comp.rank || (idx + 1)}</span>
                                <span className="leader-name" style={{ fontWeight: 500 }}>{comp.name}</span>
                                {comp.url_cited && <span style={{ fontSize: '0.8rem' }}>🔗</span>}
                              </div>
                            ))
                          ) : <p style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>No competitors cited.</p>}
                        </div>
                      </>
                    )}
                  </div>

                  {/* GPT-OSS Summary */}
                  <div className="summary-card" style={{ borderColor: '#fed7aa', background: '#fffaf5' }}>
                    <div className="stat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <span className="modal-label" style={{ color: '#c2410c', marginBottom: 0 }}>Claude Summary</span>
                      {ossEvalResults[selectedDetail.promptId] ? (
                        <span className={`rank-badge`} style={{ background: '#ffedd5', color: '#c2410c' }}>
                          Rank: {ossEvalResults[selectedDetail.promptId]?.evaluation?.recommendation_rank || 'N/A'}
                        </span>
                      ) : <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Pending Check</span>}
                    </div>

                    {ossEvalResults[selectedDetail.promptId] && (
                      <>
                        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', fontSize: '0.85rem', color: '#9a3412', fontWeight: 500 }}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span className={`sentiment-dot sentiment-${ossEvalResults[selectedDetail.promptId].evaluation.sentiment}`} />
                            {ossEvalResults[selectedDetail.promptId].evaluation.sentiment}
                          </div>
                          <div>Accuracy: {Math.round(ossEvalResults[selectedDetail.promptId].evaluation.accuracy_score * 100)}%</div>
                        </div>
                        <div className="leaderboard-box" style={{ background: 'white' }}>
                          <span className="modal-label" style={{ fontSize: '0.65rem', color: '#c2410c' }}>Market Leaders</span>
                          {ossEvalResults[selectedDetail.promptId]?.evaluation?.competitor_ranks?.length > 0 ? (
                            ossEvalResults[selectedDetail.promptId].evaluation.competitor_ranks.slice(0, 3).map((comp, idx) => (
                              <div key={idx} className="leaderboard-item">
                                <span className="rank-number" style={{ color: '#f97316', fontWeight: 700 }}>#{comp.rank || (idx + 1)}</span>
                                <span className="leader-name" style={{ fontWeight: 500 }}>{comp.name}</span>
                                {comp.url_cited && <span style={{ fontSize: '0.8rem' }}>🔗</span>}
                              </div>
                            ))
                          ) : <p style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>No competitors cited.</p>}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Google Summary */}
                  <div className="summary-card" style={{ borderColor: '#99f6e4', background: '#f0fdfa' }}>
                    <div className="stat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <span className="modal-label" style={{ color: 'var(--accent)', marginBottom: 0 }}>Google AI Search</span>
                      {googleEvalResults[selectedDetail.promptId] ? (
                        <span className={`rank-badge ${googleEvalResults[selectedDetail.promptId]?.evaluation?.recommendation_rank ? '' : 'missing'}`}>
                          Rank: {googleEvalResults[selectedDetail.promptId]?.evaluation?.recommendation_rank || 'N/A'}
                        </span>
                      ) : <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Pending Search</span>}
                    </div>

                    {googleEvalResults[selectedDetail.promptId] && (
                      <>
                        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', fontSize: '0.85rem', color: '#0d9488', fontWeight: 500 }}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span className={`sentiment-dot sentiment-${googleEvalResults[selectedDetail.promptId].evaluation.sentiment}`} />
                            {googleEvalResults[selectedDetail.promptId].evaluation.sentiment}
                          </div>
                          <div>Accuracy: {Math.round(googleEvalResults[selectedDetail.promptId].evaluation.accuracy_score * 100)}%</div>
                        </div>
                        <div className="leaderboard-box" style={{ background: 'white' }}>
                          <span className="modal-label" style={{ fontSize: '0.65rem', color: 'var(--accent)' }}>Search Dominance</span>
                          {googleEvalResults[selectedDetail.promptId]?.evaluation?.competitor_ranks?.length > 0 ? (
                            googleEvalResults[selectedDetail.promptId].evaluation.competitor_ranks.slice(0, 3).map((comp, idx) => (
                              <div key={idx} className="leaderboard-item">
                                <span className="rank-number" style={{ color: 'var(--accent)', fontWeight: 700 }}>#{comp.rank || (idx + 1)}</span>
                                <span className="leader-name" style={{ fontWeight: 500 }}>{comp.name}</span>
                                {comp.url_cited && <span style={{ fontSize: '0.8rem' }}>🔗</span>}
                              </div>
                            ))
                          ) : <p style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>No external leaders found.</p>}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* LAYER 2: Transition Toggle */}
                {(evalResults[selectedDetail.promptId] || googleEvalResults[selectedDetail.promptId] || ossEvalResults[selectedDetail.promptId]) ? (
                  <button className="detailed-toggle-btn" onClick={() => setShowDetails(!showDetails)}>
                    {showDetails ? '▲ Hide Technical Reasoning' : '▼ Explore Detailed AI Reasoning & Full Output'}
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
                    <button onClick={() => handleEvaluatePrompt(selectedDetail, selectedDetail.promptId, 'standard')} style={{ flex: 1, padding: '16px', borderRadius: '12px', background: 'var(--primary)', border: 'none', color: 'white', fontWeight: 600 }}>Run Gemini</button>
                    <button onClick={() => handleEvaluatePrompt(selectedDetail, selectedDetail.promptId, 'oss')} style={{ flex: 1, padding: '16px', borderRadius: '12px', background: '#f97316', border: 'none', color: 'white', fontWeight: 600 }}>Run Claude</button>
                    <button onClick={() => handleEvaluatePrompt(selectedDetail, selectedDetail.promptId, 'google')} style={{ flex: 1, padding: '16px', borderRadius: '12px', background: 'var(--accent)', border: 'none', color: 'white', fontWeight: 600 }}>Run Google Search</button>
                  </div>
                )}

                {/* LAYER 3: Detailed Output */}
                <div className={`response-details-container ${showDetails ? 'expanded' : 'collapsed'}`}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '24px', alignItems: 'start' }}>
                    {/* Gemini Detailed */}
                    <div>
                      <span className="modal-label" style={{ color: 'var(--primary)' }}>Gemini Full Transcript</span>
                      {evalResults[selectedDetail.promptId] && (
                        <div className="response-full" style={{ borderLeft: '4px solid var(--primary)', background: '#f8fafc', height: '500px', overflowY: 'auto' }}>
                          <div>{evalResults[selectedDetail.promptId].response_text}</div>
                        </div>
                      )}
                    </div>

                    {/* OSS Detailed */}
                    <div>
                      <span className="modal-label" style={{ color: '#f97316' }}>Claude Full Transcript</span>
                      {ossEvalResults[selectedDetail.promptId] && (
                        <div className="response-full" style={{ borderLeft: '4px solid #f97316', background: '#fffaf5', height: '500px', overflowY: 'auto' }}>
                          <div>{ossEvalResults[selectedDetail.promptId].response_text}</div>
                        </div>
                      )}
                    </div>

                    {/* Google Detailed */}
                    <div>
                      <span className="modal-label" style={{ color: 'var(--accent)' }}>Google Search Full Transcript</span>
                      {googleEvalResults[selectedDetail.promptId] && (
                        <>
                          <div className="response-full" style={{ borderLeft: '4px solid var(--accent)', background: '#f0fdfa', height: '500px', overflowY: 'auto' }}>
                            <div>{googleEvalResults[selectedDetail.promptId].response_text}</div>
                          </div>

                          {googleEvalResults[selectedDetail.promptId].sources && googleEvalResults[selectedDetail.promptId].sources.length > 0 && (
                            <div className="source-list" style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
                              <span className="modal-label" style={{ fontSize: '0.7rem', color: 'var(--accent)', marginBottom: '16px' }}>Verified Search Citations</span>
                              {googleEvalResults[selectedDetail.promptId].sources.map((source, idx) => (
                                <a key={idx} href={source.url} target="_blank" rel="noopener noreferrer" className="source-item" style={{ padding: '16px', background: 'white' }}>
                                  <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>{source.title}</div>
                                  <span className="source-url" style={{ color: '#94a3b8' }}>{source.url}</span>
                                </a>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <div className="toast-icon" />
            {toast.message}
          </div>
        ))}
      </div>
    </main >
  );
}
