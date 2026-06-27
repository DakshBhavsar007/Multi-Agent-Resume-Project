import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      window.dispatchEvent(new Event('theme_changed'));
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      window.dispatchEvent(new Event('theme_changed'));
    }
  };

  useEffect(() => {
    const syncTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    window.addEventListener('theme_changed', syncTheme);
    return () => window.removeEventListener('theme_changed', syncTheme);
  }, []);

  return (
    <button
      onClick={toggleTheme}
      className="w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center justify-center text-gray-500 dark:text-zinc-400 transition-all duration-300 relative group overflow-hidden"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        {isDark ? (
          <Sun className="h-5 w-5 text-amber-500 transform rotate-0 scale-100 transition-all duration-300" />
        ) : (
          <Moon className="h-5 w-5 text-slate-700 transform rotate-0 scale-100 transition-all duration-300" />
        )}
      </div>
    </button>
  );
}
