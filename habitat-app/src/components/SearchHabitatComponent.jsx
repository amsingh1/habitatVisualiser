'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SearchHabitatComponent({ context = 'habitats' }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get current search values from URL
  const currentSearchText = searchParams.get('q') || '';
  const currentField = searchParams.get('field') || 'habitatName'; // Default to habitatName
  const currentMonth = searchParams.get('monthFilter') || 'all';
  const currentYear = searchParams.get('yearFilter') || 'all';
  const currentSort = searchParams.get('sortBy') || 'upload_desc';
  
  // Get advanced search criteria from URL (check if any advanced params exist)
  const hasAdvancedParams = searchParams.has('habitatName') || 
                           searchParams.has('country') || 
                           searchParams.has('state') || 
                           searchParams.has('group') || 
                           searchParams.has('userName');
  const initialAdvancedMode = hasAdvancedParams;
  
  // Available search fields
  const allFields = [
    { id: 'habitatName', label: 'Vegetation type', enabledIn: ['habitats', 'personal'] },
    { id: 'state', label: 'State/Region', enabledIn: ['habitats', 'personal'] },
    { id: 'country', label: 'Country', enabledIn: ['habitats', 'personal'] },
    { id: 'userName', label: 'User Name', enabledIn: ['habitats'] },
    { id: 'group', label: 'Group', enabledIn: ['habitats', 'personal'] },
  ];
  
  // Determine which fields to show based on context
  const availableFields = allFields.filter(field => field.enabledIn.includes(context));
  
  // Month and sort options
  const months = [
    { value: 'all', label: 'All Months' },
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];
  
  const currentYearValue = new Date().getFullYear();
  const years = [
    { value: 'all', label: 'All Years' },
    ...Array.from({ length: currentYearValue - 2024 }, (_, i) => ({
      value: String(currentYearValue - i),
      label: String(currentYearValue - i)
    }))
  ];
  
  const sortOptions = [
    { value: 'upload_desc', label: 'Newest Upload' },
    { value: 'upload_asc', label: 'Oldest Upload' },
    { value: 'observation_desc', label: 'Observation Date (Recent)' },
    { value: 'observation_asc', label: 'Observation Date (Oldest)' },
    { value: 'vegetation_asc', label: 'Vegetation A-Z' },
    { value: 'vegetation_desc', label: 'Vegetation Z-A' },
  ];
  
  // State for simple search mode
  const [searchText, setSearchText] = useState(currentSearchText);
  const [selectedField, setSelectedField] = useState(currentField);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedSort, setSelectedSort] = useState(currentSort);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef(null);
  const suggestionsRef = useRef(null);
  
  // State for advanced search mode
  const [isAdvancedMode, setIsAdvancedMode] = useState(initialAdvancedMode);
  const [advancedCriteria, setAdvancedCriteria] = useState({
    habitatName: '',
    country: '',
    state: '',
    group: '',
    userName: context === 'habitats' ? '' : null,
  });
  const [activeSuggestionField, setActiveSuggestionField] = useState(null);
  const [advancedSuggestions, setAdvancedSuggestions] = useState({});
  const advancedRefs = useRef({});
  
  // Initialize advanced criteria from URL if available
  useEffect(() => {
    if (hasAdvancedParams) {
      setAdvancedCriteria({
        habitatName: searchParams.get('habitatName') || '',
        country: searchParams.get('country') || '',
        state: searchParams.get('state') || '',
        group: searchParams.get('group') || '',
        userName: context === 'habitats' ? (searchParams.get('userName') || '') : null,
      });
    }
  }, [hasAdvancedParams, searchParams, context]);
  
  // Initialize selected field, filters, and sort from URL or localStorage
  useEffect(() => {
    // Only run once on mount
    const savedField = localStorage.getItem(`${context}_searchField`);
    const savedMonth = localStorage.getItem(`${context}_monthFilter`);
    const savedYear = localStorage.getItem(`${context}_yearFilter`);
    const savedSort = localStorage.getItem(`${context}_sortPreference`);
    
    if (currentField && availableFields.some(field => field.id === currentField)) {
      setSelectedField(currentField);
    } else if (savedField && availableFields.some(field => field.id === savedField)) {
      setSelectedField(savedField);
    } else {
      // Default to first available field
      setSelectedField(availableFields[0]?.id || 'habitatName');
    }
    
    // Initialize month filter
    if (currentMonth) {
      setSelectedMonth(currentMonth);
    } else if (savedMonth) {
      setSelectedMonth(savedMonth);
    }
    
    // Initialize year filter
    if (currentYear) {
      setSelectedYear(currentYear);
    } else if (savedYear) {
      setSelectedYear(savedYear);
    }
    
    // Initialize sort preference
    if (currentSort) {
      setSelectedSort(currentSort);
    } else if (savedSort) {
      setSelectedSort(savedSort);
    }
  }, [availableFields, context, currentField, currentMonth, currentSort, currentYear]);
  
  // Function to fetch autocomplete suggestions (for simple mode)
  const fetchSuggestions = useCallback(async (text) => {
    if (!text || text.length < 2) {
      setSuggestions([]);
      return;
    }
    
    setIsLoading(true);
    try {
      // Build query params for autocomplete API
      const params = new URLSearchParams();
      params.set('q', text);
      params.set('field', selectedField);
      if (context !== 'habitats') {
        params.set('context', context);
      }
      
      const response = await fetch(`/api/habitats/autocomplete?${params.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      } else {
        console.error('Error fetching suggestions');
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedField, context]);
  
  // Function to fetch autocomplete suggestions for advanced mode
  const fetchAdvancedSuggestions = useCallback(async (field, text) => {
    if (!text || text.length < 2) {
      setAdvancedSuggestions(prev => ({ ...prev, [field]: [] }));
      return;
    }
    
    try {
      const params = new URLSearchParams();
      params.set('q', text);
      params.set('field', field === 'group' ? 'habitatName' : field);
      if (context !== 'habitats') {
        params.set('context', context);
      }
      
      const response = await fetch(`/api/habitats/autocomplete?${params.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        setAdvancedSuggestions(prev => ({ 
          ...prev, 
          [field]: data.suggestions || [] 
        }));
      }
    } catch (error) {
      console.error('Error fetching advanced suggestions:', error);
      setAdvancedSuggestions(prev => ({ ...prev, [field]: [] }));
    }
  }, [context]);

  // Add click outside handler
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        searchInputRef.current && 
        !searchInputRef.current.contains(event.target) &&
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Debounce function for simple search input
  useEffect(() => {
    if (!isAdvancedMode) {
      const debounceTimer = setTimeout(() => {
        if (searchText) {
          fetchSuggestions(searchText);
        }
      }, 300);
      
      return () => {
        clearTimeout(debounceTimer);
      };
    }
  }, [searchText, selectedField, context, fetchSuggestions, isAdvancedMode]);
  
  // Debounce function for advanced search inputs
  useEffect(() => {
    if (isAdvancedMode && activeSuggestionField && advancedCriteria[activeSuggestionField]) {
      const debounceTimer = setTimeout(() => {
        fetchAdvancedSuggestions(activeSuggestionField, advancedCriteria[activeSuggestionField]);
      }, 300);
      
      return () => {
        clearTimeout(debounceTimer);
      };
    }
  }, [advancedCriteria, activeSuggestionField, isAdvancedMode, fetchAdvancedSuggestions]);
  
  // Handle changes to the simple search input
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchText(value);
    setShowSuggestions(true);
    
    // If search is cleared, clear suggestions but DON'T change the URL or field
    // Just clear the local search text state
    if (value === '') {
      setSuggestions([]);
      // Don't update URL here - let the user click search or change field
      // This preserves the selected field in the dropdown
    }
  };
  
  // Handle changes to advanced search inputs
  const handleAdvancedInputChange = (field, value) => {
    setAdvancedCriteria(prev => ({
      ...prev,
      [field]: value
    }));
    setActiveSuggestionField(field);
  };
  
  // Handle advanced suggestion click
  const handleAdvancedSuggestionClick = (field, suggestion) => {
    const value = typeof suggestion === 'string' ? suggestion : suggestion.habitatName;
    setAdvancedCriteria(prev => ({
      ...prev,
      [field]: value
    }));
    setActiveSuggestionField(null);
    setAdvancedSuggestions(prev => ({ ...prev, [field]: [] }));
  };
  
  // Handle suggestion selection
  const handleSuggestionClick = (suggestion) => {
    setSearchText(suggestion);
    setShowSuggestions(false);
    // Update URL and trigger search
    updateSearchUrl(suggestion, selectedField);
  };
  
  // Handle field selection change
  const handleFieldChange = (e) => {
    const newField = e.target.value;
    setSelectedField(newField);
    setSuggestions([]);
    localStorage.setItem(`${context}_searchField`, newField);
    // Reset search text when field changes and update URL
    setSearchText('');
    updateSearchUrl('', newField, selectedMonth, selectedYear, selectedSort);
  };
  
  // Handle month filter change
  const handleMonthChange = (e) => {
    const newMonth = e.target.value;
    setSelectedMonth(newMonth);
    localStorage.setItem(`${context}_monthFilter`, newMonth);
    
    // Preserve advanced criteria if in advanced mode AND has values
    if (isAdvancedMode) {
      const hasValues = Object.entries(advancedCriteria)
        .filter(([key, value]) => value !== null)
        .some(([key, value]) => value && value.trim() !== '');
      updateSearchUrl('', '', newMonth, selectedYear, selectedSort, hasValues ? advancedCriteria : null);
    } else {
      updateSearchUrl(searchText, selectedField, newMonth, selectedYear, selectedSort);
    }
  };
  
  // Handle year filter change
  const handleYearChange = (e) => {
    const newYear = e.target.value;
    setSelectedYear(newYear);
    localStorage.setItem(`${context}_yearFilter`, newYear);
    
    // Preserve advanced criteria if in advanced mode AND has values
    if (isAdvancedMode) {
      const hasValues = Object.entries(advancedCriteria)
        .filter(([key, value]) => value !== null)
        .some(([key, value]) => value && value.trim() !== '');
      updateSearchUrl('', '', selectedMonth, newYear, selectedSort, hasValues ? advancedCriteria : null);
    } else {
      updateSearchUrl(searchText, selectedField, selectedMonth, newYear, selectedSort);
    }
  };
  
  // Handle sort change
  const handleSortChange = (e) => {
    const newSort = e.target.value;
    setSelectedSort(newSort);
    localStorage.setItem(`${context}_sortPreference`, newSort);
    
    // Preserve advanced criteria if in advanced mode AND has values
    if (isAdvancedMode) {
      const hasValues = Object.entries(advancedCriteria)
        .filter(([key, value]) => value !== null)
        .some(([key, value]) => value && value.trim() !== '');
      updateSearchUrl('', '', selectedMonth, selectedYear, newSort, hasValues ? advancedCriteria : null);
    } else {
      updateSearchUrl(searchText, selectedField, selectedMonth, selectedYear, newSort);
    }
  };
  
  // Update URL with search parameters
  const updateSearchUrl = (text, field, month = selectedMonth, year = selectedYear, sort = selectedSort, criteria = null) => {
    // Create a new URLSearchParams object
    const params = new URLSearchParams();
    
    // For advanced mode, add individual parameters for each field
    if (criteria !== null) {
      // Add each non-empty criteria field as a separate parameter
      if (criteria.habitatName && criteria.habitatName.trim()) {
        params.set('habitatName', criteria.habitatName.trim());
      }
      if (criteria.country && criteria.country.trim()) {
        params.set('country', criteria.country.trim());
      }
      if (criteria.state && criteria.state.trim()) {
        params.set('state', criteria.state.trim());
      }
      if (criteria.group && criteria.group.trim()) {
        params.set('group', criteria.group.trim());
      }
      if (criteria.userName && criteria.userName.trim()) {
        params.set('userName', criteria.userName.trim());
      }
    } else if (text) {
      // For simple mode with text, add search parameters
      params.set('q', text);
      if (field) {
        params.set('field', field);
      }
    } else if (field && !isAdvancedMode) {
      // When field is changed but no text yet, still preserve the field selection
      params.set('field', field);
    }
    
    // Add filter and sort parameters
    if (month && month !== 'all') {
      params.set('monthFilter', month);
    }
    
    if (year && year !== 'all') {
      params.set('yearFilter', year);
    }
    
    if (sort && sort !== 'upload_desc') {
      params.set('sortBy', sort);
    }
    
    // Add context if it's not the default
    if (context !== 'habitats') {
      params.set('context', context);
    }
    
    // Generate the new URL
    const newUrl = params.toString() 
      ? `?${params.toString()}`
      : '';
    
    // Update the URL
    router.push(newUrl);
  };
  
  // Submit simple search
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (isAdvancedMode) {
      // For advanced mode, check if any field has a value
      const hasAnyCriteria = Object.entries(advancedCriteria)
        .filter(([key, value]) => value !== null) // Filter out null values (userName in personal mode)
        .some(([key, value]) => value && value.trim() !== '');
      
      if (hasAnyCriteria) {
        // Submit criteria only if at least one field has a value
        updateSearchUrl('', '', selectedMonth, selectedYear, selectedSort, advancedCriteria);
      } else {
        // If all fields are empty, clear the search completely
        const searchParams = new URLSearchParams();
        if (selectedMonth && selectedMonth !== 'all') {
          searchParams.set('monthFilter', selectedMonth);
        }
        if (selectedYear && selectedYear !== 'all') {
          searchParams.set('yearFilter', selectedYear);
        }
        if (selectedSort && selectedSort !== 'upload_desc') {
          searchParams.set('sortBy', selectedSort);
        }
        if (context !== 'habitats') {
          searchParams.set('context', context);
        }
        const newUrl = searchParams.toString() ? `?${searchParams.toString()}` : window.location.pathname;
        router.replace(newUrl);
      }
    } else {
      // For simple mode
      localStorage.setItem(`${context}_searchField`, selectedField);
      
      // If search text is empty, clear the search but preserve filters
      if (!searchText || searchText.trim() === '') {
        const searchParams = new URLSearchParams();
        if (selectedMonth && selectedMonth !== 'all') {
          searchParams.set('monthFilter', selectedMonth);
        }
        if (selectedYear && selectedYear !== 'all') {
          searchParams.set('yearFilter', selectedYear);
        }
        if (selectedSort && selectedSort !== 'upload_desc') {
          searchParams.set('sortBy', selectedSort);
        }
        if (context !== 'habitats') {
          searchParams.set('context', context);
        }
        const newUrl = searchParams.toString() ? `?${searchParams.toString()}` : window.location.pathname;
        router.replace(newUrl);
      } else {
        // Normal search with text
        updateSearchUrl(searchText, selectedField);
      }
    }
  };
  
  // Toggle advanced mode
  const toggleAdvancedMode = () => {
    const newMode = !isAdvancedMode;
    setIsAdvancedMode(newMode);
    
    if (!newMode) {
      // Switching to simple mode - clear advanced criteria and URL
      setAdvancedCriteria({
        habitatName: '',
        country: '',
        state: '',
        group: '',
        userName: context === 'habitats' ? '' : null,
      });
      setActiveSuggestionField(null);
      setAdvancedSuggestions({});
      // Clear the URL to show all results
      updateSearchUrl('', '', selectedMonth, selectedYear, selectedSort, null);
    } else {
      // Switching to advanced mode - clear simple search and URL
      setSearchText('');
      setSuggestions([]);
      setShowSuggestions(false);
      // Clear the URL to show all results
      updateSearchUrl('', '', selectedMonth, selectedYear, selectedSort, null);
    }
  };
  
  // Clear all advanced filters
  const clearAdvancedFilters = () => {
    const clearedCriteria = {
      habitatName: '',
      country: '',
      state: '',
      group: '',
      userName: context === 'habitats' ? '' : null,
    };
    setAdvancedCriteria(clearedCriteria);
    setActiveSuggestionField(null);
    setAdvancedSuggestions({});
    
    // Also reset month, year, and sort to defaults
    setSelectedMonth('all');
    setSelectedYear('all');
    setSelectedSort('upload_desc');
    localStorage.setItem(`${context}_monthFilter`, 'all');
    localStorage.setItem(`${context}_yearFilter`, 'all');
    localStorage.setItem(`${context}_sortPreference`, 'upload_desc');
    
    // Build clean URL without any criteria or filters
    const searchParams = new URLSearchParams();
    if (context !== 'habitats') {
      searchParams.set('context', context);
    }
    
    // Use replace to avoid adding to history
    const newUrl = searchParams.toString() ? `?${searchParams.toString()}` : window.location.pathname;
    router.replace(newUrl);
  };
  
  // Clear individual advanced filter
  const clearAdvancedField = (field) => {
    setAdvancedCriteria(prev => ({
      ...prev,
      [field]: ''
    }));
  };
  
  return (
    <div className="relative w-full max-w-4xl">
      <form onSubmit={handleSubmit} className="w-full space-y-3">
        {!isAdvancedMode ? (
          /* Simple Search Mode */
          <>
            {/* Search Row */}
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Field dropdown selector */}
              <div className="w-full sm:w-1/3">
                <select
                  value={selectedField}
                  onChange={handleFieldChange}
                  className="w-full h-10 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {availableFields.map(field => (
                    <option key={field.id} value={field.id}>
                      {field.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Search input and button */}
              <div className="flex w-full sm:w-2/3 relative">
                <div className="flex flex-1 h-10 rounded-lg overflow-hidden border border-gray-200">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchText}
                    onChange={handleSearchChange}
                    placeholder={`Search by ${availableFields.find(f => f.id === selectedField)?.label == 'Group' ? 'Vegetation Type' : availableFields.find(f => f.id === selectedField)?.label || 'field'}...`}
                    className="flex-1 h-10 px-4 py-2 text-gray-700 focus:outline-none"
                  />
                  
                  <button 
                    type="submit" 
                    className="flex items-center justify-center h-10 px-4 bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  </button>
                </div>
                
                {/* Suggestions dropdown */}
                {showSuggestions && searchText.length >= 2 && (
                  <div 
                    ref={suggestionsRef}
                    className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
                  style={{ zIndex: 9999 }}
                  >
                    {isLoading ? (
                      <div className="px-4 py-2 text-gray-500">Loading suggestions...</div>
                    ) : suggestions.length > 0 ? (
                      <ul>
                        {suggestions.map((suggestion, index) => (
                          <li 
                            key={index}
                            onClick={() => handleSuggestionClick(
                              typeof suggestion === 'string' ? suggestion : suggestion.habitatName
                            )}
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-700"
                          >
                            {typeof suggestion === 'string' ? (
                              // For regular fields (location, userName, etc.)
                              <span className="font-medium">
                                {suggestion.length > 40 ? `${suggestion.substring(0, 40)}...` : suggestion}
                              </span>
                            ) : (
                              // For group/habitatName fields with EVC_code
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {suggestion.habitatName.length > 40 
                                    ? `${suggestion.habitatName.substring(0, 40)}...` 
                                    : suggestion.habitatName}
                                </span>
                                {suggestion.EVC_code && (
                                  <span className="text-sm text-gray-500">Code: {suggestion.EVC_code}</span>
                                )}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="px-4 py-2 text-gray-500">No suggestions found</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Advanced Mode Toggle */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={toggleAdvancedMode}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Advanced Search
              </button>
            </div>
          </>
        ) : (
          /* Advanced Search Mode */
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold text-gray-700">Advanced Search</h3>
              <button
                type="button"
                onClick={toggleAdvancedMode}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                × Simple Search
              </button>
            </div>
            
            {/* Vegetation Type */}
            <div className="relative">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={advancedCriteria.habitatName}
                  onChange={(e) => handleAdvancedInputChange('habitatName', e.target.value)}
                  onFocus={() => setActiveSuggestionField('habitatName')}
                  placeholder="Vegetation type..."
                  className="flex-1 h-10 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {advancedCriteria.habitatName && (
                  <button
                    type="button"
                    onClick={() => clearAdvancedField('habitatName')}
                    className="px-3 text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                )}
              </div>
              {/* Suggestions for habitatName */}
              {activeSuggestionField === 'habitatName' && advancedSuggestions.habitatName?.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  <ul>
                    {advancedSuggestions.habitatName.map((suggestion, index) => (
                      <li 
                        key={index}
                        onClick={() => handleAdvancedSuggestionClick('habitatName', suggestion)}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-700"
                      >
                        {typeof suggestion === 'string' ? (
                          <span className="font-medium">{suggestion}</span>
                        ) : (
                          <div className="flex flex-col">
                            <span className="font-medium">{suggestion.habitatName}</span>
                            {suggestion.EVC_code && (
                              <span className="text-sm text-gray-500">Code: {suggestion.EVC_code}</span>
                            )}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            {/* Country */}
            <div className="relative">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={advancedCriteria.country}
                  onChange={(e) => handleAdvancedInputChange('country', e.target.value)}
                  onFocus={() => setActiveSuggestionField('country')}
                  placeholder="Country..."
                  className="flex-1 h-10 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {advancedCriteria.country && (
                  <button
                    type="button"
                    onClick={() => clearAdvancedField('country')}
                    className="px-3 text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                )}
              </div>
              {/* Suggestions for country */}
              {activeSuggestionField === 'country' && advancedSuggestions.country?.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  <ul>
                    {advancedSuggestions.country.map((suggestion, index) => (
                      <li 
                        key={index}
                        onClick={() => handleAdvancedSuggestionClick('country', suggestion)}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-700"
                      >
                        <span className="font-medium">{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            {/* State/Region */}
            <div className="relative">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={advancedCriteria.state}
                  onChange={(e) => handleAdvancedInputChange('state', e.target.value)}
                  onFocus={() => setActiveSuggestionField('state')}
                  placeholder="State/Region..."
                  className="flex-1 h-10 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {advancedCriteria.state && (
                  <button
                    type="button"
                    onClick={() => clearAdvancedField('state')}
                    className="px-3 text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                )}
              </div>
              {/* Suggestions for state */}
              {activeSuggestionField === 'state' && advancedSuggestions.state?.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  <ul>
                    {advancedSuggestions.state.map((suggestion, index) => (
                      <li 
                        key={index}
                        onClick={() => handleAdvancedSuggestionClick('state', suggestion)}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-700"
                      >
                        <span className="font-medium">{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            {/* Group */}
            <div className="relative">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={advancedCriteria.group}
                  onChange={(e) => handleAdvancedInputChange('group', e.target.value)}
                  onFocus={() => setActiveSuggestionField('group')}
                  placeholder="Group..."
                  className="flex-1 h-10 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {advancedCriteria.group && (
                  <button
                    type="button"
                    onClick={() => clearAdvancedField('group')}
                    className="px-3 text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                )}
              </div>
              {/* Suggestions for group */}
              {activeSuggestionField === 'group' && advancedSuggestions.group?.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  <ul>
                    {advancedSuggestions.group.map((suggestion, index) => (
                      <li 
                        key={index}
                        onClick={() => handleAdvancedSuggestionClick('group', suggestion)}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-700"
                      >
                        {typeof suggestion === 'string' ? (
                          <span className="font-medium">{suggestion}</span>
                        ) : (
                          <div className="flex flex-col">
                            <span className="font-medium">{suggestion.habitatName}</span>
                            {suggestion.EVC_code && (
                              <span className="text-sm text-gray-500">Code: {suggestion.EVC_code}</span>
                            )}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            {/* User Name - only for 'habitats' context */}
            {context === 'habitats' && (
              <div className="relative">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={advancedCriteria.userName}
                    onChange={(e) => handleAdvancedInputChange('userName', e.target.value)}
                    onFocus={() => setActiveSuggestionField('userName')}
                    placeholder="User Name..."
                    className="flex-1 h-10 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {advancedCriteria.userName && (
                    <button
                      type="button"
                      onClick={() => clearAdvancedField('userName')}
                      className="px-3 text-gray-500 hover:text-gray-700"
                    >
                      ×
                    </button>
                  )}
                </div>
                {/* Suggestions for userName */}
                {activeSuggestionField === 'userName' && advancedSuggestions.userName?.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    <ul>
                      {advancedSuggestions.userName.map((suggestion, index) => (
                        <li 
                          key={index}
                          onClick={() => handleAdvancedSuggestionClick('userName', suggestion)}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-700"
                        >
                          <span className="font-medium">{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            
            {/* Action buttons */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={clearAdvancedFilters}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Reset All
              </button>
              <button
                type="submit"
                className="px-6 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Search
              </button>
            </div>
          </div>
        )}
        
        {/* Filters and Sort Row - Always visible */}
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Month Filter */}
          <div className="w-full sm:w-1/3">
            <select
              value={selectedMonth}
              onChange={handleMonthChange}
              className="w-full h-10 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {months.map(month => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* Year Filter */}
          <div className="w-full sm:w-1/3">
            <select
              value={selectedYear}
              onChange={handleYearChange}
              className="w-full h-10 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {years.map(year => (
                <option key={year.value} value={year.value}>
                  {year.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* Sort Dropdown */}
          <div className="w-full sm:w-1/3">
            <select
              value={selectedSort}
              onChange={handleSortChange}
              className="w-full h-10 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </form>
    </div>
  );
}