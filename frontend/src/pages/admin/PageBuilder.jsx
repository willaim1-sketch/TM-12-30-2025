import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { motion, Reorder } from "framer-motion";
import { 
  GripVertical, Plus, Trash2, Save, Eye, EyeOff, Image, Type, 
  Layout, Palette, Settings2, ChevronDown, ChevronUp, Copy,
  AlignLeft, AlignCenter, AlignRight, Bold, Italic, Link,
  Maximize, Minimize, RotateCcw, Check, X
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Switch } from "../../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Slider } from "../../components/ui/slider";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Section types available
const sectionTypes = [
  { id: "hero", name: "Hero Banner", icon: "🎯" },
  { id: "text", name: "Text Block", icon: "📝" },
  { id: "image", name: "Image", icon: "🖼️" },
  { id: "two_column", name: "Two Columns", icon: "◫" },
  { id: "three_column", name: "Three Columns", icon: "☰" },
  { id: "cta", name: "Call to Action", icon: "📢" },
  { id: "gallery", name: "Image Gallery", icon: "🎨" },
  { id: "testimonials", name: "Testimonials", icon: "⭐" },
  { id: "faq", name: "FAQ Section", icon: "❓" },
  { id: "contact", name: "Contact Info", icon: "📍" },
  { id: "menu_preview", name: "Menu Preview", icon: "🍽️" },
  { id: "spacer", name: "Spacer", icon: "↕️" },
  { id: "divider", name: "Divider", icon: "➖" },
  { id: "video", name: "Video Embed", icon: "🎬" },
  { id: "custom_html", name: "Custom HTML", icon: "< >" },
];

// Default section content
const defaultSectionContent = {
  hero: {
    title: "Your Headline Here",
    subtitle: "Add your compelling subtitle text",
    buttonText: "Call to Action",
    buttonLink: "/",
    backgroundImage: "",
    overlay: 60,
    height: "100vh",
    alignment: "center"
  },
  text: {
    heading: "Section Heading",
    content: "Add your content here. This is a text block where you can write paragraphs, add formatting, and share your message.",
    alignment: "left",
    maxWidth: "800px"
  },
  image: {
    src: "",
    alt: "Image description",
    caption: "",
    width: "100%",
    height: "auto",
    borderRadius: "8px"
  },
  two_column: {
    leftContent: { type: "text", content: "Left column content" },
    rightContent: { type: "text", content: "Right column content" },
    gap: "2rem",
    verticalAlign: "top"
  },
  cta: {
    heading: "Ready to Order?",
    text: "Get your delicious tamales now!",
    buttonText: "Order Now",
    buttonLink: "/order",
    backgroundColor: "#DC2626"
  },
  spacer: {
    height: "100px"
  },
  divider: {
    style: "solid",
    color: "#DC2626",
    width: "100%",
    thickness: "2px"
  }
};

