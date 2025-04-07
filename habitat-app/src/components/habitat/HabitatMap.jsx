'use client';

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Image from 'next/image';

// Fix Leaflet's default icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon.src,
  shadowUrl: iconShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

// Set the default icon for all Leaflet markers
L.Marker.prototype.options.icon = DefaultIcon;

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

  // Function to trigger the habitat selection via a custom event
  const triggerHabitatSelection = (habitat) => {
    // Create a custom event with the habitat data
    const event = new CustomEvent('habitat-selected', { 
      detail: { habitat },
      bubbles: true // This allows the event to bubble up to parent elements
    });
    // Dispatch the event from document to make it widely available
    document.dispatchEvent(event);
  };

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
      <MapContainer 
        center={mapCenter} 
        zoom={5} 
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {habitats.map((habitat) => (
          <Marker 
            key={habitat._id} 
            position={habitat.coordinates}
          >
            <Popup>
              <div 
                className="p-2 cursor-pointer hover:bg-gray-50"
                onClick={() => triggerHabitatSelection(habitat)}
              >
                <h3 className="font-bold text-lg text-blue-600 hover:underline">{habitat.habitatName}</h3>
                <p>Location: {habitat.location}</p>
                {habitat.gpsCoordinate && <p>Coordinates: {habitat.gpsCoordinate}</p>}
                <p>Date: {new Date(habitat.date).toLocaleDateString()}</p>
                {habitat.notes && <p>Notes: {habitat.notes}</p>}
                {habitat.imageUrl && habitat.imageUrl.length > 0 && (
                  <div className="mt-2 relative overflow-hidden rounded group">
                    <Image 
                      src={habitat.imageUrl[0]} 
                      alt={habitat.habitatName}
                      width={150}
                      height={100}
                      className="rounded transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity flex items-center justify-center">
                      {habitat.imageUrl.length > 1 && (
                        <span className="bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-full absolute bottom-2 right-2">
                          +{habitat.imageUrl.length - 1}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <p className="text-sm mt-2">Added by: {habitat.userName}</p>
                <div className="mt-3 text-center">
                  <span className="text-blue-500 text-sm">Click to view details →</span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}