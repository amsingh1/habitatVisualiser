'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import useSWR from 'swr';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import DownloadModal from './DownloadModal';
import ConfirmationModal from '../ui/ConfirmationModal';

// Create a fetcher function
const fetcher = (...args) => fetch(...args).then(res => res.json());

export default function HabitatList({ dataType = 'habitats', userId = null }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [selectedHabitat, setSelectedHabitat] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedHabitats, setSelectedHabitats] = useState([]);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [habitatToDelete, setHabitatToDelete] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  
  // Get search parameters from URL
  const searchParams = useSearchParams();
  const searchText = searchParams.get('q') || '';
  const searchField = searchParams.get('field') || 'habitatName'; // Default to habitatName
  const searchContext = searchParams.get('context') || dataType;
  
  // Determine if a search is being performed
  const isSearching = searchText !== '';
  
  // Determine the API endpoint based on dataType and search parameters
  const getApiEndpoint = () => {
    // If searching, use search endpoint
    if (isSearching) {
      const queryString = new URLSearchParams({
        q: searchText,
        field: searchField,
        context: dataType
      }).toString();
      return `/api/habitats/all-search?${queryString}`;
    }
    
    // Otherwise use standard endpoints
    return dataType === 'personal' 
      ? `/api/habitats/my` 
      : '/api/habitats';
  };
  
  // Use SWR to fetch and keep habitats data up-to-date
  const { data, error, isLoading, mutate } = useSWR(getApiEndpoint(), fetcher);
  
  // Extract habitats from data
  const habitats = data?.habitats || [];

  // Add event listener for habitat selection from the map
  useEffect(() => {
    const handleHabitatSelected = (event) => {
      const { habitat } = event.detail;
      // Find the matching habitat in our list (in case the data structure is slightly different)
      const matchingHabitat = habitats.find(h => h._id === habitat._id);
      if (matchingHabitat) {
        setSelectedHabitat(matchingHabitat);
        setCurrentImageIndex(0);
      } else {
        // If not found in our current list, use the habitat from the event
        setSelectedHabitat(habitat);
        setCurrentImageIndex(0);
      }
    };

    // Add event listener
    document.addEventListener('habitat-selected', handleHabitatSelected);
    
    // Cleanup on unmount
    return () => {
      document.removeEventListener('habitat-selected', handleHabitatSelected);
    };
  }, [habitats]);

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const openDetails = (habitat) => {
    setSelectedHabitat(habitat);
    setCurrentImageIndex(0);
  };

  const closeDetails = () => {
    setSelectedHabitat(null);
    setCurrentImageIndex(0);
  };

  const goToNextImage = () => {
    if (selectedHabitat) {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === selectedHabitat.imageUrl.length - 1 ? 0 : prevIndex + 1
      );
    }
  };

  const goToPrevImage = () => {
    if (selectedHabitat) {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === 0 ? selectedHabitat.imageUrl.length - 1 : prevIndex - 1
      );
    }
  };

  const goToImage = (index) => {
    setCurrentImageIndex(index);
  };

  // Selection and download functions
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedHabitats([]);
  };

  const toggleHabitatSelection = (habitat) => {
    setSelectedHabitats(prev => {
      const isSelected = prev.some(h => h._id === habitat._id);
      if (isSelected) {
        return prev.filter(h => h._id !== habitat._id);
      } else {
        return [...prev, habitat];
      }
    });
  };

  const selectAllHabitats = () => {
    setSelectedHabitats(habitats);
  };

  const clearSelection = () => {
    setSelectedHabitats([]);
  };

  const handleDownload = () => {
    if (selectedHabitats.length === 0) {
      alert('Please select at least one habitat to download.');
      return;
    }
    setShowDownloadModal(true);
  };

  const handleDownloadComplete = (downloadInfo) => {
    console.log('Download completed:', downloadInfo);
    // You can add success notification here
    setIsSelectionMode(false);
    setSelectedHabitats([]);
  };

  const handleDeleteHabitat = (habitat) => {
    setHabitatToDelete(habitat);
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = async () => {
    if (!habitatToDelete) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/habitats?id=${habitatToDelete._id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete habitat');
      }

      // Success - trigger a re-fetch of the data
      mutate();
      
      // Close the detail modal if the deleted habitat was being viewed
      if (selectedHabitat && selectedHabitat._id === habitatToDelete._id) {
        setSelectedHabitat(null);
      }

      // Close confirmation modal
      setShowDeleteConfirmation(false);
      setHabitatToDelete(null);

      console.log('Habitat deleted successfully');
    } catch (error) {
      console.error('Error deleting habitat:', error);
      // You could show an error modal here instead of alert
      alert(`Failed to delete habitat: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirmation(false);
    setHabitatToDelete(null);
  };

  return (
    <div className="relative">
      {/* Note: SearchHabitatComponent is now separate and not included here */}
      
      {/* Download Toolbar */}
      {session && habitats.length > 0 && (
        <div className="mb-4 bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleSelectionMode}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isSelectionMode
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {isSelectionMode ? 'Exit Selection' : 'Select for Download'}
              </button>
              
              {isSelectionMode && (
                <>
                  <span className="text-sm text-gray-600">
                    {selectedHabitats.length} of {habitats.length} selected
                  </span>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={selectAllHabitats}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Select All
                    </button>
                    <button
                      onClick={clearSelection}
                      className="text-sm text-gray-600 hover:text-gray-800"
                    >
                      Clear
                    </button>
                  </div>
                </>
              )}
            </div>
            
            {isSelectionMode && selectedHabitats.length > 0 && (
              <button
                onClick={handleDownload}
                className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download ({selectedHabitats.length})
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-10 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Loading habitats...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="text-center py-10 bg-red-50 rounded-lg">
          <p className="text-red-500">Error loading habitats. Please try again.</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && habitats.length === 0 && (
        <div className="text-center py-10 bg-gray-50 rounded-lg">
          {isSearching 
            ? <p className="text-gray-500">No vegetation types found matching your search.</p>
            : <p className="text-gray-500">No vegetation type entries found. Upload your first one!</p>
          }
        </div>
      )}

      {/* Habitat grid */}
      {!isLoading && !error && habitats.length > 0 && (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {habitats.map((habitat) => (
      <div
        key={habitat._id}
        className="bg-white rounded-lg shadow overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 flex flex-col"
      >
        {/* Show just the first image prominent in the card */}
        <div 
          className="relative h-48 w-full overflow-hidden"
          onClick={() => isSelectionMode ? toggleHabitatSelection(habitat) : openDetails(habitat)}
        >
          {habitat.imageUrl && habitat.imageUrl.length > 0 && (
            <Image
              src={habitat.imageUrl[0]}
              alt={`${habitat.habitatName}`}
              fill
              className="object-cover hover:scale-105 transition-transform duration-300"
            />
          )}
          
          {/* Selection checkbox - only show in selection mode */}
          {isSelectionMode && (
            <div className="absolute top-2 left-2">
              <input
                type="checkbox"
                checked={selectedHabitats.some(h => h._id === habitat._id)}
                onChange={() => toggleHabitatSelection(habitat)}
                className="w-5 h-5 text-blue-600 bg-white border-2 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
          
          {/* Image count badge */}
          {habitat.imageUrl && habitat.imageUrl.length > 1 && (
            <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded-full text-xs">
              +{habitat.imageUrl.length - 1} more
            </div>
          )}
        </div>
        
        {/* Habitat info */}
        <div className="p-4 flex flex-col flex-grow">
          <div>
            <h3 className="text-lg font-semibold">{habitat.habitatName}</h3>
            <p className="text-gray-600">{habitat.location}</p>
            <p className="text-gray-500 text-sm">{formatDate(habitat.date)}</p>
            {habitat.gpsCoordinate && <p className="text-gray-500 text-sm mt-2">Coordinates: {habitat.gpsCoordinate}</p>}
            {habitat.userName && <p className="text-gray-500 text-sm mt-2">Added by: {habitat.userName}</p>}
          </div>
          
          {/* Action buttons - always at the bottom of the card */}
          <div className="mt-auto pt-3 flex justify-end gap-2">
            {/* Only show edit and delete buttons for habitats created by the current user */}
            {session && session.user && habitat.userEmail === session.user.email && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent opening the modal
                    router.push(`/habitats/upload?id=${habitat._id}`);
                  }}
                  className="text-xs text-gray-700 bg-transparent hover:bg-indigo-100 px-3 py-1.5 rounded-md flex items-center transition-colors"
                  title="Edit vegetation type"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3.5 w-3.5 mr-1.5"
                  >
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                  </svg>
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent opening the modal
                    handleDeleteHabitat(habitat);
                  }}
                  disabled={isDeleting && habitatToDelete && habitatToDelete._id === habitat._id}
                  className="text-xs text-red-600 bg-transparent hover:bg-red-100 px-3 py-1.5 rounded-md flex items-center transition-colors disabled:opacity-50"
                  title="Delete vegetation type"
                >
                  {isDeleting && habitatToDelete && habitatToDelete._id === habitat._id ? (
                    <svg className="animate-spin h-3.5 w-3.5 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="m12 4 2.5 2.5L12 9V4z"></path>
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3.5 w-3.5 mr-1.5"
                    >
                      <polyline points="3,6 5,6 21,6"></polyline>
                      <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    ))}
  </div>
)}

      {/* Modal with image slider/carousel - Higher Z-index */}
      {selectedHabitat && selectedHabitat.imageUrl && selectedHabitat.imageUrl.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="relative">
              {/* Main image carousel */}
              <div className="relative h-[80vh] w-full">
                <Image
                  src={selectedHabitat.imageUrl[currentImageIndex]}
                  alt={`${selectedHabitat.habitatName} - Image ${currentImageIndex + 1}`}
                  fill
                  className="object-contain"
                  priority
                />
                
                {/* Navigation arrows */}
                {selectedHabitat.imageUrl.length > 1 && (
                  <>
                    <button 
                      onClick={(e) => { e.stopPropagation(); goToPrevImage(); }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-20 text-white p-2 rounded-full hover:bg-opacity-40 transition-opacity"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 19l-7-7 7-7"></path>
                      </svg>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); goToNextImage(); }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-20 text-white p-2 rounded-full hover:bg-opacity-40 transition-opacity"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5l7 7-7 7"></path>
                      </svg>
                    </button>
                  </>
                )}
                
                {/* Image counter - more subtle */}
                <div className="absolute bottom-4 right-4 bg-black bg-opacity-30 text-white px-2 py-0.5 rounded-full text-xs">
                  {currentImageIndex + 1} / {selectedHabitat.imageUrl.length}
                </div>
                
                {/* Action buttons for owner */}
                {session && session.user && selectedHabitat.userEmail === session.user.email && (
                  <div className="absolute top-4 left-4 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        closeDetails();
                        router.push(`/habitats/upload?id=${selectedHabitat._id}`);
                      }}
                      className="bg-black bg-opacity-30 text-white p-1.5 rounded-full hover:bg-opacity-50 transition-opacity"
                      title="Edit vegetation type"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                      </svg>
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteHabitat(selectedHabitat);
                      }}
                      disabled={isDeleting && habitatToDelete && habitatToDelete._id === selectedHabitat._id}
                      className="bg-black bg-opacity-30 text-white p-1.5 rounded-full hover:bg-opacity-50 transition-opacity disabled:opacity-50"
                      title="Delete vegetation type"
                    >
                      {isDeleting && habitatToDelete && habitatToDelete._id === selectedHabitat._id ? (
                        <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="m12 4 2.5 2.5L12 9V4z"></path>
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                      )}
                    </button>
                  </div>
                )}
                
                {/* Close button - more subtle */}
                <button
                  onClick={(e) => { e.stopPropagation(); closeDetails(); }}
                  className="absolute top-4 right-4 bg-black bg-opacity-30 text-white p-1.5 rounded-full hover:bg-opacity-50 transition-opacity"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
              
              {/* Thumbnail strip */}
              {selectedHabitat.imageUrl.length > 1 && (
                <div className="bg-gray-100 p-2 flex overflow-x-auto">
                  {selectedHabitat.imageUrl.map((url, index) => (
                    <div 
                      key={index} 
                      onClick={(e) => { e.stopPropagation(); goToImage(index); }}
                      className={`relative h-16 w-16 flex-shrink-0 mx-1 cursor-pointer ${
                        currentImageIndex === index 
                          ? 'ring-2 ring-blue-500' 
                          : 'hover:opacity-80'
                      }`}
                    >
                      <Image
                        src={url}
                        alt={`Thumbnail ${index + 1}`}
                        fill
                        className="object-cover rounded"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Download Modal */}
      <DownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        selectedHabitats={selectedHabitats}
        onDownload={handleDownloadComplete}
      />
      
      <ConfirmationModal
        isOpen={showDeleteConfirmation}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Delete Vegetation Type"
        message={habitatToDelete ? (
          <>
            Are you sure you want to delete <strong>"{habitatToDelete.habitatName}"</strong>? This action cannot be undone and will permanently remove all associated images and data.
          </>
        ) : ''}
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeleting}
      />
    </div>
  );
}