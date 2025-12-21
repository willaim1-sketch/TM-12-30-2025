import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Trash2, Copy, Image, Wand2, Upload, Search, Filter, Grid, List, 
  X, Check, Download, Eye, Edit2, FolderOpen, Calendar, HardDrive, 
  Maximize2, Link2, RefreshCw, ChevronDown, ImageIcon, AlertCircle,
  Home, ShoppingBag, UtensilsCrossed, MapPin, FileImage, Settings
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Image dimension recommendations
const IMAGE_DIMENSIONS = {
  hero: { width: 1920, height: 1080, label: "Hero Background", description: "Main homepage banner" },
  menu_item: { width: 600, height: 450, label: "Menu Item", description: "Food photography" },
  merch_item: { width: 600, height: 600, label: "Merch Product", description: "Product photos" },
  merch_promo: { width: 400, height: 400, label: "Merch Promo", description: "Category thumbnails" },
  chef: { width: 800, height: 1000, label: "Chef/About", description: "Portrait orientation" },
  location: { width: 800, height: 600, label: "Location", description: "Restaurant exterior/interior" },
  header_logo: { width: 200, height: 60, label: "Header Logo", description: "Navigation bar logo" },
  footer_logo: { width: 250, height: 150, label: "Footer Logo", description: "Large footer branding" },
  favicon: { width: 64, height: 64, label: "Favicon", description: "Browser tab icon" },
  blog: { width: 1200, height: 630, label: "Blog Featured", description: "Social share optimized" },
  page_builder: { width: 1200, height: 600, label: "Page Section", description: "Custom page sections" },
  og_image: { width: 1200, height: 630, label: "Social Preview", description: "Facebook/Twitter preview" }
};

// Categories for organizing media
const MEDIA_CATEGORIES = [
  { id: "all", label: "All Media", icon: FolderOpen },
  { id: "homepage", label: "Homepage", icon: Home },
  { id: "menu", label: "Menu Items", icon: UtensilsCrossed },
  { id: "merch", label: "Merchandise", icon: ShoppingBag },
  { id: "branding", label: "Logos & Branding", icon: ImageIcon },
  { id: "locations", label: "Location", icon: MapPin },
  { id: "other", label: "Other", icon: FileImage }
];

// Format file size
const formatFileSize = (bytes) => {
  if (!bytes) return "Unknown";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
};

// Format date
const formatDate = (dateStr) => {
  if (!dateStr) return "Unknown";
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Drag & Drop Upload Zone
const UploadZone = ({ onUpload, uploading }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      onUpload(Array.from(files));
    }
  }, [onUpload]);

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onUpload(Array.from(files));
    }
  };

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
        isDragging 
          ? 'border-red-500 bg-red-500/10' 
          : 'border-white/20 hover:border-white/40 hover:bg-white/5'
      } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <Upload className={`mx-auto mb-4 ${isDragging ? 'text-red-500' : 'text-white/40'}`} size={48} />
      <p className="text-white font-semibold text-lg mb-2">
        {uploading ? 'Uploading...' : 'Drag & drop images here'}
      </p>
      <p className="text-white/60 text-sm">or click to browse</p>
      <p className="text-white/40 text-xs mt-2">Supports: JPG, PNG, GIF, WebP, SVG (max 5MB)</p>
    </div>
  );
};

