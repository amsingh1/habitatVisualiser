'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function CoordinateMapSelector({ currentCoordinate, onSelectCoordinate }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const initializedRef = useRef(false);
  const isSelectingRef = useRef(false);

  // Initialize the map only once
  useEffect(() => {
    if (!mapContainerRef.current || initializedRef.current) return;
    initializedRef.current = true;

    // Fix Leaflet default icons
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
    });

    // Set initial center
    let initialCenter = [28.6139, 77.2090]; // Default (Delhi, India)
    try {
      if (currentCoordinate) {
        const parts = currentCoordinate.split(',').map(n => parseFloat(n.trim()));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          initialCenter = parts;
        }
      }
    } catch (e) {
      console.error('Invalid coordinate:', e);
    }

    // Create map
    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 5,
      zoomControl: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      dragging: true
    });

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Add initial marker
    if (currentCoordinate) {
      const parts = currentCoordinate.split(',').map(n => parseFloat(n.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        markerRef.current = L.marker(parts).addTo(map);
      }
    }

    // Handle click to set new coordinate
    map.on('click', (e) => {
      isSelectingRef.current = true;
      const { lat, lng } = e.latlng;
      const formattedLat = parseFloat(lat.toFixed(6));
      const formattedLng = parseFloat(lng.toFixed(6));

      // Remove old marker
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
      }

      // Add new marker
      markerRef.current = L.marker([formattedLat, formattedLng]).addTo(map);

      // Notify parent
      if (onSelectCoordinate) {
        onSelectCoordinate(`${formattedLat},${formattedLng}`);
      }

      // Clear the selection flag
      setTimeout(() => {
        isSelectingRef.current = false;
      }, 100);
    });

    // Instruction box
    const info = L.control();
    info.onAdd = function () {
      const div = L.DomUtil.create('div', 'info');
      div.innerHTML = '<div style="background: white; padding: 8px; border-radius: 4px; box-shadow: 0 1px 5px rgba(0,0,0,0.4); font-size: 14px;">Click anywhere on the map to select coordinates</div>';
      return div;
    };
    info.addTo(map);

    // Save map instance
    mapInstanceRef.current = map;

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        initializedRef.current = false;
      }
    };
  }, []);

  // Update marker and center when `currentCoordinate` changes
  useEffect(() => {
    if (!mapInstanceRef.current || !currentCoordinate || isSelectingRef.current) return;
  
    const parts = currentCoordinate.split(',').map(n => parseFloat(n.trim()));
    if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return;
  
    const latLng = [parts[0], parts[1]];
  
    // Remove old marker
    if (markerRef.current) {
      mapInstanceRef.current.removeLayer(markerRef.current);
    }
  
    // Add new marker
    markerRef.current = L.marker(latLng).addTo(mapInstanceRef.current);
  
    // Center and zoom in
    mapInstanceRef.current.setView(latLng, 13);  
  }, []);
  

  return (
    <div ref={mapContainerRef} style={{ height: '400px', width: '100%' }} />
  );
}
