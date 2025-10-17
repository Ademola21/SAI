import React, { useRef, useCallback, useState } from 'react';
import { UploadIcon } from './icons/UploadIcon';
import { PlusIcon } from './icons/PlusIcon';

interface ImageUploaderProps {
  onImagesUpload: (files: File[]) => void;
  isExtracting: boolean;
  disabled: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImagesUpload, isExtracting, disabled }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      onImagesUpload(Array.from(files));
    }
    event.target.value = ''; // Reset input to allow re-uploading the same file(s)
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleDragEvents = useCallback((e: React.DragEvent<HTMLDivElement>, isEntering: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(isEntering);
    }
  }, [disabled]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
        const imageFiles = Array.from(files).filter((file: File) => file.type.startsWith('image/'));
        if (imageFiles.length > 0) {
            onImagesUpload(imageFiles);
        }
    }
  }, [onImagesUpload, disabled]);

  return (
    <div className={`bg-slate-800/50 border-2 border-dashed rounded-xl p-6 transition-all duration-300 ${disabled ? 'cursor-not-allowed' : 'hover:border-cyan-400'} ${isDragging ? 'border-cyan-400' : 'border-slate-600'}`}
        onDragEnter={(e) => handleDragEvents(e, true)}
        onDragLeave={(e) => handleDragEvents(e, false)}
        onDragOver={(e) => handleDragEvents(e, true)}
        onDrop={handleDrop}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
        disabled={isExtracting || disabled}
        multiple // Allow multiple file selection
      />
      <div className="text-center">
        <div className="flex justify-center items-center">
          <UploadIcon className="w-12 h-12 text-slate-500" />
        </div>
        <p className="mt-4 text-slate-300">
            {isDragging ? "Drop images here..." : "Drag & drop screenshots here, or click to upload"}
        </p>
        <p className="text-xs text-slate-500 mt-1">You can select multiple images</p>
        <button
          onClick={handleClick}
          disabled={isExtracting || disabled}
          className="mt-4 inline-flex items-center gap-2 px-6 py-2 bg-cyan-500 text-white font-semibold rounded-lg shadow-md hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-slate-900 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
        >
          {isExtracting ? (
            <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Extracting...
            </>
          ) : (
            <>
              <PlusIcon className="w-5 h-5" />
              Add Screenshot(s)
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ImageUploader;