// Image Card Component
const ImageCard = ({ item, viewMode, onSelect, onDelete, onCopy, onEdit, selected }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState(null);

  useEffect(() => {
    if (item.url) {
      const img = new window.Image();
      img.onload = () => {
        setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        setImageLoaded(true);
      };
      img.src = item.url;
    }
  }, [item.url]);

  if (viewMode === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex items-center gap-4 p-4 rounded-lg transition-all cursor-pointer ${
          selected ? 'bg-red-600/20 border border-red-600' : 'bg-[#1A1A1A] hover:bg-[#252525] border border-transparent'
        }`}
        onClick={() => onSelect(item)}
      >
        <div className="w-16 h-16 rounded-lg overflow-hidden bg-[#2A2A2A] flex-shrink-0">
          <img src={item.url} alt={item.alt_text || item.filename} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium truncate">{item.filename || 'Untitled'}</p>
          <p className="text-white/50 text-sm truncate">{item.alt_text || 'No description'}</p>
        </div>
        <div className="flex items-center gap-6 text-white/60 text-sm">
          <span className="w-24">{imageDimensions ? `${imageDimensions.width}×${imageDimensions.height}` : '...'}</span>
          <span className="w-20">{formatFileSize(item.file_size)}</span>
          <span className="w-28">{formatDate(item.created_at)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onCopy(item.url); }} className="text-white/60 hover:text-white">
            <Copy size={16} />
          </Button>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="text-white/60 hover:text-white">
            <Edit2 size={16} />
          </Button>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(item); }} className="text-white/60 hover:text-red-500">
            <Trash2 size={16} />
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`card-dark overflow-hidden group cursor-pointer transition-all ${
        selected ? 'ring-2 ring-red-600 ring-offset-2 ring-offset-[#0A0A0A]' : ''
      }`}
      onClick={() => onSelect(item)}
    >
      <div className="aspect-square bg-[#2A2A2A] relative overflow-hidden">
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/20 border-t-red-500 rounded-full animate-spin"></div>
          </div>
        )}
        <img
          src={item.url}
          alt={item.alt_text || item.filename}
          className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-105 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImageLoaded(true)}
        />
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onCopy(item.url); }} className="bg-white/10 hover:bg-white/20 text-white">
                  <Copy size={14} />
                </Button>
                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="bg-white/10 hover:bg-white/20 text-white">
                  <Edit2 size={14} />
                </Button>
              </div>
              <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onDelete(item); }} className="bg-red-600/20 hover:bg-red-600/40 text-red-400">
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
        </div>

        {/* Dimensions badge */}
        {imageDimensions && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 rounded text-white text-xs font-mono opacity-0 group-hover:opacity-100 transition-opacity">
            {imageDimensions.width}×{imageDimensions.height}
          </div>
        )}

        {/* Selected indicator */}
        {selected && (
          <div className="absolute top-2 left-2 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center">
            <Check size={14} className="text-white" />
          </div>
        )}
      </div>
      
      <div className="p-3">
        <p className="text-white text-sm font-medium truncate">{item.filename || 'Untitled'}</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-white/50 text-xs">{formatDate(item.created_at)}</p>
          {item.category && (
            <Badge variant="outline" className="text-xs border-white/20 text-white/60">{item.category}</Badge>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Image Detail/Edit Modal
const ImageDetailModal = ({ item, isOpen, onClose, onSave, onDelete, settings }) => {
  const [editData, setEditData] = useState({ filename: '', alt_text: '', category: '' });
  const [imageDimensions, setImageDimensions] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setEditData({
        filename: item.filename || '',
        alt_text: item.alt_text || '',
        category: item.category || 'other'
      });
      
      const img = new window.Image();
      img.onload = () => setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      img.src = item.url;
    }
  }, [item]);

  const handleSave = async () => {
    setSaving(true);
    await onSave(item.media_id, editData);
    setSaving(false);
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(item.url);
    toast.success("URL copied to clipboard");
  };

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1A1A1A] border-white/10 max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <ImageIcon size={20} className="text-red-500" />
            Image Details
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Image Preview */}
          <div className="space-y-4">
            <div className="aspect-video bg-[#2A2A2A] rounded-lg overflow-hidden relative">
              <img src={item.url} alt={item.alt_text} className="w-full h-full object-contain" />
            </div>
            
            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button onClick={copyUrl} variant="outline" className="flex-1 btn-secondary">
                <Copy size={16} className="mr-2" /> Copy URL
              </Button>
              <Button onClick={() => window.open(item.url, '_blank')} variant="outline" className="flex-1 btn-secondary">
                <Maximize2 size={16} className="mr-2" /> Full Size
              </Button>
            </div>

            {/* Image Info */}
            <div className="bg-[#2A2A2A] rounded-lg p-4 space-y-3">
              <h4 className="text-white font-semibold flex items-center gap-2">
                <AlertCircle size={16} className="text-red-500" />
                Image Information
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-white/50">Dimensions</p>
                  <p className="text-white font-mono">{imageDimensions ? `${imageDimensions.width} × ${imageDimensions.height}px` : 'Loading...'}</p>
                </div>
                <div>
                  <p className="text-white/50">File Size</p>
                  <p className="text-white">{formatFileSize(item.file_size)}</p>
                </div>
                <div>
                  <p className="text-white/50">Uploaded</p>
                  <p className="text-white">{formatDate(item.created_at)}</p>
                </div>
                <div>
                  <p className="text-white/50">Type</p>
                  <p className="text-white">{item.file_type || 'image'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Edit Form */}
          <div className="space-y-4">
            <div>
              <Label className="text-white/70">Filename</Label>
              <Input
                value={editData.filename}
                onChange={(e) => setEditData(prev => ({ ...prev, filename: e.target.value }))}
                className="input-dark mt-1"
                placeholder="image-name"
              />
            </div>

            <div>
              <Label className="text-white/70">Alt Text (SEO & Accessibility)</Label>
              <Textarea
                value={editData.alt_text}
                onChange={(e) => setEditData(prev => ({ ...prev, alt_text: e.target.value }))}
                className="input-dark mt-1"
                placeholder="Describe this image for search engines and screen readers..."
                rows={3}
              />
              <p className="text-white/40 text-xs mt-1">Good alt text improves SEO and accessibility</p>
            </div>

            <div>
              <Label className="text-white/70">Category</Label>
              <Select value={editData.category} onValueChange={(val) => setEditData(prev => ({ ...prev, category: val }))}>
                <SelectTrigger className="input-dark mt-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-white/10">
                  {MEDIA_CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                    <SelectItem key={cat.id} value={cat.id} className="text-white hover:bg-[#2A2A2A]">
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* URL Display */}
            <div>
              <Label className="text-white/70">Image URL</Label>
              <div className="flex gap-2 mt-1">
                <Input value={item.url} readOnly className="input-dark flex-1 text-white/60" />
                <Button onClick={copyUrl} variant="outline" className="btn-secondary">
                  <Copy size={16} />
                </Button>
              </div>
            </div>

            {/* Recommended Dimensions */}
            <div className="bg-[#2A2A2A] rounded-lg p-4">
              <h4 className="text-white font-semibold mb-3 text-sm">Recommended Sizes</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(IMAGE_DIMENSIONS).slice(0, 6).map(([key, dim]) => (
                  <div key={key} className="flex justify-between text-white/60">
                    <span>{dim.label}:</span>
                    <span className="font-mono text-white/80">{dim.width}×{dim.height}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-white/10">
              <Button onClick={() => onDelete(item)} variant="outline" className="text-red-500 border-red-500/30 hover:bg-red-500/10">
                <Trash2 size={16} className="mr-2" /> Delete
              </Button>
              <div className="flex-1"></div>
              <Button onClick={onClose} variant="outline" className="btn-secondary">Cancel</Button>
              <Button onClick={handleSave} className="btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Site Images Manager - Quick access to all site images
const SiteImagesManager = ({ settings, onUpdateSetting, onSelectFromLibrary }) => {
  const siteImages = [
    { key: 'hero_image', label: 'Hero Background', dim: IMAGE_DIMENSIONS.hero, current: settings?.hero_image },
    { key: 'chef_image', label: 'Chef/About Image', dim: IMAGE_DIMENSIONS.chef, current: settings?.chef_image },
    { key: 'header_logo', label: 'Header Logo', dim: IMAGE_DIMENSIONS.header_logo, current: settings?.header_logo },
    { key: 'footer_logo', label: 'Footer Logo', dim: IMAGE_DIMENSIONS.footer_logo, current: settings?.footer_logo },
    { key: 'favicon', label: 'Favicon', dim: IMAGE_DIMENSIONS.favicon, current: settings?.favicon },
    { key: 'merch_tshirt_image', label: 'Merch: T-Shirts', dim: IMAGE_DIMENSIONS.merch_promo, current: settings?.merch_tshirt_image },
    { key: 'merch_cups_image', label: 'Merch: Cups & Mugs', dim: IMAGE_DIMENSIONS.merch_promo, current: settings?.merch_cups_image },
    { key: 'merch_hats_image', label: 'Merch: Hats', dim: IMAGE_DIMENSIONS.merch_promo, current: settings?.merch_hats_image },
    { key: 'merch_souvenirs_image', label: 'Merch: Souvenirs', dim: IMAGE_DIMENSIONS.merch_promo, current: settings?.merch_souvenirs_image },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white">Site Images</h3>
          <p className="text-white/60 text-sm">Quickly update images used across your website</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {siteImages.map((img) => (
          <SiteImageCard 
            key={img.key}
            image={img}
            onUpdate={(url) => onUpdateSetting(img.key, url)}
            onSelectFromLibrary={() => onSelectFromLibrary(img.key)}
          />
        ))}
      </div>
    </div>
  );
};

// Individual Site Image Card
const SiteImageCard = ({ image, onUpdate, onSelectFromLibrary }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Max size is 5MB");
      return;
    }
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await axios.post(`${API}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true
      });
      
      onUpdate(response.data.url);
      toast.success("Image updated!");
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-[#1A1A1A] rounded-xl p-4 border border-white/10 hover:border-white/20 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="text-white font-medium">{image.label}</h4>
          <p className="text-white/50 text-xs font-mono">{image.dim.width}×{image.dim.height}px</p>
        </div>
        {image.current && (
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => onUpdate('')}
            className="text-white/40 hover:text-red-500"
          >
            <X size={14} />
          </Button>
        )}
      </div>

      <div 
        className="aspect-video bg-[#2A2A2A] rounded-lg overflow-hidden mb-3 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => fileInputRef.current?.click()}
      >
        {image.current ? (
          <img src={image.current} alt={image.label} className="w-full h-full object-contain" />
        ) : (
          <div className="text-center p-4">
            <ImageIcon size={32} className="mx-auto text-white/30 mb-2" />
            <p className="text-white/40 text-xs">No image set</p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      <div className="flex gap-2">
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex-1 btn-secondary text-xs"
        >
          <Upload size={14} className="mr-1" />
          {uploading ? 'Uploading...' : 'Upload'}
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={onSelectFromLibrary}
          className="flex-1 btn-secondary text-xs"
        >
          <FolderOpen size={14} className="mr-1" />
          Library
        </Button>
      </div>
    </div>
  );
};

