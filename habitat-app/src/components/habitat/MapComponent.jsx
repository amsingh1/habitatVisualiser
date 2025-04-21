'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Image from 'next/image';

// Fix Leaflet's default icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// This component will only be rendered on the client side
export default function MapComponent({ habitats, mapCenter }) {
  useEffect(() => {
    // Set the default icon for all Leaflet markers
    // Note: This needs to be done inside useEffect to ensure window is defined
    let DefaultIcon = L.icon({
      iconUrl: icon.src,
      shadowUrl: iconShadow.src,
      iconSize: [25, 41],
      iconAnchor: [12, 41]
    });
    
    L.Marker.prototype.options.icon = DefaultIcon;
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

  return (
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
         habitat.gpsCoordinate && (
        <Marker 
          key={habitat._id} 
          position={habitat.coordinates}
        >
          <Popup>
            <div 
              className="p-2 cursor-pointer hover:bg-gray-50"
              onClick={() => triggerHabitatSelection(habitat)}
            >
            <h3 
              className="font-bold text-lg text-blue-600 hover:underline"
              title={habitat.habitatName} // This adds the tooltip with full name
            >
              {habitat.habitatName.length > 30 
                ? `${habitat.habitatName.substring(0, 20)}...` 
                : habitat.habitatName}
            </h3>
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
      )))}
    </MapContainer>
  );
}