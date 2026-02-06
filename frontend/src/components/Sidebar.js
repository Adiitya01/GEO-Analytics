"use client";

import { useState, useEffect } from 'react';
import { Settings, LayoutDashboard, Bookmark, Search, LogOut, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const Sidebar = ({ isOpen, toggleSidebar, activeView, setActiveView }) => {
    const { user, logout } = useAuth();
    const [sessionId] = useState(() => `SES-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`);
    const menuItems = [
        { id: 'audit', name: 'Home', icon: Search },
        { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
        { id: 'references', name: 'References', icon: Bookmark },
        { id: 'settings', name: 'Settings', icon: Settings },
    ];

    // Custom Triangle Icon similar to the image
    const TriangleIcon = ({ isOpen }) => (
        <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="currentColor"
            className={`transition-transform duration-300 ${isOpen ? '' : 'rotate-180'}`}
            style={{ color: 'var(--primary)' }}
        >
            <path d="M19 2l-14 10 14 10z" />
        </svg>
    );

    return (
        <aside className={`sidebar-container ${isOpen ? 'open' : 'closed'}`}>
            {/* Header with Menu Title and Toggle */}
            <div className="sidebar-header">
                <span className={`header-title ${isOpen ? 'visible' : 'hidden'}`} style={{ color: 'var(--foreground)', fontWeight: '900' }}>
                    Menu
                </span>
                <button onClick={toggleSidebar} className="toggle-btn" style={{ marginLeft: 'auto' }}>
                    <TriangleIcon isOpen={isOpen} />
                </button>
            </div>

            <div className="sidebar-divider"></div>

            {/* Tools Section */}
            <div className="sidebar-section flex-grow" style={{ marginTop: '16px' }}>
                <span className={`section-label ${isOpen ? 'visible' : 'hidden'}`}>TOOLS</span>
                <nav className="nav-menu">
                    {menuItems.map((item) => (
                        <div
                            key={item.id}
                            className={`nav-item ${activeView === item.id ? 'active' : ''}`}
                            onClick={() => setActiveView(item.id)}
                        >
                            <item.icon size={22} className="nav-icon" />
                            <span className={`nav-text ${isOpen ? 'visible' : 'hidden'}`}>
                                {item.name}
                            </span>
                            {!isOpen && <div className="nav-tooltip">{item.name}</div>}
                        </div>
                    ))}
                </nav>
            </div>

            {/* Footer Version */}
            <div className="sidebar-footer">
                {user && (
                    <div className={`user-profile ${isOpen ? 'visible' : 'minified'}`} style={{ marginBottom: '16px', padding: isOpen ? '0 12px' : '0', width: '100%' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            background: isOpen ? 'rgba(255,255,255,0.05)' : 'transparent',
                            padding: isOpen ? '12px' : '0',
                            borderRadius: '12px',
                            justifyContent: isOpen ? 'flex-start' : 'center',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                minWidth: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: 'var(--primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <User size={18} color="white" />
                            </div>
                            {isOpen && (
                                <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#f1f5f9', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{user.full_name || 'GEO User'}</div>
                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{user.email}</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {user && (
                    <div
                        className="nav-item logout-btn"
                        onClick={logout}
                        style={{ color: '#f87171', marginBottom: '16px', width: '100%', justifyContent: isOpen ? 'flex-start' : 'center' }}
                    >
                        <LogOut size={22} className="nav-icon" />
                        <span className={`nav-text ${isOpen ? 'visible' : 'hidden'}`}>Logout</span>
                        {!isOpen && <div className="nav-tooltip">Logout</div>}
                    </div>
                )}

                <div className="footer-line"></div>
                <div className={`footer-text ${isOpen ? 'visible' : 'hidden'}`}>
                    GEO Analytics v1.0
                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '4px', fontWeight: '400' }}>
                        ID: {sessionId}
                    </div>
                </div>
                <div className="footer-line"></div>
            </div>
        </aside>
    );
};

export default Sidebar;
