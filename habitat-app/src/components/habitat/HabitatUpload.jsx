'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { mutate } from 'swr';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

const MapSelector = dynamic(
  () => import('./CoordinateMapSelector'),
  { 
    ssr: false,
    loading: () => <div className="text-center p-4">Loading map...</div>
  }
);

export default function HabitatUpload() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const habitatId = searchParams.get('id'); // Get habitat ID from URL if editing
  const [isEditing, setIsEditing] = useState(!!habitatId);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [euVegSuggestions, setEuVegSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Form state
  const [habitatName, setHabitatName] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [coordinate, setCoordinate] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [showMap, setShowMap] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch existing habitat data if editing
  useEffect(() => {
    const fetchHabitatData = async () => {
      if (!habitatId) return;
      
      try {
        const response = await fetch(`/api/habitats?id=${habitatId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch habitat data');
        }
        
        const data = await response.json();
        const habitat = data.habitat;
        
        // Check if the current user is the owner of this habitat
        if (session && habitat.userEmail !== session.user.email) {
          setError('You do not have permission to edit this habitat');
          setTimeout(() => router.push('/habitats'), 2000);
          return;
        }
        
        // Set form values
        setHabitatName(habitat.habitatName || '');
        setLocation(habitat.location || '');
        setDate(habitat.date ? new Date(habitat.date).toISOString().split('T')[0] : '');
        setNotes(habitat.notes || '');
        setCoordinate(habitat.gpsCoordinate || '');
        
        // Set existing images
        if (habitat.imageUrl && habitat.imageUrl.length > 0) {
          setExistingImages(habitat.imageUrl);
        }
      } catch (error) {
        console.error('Error fetching habitat data:', error);
        setError('Failed to load habitat data. Please try again.');
      }
    };
    
    if (habitatId && session) {
      fetchHabitatData();
    }
  }, [habitatId, session, router]);

  // Search for EU Veg Units as user types
  useEffect(() => {
    const searchEuVegUnits = async () => {
      if (habitatName.trim().length < 2) {
        setEuVegSuggestions([]);
        setShowSuggestions(false);
        return;
      }
      
      try {
        const response = await fetch(`/api/eu-veg-units/search?query=${encodeURIComponent(habitatName)}`);
        
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        
        const data = await response.json();
        setEuVegSuggestions(data.units);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error searching EU Veg Units:', error);
        setEuVegSuggestions([]);
        setShowSuggestions(false);
      }
    };
    
    const debounceTimer = setTimeout(searchEuVegUnits, 300);
    return () => clearTimeout(debounceTimer);
  }, [habitatName]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
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
      setPreviews(previewUrls);
    });
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const selectEuVegSuggestion = (nameWithoutAuthority) => {
    setHabitatName(nameWithoutAuthority);
    setShowSuggestions(false);
  };

  const removeImage = (index) => {
    const updatedFiles = [...selectedFiles];
    const updatedPreviews = [...previews];
    
    updatedFiles.splice(index, 1);
    updatedPreviews.splice(index, 1);
  
    setSelectedFiles(updatedFiles);
    setPreviews(updatedPreviews);
  };

  const removeExistingImage = (index) => {
    const updatedImages = [...existingImages];
    updatedImages.splice(index, 1);
    setExistingImages(updatedImages);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!session) {
      setError('You must be signed in to upload or edit');
      return;
    }
    
    // Validation for new uploads
    if (!isEditing && (!selectedFiles || selectedFiles.length === 0)) {
      setError('Please select at least one image to upload');
      return;
    }
    
    // Validation for edits - must have at least one image (either existing or new)
    if (isEditing && existingImages.length === 0 && (!selectedFiles || selectedFiles.length === 0)) {
      setError('Your habitat must have at least one image');
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
    setUploadProgress(10);
    setError('');

    try {
      let updatedImageUrls = [...existingImages]; // Start with existing images
      
      // Upload new images to Cloudinary if any
      if (selectedFiles && selectedFiles.length > 0) {
        const formData = new FormData();
        for (const file of selectedFiles) {
          formData.append('image', file);
        }
        
        setUploadProgress(30);
        
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        setUploadProgress(70);
        
        const uploadData = await uploadResponse.json();
        
        if (!uploadResponse.ok) {
          throw new Error(uploadData.message || 'Error uploading image');
        }
        
        // Add new images to the array
        updatedImageUrls = [...updatedImageUrls, ...uploadData.imageUrls];
      }
      
      setUploadProgress(80);
      
      // Prepare data for API call
      const habitatData = {
        gpsCoordinate: coordinate,
        habitatName,
        location,
        date: date || new Date().toISOString(),
        notes,
        imageUrl: updatedImageUrls,
      };
      
      // If editing, add the habitat ID
      if (isEditing) {
        habitatData.habitatId = habitatId;
      }
      
      // Create or update habitat entry
      const response = await fetch('/api/habitats', {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(habitatData),
      });
      
      setUploadProgress(95);
      
      // Get response
      const responseText = await response.text();
      const data = responseText ? JSON.parse(responseText) : {};
      
      if (!response.ok) {
        throw new Error(data.message || `Server error: ${response.status}`);
      }
      
      setUploadProgress(100);
      
      // Invalidate SWR cache to refresh habitat list
      mutate('/api/habitats');
      
      // Reset form and redirect
      setHabitatName('');
      setLocation('');
      setDate('');
      setNotes('');
      setSelectedFiles([]);
      setCoordinate('');
      setPreviews([]);
      setExistingImages([]);
      
      setSuccess(isEditing ? 'Habitat updated successfully!' : 'Habitat uploaded successfully!');
      setTimeout(() => {
        setSuccess('');
        router.push('/habitats');
      }, 2000);
      
    } catch (error) {
      console.error('Error:', error);
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4">{isEditing ? 'Edit Habitat' : 'Upload New Habitat'}</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <div 
            onClick={triggerFileInput}
            className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50"
          >
            {/* Show existing images if editing */}
            {isEditing && existingImages && existingImages.length > 0 && (
              <>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Current Images:</h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {existingImages.map((imageUrl, index) => (
                    <div key={`existing-${index}`} className="relative h-64 inline-block">
                      <Image
                        src={imageUrl}
                        alt={`Existing Image ${index + 1}`}
                        fill
                        className="object-contain"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeExistingImage(index);
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
            
            {/* Show new file previews */}
            {previews && previews.length > 0 && (
              <>
                {isEditing && <h3 className="text-sm font-medium text-gray-700 mb-2">New Images to Add:</h3>}
                <div className="grid grid-cols-3 gap-4">
                  {previews.map((preview, index) => (
                    <div key={`new-${index}`} className="relative h-64 inline-block">
                      <Image
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        fill
                        className="object-contain"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage(index);
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
            
            {/* Show upload prompt if no images are selected */}
            {(!previews || previews.length === 0) && (!existingImages || existingImages.length === 0) && (
              <div className="py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <p className="mt-2">Click to upload habitat images</p>
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
            Name without authority
          </label>
          <input
            type="text"
            id="habitatName"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            value={habitatName}
            onChange={(e) => setHabitatName(e.target.value)}
            placeholder="Search for EU vegetation unit..."
            required
          />
          {showSuggestions && euVegSuggestions.length > 0 && (
            <ul className="absolute z-10 bg-white w-full mt-1 border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
              {euVegSuggestions.map((unit) => (
                <li
                  key={unit._id}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => selectEuVegSuggestion(unit.name_without_authority)}
                >
                  <div className="font-medium">{unit.name_without_authority}</div>
                  <div className="text-xs text-gray-500">Code: {unit.code} | EVC: {unit.EVC_code}</div>
                </li>
              ))}
            </ul>
          )}
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
                onSelectCoordinate={(value, locationName) => {
                  setCoordinate(value);
                  setLocation(locationName); 
                }}
              />
            </div>
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
            type="button"
            onClick={() => router.push('/habitats')}
            className="mr-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isUploading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isUploading ? 'Saving...' : isEditing ? 'Update Habitat' : 'Upload Habitat'}
          </button>
        </div>
      </form>
    </div>
  );
}