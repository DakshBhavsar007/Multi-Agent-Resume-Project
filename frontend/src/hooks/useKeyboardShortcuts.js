import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Global keyboard shortcuts hook.
 * Ctrl+K → Focus search / open search modal
 * Ctrl+N → New action (session for recruiter, resume for seeker)
 * Esc → Close modals / clear focus
 */
export default function useKeyboardShortcuts({ onSearch, onNew, onEscape } = {}) {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea' || document.activeElement?.contentEditable === 'true';

      // Ctrl+K — Search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (onSearch) {
          onSearch();
        } else {
          // Try to focus the first search input on the page
          const searchInput = document.querySelector('[data-search-input]') || document.querySelector('input[type="search"]') || document.querySelector('input[placeholder*="earch"]');
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          }
        }
      }

      // Ctrl+N — New
      if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !isInput) {
        e.preventDefault();
        if (onNew) {
          onNew();
        }
      }

      // Escape — Close / blur
      if (e.key === 'Escape') {
        if (onEscape) {
          onEscape();
        }
        // Close any open modals by blurring active element
        if (document.activeElement) {
          document.activeElement.blur();
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, onSearch, onNew, onEscape]);
}
