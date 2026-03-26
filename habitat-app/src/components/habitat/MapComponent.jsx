'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Image from 'next/image';

// Separate component to add layer control to the map
function LayerControl() {
  const map = useMap();
  const controlAddedRef = useRef(false);

  useEffect(() => {
    if (!map || controlAddedRef.current) return;
    controlAddedRef.current = true;

    // Get the existing street layer (added by TileLayer component)
    let streetLayer = null;
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer && layer.getAttribution()?.includes('OpenStreetMap')) {
        streetLayer = layer;
      }
    });

    // If street layer not found, create it
    if (!streetLayer) {
      streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);
    }

    const aerialLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 19
      }
    );

    // Add layer switcher with Street Map already selected
    L.control.layers(
      { 'Street Map': streetLayer, 'Aerial Map': aerialLayer },
      {},
      { position: 'topright', collapsed: true }
    ).addTo(map);
  }, [map]);

  return null;
}

// This component will only be rendered on the client side
export default function MapComponent({ habitats, mapCenter }) {
  useEffect(() => {
    // Fix Leaflet default marker icons broken by bundlers
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
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
      <LayerControl />
      
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
              <p>Location: {habitat.state}, {habitat.country}</p>
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