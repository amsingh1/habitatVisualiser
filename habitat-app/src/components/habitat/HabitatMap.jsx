'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';

// Dynamically import the map component with ssr: false
const MapWithNoSSR = dynamic(
  () => import('./MapComponent'),
  { 
    ssr: false,
    loading: () => <div className="text-center p-8">Loading habitat map...</div>
  }
);

// This component will display all habitats on a map
export default function HabitatMap() {
  const [habitats, setHabitats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchHabitats() {
      try {
        const response = await fetch('/api/habitats');
        if (!response.ok) {
          throw new Error('Failed to fetch habitat data');
        }
        
        const responseData = await response.json();
        
        // Extract the habitats array from the response object
        const habitatsArray = responseData.habitats || [];
        
        if (!Array.isArray(habitatsArray)) {
          console.error('Expected habitats to be an array:', responseData);
          throw new Error('Invalid data format received from API');
        }
        
        // Process the GPS coordinates from string to [lat, lng] array
        const processedData = habitatsArray.map(habitat => {
          // Assuming gpsCoordinate is in format "lat,lng" or similar
          let coordinates = [0, 0]; // Default coordinates
          
          try {
            if (habitat.gpsCoordinate) {
              // Parse the coordinate string into latitude and longitude
              const coordParts = habitat.gpsCoordinate.split(',').map(part => parseFloat(part.trim()));
              if (coordParts.length === 2 && !isNaN(coordParts[0]) && !isNaN(coordParts[1])) {
                coordinates = coordParts;
              }
            } else {
              console.warn(`No GPS coordinate for habitat: ${habitat.habitatName}`);
            }
          } catch (e) {
            console.error(`Error parsing coordinates for habitat: ${habitat.habitatName}`, e);
          }
          
          return {
            ...habitat,
            coordinates
          };
        });
        
        setHabitats(processedData);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching habitat data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchHabitats();
  }, []);

  if (loading) return <div className="text-center p-8">Loading habitat map...</div>;
  if (error) return <div className="text-center p-8 text-red-500">Error: {error}</div>;
  if (habitats.length === 0) return <div className="text-center p-8">No habitats found to display.</div>;

  // Find center point for the map (average of all coordinates)
  const defaultCenter = [50.0755, 14.4378]; // Default center (Prague)
  let mapCenter = defaultCenter;
  
  if (habitats.length > 0) {
    // Only use coordinates that are not [0,0]
    const validCoordinates = habitats.filter(h => 
      h.coordinates[0] !== 0 || h.coordinates[1] !== 0
    );
    
    if (validCoordinates.length > 0) {
      const sumLat = validCoordinates.reduce((sum, habitat) => sum + habitat.coordinates[0], 0);
      const sumLng = validCoordinates.reduce((sum, habitat) => sum + habitat.coordinates[1], 0);
      mapCenter = [sumLat / validCoordinates.length, sumLng / validCoordinates.length];
    }
  }

  return (
    <div className="w-full h-screen relative">
      <MapWithNoSSR 
        habitats={habitats}
        mapCenter={mapCenter}
      />
    </div>
  );
}