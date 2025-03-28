'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function HabitatUpload() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [habitatSuggestions, setHabitatSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Form state
  const [habitatName, setHabitatName] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]); // Array of selected files
const [previews, setPreviews] = useState(null); // Array of preview URLs
  
  const fileInputRef = useRef(null);

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
    
    if (!selectedFiles) {
      setError('Please select an image to upload');
      return;
    }
    
    if (!habitatName || !location) {
      setError('Habitat name and location are required');
      return;
    }
    
    setIsUploading(true);
    setError('');
  
    try {
      // Upload image first
      const formData = new FormData();
      for (const file of selectedFiles) {
        formData.append('image', file); // Append each file with the key 'image'
      }
      console.log("formData:", formData);
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      const uploadData = await uploadResponse.json();
      console.log("Upload response:", uploadData);
      if (!uploadResponse.ok) {
        throw new Error(uploadData.message || 'Error uploading image');
      }
      
     // Create habitat entry with image URL
try {
  console.log("Sending habitat data:", {
    habitatName,
    location,
    date: date || new Date().toISOString(),
    notes,
    imageUrl: uploadData.imageUrls,
  });
  console.log("Upload response:", uploadData);
  const habitatResponse = await fetch('/api/habitats', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      habitatName,
      location,
      date: date || new Date().toISOString(),
      notes,
      imageUrl: uploadData.imageUrls,
    }),
  });
  
  // Check response status
  console.log("Response status:", habitatResponse.status);
  
  // Get response as text first
  const responseText = await habitatResponse.text();
  console.log("Response text:", responseText);
  
  // Only try to parse as JSON if there's content
  const habitatData = responseText ? JSON.parse(responseText) : {};
  
  if (!habitatResponse.ok) {
    throw new Error(habitatData.message || `Server error: ${habitatResponse.status}`);
  }
  
  console.log('Habitat created successfully:', habitatData);
  
  // Rest of your success handling code...
  
} catch (error) {
  console.error('Error creating habitat:', error);
  setError(error.message || 'An unexpected error occurred');
  setIsUploading(false);
}
      
      // Reset form
      setHabitatName('');
      setLocation('');
      setDate('');
      setNotes('');
      setSelectedFiles(null);
      setPreviews(null);
      
      // Redirect to habitats page or refresh the current page
      router.push('/habitats');
      router.refresh();
    } catch (error) {
      console.error('Error:', error);
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setIsUploading(false);
    }
  };
  const removeImage = (index) => {
    const updatedFiles = selectedFiles.filter((_, i) => i !== index);
    const updatedPreviews = previews.filter((_, i) => i !== index);
  
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
                <p className="mt-2">Click to upload a habitat image</p>
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