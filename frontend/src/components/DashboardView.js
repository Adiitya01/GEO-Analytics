"use client";

import { TrendingUp, Award, Zap, Users, BarChart3, Target, Search, ArrowRight } from 'lucide-react';

export default function DashboardView({ report, companyProfile }) {
    if (!report) {
        return (
            <div style={{
                height: '80vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
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
                    <BarChart3 size={80} style={{ color: 'var(--primary)', marginBottom: '32px', opacity: 0.8 }} />
                    <h2 style={{ color: 'var(--foreground)', fontSize: '2rem', marginBottom: '16px', fontWeight: 800 }}>No Audit Data Found</h2>
                    <p style={{ color: '#64748b', lineHeight: '1.6', marginBottom: '32px' }}>
                        Your performance dashboard is empty. Please run a "Full Visibility Audit" to populate these insights.
                    </p>
                    <button
                        style={{ width: '100%', padding: '16px', background: 'var(--primary)', color: 'white', borderRadius: '12px', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                    >
                        Please Run Audit First
                    </button>
                </div>
            </div>
        );
    }

    // Helper for dynamic colors based on score
    const getScoreColor = (score) => {
        if (score >= 70) return '#10b981'; // Emerald Green
        if (score >= 40) return '#f59e0b'; // Amber/Orange
        return '#ef4444'; // Red
    };

    const scoreColor = getScoreColor(report.overall_score);

    return (
        <div style={{ padding: '40px 60px', maxWidth: '1400px', margin: '0 auto', animation: 'fadeIn 0.6s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '48px' }}>
                <div>
                    <h1 style={{ textAlign: 'left', fontSize: '3rem', marginBottom: '12px', letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Performance <span style={{ color: 'var(--primary)', WebkitTextFillColor: 'initial' }}>Dashboard</span>
                    </h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ padding: '4px 12px', background: 'rgba(37, 99, 235, 0.08)', border: '1px solid rgba(37, 99, 235, 0.1)', borderRadius: '100px', color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 600 }}>
                            {companyProfile?.url || 'Selected Company'}
                        </div>
                        <ArrowRight size={16} style={{ color: '#94a3b8' }} />
                        <span style={{ color: '#64748b', fontSize: '0.9rem' }}>{companyProfile?.region || 'Global'} Analysis</span>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Last Audit</div>
                    <div style={{ color: 'var(--foreground)', fontWeight: 600 }}>{new Date().toLocaleDateString()}</div>
                </div>
            </div>

            {/* Main Score & Top Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '24px', marginBottom: '40px' }}>
                <div className="report-card" style={{ margin: 0, padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', background: 'white', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.05)' }}>
                    <div style={{ position: 'relative', width: '200px', height: '200px', marginBottom: '32px' }}>
                        <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                            <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="#f1f5f9"
                                strokeWidth="2.5"
                            />
                            <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke={scoreColor}
                                strokeWidth="2.5"
                                strokeDasharray={`${report.overall_score}, 100`}
                                strokeLinecap="round"
                                className="score-circle"
                                style={{ transition: 'stroke-dasharray 1s ease-in-out, stroke 1s ease' }}
                            />
                        </svg>
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                            <div style={{ fontSize: '3.5rem', fontWeight: 900, color: 'var(--foreground)', lineHeight: 1 }}>{report.overall_score}</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: scoreColor, textTransform: 'uppercase', letterSpacing: '0.2em', marginTop: '4px' }}>Score</div>
                        </div>
                    </div>
                    <h3 style={{ color: 'var(--foreground)', fontSize: '1.5rem', marginBottom: '12px', fontWeight: 700 }}>
                        {report.is_composite ? 'Composite GEO Authority' : 'Overall GEO Authority'}
                    </h3>
                    <p style={{ fontSize: '1rem', color: '#64748b', maxWidth: '300px' }}>
                        {report.is_composite
                            ? `Weighted average across ${report.provider_count} major generative engines.`
                            : 'Visibility score based on the current engine audit.'}
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: '24px' }}>
                    <div className="report-card" style={{ margin: 0, padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'white', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <div style={{ background: 'rgba(37, 99, 235, 0.08)', padding: '12px', borderRadius: '12px', width: 'fit-content', marginBottom: '20px' }}>
                            <Award size={28} style={{ color: 'var(--primary)' }} />
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Market Authority</div>
                        <div style={{ fontSize: '1.75rem', color: 'var(--foreground)', fontWeight: 800 }}>{report.overall_score >= 70 ? 'Industry Leader' : report.overall_score >= 40 ? 'Established' : 'Emerging'}</div>
                        <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', marginTop: '20px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: scoreColor, width: `${report.overall_score}%`, transition: 'width 1s ease, background 1s ease' }}></div>
                        </div>
                    </div>

                    <div className="report-card" style={{ margin: 0, padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'white', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <div style={{ background: 'rgba(13, 148, 136, 0.08)', padding: '12px', borderRadius: '12px', width: 'fit-content', marginBottom: '20px' }}>
                            <TrendingUp size={28} style={{ color: 'var(--accent)' }} />
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Optimization Level</div>
                        <div style={{ fontSize: '1.75rem', color: 'var(--foreground)', fontWeight: 800 }}>{Math.round(report.overall_score)}% <span style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: 500 }}>Global Rating</span></div>
                    </div>
                </div>

                <div className="report-card" style={{ margin: 0, padding: '32px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ background: 'rgba(124, 58, 237, 0.08)', padding: '12px', borderRadius: '12px', width: 'fit-content', marginBottom: '20px' }}>
                            <Target size={28} style={{ color: '#7c3aed' }} />
                        </div>
                        <h3 style={{ fontSize: '1.25rem', color: 'var(--foreground)', fontWeight: 700, marginBottom: '12px' }}>AI Brand Perception</h3>
                        <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.6' }}>
                            Your brand is primarily associated with <span style={{ color: 'var(--foreground)', fontWeight: 600 }}>"{report.key_findings?.[0]?.split(' ').slice(-3).join(' ') || 'Key Industry Terms'}"</span> across audited models.
                        </p>
                    </div>
                    <div style={{ padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#64748b' }}>
                        💡 Tip: Strengthening citations will boost this metric.
                    </div>
                </div>
            </div>

            {/* Two Column Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '40px' }}>
                <section>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <Search size={24} style={{ color: 'var(--primary)' }} />
                        <h2 style={{ fontSize: '1.5rem', color: 'var(--foreground)', fontWeight: 700 }}>Key Audit Findings</h2>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {(report.key_findings || []).map((finding, i) => (
                            <div key={i} className="finding-item" style={{ animation: `slideUp 0.4s ease-out ${i * 0.1}s both`, background: 'white', padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                <div style={{ color: '#334155', fontSize: '0.95rem', lineHeight: '1.5', fontWeight: 500 }}>{finding}</div>
                            </div>
                        ))}
                    </div>
                </section>

                <section>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <Zap size={24} style={{ color: 'var(--accent)' }} />
                        <h2 style={{ fontSize: '1.5rem', color: 'var(--foreground)', fontWeight: 700 }}>Optimizer Roadmap</h2>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {(report.optimizer_tips || []).map((tip, i) => (
                            <div key={i} className="tip-item" style={{ animation: `slideUp 0.4s ease-out ${i * 0.1 + 0.3}s both`, background: '#f0fdfa', padding: '16px 20px', borderRadius: '16px', border: '1px solid #ccfbf1' }}>
                                <div style={{ color: '#0d9488', fontSize: '0.95rem', lineHeight: '1.5', fontWeight: 600 }}>{tip}</div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            {/* Competitive Landscape */}
            <section style={{ marginBottom: '60px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                    <Users size={24} style={{ color: 'var(--primary)' }} />
                    <h2 style={{ fontSize: '1.5rem', color: 'var(--foreground)', fontWeight: 700 }}>Market Competitor visibility</h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
                    {report.competitor_summary?.map((summary, i) => (
                        <div key={i} style={{
                            background: 'white',
                            padding: '24px',
                            borderRadius: '24px',
                            border: '1px solid rgba(0,0,0,0.06)',
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
                            transition: 'all 0.3s ease'
                        }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.borderColor = 'var(--primary)';
                                e.currentTarget.style.transform = 'translateY(-4px)';
                                e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0,0,0,0.05)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)';
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.02)';
                            }}
                        >
                            <p style={{ color: '#475569', lineHeight: '1.7', fontSize: '0.95rem', fontWeight: 500 }}>{summary}</p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
