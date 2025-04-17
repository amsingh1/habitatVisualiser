'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the map selection component with ssr: false
const CoordinateMapSelector = dynamic(
  () => import('./CoordinateMapSelector'),
  {
    ssr: false,
    loading: () => <div className="text-center p-4">Loading map...</div>
  }
);

export default function CoordinatePicker({ value, onChange }) {
  const [showMap, setShowMap] = useState(false);
  const [coordinate, setCoordinate] = useState(value || '');

  // Update local state when parent value changes
  useEffect(() => {
    setCoordinate(value);
  }, [value]);

  // Handle coordinate selection from map
  const handleCoordinateSelect = (newCoordinate) => {
    setCoordinate(newCoordinate);
    onChange(newCoordinate);
    setShowMap(false); // Hide map after selection
  };

  // Handle manual input change
  const handleInputChange = (e) => {
    setCoordinate(e.target.value);
    onChange(e.target.value);
  };

  return (
    <div className="mb-4">
      <label htmlFor="coordinate" className="block text-sm font-medium text-gray-700 mb-1">
        GPS Coordinate
      </label>
      <div className="relative">
        <input
          type="text"
          id="coordinate"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          value={coordinate}
          onChange={handleInputChange}
          placeholder="Enter GPS coordinate ex. 28.6139,77.2090"
          required
        />
        <button
          type="button"
          onClick={() => setShowMap(!showMap)}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 bg-gray-100 rounded-md hover:bg-gray-200"
          title={showMap ? "Hide map" : "Show map to select coordinates"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </button>
      </div>
      
      {showMap && (
        <div className="border border-gray-300 rounded-md mt-2 overflow-hidden" style={{ height: '400px' }}>
          <CoordinateMapSelector 
            currentCoordinate={coordinate} 
            onSelectCoordinate={handleCoordinateSelect}
          />
        </div>
      )}
    </div>
  );
}