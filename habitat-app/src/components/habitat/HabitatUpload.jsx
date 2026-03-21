'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { mutate } from 'swr';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import exifr from 'exifr'; // Import exifr for EXIF data extraction

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
  const [isDragging, setIsDragging] = useState(false);

  // EU vegetation hierarchy autocomplete state
  const [showClassSuggestions, setShowClassSuggestions] = useState(false);
  const [showOrderSuggestions, setShowOrderSuggestions] = useState(false);
  const [showAllianceSuggestions, setShowAllianceSuggestions] = useState(false);
  // Full option lists loaded on click (filtered client-side while typing)
  const [allClassOptions, setAllClassOptions] = useState([]);
  const [allOrderOptions, setAllOrderOptions] = useState([]);
  const [allAllianceOptions, setAllAllianceOptions] = useState([]);
  // Last confirmed valid selections (used to revert if user types a non-list value)
  const [lastValidClass, setLastValidClass] = useState('');
  const [lastValidOrder, setLastValidOrder] = useState('');
  const [lastValidAlliance, setLastValidAlliance] = useState('');
  const [exifData, setExifData] = useState(null);
  const [useExifData, setUseExifData] = useState(true);
  const [isLoadingExif, setIsLoadingExif] = useState(false);
  const [isGeocodingLocation, setIsGeocodingLocation] = useState(false);
  
  // Form state
  const [vegClass, setVegClass] = useState('');
  const [vegClassCode, setVegClassCode] = useState(''); // code of the selected class, used to filter order/alliance
  const [vegOrder, setVegOrder] = useState('');
  const [vegAlliance, setVegAlliance] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [dominantSpecies1, setDominantSpecies1] = useState('');
  const [dominantSpecies2, setDominantSpecies2] = useState('');
  const [dominantSpecies3, setDominantSpecies3] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
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
          setError('You do not have permission to edit this vegetation type');
          setTimeout(() => router.push('/habitats'), 2000);
          return;
        }
        
        // Set form values
        const className = habitat.vegClass || habitat.habitatName || '';
        setVegClass(className);
        setLastValidClass(className);
        setVegOrder(habitat.vegOrder || '');
        setLastValidOrder(habitat.vegOrder || '');
        setVegAlliance(habitat.vegAlliance || '');
        setLastValidAlliance(habitat.vegAlliance || '');
        setState(habitat.state || '');
        setCountry(habitat.country || '');
        setDate(habitat.date ? new Date(habitat.date).toISOString().split('T')[0] : '');
        setNotes(habitat.notes || '');
        setDominantSpecies1(habitat.dominantSpecies1 || '');
        setDominantSpecies2(habitat.dominantSpecies2 || '');
        setDominantSpecies3(habitat.dominantSpecies3 || '');

        // Resolve the class code so Order/Alliance dropdowns work in edit mode
        if (className) {
          try {
            const classResp = await fetch(`/api/eu-veg-units/search?type=class&query=${encodeURIComponent(className)}`);
            if (classResp.ok) {
              const classData = await classResp.json();
              const match = classData.units?.find(u => u.name_without_authority === className);
              if (match) {
                setVegClassCode(match.code);
                // Preload order/alliance options for the existing class
                const loadOpts = async (type, setOptions, code) => {
                  try {
                    const r = await fetch(`/api/eu-veg-units/search?type=${type}&fetchAll=true&classCode=${encodeURIComponent(code)}`);
                    if (r.ok) { const d = await r.json(); setOptions(d.units || []); }
                  } catch {}
                };
                loadOpts('order', setAllOrderOptions, match.code);
                loadOpts('alliance', setAllAllianceOptions, match.code);
              }
            }
          } catch {}
        }
        
        // Parse GPS coordinate if it exists
        if (habitat.gpsCoordinate) {
          const coords = habitat.gpsCoordinate.split(',');
          if (coords.length === 2) {
            setLatitude(coords[0].trim());
            setLongitude(coords[1].trim());
          }
        }
        
        // Set existing images
        if (habitat.imageUrl && habitat.imageUrl.length > 0) {
          setExistingImages(habitat.imageUrl);
        }
      } catch (error) {
        console.error('Error fetching habitat data:', error);
        setError('Failed to load vegetation type data. Please try again.');
      }
    };
    
    if (habitatId && session) {
      fetchHabitatData();
    }
  }, [habitatId, session, router]);
   // Extract EXIF data when selectedFiles array changes or useExifData toggle changes
  useEffect(() => {
    // Create a flag to track if we should process EXIF data
    // This helps prevent unnecessary processing
    const shouldProcessExif = useExifData && selectedFiles.length > 0;
    
    const extractExifData = async () => {
      // Handle clearing fields when useExifData is toggled off
        if (!useExifData) {
        // If we're not using EXIF data, clear the fields that might have been populated by EXIF
        if (exifData) {
          // Clear coordinates if they were set from EXIF data
          if (exifData.latitude && exifData.longitude) {
            setLatitude('');
            setLongitude('');
          }
          
          // Clear date if it was set from EXIF data
          if (exifData.DateTimeOriginal) {
            setDate('');
          }
        }
        return;
      }      // Only proceed if there are files and shouldProcessExif flag is true
      if (!shouldProcessExif) return;
      
      // Show the loading indicator
      setIsLoadingExif(true);
      
      try {
        let foundUsefulExif = false;
        let extractedData = null;
        
        // Try each file until we find one with the data we need
        for (const file of selectedFiles) {
          // Extract GPS and DateTime information
          const data = await exifr.parse(file, {
            gps: true,
            exif: true,
          });
          
          if (data) {
            // Check if this file has the important EXIF data we need
            const hasCoordinates = data.latitude && data.longitude;
            const hasDate = data.DateTimeOriginal;
            
            // If this file has coordinates or date, use it
            if (hasCoordinates || hasDate) {
              extractedData = data;
              foundUsefulExif = true;
              console.log('Found image with useful EXIF data:', data);
              break; // Stop searching once we find a good one
            } else {
              console.log('Image has EXIF data but missing important fields');
            }
          }
        }
        
        // If we found useful EXIF data, update the UI
        if (foundUsefulExif && extractedData) {
          // Populate GPS coordinates if available
          if (extractedData.latitude && extractedData.longitude) {
            setLatitude(extractedData.latitude.toFixed(2));
            setLongitude(extractedData.longitude.toFixed(2));
          }
            
          // Populate date if available
          if (extractedData.DateTimeOriginal) {
            try {
              const exifDate = new Date(extractedData.DateTimeOriginal);
              // Make sure the date is valid before using it
              if (!isNaN(exifDate.getTime())) {
                setDate(exifDate.toISOString().split('T')[0]);
              } else {
                console.warn('Could not parse EXIF date:', extractedData.DateTimeOriginal);
              }
            } catch (err) {
              console.error('Error parsing EXIF date:', err);
            }
          }
          
          // Set the EXIF data after handling the form fields
          // to prevent triggering the useEffect again
          setExifData(extractedData);
        } else {
          console.log('No images with useful EXIF data found');
        }
      } catch (error) {
        console.error('Error extracting EXIF data:', error);
        // Don't set error state to avoid UI disruption
      } finally {
        // Hide the loading indicator
        setIsLoadingExif(false);
      }
    };
    
    extractExifData();
  }, [selectedFiles, useExifData]); // Removed exifData from dependencies

  // Load all options for a vegetation hierarchy level (used on click/focus)
  const loadAllVegUnits = async (type, setOptions, classCode = '') => {
    try {
      let url = `/api/eu-veg-units/search?type=${type}&fetchAll=true`;
      if (classCode) url += `&classCode=${encodeURIComponent(classCode)}`;
      const response = await fetch(url);
      if (!response.ok) return;
      const data = await response.json();
      setOptions(data.units || []);
    } catch (err) {
      console.error('Error loading EU Veg Units:', err);
      setOptions([]);
    }
  };

  // Reverse geocode coordinates to get location info
  useEffect(() => {
    const reverseGeocode = async () => {
      // Only proceed if we have valid coordinates
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      
      if (!latitude || !longitude || isNaN(lat) || isNaN(lng)) {
        return;
      }
      
      // Validate coordinate ranges
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return;
      }
      
      setIsGeocodingLocation(true);
      
      try {
        // Use OpenStreetMap Nominatim for reverse geocoding (free, no API key needed)
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
          {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'HabitatVisualiser/1.0' // Nominatim requires a User-Agent
            }
          }
        );
        
        if (!response.ok) {
          throw new Error('Geocoding failed');
        }
        
        const data = await response.json();
        
        // Extract state and country from the response
        if (data.address) {
          // Get state/region (try different field names as they vary by country)
          const stateValue = data.address.state || 
                           data.address.region || 
                           data.address.province || 
                           data.address.county ||
                           '';
          
          // Get country
          const countryValue = data.address.country || '';
          
          // Update state and country whenever coordinates change
          if (stateValue) {
            setState(stateValue);
          }
          
          if (countryValue) {
            setCountry(countryValue);
          }
        }
      } catch (error) {
        console.error('Error reverse geocoding:', error);
        // Fail silently - don't disrupt the user experience
      } finally {
        setIsGeocodingLocation(false);
      }
    };
    
    // Debounce the geocoding to avoid too many API calls
    const debounceTimer = setTimeout(reverseGeocode, 800);
    return () => clearTimeout(debounceTimer);
  }, [latitude, longitude]); // Only depend on coordinates, not state/country to avoid loops
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
  
    // Clear existing EXIF data if we have any to allow the useEffect to find new EXIF data
    if (exifData) {
      setExifData(null);
    }
    
    // Generate previews for all selected files
    const previewPromises = files.map((file) => {
      const reader = new FileReader();
      return new Promise((resolve) => {
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
    });
  
    // Update state only once to minimize renders
    Promise.all(previewPromises).then((previewUrls) => {
      // Update both state variables at once to batch the renders
      setSelectedFiles(prevFiles => [...prevFiles, ...files]);
      setPreviews(prevPreviews => [...prevPreviews, ...previewUrls]);
    });
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  };  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length === 0) return;
    
    // Clear existing EXIF data if we have any to allow the useEffect to find new EXIF data
    if (exifData) {
      setExifData(null);
    }
    
    // Generate previews for dropped files
    const previewPromises = files.map((file) => {
      const reader = new FileReader();
      return new Promise((resolve) => {
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
    });
    
    // Update state only once to minimize renders
    Promise.all(previewPromises).then((previewUrls) => {
      // Update both state variables at once to batch the renders
      setSelectedFiles(prevFiles => [...prevFiles, ...files]);
      setPreviews(prevPreviews => [...prevPreviews, ...previewUrls]);
    });
    
    // EXIF data extraction is now handled by the useEffect hook that watches selectedFiles
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const selectClassSuggestion = (nameWithoutAuthority, code) => {
    setVegClass(nameWithoutAuthority);
    setLastValidClass(nameWithoutAuthority);
    setVegClassCode(code);
    setShowClassSuggestions(false);
    setVegOrder('');
    setLastValidOrder('');
    setVegAlliance('');
    setLastValidAlliance('');
    setAllOrderOptions([]);
    setAllAllianceOptions([]);
    setShowOrderSuggestions(false);
    setShowAllianceSuggestions(false);
    // Preload order and alliance options for the selected class
    loadAllVegUnits('order', setAllOrderOptions, code);
    loadAllVegUnits('alliance', setAllAllianceOptions, code);
  };

  const selectOrderSuggestion = (nameWithoutAuthority) => {
    setVegOrder(nameWithoutAuthority);
    setLastValidOrder(nameWithoutAuthority);
    setShowOrderSuggestions(false);
  };

  const selectAllianceSuggestion = (nameWithoutAuthority) => {
    setVegAlliance(nameWithoutAuthority);
    setLastValidAlliance(nameWithoutAuthority);
    setShowAllianceSuggestions(false);
  };

  const removeImage = (index) => {
    const updatedFiles = [...selectedFiles];
    const updatedPreviews = [...previews];
    
    updatedFiles.splice(index, 1);
    updatedPreviews.splice(index, 1);
  
    // If no images remain, clear the EXIF data and form fields
    if (updatedFiles.length === 0) {
      // If useExifData is true and we have EXIF data, clear the coordinates and date fields
      if (useExifData && exifData) {
        if (exifData.latitude && exifData.longitude) {
          setLatitude('');
          setLongitude('');
        }
        if (exifData.DateTimeOriginal) {
          setDate('');
        }
      }
      // Clear EXIF data last to avoid triggering unnecessary re-renders
      setExifData(null);
    } else if (exifData) {
      // If EXIF data exists and we still have files, clear it to allow a rescan
      // The useEffect will automatically run again due to selectedFiles changing
      setExifData(null);
    }
    
    // Always update the files/previews state last to ensure only one re-render
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
      setError('Your vegetation type must have at least one image');
      return;
    }
    
    if (!vegClass || !state || !country) {
      setError('Vegetation class, state, and country are required');
      return;
    }
    
    if (!latitude || !longitude) {
      setError('Both latitude and longitude are required');
      return;
    }
    
    // Validate latitude and longitude are numbers
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng)) {
      setError('Latitude and longitude must be valid numbers');
      return;
    }
    
    if (lat < -90 || lat > 90) {
      setError('Latitude must be between -90 and 90');
      return;
    }
    
    if (lng < -180 || lng > 180) {
      setError('Longitude must be between -180 and 180');
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
        gpsCoordinate: `${latitude},${longitude}`,
        vegClass,
        vegOrder,
        vegAlliance,
        state,
        country,
        date: date || new Date().toISOString(),
        notes,
        dominantSpecies1,
        dominantSpecies2,
        dominantSpecies3,
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
      setVegClass('');
      setVegOrder('');
      setVegAlliance('');
      setState('');
      setCountry('');
      setDate('');
      setNotes('');
      setDominantSpecies1('');
      setDominantSpecies2('');
      setDominantSpecies3('');
      setSelectedFiles([]);
      setLatitude('');
      setLongitude('');
      setPreviews([]);
      setExistingImages([]);
      
      setSuccess(isEditing ? 'Vegetation type updated successfully!' : 'Vegetation type uploaded successfully!');
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
      <h2 className="text-2xl font-bold mb-4">{isEditing ? 'Edit Vegetation type' : 'Upload New Vegetation type'}</h2>
      
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
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'} rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors duration-200 relative`}
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
                <p className="mt-2">Click to upload vegetation type images or drag and drop files here</p>
              </div>
            ) }
            
            {/* Always visible add more button when there are already images */}
            {((previews && previews.length > 0) || (existingImages && existingImages.length > 0)) && (
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerFileInput();
                }}
                className="mt-4 flex items-center justify-center w-full py-2 bg-indigo-50 hover:bg-indigo-100 border border-dashed border-indigo-300 rounded text-indigo-600 transition-all duration-200"
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Images
              </button>
            )}
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              multiple
              className="hidden"
              onClick={(e) => {
                // This prevents the file input from capturing click events from elements below it
                e.stopPropagation();
              }}
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
        
        {/* Vegetation Class (mandatory) */}
        <div className="mb-4 relative">
          <label htmlFor="vegClass" className="block text-sm font-medium text-gray-700 mb-1">
            Vegetation Class <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="vegClass"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            value={vegClass}
            onChange={(e) => {
              setVegClass(e.target.value);
              setVegClassCode('');
              setVegOrder('');
              setLastValidOrder('');
              setVegAlliance('');
              setLastValidAlliance('');
              setAllOrderOptions([]);
              setAllAllianceOptions([]);
              setShowOrderSuggestions(false);
              setShowAllianceSuggestions(false);
              setShowClassSuggestions(true);
            }}
            onFocus={() => {
              if (allClassOptions.length === 0) loadAllVegUnits('class', setAllClassOptions);
              setShowClassSuggestions(true);
            }}
            onBlur={() => {
              const match = allClassOptions.find(u => u.name_without_authority === vegClass);
              if (!match) setVegClass(lastValidClass);
              setShowClassSuggestions(false);
            }}
            placeholder="Click to select a vegetation class..."
            required
          />
          {showClassSuggestions && (
            <ul className="absolute z-10 bg-white w-full mt-1 border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto" onMouseDown={(e) => e.preventDefault()}>
              {allClassOptions
                .filter(u => !vegClass || u.name_without_authority.toLowerCase().includes(vegClass.toLowerCase()))
                .map((unit) => (
                  <li
                    key={unit._id}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => selectClassSuggestion(unit.name_without_authority, unit.code)}
                  >
                    <div className="font-medium">{unit.name_without_authority}</div>
                    <div className="text-xs text-gray-500">Code: {unit.code}</div>
                  </li>
                ))}
            </ul>
          )}
        </div>

        {/* Vegetation Order (optional) */}
        <div className="mb-4 relative">
          <label htmlFor="vegOrder" className="block text-sm font-medium text-gray-700 mb-1">
            Vegetation Order
          </label>
          <input
            type="text"
            id="vegOrder"
            className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${!vegClassCode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            value={vegOrder}
            onChange={(e) => { setVegOrder(e.target.value); setShowOrderSuggestions(true); }}
            onFocus={() => {
              if (!vegClassCode) return;
              if (allOrderOptions.length === 0) loadAllVegUnits('order', setAllOrderOptions, vegClassCode);
              setShowOrderSuggestions(true);
            }}
            onBlur={() => {
              if (vegOrder !== '') {
                const match = allOrderOptions.find(u => u.name_without_authority === vegOrder);
                if (!match) setVegOrder(lastValidOrder);
              }
              setShowOrderSuggestions(false);
            }}
            placeholder={vegClassCode ? 'Click to select a vegetation order...' : 'Select a vegetation class first'}
            disabled={!vegClassCode}
          />
          {showOrderSuggestions && vegClassCode && (
            <ul className="absolute z-10 bg-white w-full mt-1 border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto" onMouseDown={(e) => e.preventDefault()}>
              {allOrderOptions
                .filter(u => !vegOrder || u.name_without_authority.toLowerCase().includes(vegOrder.toLowerCase()))
                .map((unit) => (
                  <li
                    key={unit._id}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => selectOrderSuggestion(unit.name_without_authority)}
                  >
                    <div className="font-medium">{unit.name_without_authority}</div>
                    <div className="text-xs text-gray-500">Code: {unit.code}</div>
                  </li>
                ))}
            </ul>
          )}
        </div>

        {/* Vegetation Alliance (optional) */}
        <div className="mb-4 relative">
          <label htmlFor="vegAlliance" className="block text-sm font-medium text-gray-700 mb-1">
            Vegetation Alliance
          </label>
          <input
            type="text"
            id="vegAlliance"
            className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${!vegClassCode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            value={vegAlliance}
            onChange={(e) => { setVegAlliance(e.target.value); setShowAllianceSuggestions(true); }}
            onFocus={() => {
              if (!vegClassCode) return;
              if (allAllianceOptions.length === 0) loadAllVegUnits('alliance', setAllAllianceOptions, vegClassCode);
              setShowAllianceSuggestions(true);
            }}
            onBlur={() => {
              if (vegAlliance !== '') {
                const match = allAllianceOptions.find(u => u.name_without_authority === vegAlliance);
                if (!match) setVegAlliance(lastValidAlliance);
              }
              setShowAllianceSuggestions(false);
            }}
            placeholder={vegClassCode ? 'Click to select a vegetation alliance...' : 'Select a vegetation class first'}
            disabled={!vegClassCode}
          />
          {showAllianceSuggestions && vegClassCode && (
            <ul className="absolute z-10 bg-white w-full mt-1 border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto" onMouseDown={(e) => e.preventDefault()}>
              {allAllianceOptions
                .filter(u => !vegAlliance || u.name_without_authority.toLowerCase().includes(vegAlliance.toLowerCase()))
                .map((unit) => (
                  <li
                    key={unit._id}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => selectAllianceSuggestion(unit.name_without_authority)}
                  >
                    <div className="font-medium">{unit.name_without_authority}</div>
                    <div className="text-xs text-gray-500">Code: {unit.code}</div>
                  </li>
                ))}
            </ul>
          )}
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            GPS Coordinates
            {isGeocodingLocation && (
              <span className="ml-2 text-xs text-indigo-600">
                (Looking up location...)
              </span>
            )}
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="latitude" className="block text-xs text-gray-600 mb-1">
                Latitude <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="latitude"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="e.g., 28.6139"
                required
              />
            </div>
            <div>
              <label htmlFor="longitude" className="block text-xs text-gray-600 mb-1">
                Longitude <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="longitude"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="e.g., 77.2090"
                required
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowMap(!showMap)}
            className="mt-2 flex items-center text-sm text-indigo-600 hover:text-indigo-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            {showMap ? "Hide map" : "Select coordinates from map"}
          </button>          {/* EXIF Data Info */}
          {isLoadingExif && (
            <div className="mt-2 text-sm">
              <div className="flex items-center text-indigo-600">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Extracting EXIF data from photos...
              </div>
            </div>
          )}
          
          {exifData && !isLoadingExif && (
            <div className="mt-2 text-sm">
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id="useExifData"
                  checked={useExifData}
                  onChange={() => {
                    // Simply toggle the useExifData value
                    // The useEffect hook will handle the form field updates
                    setUseExifData(!useExifData);
                  }}
                  className="mr-2"
                />
                <label htmlFor="useExifData" className="text-indigo-600 font-medium">
                  Use EXIF data from photos
                </label>
              </div>
              {exifData && useExifData && (
                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                  <p className="font-medium text-blue-800 mb-1">Photo EXIF Data Found:</p>
                  <ul className="list-disc list-inside text-blue-700 space-y-1">
                    {exifData.latitude && exifData.longitude && (
                      <li>GPS: {exifData.latitude.toFixed(2)}, {exifData.longitude.toFixed(2)}</li>
                    )}
                    {exifData.DateTimeOriginal && (
                      <li>Date Taken: {new Date(exifData.DateTimeOriginal).toLocaleDateString()}</li>
                    )}
                    {exifData.Make && exifData.Model && (
                      <li>Camera: {exifData.Make} {exifData.Model}</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          {showMap && (
            <div className="border border-gray-300 rounded-md mt-2 overflow-hidden" style={{ height: '400px' }}>
              <MapSelector 
                key={`${latitude},${longitude}`}
                currentCoordinate={latitude && longitude ? `${latitude},${longitude}` : ''} 
                onSelectCoordinate={(value, stateValue, countryValue) => {
                  const coords = value.split(',');
                  if (coords.length === 2) {
                    setLatitude(coords[0].trim());
                    setLongitude(coords[1].trim());
                  }
                  setState(stateValue); 
                  setCountry(countryValue);
                }}
              />
            </div>
          )}
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="state" className="block text-xs text-gray-600 mb-1">
                State/Region, Municipality, Site name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="state"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g., Bavaria"
                required
              />
            </div>
            <div>
              <label htmlFor="country" className="block text-xs text-gray-600 mb-1">
                Country <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="country"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g., Germany"
                required
              />
            </div>
          </div>
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
          <label htmlFor="dominantSpecies1" className="block text-sm font-medium text-gray-700 mb-1">
            Dominant species 1
          </label>
          <input
            type="text"
            id="dominantSpecies1"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            value={dominantSpecies1}
            onChange={(e) => setDominantSpecies1(e.target.value)}
            placeholder="Enter dominant species 1"
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="dominantSpecies2" className="block text-sm font-medium text-gray-700 mb-1">
            Dominant species 2
          </label>
          <input
            type="text"
            id="dominantSpecies2"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            value={dominantSpecies2}
            onChange={(e) => setDominantSpecies2(e.target.value)}
            placeholder="Enter dominant species 2"
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="dominantSpecies3" className="block text-sm font-medium text-gray-700 mb-1">
            Dominant species 3
          </label>
          <input
            type="text"
            id="dominantSpecies3"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            value={dominantSpecies3}
            onChange={(e) => setDominantSpecies3(e.target.value)}
            placeholder="Enter dominant species 3"
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
            {isUploading ? 'Saving...' : isEditing ? 'Update Vegetation type' : 'Upload Vegetation type'}
          </button>
        </div>
      </form>
    </div>
  );
}