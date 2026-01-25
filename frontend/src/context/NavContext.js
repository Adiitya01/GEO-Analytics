"use client";

import { createContext, useContext, useState } from 'react';

const NavContext = createContext();

export function NavProvider({ children }) {
    const [activeView, setActiveView] = useState('audit'); // Default view

    return (
        <NavContext.Provider value={{ activeView, setActiveView }}>
            {children}
        </NavContext.Provider>
    );
}

export function useNav() {
    return useContext(NavContext);
}
