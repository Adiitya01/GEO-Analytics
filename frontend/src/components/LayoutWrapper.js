"use client";

import { useState } from 'react';
import Sidebar from './Sidebar';
import { NavProvider, useNav } from '@/context/NavContext';

function LayoutContent({ children }) {
    const [isOpen, setIsOpen] = useState(true);
    const { activeView, setActiveView } = useNav();

    const toggleSidebar = () => {
        setIsOpen(!isOpen);
    };

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
