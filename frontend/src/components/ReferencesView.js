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
                    background: 'var(--card-bg)',
                    borderRadius: '28px',
                    border: 'var(--glass-border)',
                    maxWidth: '500px',
                    boxShadow: 'var(--glass-shadow)',
                    backdropFilter: 'blur(20px)'
                }}>
                    <Bookmark size={80} style={{ color: 'var(--accent)', marginBottom: '32px', opacity: 0.8 }} />
                    <h2 style={{ color: '#ffffff', fontSize: '2rem', marginBottom: '16px', fontWeight: 800 }}>No References Stored</h2>
                    <p style={{ color: '#a1a1aa', lineHeight: '1.6', marginBottom: '32px' }}>
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
                    <h1 style={{ textAlign: 'left', fontSize: '3rem', marginBottom: '12px', letterSpacing: '-0.02em' }}>
                        Stored <span style={{ color: 'var(--accent)' }}>References</span>
                    </h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ padding: '4px 12px', background: 'rgba(45, 212, 191, 0.1)', border: '1px solid rgba(45, 212, 191, 0.2)', borderRadius: '100px', color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 600 }}>
                            {allReferences.length} Total Citations
                        </div>
                        <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Repositories of knowledge accessed by AI models</span>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '32px' }}>
                {Object.entries(byProvider).map(([providerName, refs]) => (
                    <div key={providerName} className="report-card" style={{ margin: 0, padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div style={{
                            padding: '24px',
                            background: providerName === 'Claude' ? 'rgba(255, 107, 0, 0.1)' : providerName === 'Google AI' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            {providerName === 'Google AI' ? <Search size={24} color="var(--accent)" /> :
                                providerName === 'Claude' ? <Layers size={24} color="#ff6b00" /> :
                                    <Globe size={24} color="var(--primary)" />}

                            <div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white' }}>{providerName}</h3>
                                <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{refs.length} visited sources</p>
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
                                        background: 'rgba(255,255,255,0.03)',
                                        padding: '16px',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        textDecoration: 'none',
                                        transition: 'all 0.2s ease'
                                    }}
                                    className="reference-item-hover"
                                >
                                    <div style={{ fontSize: '0.9rem', color: 'white', fontWeight: 600, marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                                            {ref.title || new URL(ref.url).hostname}
                                        </span>
                                        <ExternalLink size={14} style={{ opacity: 0.5 }} />
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {ref.url}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: '#475569', fontStyle: 'italic', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', marginTop: '8px' }}>
                                        From query: "{ref.promptText.length > 40 ? ref.promptText.substring(0, 40) + '...' : ref.promptText}"
                                    </div>
                                </a>
                            )) : (
                                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontStyle: 'italic' }}>
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
