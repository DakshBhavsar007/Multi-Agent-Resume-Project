import React, { useState, useEffect, useRef } from 'react';
import { Country, State, City } from 'country-state-city';

export function LocationSelector({ value, onChange, isLight = false }) {
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  // Prevent circular update loops by keeping track of the last value we generated internally
  const lastInternalValueRef = useRef('');

  useEffect(() => {
    // If the change came from our own dropdown changes, ignore it to prevent resetting dropdown state
    if (value === lastInternalValueRef.current) {
      return;
    }

    if (!value) {
      setSelectedCountry('');
      setSelectedState('');
      setSelectedCity('');
      setCustomLocation('');
      setIsCustom(false);
      return;
    }

    const parts = value.split(',').map(p => p.trim());
    if (parts.length === 3) {
      const [cityName, stateName, countryName] = parts;
      
      // Find country by name
      const countries = Country.getAllCountries();
      const countryObj = countries.find(c => c.name.toLowerCase() === countryName.toLowerCase());
      
      if (countryObj) {
        // Find state by name
        const states = State.getStatesOfCountry(countryObj.isoCode);
        const stateObj = states.find(s => s.name.toLowerCase() === stateName.toLowerCase());
        
        if (stateObj) {
          // Find city by name
          const cities = City.getCitiesOfState(countryObj.isoCode, stateObj.isoCode);
          const cityObj = cities.find(c => c.name.toLowerCase() === cityName.toLowerCase());
          
          if (cityObj) {
            setSelectedCountry(countryObj.isoCode);
            setSelectedState(stateObj.isoCode);
            setSelectedCity(cityObj.name);
            setIsCustom(false);
            return;
          }
        }
      }
    }

    // Fallback: If not standard 3-part or not matching database, treat as Custom
    setIsCustom(true);
    setSelectedCountry('Other');
    setCustomLocation(value);
  }, [value]);

  const handleCountryChange = (e) => {
    const countryIso = e.target.value;
    setSelectedCountry(countryIso);
    setSelectedState('');
    setSelectedCity('');
    
    if (countryIso === 'Other') {
      setIsCustom(true);
      setCustomLocation('');
      lastInternalValueRef.current = '';
      onChange('');
    } else {
      setIsCustom(false);
      if (countryIso) {
        const countryObj = Country.getCountryByCode(countryIso);
        const newVal = countryObj ? countryObj.name : '';
        lastInternalValueRef.current = newVal;
        onChange(newVal);
      } else {
        lastInternalValueRef.current = '';
        onChange('');
      }
    }
  };

  const handleStateChange = (e) => {
    const stateIso = e.target.value;
    setSelectedState(stateIso);
    setSelectedCity('');
    
    if (stateIso && selectedCountry) {
      const countryObj = Country.getCountryByCode(selectedCountry);
      const stateObj = State.getStateByCodeAndCountry(stateIso, selectedCountry);
      const newVal = `${stateObj ? stateObj.name : ''}, ${countryObj ? countryObj.name : ''}`;
      lastInternalValueRef.current = newVal;
      onChange(newVal);
    } else {
      const countryObj = Country.getCountryByCode(selectedCountry);
      const newVal = countryObj ? countryObj.name : '';
      lastInternalValueRef.current = newVal;
      onChange(newVal);
    }
  };

  const handleCityChange = (e) => {
    const cityName = e.target.value;
    setSelectedCity(cityName);
    
    if (cityName && selectedState && selectedCountry) {
      const countryObj = Country.getCountryByCode(selectedCountry);
      const stateObj = State.getStateByCodeAndCountry(selectedState, selectedCountry);
      const newVal = `${cityName}, ${stateObj ? stateObj.name : ''}, ${countryObj ? countryObj.name : ''}`;
      lastInternalValueRef.current = newVal;
      onChange(newVal);
    } else if (selectedState && selectedCountry) {
      const countryObj = Country.getCountryByCode(selectedCountry);
      const stateObj = State.getStateByCodeAndCountry(selectedState, selectedCountry);
      const newVal = `${stateObj ? stateObj.name : ''}, ${countryObj ? countryObj.name : ''}`;
      lastInternalValueRef.current = newVal;
      onChange(newVal);
    }
  };

  const handleCustomChange = (e) => {
    const text = e.target.value;
    setCustomLocation(text);
    lastInternalValueRef.current = text;
    onChange(text);
  };

  const selectClass = isLight 
    ? "w-full p-2.5 bg-white border border-gray-200 focus:border-accent rounded-xl text-xs font-bold text-charcoal focus:outline-none transition-colors"
    : "w-full p-2.5 bg-white border border-gray-200 focus:border-accent rounded-xl text-xs font-bold text-charcoal focus:outline-none transition-colors dark:bg-[#18181B] dark:border-gray-800 dark:text-white";

  const labelClass = "text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block pl-0.5";

  // Dynamic lists from library
  const countries = Country.getAllCountries();
  const states = selectedCountry && selectedCountry !== 'Other' ? State.getStatesOfCountry(selectedCountry) : [];
  const cities = selectedCountry && selectedCountry !== 'Other' && selectedState ? City.getCitiesOfState(selectedCountry, selectedState) : [];

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
            {countries.map(c => (
              <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
            ))}
            <option value="Other">Other / Custom</option>
          </select>
        </div>

        {/* State Select */}
        {!isCustom && selectedCountry && states.length > 0 && (
          <div>
            <label className={labelClass}>State / Region</label>
            <select 
              value={selectedState} 
              onChange={handleStateChange}
              className={selectClass}
              required
            >
              <option value="">Select State</option>
              {states.map(s => (
                <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* City Select */}
        {!isCustom && selectedState && cities.length > 0 && (
          <div>
            <label className={labelClass}>City</label>
            <select 
              value={selectedCity} 
              onChange={handleCityChange}
              className={selectClass}
              required
            >
              <option value="">Select City</option>
              {cities.map(c => (
                <option key={c.name} value={c.name}>{c.name}</option>
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
