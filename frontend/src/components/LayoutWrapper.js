"use client";

import { useState } from 'react';
import Sidebar from './Sidebar';
import { NavProvider, useNav } from '@/context/NavContext';
import { useAuth } from '@/context/AuthContext';

function LayoutContent({ children }) {
    const [isOpen, setIsOpen] = useState(true);
    const { activeView, setActiveView } = useNav();
    const { user } = useAuth();

    console.log("LayoutContent User:", user);

    const toggleSidebar = () => {
        setIsOpen(!isOpen);
    };

    // If no user, just render children without sidebar layout
    if (!user) {
        return <div id="auth-root-wrapper" className="auth-only-view">{children}</div>;
    }

    return (
        <div className={`main-wrapper ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
            <Sidebar
                isOpen={isOpen}
                toggleSidebar={toggleSidebar}
                activeView={activeView}
                setActiveView={setActiveView}
            />
            <div className="content-area">
                {children}
            </div>
        </div>
    );
}

export default function LayoutWrapper({ children }) {
    return (
        <NavProvider>
            <LayoutContent>{children}</LayoutContent>
        </NavProvider>
    );
}