// Section Editor Component
const SectionEditor = ({ section, onUpdate, onDelete, onDuplicate }) => {
  const [expanded, setExpanded] = useState(false);
  const [localContent, setLocalContent] = useState(section.content);

  const handleContentChange = (key, value) => {
    const updated = { ...localContent, [key]: value };
    setLocalContent(updated);
    onUpdate({ ...section, content: updated });
  };

  const renderContentEditor = () => {
    switch (section.type) {
      case "hero":
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-white text-lg">Headline</Label>
              <Input
                value={localContent.title || ""}
                onChange={(e) => handleContentChange("title", e.target.value)}
                className="input-dark mt-1 text-xl font-bold"
                placeholder="Your main headline"
              />
            </div>
            <div>
              <Label className="text-white text-lg">Subtitle</Label>
              <Textarea
                value={localContent.subtitle || ""}
                onChange={(e) => handleContentChange("subtitle", e.target.value)}
                className="input-dark mt-1"
                placeholder="Supporting text"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Button Text</Label>
                <Input
                  value={localContent.buttonText || ""}
                  onChange={(e) => handleContentChange("buttonText", e.target.value)}
                  className="input-dark mt-1"
                />
              </div>
              <div>
                <Label className="text-white">Button Link</Label>
                <Input
                  value={localContent.buttonLink || ""}
                  onChange={(e) => handleContentChange("buttonLink", e.target.value)}
                  className="input-dark mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-white">Background Image</Label>
              <div className="flex gap-3 mt-2">
                <label className="cursor-pointer flex-shrink-0">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append("file", file);
                      try {
                        const response = await axios.post(`${API}/upload`, formData, {
                          headers: { "Content-Type": "multipart/form-data" }
                        });
                        handleContentChange("backgroundImage", response.data.url);
                        toast.success("Background uploaded!");
                      } catch (err) {
                        toast.error("Upload failed");
                      }
                    }}
                    className="hidden"
                  />
                  <div className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2">
                    <Image size={18} />
                    Upload
                  </div>
                </label>
                <Input
                  value={localContent.backgroundImage || ""}
                  onChange={(e) => handleContentChange("backgroundImage", e.target.value)}
                  className="input-dark flex-1"
                  placeholder="Or paste image URL..."
                />
              </div>
              <p className="text-white/50 text-sm mt-1">Recommended: 1920 x 1080px</p>
            </div>
            <div>
              <Label className="text-white">Overlay Darkness: {localContent.overlay || 60}%</Label>
              <Slider
                value={[localContent.overlay || 60]}
                onValueChange={(v) => handleContentChange("overlay", v[0])}
                max={100}
                step={5}
                className="mt-2"
              />
            </div>
            <div>
              <Label className="text-white">Text Alignment</Label>
              <div className="flex gap-2 mt-2">
                {["left", "center", "right"].map((align) => (
                  <button
                    key={align}
                    onClick={() => handleContentChange("alignment", align)}
                    className={`p-3 rounded-lg ${localContent.alignment === align ? 'bg-red-600' : 'bg-white/10'}`}
                  >
                    {align === "left" && <AlignLeft className="text-white" size={20} />}
                    {align === "center" && <AlignCenter className="text-white" size={20} />}
                    {align === "right" && <AlignRight className="text-white" size={20} />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case "text":
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-white text-lg">Heading</Label>
              <Input
                value={localContent.heading || ""}
                onChange={(e) => handleContentChange("heading", e.target.value)}
                className="input-dark mt-1 text-xl font-bold"
              />
            </div>
            <div>
              <Label className="text-white text-lg">Content</Label>
              <Textarea
                value={localContent.content || ""}
                onChange={(e) => handleContentChange("content", e.target.value)}
                className="input-dark mt-1 min-h-[200px]"
              />
            </div>
            <div>
              <Label className="text-white">Text Alignment</Label>
              <div className="flex gap-2 mt-2">
                {["left", "center", "right"].map((align) => (
                  <button
                    key={align}
                    onClick={() => handleContentChange("alignment", align)}
                    className={`p-3 rounded-lg ${localContent.alignment === align ? 'bg-red-600' : 'bg-white/10'}`}
                  >
                    {align === "left" && <AlignLeft className="text-white" size={20} />}
                    {align === "center" && <AlignCenter className="text-white" size={20} />}
                    {align === "right" && <AlignRight className="text-white" size={20} />}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-white">Max Width</Label>
              <Select
                value={localContent.maxWidth || "800px"}
                onValueChange={(v) => handleContentChange("maxWidth", v)}
              >
                <SelectTrigger className="input-dark mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-white/20">
                  <SelectItem value="600px" className="text-white">Narrow (600px)</SelectItem>
                  <SelectItem value="800px" className="text-white">Medium (800px)</SelectItem>
                  <SelectItem value="1000px" className="text-white">Wide (1000px)</SelectItem>
                  <SelectItem value="100%" className="text-white">Full Width</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case "image":
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-white text-lg">Image</Label>
              <div className="flex gap-3 mt-2">
                <label className="cursor-pointer flex-shrink-0">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append("file", file);
                      try {
                        const response = await axios.post(`${API}/upload`, formData, {
                          headers: { "Content-Type": "multipart/form-data" }
                        });
                        handleContentChange("src", response.data.url);
                        toast.success("Image uploaded!");
                      } catch (err) {
                        toast.error("Upload failed");
                      }
                    }}
                    className="hidden"
                  />
                  <div className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2">
                    <Image size={18} />
                    Upload Image
                  </div>
                </label>
                <Input
                  value={localContent.src || ""}
                  onChange={(e) => handleContentChange("src", e.target.value)}
                  className="input-dark flex-1"
                  placeholder="Or paste image URL..."
                />
              </div>
              {localContent.src && (
                <img src={localContent.src} alt="Preview" className="mt-4 w-full h-48 object-cover rounded-lg" />
              )}
              <p className="text-white/50 text-sm mt-2">Recommended size: 1200 x 800px</p>
            </div>
            <div>
              <Label className="text-white">Alt Text (for SEO)</Label>
              <Input
                value={localContent.alt || ""}
                onChange={(e) => handleContentChange("alt", e.target.value)}
                className="input-dark mt-1"
              />
            </div>
            <div>
              <Label className="text-white">Caption (optional)</Label>
              <Input
                value={localContent.caption || ""}
                onChange={(e) => handleContentChange("caption", e.target.value)}
                className="input-dark mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Width</Label>
                <Input
                  value={localContent.width || "100%"}
                  onChange={(e) => handleContentChange("width", e.target.value)}
                  className="input-dark mt-1"
                />
              </div>
              <div>
                <Label className="text-white">Border Radius</Label>
                <Input
                  value={localContent.borderRadius || "8px"}
                  onChange={(e) => handleContentChange("borderRadius", e.target.value)}
                  className="input-dark mt-1"
                />
              </div>
            </div>
          </div>
        );

      case "cta":
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-white text-lg">Heading</Label>
              <Input
                value={localContent.heading || ""}
                onChange={(e) => handleContentChange("heading", e.target.value)}
                className="input-dark mt-1 text-xl font-bold"
              />
            </div>
            <div>
              <Label className="text-white">Supporting Text</Label>
              <Textarea
                value={localContent.text || ""}
                onChange={(e) => handleContentChange("text", e.target.value)}
                className="input-dark mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Button Text</Label>
                <Input
                  value={localContent.buttonText || ""}
                  onChange={(e) => handleContentChange("buttonText", e.target.value)}
                  className="input-dark mt-1"
                />
              </div>
              <div>
                <Label className="text-white">Button Link</Label>
                <Input
                  value={localContent.buttonLink || ""}
                  onChange={(e) => handleContentChange("buttonLink", e.target.value)}
                  className="input-dark mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-white">Background Color</Label>
              <div className="flex gap-2 mt-1">
                <input
                  type="color"
                  value={localContent.backgroundColor || "#DC2626"}
                  onChange={(e) => handleContentChange("backgroundColor", e.target.value)}
                  className="w-14 h-14 rounded cursor-pointer"
                />
                <Input
                  value={localContent.backgroundColor || "#DC2626"}
                  onChange={(e) => handleContentChange("backgroundColor", e.target.value)}
                  className="input-dark flex-1"
                />
              </div>
            </div>
          </div>
        );

      case "spacer":
        return (
          <div>
            <Label className="text-white">Height: {localContent.height || "100px"}</Label>
            <Slider
              value={[parseInt(localContent.height) || 100]}
              onValueChange={(v) => handleContentChange("height", `${v[0]}px`)}
              min={20}
              max={300}
              step={10}
              className="mt-2"
            />
          </div>
        );

      case "divider":
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-white">Style</Label>
              <Select
                value={localContent.style || "solid"}
                onValueChange={(v) => handleContentChange("style", v)}
              >
                <SelectTrigger className="input-dark mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-white/20">
                  <SelectItem value="solid" className="text-white">Solid</SelectItem>
                  <SelectItem value="dashed" className="text-white">Dashed</SelectItem>
                  <SelectItem value="dotted" className="text-white">Dotted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white">Color</Label>
              <div className="flex gap-2 mt-1">
                <input
                  type="color"
                  value={localContent.color || "#DC2626"}
                  onChange={(e) => handleContentChange("color", e.target.value)}
                  className="w-14 h-14 rounded cursor-pointer"
                />
                <Input
                  value={localContent.color || "#DC2626"}
                  onChange={(e) => handleContentChange("color", e.target.value)}
                  className="input-dark flex-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-white">Thickness: {localContent.thickness || "2px"}</Label>
              <Slider
                value={[parseInt(localContent.thickness) || 2]}
                onValueChange={(v) => handleContentChange("thickness", `${v[0]}px`)}
                min={1}
                max={10}
                step={1}
                className="mt-2"
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="text-white/50 text-center py-8">
            Content editor for {section.type} section
          </div>
        );
    }
  };

  return (
    <div className="bg-[#1A1A1A] border border-white/10 rounded-xl overflow-hidden">
      {/* Section Header */}
      <div className="flex items-center gap-4 p-4 bg-white/5">
        <div className="cursor-grab text-white/40 hover:text-white">
          <GripVertical size={24} />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{sectionTypes.find(s => s.id === section.type)?.icon}</span>
            <span className="text-white font-bold text-lg">
              {sectionTypes.find(s => s.id === section.type)?.name || section.type}
            </span>
            {!section.visible && (
              <span className="text-white/50 text-sm">(Hidden)</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onUpdate({ ...section, visible: !section.visible })}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title={section.visible ? "Hide section" : "Show section"}
          >
            {section.visible ? (
              <Eye className="text-white" size={20} />
            ) : (
              <EyeOff className="text-white/50" size={20} />
            )}
          </button>
          <button
            onClick={() => onDuplicate(section)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Duplicate"
          >
            <Copy className="text-white/70" size={20} />
          </button>
          <button
            onClick={() => onDelete(section.id)}
            className="p-2 hover:bg-red-600/20 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="text-red-500" size={20} />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            {expanded ? (
              <ChevronUp className="text-white" size={20} />
            ) : (
              <ChevronDown className="text-white" size={20} />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Content Editor */}
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="p-6 border-t border-white/10"
        >
          {renderContentEditor()}
        </motion.div>
      )}
    </div>
  );
};