// Main Media Manager Component
const MediaManager = () => {
  const [media, setMedia] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedItems, setSelectedItems] = useState([]);
  const [detailItem, setDetailItem] = useState(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [generatePrompt, setGeneratePrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [selectingFor, setSelectingFor] = useState(null); // For site image selection

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [mediaRes, settingsRes] = await Promise.all([
        axios.get(`${API}/admin/media`, { withCredentials: true }),
        axios.get(`${API}/settings`)
      ]);
      setMedia(mediaRes.data);
      setSettings(settingsRes.data);
    } catch (error) {
      toast.error("Failed to load media");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (files) => {
    setUploading(true);
    const uploadedCount = { success: 0, failed: 0 };

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 5MB)`);
        uploadedCount.failed++;
        continue;
      }

      try {
        const formData = new FormData();
        formData.append("file", file);
        
        const uploadRes = await axios.post(`${API}/upload`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
          withCredentials: true
        });

        // Add to media library
        await axios.post(`${API}/admin/media`, {
          url: uploadRes.data.url,
          filename: file.name,
          file_type: file.type,
          file_size: file.size,
          category: 'other'
        }, { withCredentials: true });

        uploadedCount.success++;
      } catch (error) {
        uploadedCount.failed++;
      }
    }

    setUploading(false);
    
    if (uploadedCount.success > 0) {
      toast.success(`Uploaded ${uploadedCount.success} file(s)`);
      fetchData();
    }
    if (uploadedCount.failed > 0) {
      toast.error(`Failed to upload ${uploadedCount.failed} file(s)`);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.filename}"? This cannot be undone.`)) return;

    try {
      await axios.delete(`${API}/admin/media/${item.media_id}`, { withCredentials: true });
      toast.success("Image deleted");
      setDetailItem(null);
      fetchData();
    } catch (error) {
      toast.error("Failed to delete image");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    if (!window.confirm(`Delete ${selectedItems.length} selected images?`)) return;

    let deleted = 0;
    for (const item of selectedItems) {
      try {
        await axios.delete(`${API}/admin/media/${item.media_id}`, { withCredentials: true });
        deleted++;
      } catch (error) {}
    }

    toast.success(`Deleted ${deleted} images`);
    setSelectedItems([]);
    fetchData();
  };

  const handleSaveDetails = async (mediaId, data) => {
    try {
      await axios.put(`${API}/admin/media/${mediaId}`, data, { withCredentials: true });
      toast.success("Image updated");
      setDetailItem(null);
      fetchData();
    } catch (error) {
      toast.error("Failed to update image");
    }
  };

  const handleUpdateSiteSetting = async (key, value) => {
    try {
      await axios.put(`${API}/admin/settings`, { [key]: value }, { withCredentials: true });
      setSettings(prev => ({ ...prev, [key]: value }));
      toast.success("Site image updated");
    } catch (error) {
      toast.error("Failed to update site image");
    }
  };

  const handleSelectForSite = (key) => {
    setSelectingFor(key);
  };

  const handleSelectFromLibrary = (item) => {
    if (selectingFor) {
      handleUpdateSiteSetting(selectingFor, item.url);
      setSelectingFor(null);
    }
  };

  const copyUrl = (url) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copied to clipboard");
  };

  const handleGenerateImage = async () => {
    if (!generatePrompt) {
      toast.error("Please enter a description");
      return;
    }

    setGenerating(true);
    try {
      const response = await axios.post(
        `${API}/admin/generate-image`,
        { prompt: generatePrompt },
        { withCredentials: true }
      );

      if (response.data.image_base64) {
        // Convert base64 to blob and upload
        const byteCharacters = atob(response.data.image_base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/png' });
        const file = new File([blob], `ai-generated-${Date.now()}.png`, { type: 'image/png' });
        
        await handleUpload([file]);
        setShowAIDialog(false);
        setGeneratePrompt('');
        toast.success("AI image generated and added to library!");
      }
    } catch (error) {
      toast.error("Failed to generate image");
    } finally {
      setGenerating(false);
    }
  };

  // Filter and sort media
  const filteredMedia = media
    .filter(item => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (searchQuery && !item.filename?.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !item.alt_text?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest': return new Date(b.created_at) - new Date(a.created_at);
        case 'oldest': return new Date(a.created_at) - new Date(b.created_at);
        case 'name': return (a.filename || '').localeCompare(b.filename || '');
        case 'size': return (b.file_size || 0) - (a.file_size || 0);
        default: return 0;
      }
    });

  const toggleSelect = (item) => {
    if (selectingFor) {
      handleSelectFromLibrary(item);
      return;
    }
    
    setSelectedItems(prev => {
      const exists = prev.find(i => i.media_id === item.media_id);
      if (exists) return prev.filter(i => i.media_id !== item.media_id);
      return [...prev, item];
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white text-xl">Loading media library...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Media Manager</h1>
          <p className="text-white/60">{media.length} images in library</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setShowAIDialog(true)} variant="outline" className="btn-secondary">
            <Wand2 size={18} className="mr-2" />
            AI Generate
          </Button>
          <Button onClick={() => setShowUploadDialog(true)} className="btn-primary">
            <Upload size={18} className="mr-2" />
            Upload Images
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="library" className="space-y-6">
        <TabsList className="bg-[#1A1A1A] border border-white/10">
          <TabsTrigger value="library" className="data-[state=active]:bg-red-600">
            <FolderOpen size={16} className="mr-2" />
            Media Library
          </TabsTrigger>
          <TabsTrigger value="site-images" className="data-[state=active]:bg-red-600">
            <Settings size={16} className="mr-2" />
            Site Images
          </TabsTrigger>
          <TabsTrigger value="dimensions" className="data-[state=active]:bg-red-600">
            <Maximize2 size={16} className="mr-2" />
            Size Guide
          </TabsTrigger>
        </TabsList>

        {/* Media Library Tab */}
        <TabsContent value="library" className="space-y-4">
          {/* Selection banner */}
          {selectingFor && (
            <div className="bg-red-600/20 border border-red-600 rounded-lg p-4 flex items-center justify-between">
              <p className="text-white">
                <span className="font-semibold">Selecting image for:</span> {selectingFor.replace(/_/g, ' ')}
              </p>
              <Button onClick={() => setSelectingFor(null)} variant="ghost" className="text-white">
                <X size={18} className="mr-2" /> Cancel
              </Button>
            </div>
          )}

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-4 bg-[#1A1A1A] rounded-xl p-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search images..."
                className="input-dark pl-10"
              />
            </div>

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="input-dark w-40">
                <Filter size={16} className="mr-2 text-white/60" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A1A] border-white/10">
                {MEDIA_CATEGORIES.map(cat => (
                  <SelectItem key={cat.id} value={cat.id} className="text-white hover:bg-[#2A2A2A]">
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="input-dark w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A1A] border-white/10">
                <SelectItem value="newest" className="text-white hover:bg-[#2A2A2A]">Newest</SelectItem>
                <SelectItem value="oldest" className="text-white hover:bg-[#2A2A2A]">Oldest</SelectItem>
                <SelectItem value="name" className="text-white hover:bg-[#2A2A2A]">Name</SelectItem>
                <SelectItem value="size" className="text-white hover:bg-[#2A2A2A]">Size</SelectItem>
              </SelectContent>
            </Select>

            {/* View Toggle */}
            <div className="flex bg-[#2A2A2A] rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-red-600 text-white' : 'text-white/60 hover:text-white'}`}
              >
                <Grid size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-red-600 text-white' : 'text-white/60 hover:text-white'}`}
              >
                <List size={18} />
              </button>
            </div>

            {/* Refresh */}
            <Button onClick={fetchData} variant="ghost" size="sm" className="text-white/60 hover:text-white">
              <RefreshCw size={18} />
            </Button>
          </div>

          {/* Bulk Actions */}
          {selectedItems.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#2A2A2A] rounded-lg p-4 flex items-center justify-between"
            >
              <p className="text-white">
                <span className="font-semibold">{selectedItems.length}</span> items selected
              </p>
              <div className="flex gap-2">
                <Button onClick={() => setSelectedItems([])} variant="ghost" className="text-white/60">
                  Clear Selection
                </Button>
                <Button onClick={handleBulkDelete} variant="destructive">
                  <Trash2 size={16} className="mr-2" />
                  Delete Selected
                </Button>
              </div>
            </motion.div>
          )}

          {/* Media Grid/List */}
          {filteredMedia.length === 0 ? (
            <div className="text-center py-20 card-dark">
              <Image className="mx-auto mb-4 text-white/30" size={64} />
              <p className="text-white/60 text-lg mb-2">No images found</p>
              <p className="text-white/40 text-sm mb-6">
                {searchQuery || categoryFilter !== 'all' ? 'Try adjusting your filters' : 'Upload your first image to get started'}
              </p>
              <Button onClick={() => setShowUploadDialog(true)} className="btn-primary">
                <Upload size={18} className="mr-2" />
                Upload Images
              </Button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredMedia.map((item) => (
                <ImageCard
                  key={item.media_id}
                  item={item}
                  viewMode={viewMode}
                  selected={selectedItems.some(i => i.media_id === item.media_id)}
                  onSelect={toggleSelect}
                  onDelete={handleDelete}
                  onCopy={copyUrl}
                  onEdit={setDetailItem}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {/* List Header */}
              <div className="flex items-center gap-4 px-4 py-2 text-white/50 text-sm font-medium">
                <div className="w-16"></div>
                <div className="flex-1">Name</div>
                <div className="w-24">Dimensions</div>
                <div className="w-20">Size</div>
                <div className="w-28">Date</div>
                <div className="w-28"></div>
              </div>
              {filteredMedia.map((item) => (
                <ImageCard
                  key={item.media_id}
                  item={item}
                  viewMode={viewMode}
                  selected={selectedItems.some(i => i.media_id === item.media_id)}
                  onSelect={toggleSelect}
                  onDelete={handleDelete}
                  onCopy={copyUrl}
                  onEdit={setDetailItem}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Site Images Tab */}
        <TabsContent value="site-images">
          <SiteImagesManager 
            settings={settings}
            onUpdateSetting={handleUpdateSiteSetting}
            onSelectFromLibrary={handleSelectForSite}
          />
        </TabsContent>

        {/* Dimensions Guide Tab */}
        <TabsContent value="dimensions">
          <div className="card-dark p-6">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Maximize2 className="text-red-500" />
              Recommended Image Dimensions
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(IMAGE_DIMENSIONS).map(([key, dim]) => (
                <div key={key} className="bg-[#2A2A2A] rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-white font-medium">{dim.label}</h4>
                    <span className="text-red-500 font-mono text-sm">{dim.width}×{dim.height}</span>
                  </div>
                  <p className="text-white/60 text-sm">{dim.description}</p>
                  <div className="mt-3 h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-600/50" 
                      style={{ width: `${Math.min((dim.width / 1920) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="bg-[#1A1A1A] border-white/10 max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Upload className="text-red-500" />
              Upload Images
            </DialogTitle>
          </DialogHeader>
          <UploadZone onUpload={(files) => { handleUpload(files); setShowUploadDialog(false); }} uploading={uploading} />
        </DialogContent>
      </Dialog>

      {/* AI Generate Dialog */}
      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent className="bg-[#1A1A1A] border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Wand2 className="text-red-500" />
              AI Image Generation
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white/70">Describe the image you want</Label>
              <Textarea
                value={generatePrompt}
                onChange={(e) => setGeneratePrompt(e.target.value)}
                placeholder="A delicious plate of authentic Mexican tamales with red salsa and fresh cilantro garnish, professional food photography..."
                className="input-dark mt-2"
                rows={4}
              />
            </div>
            <p className="text-white/40 text-sm">
              Tip: Be specific about style, lighting, and composition for better results.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowAIDialog(false)} className="btn-secondary">
                Cancel
              </Button>
              <Button onClick={handleGenerateImage} disabled={generating} className="btn-primary">
                <Wand2 size={16} className="mr-2" />
                {generating ? 'Generating...' : 'Generate Image'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Detail Modal */}
      <ImageDetailModal
        item={detailItem}
        isOpen={!!detailItem}
        onClose={() => setDetailItem(null)}
        onSave={handleSaveDetails}
        onDelete={handleDelete}
        settings={settings}
      />
    </div>
  );
};

export default MediaManager;
