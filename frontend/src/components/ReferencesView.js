"use client";

import { Bookmark, ExternalLink, Globe, Layers, Search } from 'lucide-react';

export default function ReferencesView({
    prompts = [],
    evalResults = {},
    googleEvalResults = {},
    ossEvalResults = {}
}) {
    // 1. Aggegrate all sources
    const allReferences = [];

    prompts.forEach((p) => {
        const pId = p.id;

        // Gemini Sources
        const geminiSources = evalResults[pId]?.sources || [];
        geminiSources.forEach(s => allReferences.push({ ...s, provider: 'Gemini', promptText: p.prompt_text, date: new Date().toLocaleDateString() }));

        // Claude Sources
        const claudeSources = ossEvalResults[pId]?.sources || [];
        claudeSources.forEach(s => allReferences.push({ ...s, provider: 'Claude', promptText: p.prompt_text, date: new Date().toLocaleDateString() }));

        // Google Sources
        const googleSources = googleEvalResults[pId]?.sources || [];
        googleSources.forEach(s => allReferences.push({ ...s, provider: 'Google AI', promptText: p.prompt_text, date: new Date().toLocaleDateString() }));
    });

    // 2. Group by Provider for the "Stored" view
    const byProvider = {
        'Gemini': allReferences.filter(r => r.provider === 'Gemini'),
        'Claude': allReferences.filter(r => r.provider === 'Claude'),
        'Google AI': allReferences.filter(r => r.provider === 'Google AI')
    };

    if (allReferences.length === 0) {
        return (
            <div style={{
                height: '80vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'fadeIn 0.5s ease-out'
            }}>
                <div style={{
                    padding: '60px',
                    textAlign: 'center',
                    background: 'white',
                    borderRadius: '32px',
                    border: '1px solid rgba(0,0,0,0.08)',
                    maxWidth: '500px',
                    boxShadow: '0 30px 60px -12px rgba(0,0,0,0.08)',
                }}>
                    <Bookmark size={80} style={{ color: 'var(--accent)', marginBottom: '32px', opacity: 0.8 }} />
                    <h2 style={{ color: 'var(--foreground)', fontSize: '2rem', marginBottom: '16px', fontWeight: 800 }}>No References Stored</h2>
                    <p style={{ color: '#64748b', lineHeight: '1.6', marginBottom: '32px' }}>
                        Run an analysis to populate the list of sites visited by Gemini, Claude, and Google AI during their generation process.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '40px 60px', maxWidth: '1400px', margin: '0 auto', animation: 'fadeIn 0.6s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '48px' }}>
                <div>
                    <h1 style={{ textAlign: 'left', fontSize: '3rem', marginBottom: '12px', letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Stored <span style={{ color: 'var(--accent)', WebkitTextFillColor: 'initial' }}>References</span>
                    </h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ padding: '4px 12px', background: 'rgba(13, 148, 136, 0.08)', border: '1px solid rgba(13, 148, 136, 0.1)', borderRadius: '100px', color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 600 }}>
                            {allReferences.length} Total Citations
                        </div>
                        <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Repositories of knowledge accessed by AI models</span>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '32px' }}>
                {Object.entries(byProvider).map(([providerName, refs]) => (
                    <div key={providerName} className="report-card" style={{ margin: 0, padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'white', border: '1px solid rgba(0,0,0,0.08)' }}>
                        <div style={{
                            padding: '24px',
                            background: providerName === 'Claude' ? '#fff7ed' : providerName === 'Google AI' ? '#f0fdf4' : '#eff6ff',
                            borderBottom: '1px solid rgba(0,0,0,0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            {providerName === 'Google AI' ? <Search size={24} style={{ color: '#16a34a' }} /> :
                                providerName === 'Claude' ? <Layers size={24} style={{ color: '#ea580c' }} /> :
                                    <Globe size={24} style={{ color: '#2563eb' }} />}

                            <div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--foreground)' }}>{providerName}</h3>
                                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>{refs.length} visited sources</p>
                            </div>
                        </div>

                        <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '600px', overflowY: 'auto' }}>
                            {refs.length > 0 ? refs.map((ref, idx) => (
                                <a
                                    key={idx}
                                    href={ref.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'block',
                                        background: 'white',
                                        padding: '12px 20px',
                                        borderRadius: '100px',
                                        border: '1px solid #f1f5f9',
                                        textDecoration: 'none',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                        marginBottom: '8px'
                                    }}
                                    className="reference-item-card"
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.borderColor = providerName === 'Claude' ? '#ea580c' : providerName === 'Google AI' ? '#16a34a' : '#2563eb';
                                        e.currentTarget.style.transform = 'scale(1.02)';
                                        e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.08)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.borderColor = '#f1f5f9';
                                        e.currentTarget.style.transform = 'scale(1)';
                                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                        <div style={{
                                            width: '36px',
                                            height: '36px',
                                            background: '#f1f5f9',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0
                                        }}>
                                            {ref.favicon ? (
                                                <img src={ref.favicon} alt="" style={{ width: '20px', height: '20px', objectFit: 'contain' }}
                                                    onError={(e) => e.target.style.display = 'none'} />
                                            ) : <Globe size={18} style={{ color: '#94a3b8' }} />}
                                        </div>

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontSize: '0.9rem',
                                                fontWeight: 600,
                                                color: '#334155',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {ref.title || ref.domain || 'Verified Source'}
                                            </div>
                                        </div>

                                        <ExternalLink size={14} style={{ color: '#cbd5e1', flexShrink: 0 }} />
                                    </div>
                                </a>
                            )) : (
                                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontStyle: 'italic' }}>
                                    No citations recorded for this provider.
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
