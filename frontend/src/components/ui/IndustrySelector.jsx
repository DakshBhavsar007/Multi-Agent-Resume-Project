import React, { useState, useEffect } from 'react';

export const INDUSTRY_OPTIONS = [
  "Technology / Software",
  "SaaS / Cloud",
  "FinTech / Financial Services",
  "Healthcare / MedTech",
  "EdTech / Education",
  "E-commerce / Retail",
  "Consulting / Professional Services",
  "Manufacturing",
  "Media & Entertainment",
  "Logistics / Supply Chain",
  "Real Estate",
  "Legal",
  "Government / Public Sector",
  "Energy / CleanTech",
  "Hospitality / Travel",
  "Agriculture",
  "Automotive",
  "Cybersecurity",
  "Telecommunications",
  "Gaming",
  "HR Tech / Recruitment",
  "Marketing / AdTech",
  "BioTech / Pharma",
  "Defence / Aerospace",
  "Non-Profit / NGO",
  "Banking / Insurance",
  "Design / Creative",
  "Construction",
  "Food & Beverage",
  "Research & Development",
  "Other",
];

/**
 * IndustrySelector — <select> dropdown with 30 standard industries.
 * Selecting "Other" reveals a text input for custom entry.
 *
 * Props:
 *   value        — controlled value (string)
 *   onChange     — (newValue: string) => void
 *   isLight      — bool (true = light theme, false = dark theme for CompleteProfilePage)
 *   className    — extra class override for the select wrapper
 */
export function IndustrySelector({ value, onChange, isLight = true, className = '' }) {
  // If the stored value is not in the predefined list → "Other" selected + custom text
  const isKnown = INDUSTRY_OPTIONS.includes(value);
  const [selected, setSelected] = useState(isKnown ? value : (value ? 'Other' : ''));
  const [custom, setCustom] = useState(!isKnown && value ? value : '');

  // Sync outward when internal state changes
  useEffect(() => {
    if (selected === 'Other') {
      onChange(custom.trim() || '');
    } else {
      onChange(selected);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, custom]);

  // If parent resets value externally (e.g. after profile load)
  useEffect(() => {
    const known = INDUSTRY_OPTIONS.includes(value);
    if (known) {
      setSelected(value);
      setCustom('');
    } else if (value && value !== '') {
      setSelected('Other');
      setCustom(value);
    } else {
      setSelected('');
      setCustom('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lightSelect =
    'w-full p-3 bg-white border border-gray-200 focus:border-accent rounded-xl text-sm font-bold text-charcoal focus:outline-none transition-colors appearance-none';
  const darkSelect =
    'w-full text-xs p-3.5 bg-zinc-950/60 border border-zinc-800/80 rounded-xl text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none transition-colors appearance-none';
  const lightInput =
    'w-full mt-2 p-3 bg-white border border-gray-200 focus:border-accent rounded-xl text-sm font-bold text-charcoal focus:outline-none transition-colors';
  const darkInput =
    'w-full mt-2 text-xs p-3.5 bg-zinc-950/60 border border-zinc-800/80 rounded-xl text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none transition-colors';

  return (
    <div className={className}>
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className={isLight ? lightSelect : darkSelect}
      >
        <option value="">Select industry...</option>
        {INDUSTRY_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>

      {selected === 'Other' && (
        <input
          type="text"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="Type your industry..."
          className={isLight ? lightInput : darkInput}
        />
      )}
    </div>
  );
}
