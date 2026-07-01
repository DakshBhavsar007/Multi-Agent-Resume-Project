import React, { useState, useEffect } from 'react';
import { countriesData } from '../../lib/countriesData';

export function LocationSelector({ value, onChange, isLight = false }) {
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  // Parse initial value on mount or when value changes
  useEffect(() => {
    if (!value) {
      setSelectedCountry('');
      setSelectedState('');
      setSelectedCity('');
      setCustomLocation('');
      setIsCustom(false);
      return;
    }

    // Expected format: "City, State, Country"
    const parts = value.split(',').map(p => p.trim());
    if (parts.length === 3) {
      const [city, state, country] = parts;
      if (countriesData[country] && countriesData[country][state] && countriesData[country][state].includes(city)) {
        setSelectedCountry(country);
        setSelectedState(state);
        setSelectedCity(city);
        setIsCustom(false);
        return;
      }
    }

    // If it doesn't match standard hierarchy, treat as custom
    setIsCustom(true);
    setSelectedCountry('Other');
    setCustomLocation(value);
  }, [value]);

  // Handle Country Change
  const handleCountryChange = (e) => {
    const country = e.target.value;
    setSelectedCountry(country);
    setSelectedState('');
    setSelectedCity('');
    
    if (country === 'Other') {
      setIsCustom(true);
      setCustomLocation('');
      onChange('');
    } else {
      setIsCustom(false);
      onChange(country ? `Select State, ${country}` : '');
    }
  };

  // Handle State Change
  const handleStateChange = (e) => {
    const state = e.target.value;
    setSelectedState(state);
    setSelectedCity('');
    onChange(state ? `Select City, ${state}, ${selectedCountry}` : `${selectedCountry}`);
  };

  // Handle City Change
  const handleCityChange = (e) => {
    const city = e.target.value;
    setSelectedCity(city);
    if (city) {
      onChange(`${city}, ${selectedState}, ${selectedCountry}`);
    } else {
      onChange(`${selectedState}, ${selectedCountry}`);
    }
  };

  // Handle Custom Location Change
  const handleCustomChange = (e) => {
    const text = e.target.value;
    setCustomLocation(text);
    onChange(text);
  };

  const selectClass = isLight 
    ? "w-full p-2.5 bg-white border border-gray-200 focus:border-accent rounded-xl text-xs font-bold text-charcoal focus:outline-none transition-colors"
    : "w-full p-2.5 bg-white border border-gray-200 focus:border-accent rounded-xl text-xs font-bold text-charcoal focus:outline-none transition-colors dark:bg-[#18181B] dark:border-gray-800 dark:text-white";

  const labelClass = "text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block pl-0.5";

  return (
    <div className="space-y-3 w-full">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Country Select */}
        <div>
          <label className={labelClass}>Country</label>
          <select 
            value={selectedCountry} 
            onChange={handleCountryChange}
            className={selectClass}
          >
            <option value="">Select Country</option>
            {Object.keys(countriesData).map(country => (
              <option key={country} value={country}>{country}</option>
            ))}
            <option value="Other">Other / Custom</option>
          </select>
        </div>

        {/* State Select */}
        {!isCustom && selectedCountry && (
          <div>
            <label className={labelClass}>State / Region</label>
            <select 
              value={selectedState} 
              onChange={handleStateChange}
              className={selectClass}
              required
            >
              <option value="">Select State</option>
              {Object.keys(countriesData[selectedCountry] || {}).map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>
        )}

        {/* City Select */}
        {!isCustom && selectedState && (
          <div>
            <label className={labelClass}>City</label>
            <select 
              value={selectedCity} 
              onChange={handleCityChange}
              className={selectClass}
              required
            >
              <option value="">Select City</option>
              {(countriesData[selectedCountry][selectedState] || []).map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Custom Location input */}
      {isCustom && (
        <div className="transition-all duration-200">
          <label className={labelClass}>Enter Location</label>
          <input 
            type="text"
            placeholder="e.g. Ahmedabad, Gujarat, India"
            value={customLocation}
            onChange={handleCustomChange}
            className={isLight
              ? "w-full p-3 bg-white border border-gray-200 focus:border-accent rounded-xl text-sm font-bold text-charcoal focus:outline-none transition-colors"
              : "w-full p-3 bg-white border border-gray-200 focus:border-accent rounded-xl text-sm font-bold text-charcoal focus:outline-none transition-colors dark:bg-[#18181B] dark:border-gray-800 dark:text-white"
            }
            required
          />
        </div>
      )}
    </div>
  );
}
