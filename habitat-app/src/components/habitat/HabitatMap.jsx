'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import useSWR from 'swr';

// Fetcher function for SWR
const fetcher = (...args) => fetch(...args).then(res => res.json());

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
  // Use SWR for data fetching with automatic revalidation
  const { data, error, isLoading, mutate } = useSWR('/api/habitats', fetcher, {
    refreshInterval: 5000, // Refresh every 5 seconds (adjust as needed)
    revalidateOnFocus: true, // Revalidate when window gets focus
    revalidateOnMount: true, // Revalidate when component mounts
  });

  // Listen for custom events that indicate a habitat was added/updated
  useEffect(() => {
    const handleHabitatChange = () => {
      // Trigger a revalidation when a habitat is added or updated
      mutate();
    };

    // Add event listeners
    document.addEventListener('habitat-added', handleHabitatChange);
    document.addEventListener('habitat-updated', handleHabitatChange);
    
    // Clean up
    return () => {
      document.removeEventListener('habitat-added', handleHabitatChange);
      document.removeEventListener('habitat-updated', handleHabitatChange);
    };
  }, [mutate]);

  // Process the habitats data once we have it
  const habitats = useMemo(() => {
    if (!data || !data.habitats) return [];
    
    const habitatsArray = data.habitats;
    
    // Process the GPS coordinates from string to [lat, lng] array
    return habitatsArray.map(habitat => {
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
  }, [data]);

  // Calculate map center
  const mapCenter = useMemo(() => {
    const defaultCenter = [50.0755, 14.4378]; // Default center (Prague)
    
    if (!habitats || habitats.length === 0) return defaultCenter;
    
    // Only use coordinates that are not [0,0]
    const validCoordinates = habitats.filter(h => 
      h.coordinates[0] !== 0 || h.coordinates[1] !== 0
    );
    
    if (validCoordinates.length === 0) return defaultCenter;
    
    const sumLat = validCoordinates.reduce((sum, habitat) => sum + habitat.coordinates[0], 0);
    const sumLng = validCoordinates.reduce((sum, habitat) => sum + habitat.coordinates[1], 0);
    return [sumLat / validCoordinates.length, sumLng / validCoordinates.length];
  }, [habitats]);

  // Show loading state
  if (isLoading) return <div className="text-center p-8">Loading habitat map...</div>;
  
  // Show error state
  if (error) return <div className="text-center p-8 text-red-500">Error: {error.message}</div>;
  
  // Show empty state
  if (!habitats || habitats.length === 0) return <div className="text-center p-8">No habitats found to display.</div>;

  return (
    <div className="w-full h-[50vh] relative">
      <MapWithNoSSR 
        habitats={habitats}
        mapCenter={mapCenter}
      />
    </div>
  );
}