import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, FolderOpen, X, Search, Image as ImageIcon, Check, Loader2, Grid, ChevronLeft
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

// Helper to get full URL for images
const getFullUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `${API}${url.startsWith('/') ? '' : '/'}${url}`;
};

/**
 * MediaPicker Component
 * 
 * A reusable component for selecting images either from:
 * 1. Media Library (existing uploads)
 * 2. Direct file upload
 * 3. URL paste
 * 
 * Props:
 * - value: Current image URL
 * - onChange: Callback when image is selected (receives URL string)
 * - label: Label for the field (optional)
 * - width: Recommended width in pixels (optional)
 * - height: Recommended height in pixels (optional)
 * - description: Help text (optional)
 * - className: Additional CSS classes (optional)
 */
const MediaPicker = ({ 
  value, 
  onChange, 
  label = "Image", 
  width, 
  height,
  description,
  className = ""
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mode, setMode] = useState("library"); // library, upload, url
  const [urlInput, setUrlInput] = useState("");
  const fileInputRef = useRef(null);
  
  const currentImageUrl = value ? getFullUrl(value) : "";

  // Fetch media library when picker opens
  useEffect(() => {
    if (showPicker) {
      fetchMedia();
    }
  }, [showPicker]);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/api/admin/media`, { withCredentials: true });
      setMedia(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Failed to load media:", error);
      toast.error("Failed to load media library");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Max size is 5MB");
      return;
    }

    setUploading(true);
    try {
      // Upload file
      const formData = new FormData();
      formData.append("file", file);
      
      const uploadRes = await axios.post(`${API}/api/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true
      });

      // Add to media library
      await axios.post(`${API}/api/admin/media`, {
        url: uploadRes.data.url,
        filename: file.name,
        file_type: file.type,
        file_size: uploadRes.data.file_size || file.size,
        category: 'other'
      }, { withCredentials: true });

      // Select the uploaded image
      onChange(uploadRes.data.url);
      setShowPicker(false);
      toast.success("Image uploaded!");
      
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSelectFromLibrary = (item) => {
    onChange(item.url);
    setShowPicker(false);
    toast.success("Image selected");
  };

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) {
      toast.error("Please enter a URL");
      return;
    }
    onChange(urlInput.trim());
    setShowPicker(false);
    setUrlInput("");
    toast.success("Image URL set");
  };

  const handleRemove = () => {
    onChange("");
  };

  // Filter media by search
  const filteredMedia = media.filter(item => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return item.filename?.toLowerCase().includes(query) || 
           item.alt_text?.toLowerCase().includes(query);
  });

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label */}
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-white/70 text-sm font-medium">{label}</label>
          {width && height && (
            <span className="text-white/40 text-xs font-mono">{width}×{height}px</span>
          )}
        </div>
      )}
      
      {description && (
        <p className="text-white/50 text-xs">{description}</p>
      )}

      {/* Preview & Controls */}
      <div className="flex gap-4 items-start">
        {/* Image Preview */}
        <div 
          className="w-32 h-24 bg-[#2A2A2A] rounded-lg overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity border border-white/10"
          onClick={() => setShowPicker(true)}
        >
          {currentImageUrl ? (
            <img src={currentImageUrl} alt={label} className="w-full h-full object-cover" />
          ) : (
            <div className="text-center p-2">
              <ImageIcon size={24} className="mx-auto text-white/30 mb-1" />
              <p className="text-white/40 text-xs">No image</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 flex-1">
          <Button 
            type="button"
            onClick={() => setShowPicker(true)}
            variant="outline"
            className="btn-secondary text-sm justify-start"
            data-testid={`media-picker-${label.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <FolderOpen size={16} className="mr-2" />
            Choose from Library
          </Button>
          
          <div className="flex gap-2">
            <Button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="btn-secondary text-sm flex-1"
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 size={16} className="mr-2 animate-spin" />
              ) : (
                <Upload size={16} className="mr-2" />
              )}
              {uploading ? "Uploading..." : "Upload"}
            </Button>
            
            {currentImageUrl && (
              <Button 
                type="button"
                onClick={handleRemove}
                variant="outline"
                className="text-red-500 border-red-500/30 hover:bg-red-500/10"
                title="Remove image"
              >
                <X size={16} />
              </Button>
            )}
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Media Picker Dialog */}
      <Dialog open={showPicker} onOpenChange={setShowPicker}>
        <DialogContent className="bg-[#1A1A1A] border-white/10 max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FolderOpen className="text-red-500" size={20} />
              Select Image
              {label && <span className="text-white/50 text-sm font-normal">for {label}</span>}
            </DialogTitle>
          </DialogHeader>

          {/* Mode Tabs */}
          <div className="flex gap-2 border-b border-white/10 pb-4">
            <Button
              variant={mode === "library" ? "default" : "outline"}
              onClick={() => setMode("library")}
              className={mode === "library" ? "btn-primary" : "btn-secondary"}
              size="sm"
            >
              <Grid size={16} className="mr-2" />
              Media Library
            </Button>
            <Button
              variant={mode === "upload" ? "default" : "outline"}
              onClick={() => setMode("upload")}
              className={mode === "upload" ? "btn-primary" : "btn-secondary"}
              size="sm"
            >
              <Upload size={16} className="mr-2" />
              Upload New
            </Button>
            <Button
              variant={mode === "url" ? "default" : "outline"}
              onClick={() => setMode("url")}
              className={mode === "url" ? "btn-primary" : "btn-secondary"}
              size="sm"
            >
              <ImageIcon size={16} className="mr-2" />
              Paste URL
            </Button>
          </div>

          {/* Content based on mode */}
          <div className="flex-1 overflow-y-auto">
            {mode === "library" && (
              <div className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search images..."
                    className="input-dark pl-10"
                  />
                </div>

                {/* Media Grid */}
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
                  </div>
                ) : filteredMedia.length === 0 ? (
                  <div className="text-center py-12">
                    <ImageIcon className="mx-auto text-white/30 mb-4" size={48} />
                    <p className="text-white/60">
                      {searchQuery ? "No images match your search" : "No images in library"}
                    </p>
                    <Button 
                      onClick={() => setMode("upload")} 
                      className="btn-primary mt-4"
                    >
                      <Upload size={16} className="mr-2" />
                      Upload First Image
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    <AnimatePresence>
                      {filteredMedia.map((item) => (
                        <motion.div
                          key={item.media_id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className={`aspect-square bg-[#2A2A2A] rounded-lg overflow-hidden cursor-pointer relative group border-2 transition-all ${
                            value === item.url 
                              ? 'border-red-600 ring-2 ring-red-600/50' 
                              : 'border-transparent hover:border-white/30'
                          }`}
                          onClick={() => handleSelectFromLibrary(item)}
                        >
                          <img 
                            src={getFullUrl(item.url)} 
                            alt={item.alt_text || item.filename}
                            className="w-full h-full object-cover"
                          />
                          {value === item.url && (
                            <div className="absolute top-2 right-2 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center">
                              <Check size={14} className="text-white" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white text-sm font-medium">Select</span>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            )}

            {mode === "upload" && (
              <div className="py-8">
                <div
                  className="border-2 border-dashed border-white/20 rounded-xl p-12 text-center cursor-pointer hover:border-white/40 hover:bg-white/5 transition-all"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="mx-auto mb-4 text-red-500 animate-spin" size={48} />
                  ) : (
                    <Upload className="mx-auto mb-4 text-white/40" size={48} />
                  )}
                  <p className="text-white font-semibold text-lg mb-2">
                    {uploading ? "Uploading..." : "Click to upload or drag & drop"}
                  </p>
                  <p className="text-white/60 text-sm">JPG, PNG, GIF, WebP (max 5MB)</p>
                  {width && height && (
                    <p className="text-white/40 text-xs mt-2">
                      Recommended: {width}×{height}px
                    </p>
                  )}
                </div>
              </div>
            )}

            {mode === "url" && (
              <div className="py-8 space-y-4">
                <div>
                  <label className="text-white/70 text-sm mb-2 block">Image URL</label>
                  <Input
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="input-dark"
                  />
                </div>
                
                {urlInput && (
                  <div className="bg-[#2A2A2A] rounded-lg p-4">
                    <p className="text-white/60 text-sm mb-2">Preview:</p>
                    <img 
                      src={urlInput} 
                      alt="Preview" 
                      className="max-h-48 rounded-lg mx-auto"
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  </div>
                )}
                
                <Button onClick={handleUrlSubmit} className="btn-primary w-full">
                  Use This URL
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MediaPicker;