// Main Page Builder Component
const PageBuilder = () => {
  const [pages, setPages] = useState([
    { id: "home", name: "Homepage" },
    { id: "menu", name: "Menu Page" },
    { id: "about", name: "About Page" }
  ]);
  const [activePage, setActivePage] = useState("home");
  const [sectionsTop, setSectionsTop] = useState([]);
  const [sectionsBottom, setSectionsBottom] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddSection, setShowAddSection] = useState(false);
  const [addPosition, setAddPosition] = useState("top"); // "top" or "bottom"

  const fetchPageContent = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/admin/page-builder/${activePage}`, { withCredentials: true });
      if (response.data) {
        setSectionsTop(response.data.sections_top || response.data.sections || []);
        setSectionsBottom(response.data.sections_bottom || []);
      } else {
        setSectionsTop([]);
        setSectionsBottom([]);
      }
    } catch (error) {
      console.error("Error fetching page content:", error);
      setSectionsTop([]);
      setSectionsBottom([]);
    }
  }, [activePage]);

  useEffect(() => {
    fetchPageContent();
  }, [fetchPageContent]);

  const fetchPageContent = async () => {
    try {
      const response = await axios.get(`${API}/admin/page-builder/${activePage}`, { withCredentials: true });
      if (response.data) {
        setSectionsTop(response.data.sections_top || response.data.sections || []);
        setSectionsBottom(response.data.sections_bottom || []);
      } else {
        setSectionsTop([]);
        setSectionsBottom([]);
      }
    } catch (error) {
      setSectionsTop([]);
      setSectionsBottom([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/admin/page-builder/${activePage}`, { 
        sections_top: sectionsTop,
        sections_bottom: sectionsBottom
      }, { withCredentials: true });
      toast.success("Page saved & published!");
    } catch (error) {
      toast.error("Failed to save page");
    } finally {
      setSaving(false);
    }
  };

  const addSection = (type) => {
    const newSection = {
      id: `section_${Date.now()}`,
      type,
      visible: true,
      content: defaultSectionContent[type] || {}
    };
    if (addPosition === "top") {
      setSectionsTop([...sectionsTop, newSection]);
    } else {
      setSectionsBottom([...sectionsBottom, newSection]);
    }
    setShowAddSection(false);
    toast.success(`${sectionTypes.find(s => s.id === type)?.name} added to ${addPosition === "top" ? "TOP" : "BOTTOM"}`);
  };

  const updateSection = (updatedSection, position) => {
    if (position === "top") {
      setSectionsTop(sectionsTop.map(s => s.id === updatedSection.id ? updatedSection : s));
    } else {
      setSectionsBottom(sectionsBottom.map(s => s.id === updatedSection.id ? updatedSection : s));
    }
  };

  const deleteSection = (sectionId, position) => {
    if (!window.confirm("Delete this section?")) return;
    if (position === "top") {
      setSectionsTop(sectionsTop.filter(s => s.id !== sectionId));
    } else {
      setSectionsBottom(sectionsBottom.filter(s => s.id !== sectionId));
    }
    toast.success("Section deleted");
  };

  const duplicateSection = (section, position) => {
    const newSection = {
      ...section,
      id: `section_${Date.now()}`,
      content: { ...section.content }
    };
    if (position === "top") {
      const index = sectionsTop.findIndex(s => s.id === section.id);
      const newSections = [...sectionsTop];
      newSections.splice(index + 1, 0, newSection);
      setSectionsTop(newSections);
    } else {
      const index = sectionsBottom.findIndex(s => s.id === section.id);
      const newSections = [...sectionsBottom];
      newSections.splice(index + 1, 0, newSection);
      setSectionsBottom(newSections);
    }
    toast.success("Section duplicated");
  };

  const handleReorderTop = (newOrder) => {
    setSectionsTop(newOrder);
  };

  const handleReorderBottom = (newOrder) => {
    setSectionsBottom(newOrder);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-display font-bold text-white">Page Builder</h1>
          <p className="text-white/60 mt-1 text-lg">Add sections to TOP or BOTTOM of your page</p>
        </div>
        <div className="flex gap-4">
          <Button
            onClick={() => window.open('/', '_blank')}
            variant="outline"
            className="btn-secondary"
          >
            <Eye size={20} className="mr-2" />
            Preview Live Site
          </Button>
          <Button onClick={handleSave} disabled={saving} className="btn-primary">
            <Save size={20} className="mr-2" />
            {saving ? "Saving..." : "Save & Publish"}
          </Button>
        </div>
      </div>

      {/* Page Selector */}
      <div className="flex gap-4 mb-6">
        {pages.map((page) => (
          <button
            key={page.id}
            onClick={() => setActivePage(page.id)}
            className={`px-6 py-3 rounded-lg font-semibold text-lg transition-all ${
              activePage === page.id
                ? "bg-red-600 text-white"
                : "bg-white/10 text-white/70 hover:bg-white/20"
            }`}
          >
            {page.name}
          </button>
        ))}
      </div>

      {/* TOP SECTIONS */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            ⬆️ TOP Sections
            <span className="text-sm font-normal text-white/50">(appears above default content)</span>
          </h2>
          <Button onClick={() => { setAddPosition("top"); setShowAddSection(true); }} className="btn-primary">
            <Plus size={18} className="mr-2" />
            Add to Top
          </Button>
        </div>
        
        {sectionsTop.length === 0 ? (
          <div className="card-dark p-8 text-center border-2 border-dashed border-white/20">
            <p className="text-white/50">No sections at top. Click "Add to Top" to add sections that appear before the default page content.</p>
          </div>
        ) : (
          <Reorder.Group values={sectionsTop} onReorder={handleReorderTop} className="space-y-4">
            {sectionsTop.map((section) => (
              <Reorder.Item key={section.id} value={section}>
                <SectionEditor
                  section={section}
                  onUpdate={(s) => updateSection(s, "top")}
                  onDelete={(id) => deleteSection(id, "top")}
                  onDuplicate={(s) => duplicateSection(s, "top")}
                />
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}
      </div>

      {/* DEFAULT CONTENT INDICATOR */}
      <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-6 mb-8">
        <div className="text-center">
          <p className="text-white/70 text-lg">📄 <strong>Default Page Content</strong></p>
          <p className="text-white/50 text-sm">Hero, About, Menu, Testimonials, Location, FAQ sections appear here</p>
        </div>
      </div>

      {/* BOTTOM SECTIONS */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            ⬇️ BOTTOM Sections
            <span className="text-sm font-normal text-white/50">(appears above footer)</span>
          </h2>
          <Button onClick={() => { setAddPosition("bottom"); setShowAddSection(true); }} className="btn-primary">
            <Plus size={18} className="mr-2" />
            Add to Bottom
          </Button>
        </div>
        
        {sectionsBottom.length === 0 ? (
          <div className="card-dark p-8 text-center border-2 border-dashed border-white/20">
            <p className="text-white/50">No sections at bottom. Click "Add to Bottom" to add sections that appear above the footer.</p>
          </div>
        ) : (
          <Reorder.Group values={sectionsBottom} onReorder={handleReorderBottom} className="space-y-4">
            {sectionsBottom.map((section) => (
              <Reorder.Item key={section.id} value={section}>
                <SectionEditor
                  section={section}
                  onUpdate={(s) => updateSection(s, "bottom")}
                  onDelete={(id) => deleteSection(id, "bottom")}
                  onDuplicate={(s) => duplicateSection(s, "bottom")}
                />
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}
      </div>

      {/* Add Section Modal */}
      {showAddSection && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#1A1A1A] rounded-2xl p-8 max-w-4xl w-full max-h-[80vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-white text-3xl font-bold">
                Add Section to {addPosition === "top" ? "⬆️ TOP" : "⬇️ BOTTOM"}
              </h2>
              <button
                onClick={() => setShowAddSection(false)}
                className="p-2 hover:bg-white/10 rounded-lg"
              >
                <X className="text-white" size={24} />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {sectionTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => addSection(type.id)}
                  className="p-6 bg-white/5 hover:bg-red-600/20 border border-white/10 hover:border-red-600 rounded-xl transition-all text-center group"
                >
                  <div className="text-4xl mb-3">{type.icon}</div>
                  <div className="text-white font-semibold text-lg group-hover:text-red-500">{type.name}</div>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default PageBuilder;
