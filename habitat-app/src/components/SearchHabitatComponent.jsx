'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SearchHabitatComponent({ context = 'habitats' }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get current search values from URL
  const currentSearchText = searchParams.get('q') || '';
  const currentField = searchParams.get('field') || 'habitatName'; // Default to habitatName
  
  // Available search fields
  const allFields = [
    { id: 'habitatName', label: 'Habitat Name', enabledIn: ['habitats', 'personal'] },
    { id: 'location', label: 'Location', enabledIn: ['habitats', 'personal'] },
    { id: 'userName', label: 'User Name', enabledIn: ['habitats', 'personal'] },
    { id: 'userEmail', label: 'Email', enabledIn: ['habitats', 'personal'] },
    { id: 'group', label: 'Group', enabledIn: ['habitats', 'personal'] },
  ];
  
  // Determine which fields to show based on context
  const availableFields = allFields.filter(field => field.enabledIn.includes(context));
  
  // State for search text and selected field
  const [searchText, setSearchText] = useState(currentSearchText);
  const [selectedField, setSelectedField] = useState(currentField);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef(null);
  const suggestionsRef = useRef(null);
  
  // Initialize selected field from URL or localStorage
  useEffect(() => {
    // Only run once on mount
    const savedField = localStorage.getItem(`${context}_searchField`);
    
    if (currentField && availableFields.some(field => field.id === currentField)) {
      setSelectedField(currentField);
    } else if (savedField && availableFields.some(field => field.id === savedField)) {
      setSelectedField(savedField);
    } else {
      // Default to first available field
      setSelectedField(availableFields[0]?.id || 'habitatName');
    }
  }, []);
  
  // Function to fetch autocomplete suggestions
  const fetchSuggestions = async (text) => {
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
  };

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
  
  // Debounce function for search input
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchText) {
        fetchSuggestions(searchText);
      }
    }, 300);
    
    return () => {
      clearTimeout(debounceTimer);
    };
  }, [searchText, selectedField, context]);
  
  // Handle changes to the search input
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchText(value);
    setShowSuggestions(true);
    
    // If search is cleared, reset the URL
    if (value === '') {
      setSuggestions([]);
      updateSearchUrl('', selectedField);
    }
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
    // Reset search text when field changes
    setSearchText('');
  };
  
  // Update URL with search parameters
  const updateSearchUrl = (text, field) => {
    // Create a new URLSearchParams object
    const params = new URLSearchParams();
    
    // Only add parameters if they have values
    if (text) {
      params.set('q', text);
    }
    
    if (field) {
      params.set('field', field);
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
  
  // Submit search
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Save search field preference to localStorage
    localStorage.setItem(`${context}_searchField`, selectedField);
    
    // Update URL with search parameters
    updateSearchUrl(searchText, selectedField);
  };
  
  return (
    <div className="relative w-full max-w-xl">
      <form onSubmit={handleSubmit} className="w-full">
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
                placeholder={`Search by ${availableFields.find(f => f.id === selectedField)?.label || 'field'}...`}
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
      </form>
    </div>
  );
}