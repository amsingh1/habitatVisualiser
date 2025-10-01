'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

export default function DownloadModal({ 
  isOpen, 
  onClose, 
  selectedHabitats = [], 
  onDownload 
}) {
  const { data: session } = useSession();
  const [downloadType, setDownloadType] = useState('zip');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includeImages, setIncludeImages] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState('');

  if (!isOpen || !session) return null;

  const handleDownload = async () => {
    if (selectedHabitats.length === 0) {
      alert('Please select at least one habitat to download.');
      return;
    }

    setIsDownloading(true);
    setDownloadProgress('Preparing download...');

    try {
      const habitatIds = selectedHabitats.map(h => h._id);
      
      const response = await fetch('/api/habitats/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          habitatIds,
          downloadType,
          includeImages,
          includeMetadata
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Download failed');
      }

      setDownloadProgress('Processing files...');

      // Handle the download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Get filename from response headers or generate one
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'habitat_export.zip';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setDownloadProgress('Download completed!');
      setTimeout(() => {
        onClose();
        setDownloadProgress('');
      }, 2000);

      // Notify parent component
      if (onDownload) {
        onDownload({
          count: selectedHabitats.length,
          type: downloadType,
          filename
        });
      }

    } catch (error) {
      console.error('Download error:', error);
      setDownloadProgress(`Error: ${error.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const getTotalImages = () => {
    return selectedHabitats.reduce((total, habitat) => {
      return total + (habitat.imageUrl ? habitat.imageUrl.length : 0);
    }, 0);
  };

  const getEstimatedSize = () => {
    const totalImages = getTotalImages();
    const avgImageSize = 2; // MB per image (rough estimate)
    const totalSizeMB = totalImages * avgImageSize;
    
    if (totalSizeMB < 1024) {
      return `~${totalSizeMB}MB`;
    } else {
      return `~${(totalSizeMB / 1024).toFixed(1)}GB`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          aria-hidden="true"
          onClick={onClose}
        ></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                  Download Habitat Data
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Download {selectedHabitats.length} habitat{selectedHabitats.length !== 1 ? 's' : ''} 
                    {' '}({getTotalImages()} image{getTotalImages() !== 1 ? 's' : ''})
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Estimated size: {getEstimatedSize()}
                  </p>
                </div>

                {/* Download Options */}
                <div className="mt-4 space-y-4">
                  {/* Download Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Download Format
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="downloadType"
                          value="zip"
                          checked={downloadType === 'zip'}
                          onChange={(e) => setDownloadType(e.target.value)}
                          className="mr-2"
                        />
                        <span className="text-sm">ZIP Archive (images + metadata)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="downloadType"
                          value="csv"
                          checked={downloadType === 'csv'}
                          onChange={(e) => setDownloadType(e.target.value)}
                          className="mr-2"
                        />
                        <span className="text-sm">CSV File (metadata only)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="downloadType"
                          value="images-only"
                          checked={downloadType === 'images-only'}
                          onChange={(e) => setDownloadType(e.target.value)}
                          className="mr-2"
                        />
                        <span className="text-sm">Images Only (ZIP)</span>
                      </label>
                    </div>
                  </div>

                  {/* Additional Options for ZIP downloads */}
                  {downloadType === 'zip' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Include
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={includeImages}
                            onChange={(e) => setIncludeImages(e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-sm">Original resolution images</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={includeMetadata}
                            onChange={(e) => setIncludeMetadata(e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-sm">Metadata spreadsheet (CSV)</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Progress indicator */}
                  {isDownloading && (
                    <div className="mt-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                          <span className="text-sm text-blue-700">{downloadProgress}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              disabled={isDownloading}
              onClick={handleDownload}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDownloading ? 'Downloading...' : 'Download'}
            </button>
            <button
              type="button"
              disabled={isDownloading}
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}