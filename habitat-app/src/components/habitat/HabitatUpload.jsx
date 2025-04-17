'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { mutate } from 'swr';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

export default function HabitatUpload() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // Added for upload progress
  const [error, setError] = useState('');
  const [habitatSuggestions, setHabitatSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Form state
  const [habitatName, setHabitatName] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [coordinate, setCoordinate] = useState(''); // Added for GPS coordinate
  const [success, setSuccess] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]); // Array of selected files
  const [previews, setPreviews] = useState([]); // Array of preview URLs
  const [showMap, setShowMap] = useState(false);
  const fileInputRef = useRef(null);


  const MapSelector = dynamic(
    () => import('./CoordinateMapSelector'),
    { 
      ssr: false,
      loading: () => <div className="text-center p-4">Loading map...</div>
    }
  );
  // Search for habitats as user types
  useEffect(() => {
    const searchHabitats = async () => {
      if (habitatName.trim().length < 2) {
        setHabitatSuggestions([]);
        setShowSuggestions(false);
        return;
      }
      
      try {
        const response = await fetch(`/api/habitats/search?query=${encodeURIComponent(habitatName)}`);
        const data = await response.json();
        
        if (response.ok) {
          setHabitatSuggestions(data.habitats);
          setShowSuggestions(true);
        }
      } catch (error) {
        console.error('Error searching habitats:', error);
      }
    };
    
    const debounceTimer = setTimeout(searchHabitats, 300);
    return () => clearTimeout(debounceTimer);
  }, [habitatName]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files); // Convert FileList to an array
    if (files.length === 0) return;
  
    setSelectedFiles(files);
  
    // Generate previews for all selected files
    const previewPromises = files.map((file) => {
      const reader = new FileReader();
      return new Promise((resolve) => {
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
    });
  
    Promise.all(previewPromises).then((previewUrls) => {
      setPreviews(previewUrls); // Store all preview URLs
    });
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const selectHabitatSuggestion = (name) => {
    setHabitatName(name);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!session) {
      setError('You must be signed in to upload');
      return;
    }
    
    if (!selectedFiles || selectedFiles.length === 0) {
      setError('Please select at least one image to upload');
      return;
    }
    
    if (!habitatName || !location) {
      setError('Habitat name and location are required');
      return;
    }
    
    if (!coordinate) {
      setError('GPS coordinate is required');
      return;
    }
    setIsUploading(true);
    setUploadProgress(10); // Start progress indicator
    setError('');
  
    try {
      // Upload images to Cloudinary
      const formData = new FormData();
      for (const file of selectedFiles) {
        formData.append('image', file);
      }
      
      setUploadProgress(30); // Update progress
      
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      setUploadProgress(70); // Update progress
      
      const uploadData = await uploadResponse.json();
      
      if (!uploadResponse.ok) {
        throw new Error(uploadData.message || 'Error uploading image');
      }
      
      setUploadProgress(80); // Update progress
      
      // Create habitat entry with image URLs
      const habitatResponse = await fetch('/api/habitats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          gpsCoordinate:coordinate,
          habitatName,
          location,
          date: date || new Date().toISOString(),
          notes,
          imageUrl: uploadData.imageUrls, // This is now coming from Cloudinary
        }),
      });
      
      setUploadProgress(95); // Update progress
      
      // Get response as text first
      const responseText = await habitatResponse.text();
      
      // Only try to parse as JSON if there's content
      const habitatData = responseText ? JSON.parse(responseText) : {};
      
      if (!habitatResponse.ok) {
        throw new Error(habitatData.message || `Server error: ${habitatResponse.status}`);
      }
      
      setUploadProgress(100); // Complete progress
      mutate('/api/habitats');
      // Reset form
      setHabitatName('');
      setLocation('');
      setDate('');
      setNotes('');
      setSelectedFiles([]);
      setCoordinate('');
      setPreviews([]);
      
      setSuccess('Habitat uploaded successfully!');
      setTimeout(() => setSuccess(''), 3000);
      // Redirect to habitats page or refresh the current page
      router.push('/habitats');
      router.refresh();
    } catch (error) {
      console.error('Error:', error);
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };
  
  const removeImage = (index) => {
    const updatedFiles = [...selectedFiles];
    const updatedPreviews = [...previews];
    
    updatedFiles.splice(index, 1);
    updatedPreviews.splice(index, 1);
  
    setSelectedFiles(updatedFiles);
    setPreviews(updatedPreviews);
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4">Upload Habitat Image</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <div 
            onClick={triggerFileInput}
            className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50"
          >
            {previews && previews.length > 0 ? (
              <div className="grid grid-cols-3 gap-4">
                {previews.map((preview, index) => (
                  <div key={index} className="relative h-64 inline-block">
                    <Image
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      fill
                      className="object-contain"
                    />
                    <button
                      type="button" // Added button type to prevent form submission
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent the click event from propagating to the parent
                        removeImage(index);
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ): (
              <div className="py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <p className="mt-2">Click to upload habitat images</p>
                <p className="text-xs text-gray-500 mt-1">Images will be stored in Cloudinary</p>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              multiple
              className="hidden"
            />
          </div>
        </div>
        
        {/* Progress bar for upload */}
        {isUploading && (
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
            <div 
              className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" 
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        )}
        
        <div className="mb-4 relative">
          <label htmlFor="habitatName" className="block text-sm font-medium text-gray-700 mb-1">
            Habitat Name
          </label>
          <input
            type="text"
            id="habitatName"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            value={habitatName}
            onChange={(e) => setHabitatName(e.target.value)}
            placeholder="Search for habitat name..."
            required
          />
          {showSuggestions && habitatSuggestions.length > 0 && (
            <ul className="absolute z-10 bg-white w-full mt-1 border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
              {habitatSuggestions.map((habitat) => (
                <li
                  key={habitat._id}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => selectHabitatSuggestion(habitat.habitatName)}
                >
                  {habitat.habitatName}
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <div className="mb-4">
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <input
            type="text"
            id="location"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Enter location"
            required
          />
        </div>

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
            onChange={(e) => setCoordinate(e.target.value)}
            onClick={() => setShowMap(true)}
            placeholder="Enter GPS coordinate ex. 28.6139,77.2090 or click to select on map"
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
            <MapSelector 
              currentCoordinate={coordinate} 
              onSelectCoordinate={(value) => {
                setCoordinate(value);
                setShowMap(true);
              }}
            />
          </div>
        )}
      </div>
        
        <div className="mb-4">
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
            Date
          </label>
          <input
            type="date"
            id="date"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            id="notes"
            rows="3"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any additional notes"
          ></textarea>
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isUploading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isUploading ? 'Uploading...' : 'Upload Habitat'}
          </button>
        </div>
      </form>
    </div>
  );
}