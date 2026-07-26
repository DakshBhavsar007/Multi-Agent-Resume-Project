import React, { useState } from "react";
import { Upload, Camera, Check, X } from "lucide-react";
import { toast } from "react-hot-toast";

export default function DragDropAvatarUploader({ currentAvatar, fullName, onUpload, uploading }) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState(currentAvatar || null);

  const handleFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      return toast.error("Please upload an image file (PNG, JPG, WEBP)");
    }
    if (file.size > 5 * 1024 * 1024) {
      return toast.error("File size must be under 5 MB");
    }

    // Instant local preview
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(file);

    if (onUpload) onUpload(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-gray-100 dark:border-gray-800">
      {/* PREVIEW CONTAINER */}
      <div 
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative group rounded-full transition-all cursor-pointer ${
          isDragging ? "ring-4 ring-blue-500 scale-105" : ""
        }`}
      >
        {preview ? (
          <img 
            src={preview} 
            alt="Profile Avatar" 
            className="w-24 h-24 rounded-full object-cover border-2 border-blue-500/20 shadow-md"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 font-extrabold text-3xl shadow-sm">
            {fullName?.charAt(0)?.toUpperCase() || "U"}
          </div>
        )}
        <label className="absolute bottom-0 right-0 p-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-lg transition-transform hover:scale-110">
          <Camera size={16} />
          <input 
            type="file" 
            accept="image/png, image/jpeg, image/webp" 
            onChange={(e) => handleFile(e.target.files?.[0])} 
            className="hidden" 
            disabled={uploading}
          />
        </label>
      </div>

      {/* DROPZONE INFO */}
      <div className="flex-1 text-center sm:text-left space-y-1">
        <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">Profile Avatar Photo</h4>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Drag and drop an image here, or click to browse. Max 5MB (PNG, JPG, WEBP).
        </p>
        <div className="pt-2 flex items-center justify-center sm:justify-start gap-3">
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold text-gray-800 dark:text-gray-200 cursor-pointer transition-colors">
            <Upload size={14} />
            {uploading ? "Uploading..." : "Browse Photo"}
            <input 
              type="file" 
              accept="image/png, image/jpeg, image/webp" 
              onChange={(e) => handleFile(e.target.files?.[0])} 
              className="hidden" 
              disabled={uploading}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
