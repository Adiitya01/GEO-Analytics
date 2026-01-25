"use client";

import { Settings, LayoutDashboard, Bookmark, Search } from 'lucide-react';

const Sidebar = ({ isOpen, toggleSidebar, activeView, setActiveView }) => {
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
            style={{ color: '#2563eb' }}
        >
            <path d="M19 2l-14 10 14 10z" />
        </svg>
    );

    return (
        <aside className={`sidebar-container ${isOpen ? 'open' : 'closed'}`}>
            {/* Header with Menu Title and Toggle */}
            <div className="sidebar-header">
                <span className={`header-title ${isOpen ? 'visible' : 'hidden'}`} style={{ color: '#ffffff', fontWeight: '800' }}>
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
                            <item.icon size={20} className="nav-icon" />
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
                <div className="footer-line"></div>
                <div className={`footer-text ${isOpen ? 'visible' : 'hidden'}`}>
                    GEO Analytics v1.0
                </div>
                <div className="footer-line"></div>
            </div>
        </aside>
    );
};

export default Sidebar;
