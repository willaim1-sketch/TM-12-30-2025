import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { Save, Globe, Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SEOManager = () => {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    page_slug: "",
    meta_title: "",
    meta_description: "",
    og_title: "",
    og_description: "",
    og_image: "",
    keywords: []
  });
  const [keywordsInput, setKeywordsInput] = useState("");

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      const response = await axios.get(`${API}/admin/seo`, { withCredentials: true });
      setPages(response.data);
    } catch (error) {
      toast.error("Failed to load SEO settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.page_slug || !form.meta_title) {
      toast.error("Please fill in page slug and meta title");
      return;
    }

    const data = {
      ...form,
      keywords: keywordsInput.split(',').map(k => k.trim()).filter(Boolean)
    };

    try {
      await axios.put(`${API}/admin/seo/${form.page_slug}`, data, { withCredentials: true });
      toast.success("SEO settings saved");

      setShowDialog(false);
      resetForm();
      fetchPages();
    } catch (error) {
      toast.error("Failed to save SEO settings");
    }
  };

  const openEdit = (page) => {
    setEditing(page);
    setForm({
      page_slug: page.page_slug,
      meta_title: page.meta_title,
      meta_description: page.meta_description || "",
      og_title: page.og_title || "",
      og_description: page.og_description || "",
      og_image: page.og_image || "",
      keywords: page.keywords || []
    });
    setKeywordsInput((page.keywords || []).join(', '));
    setShowDialog(true);
  };

  const resetForm = () => {
    setEditing(null);
    setForm({
      page_slug: "", meta_title: "", meta_description: "",
      og_title: "", og_description: "", og_image: "", keywords: []
    });
    setKeywordsInput("");
  };

  const defaultPages = [
    { slug: "home", name: "Home Page" },
    { slug: "menu", name: "Menu Page" },
    { slug: "order", name: "Order Page" },
    { slug: "blog", name: "Blog Page" },
    { slug: "contact", name: "Contact Page" }
  ];

  if (loading) {
    return <div className="text-white">Loading SEO settings...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">SEO Manager</h1>
          <p className="text-white/60 mt-1">Optimize your pages for search engines</p>
        </div>
        <Button 
          onClick={() => { resetForm(); setShowDialog(true); }}
          className="btn-primary"
          data-testid="add-seo-btn"
        >
          <Plus size={18} className="mr-2" />
          Add Page SEO
        </Button>
      </div>

      {/* Quick Setup */}
      <div className="card-dark p-6 mb-8">
        <h3 className="text-white font-semibold mb-4">Quick Setup</h3>
        <p className="text-white/60 text-sm mb-4">
          Click on a page below to configure its SEO settings:
        </p>
        <div className="flex flex-wrap gap-3">
          {defaultPages.map((page) => {
            const existingPage = pages.find(p => p.page_slug === page.slug);
            return (
              <button
                key={page.slug}
                onClick={() => {
                  if (existingPage) {
                    openEdit(existingPage);
                  } else {
                    setForm(prev => ({ ...prev, page_slug: page.slug, meta_title: page.name }));
                    setShowDialog(true);
                  }
                }}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  existingPage 
                    ? 'bg-green-600/20 border border-green-600 text-green-400' 
                    : 'bg-[#2A2A2A] border border-white/20 text-white/70 hover:bg-[#3A3A3A]'
                }`}
                data-testid={`setup-${page.slug}`}
              >
                {page.name}
                {existingPage && <span className="ml-2 text-xs">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Existing SEO Configurations */}
      {pages.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-white font-semibold">Configured Pages</h3>
          {pages.map((page) => (
            <motion.div
              key={page.page_id || page.page_slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-dark p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Globe className="text-red-500" size={20} />
                    <span className="text-white/60 font-mono text-sm">/{page.page_slug}</span>
                  </div>
                  <h4 className="text-white font-semibold mb-1">{page.meta_title}</h4>
                  <p className="text-white/60 text-sm line-clamp-2">{page.meta_description}</p>
                  {page.keywords?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {page.keywords.map((keyword, idx) => (
                        <span key={idx} className="text-xs bg-[#2A2A2A] text-white/60 px-2 py-1 rounded">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => openEdit(page)}
                  variant="outline"
                  size="sm"
                  className="btn-secondary"
                  data-testid={`edit-seo-${page.page_slug}`}
                >
                  <Edit size={14} className="mr-1" />
                  Edit
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* SEO Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-[#1A1A1A] border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editing ? 'Edit SEO Settings' : 'Add SEO Settings'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <Label className="text-white/70">Page Slug *</Label>
              <Input
                value={form.page_slug}
                onChange={(e) => setForm(prev => ({ ...prev, page_slug: e.target.value }))}
                className="input-dark mt-1"
                placeholder="home, menu, contact, etc."
                disabled={!!editing}
                data-testid="seo-slug-input"
              />
              <p className="text-white/50 text-xs mt-1">This identifies which page these settings apply to</p>
            </div>

            <div className="border-t border-white/10 pt-6">
              <h4 className="text-white font-semibold mb-4">Basic Meta Tags</h4>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-white/70">Meta Title * (50-60 characters ideal)</Label>
                  <Input
                    value={form.meta_title}
                    onChange={(e) => setForm(prev => ({ ...prev, meta_title: e.target.value }))}
                    className="input-dark mt-1"
                    placeholder="The Tamale Man - Authentic Gourmet Tamales"
                    data-testid="seo-title-input"
                  />
                  <p className="text-white/50 text-xs mt-1">{form.meta_title.length}/60 characters</p>
                </div>

                <div>
                  <Label className="text-white/70">Meta Description (150-160 characters ideal)</Label>
                  <Textarea
                    value={form.meta_description}
                    onChange={(e) => setForm(prev => ({ ...prev, meta_description: e.target.value }))}
                    className="input-dark mt-1"
                    placeholder="Experience the finest handcrafted tamales in town..."
                    data-testid="seo-description-input"
                  />
                  <p className="text-white/50 text-xs mt-1">{form.meta_description.length}/160 characters</p>
                </div>

                <div>
                  <Label className="text-white/70">Keywords (comma separated)</Label>
                  <Input
                    value={keywordsInput}
                    onChange={(e) => setKeywordsInput(e.target.value)}
                    className="input-dark mt-1"
                    placeholder="tamales, mexican food, gourmet, austin"
                    data-testid="seo-keywords-input"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 pt-6">
              <h4 className="text-white font-semibold mb-4">Open Graph (Social Sharing)</h4>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-white/70">OG Title (for Facebook/Twitter)</Label>
                  <Input
                    value={form.og_title}
                    onChange={(e) => setForm(prev => ({ ...prev, og_title: e.target.value }))}
                    className="input-dark mt-1"
                    placeholder="Same as meta title if empty"
                    data-testid="seo-og-title-input"
                  />
                </div>

                <div>
                  <Label className="text-white/70">OG Description</Label>
                  <Textarea
                    value={form.og_description}
                    onChange={(e) => setForm(prev => ({ ...prev, og_description: e.target.value }))}
                    className="input-dark mt-1"
                    placeholder="Description when shared on social media"
                    data-testid="seo-og-description-input"
                  />
                </div>

                <div>
                  <Label className="text-white/70">OG Image URL (1200x630px recommended)</Label>
                  <Input
                    value={form.og_image}
                    onChange={(e) => setForm(prev => ({ ...prev, og_image: e.target.value }))}
                    className="input-dark mt-1"
                    placeholder="https://..."
                    data-testid="seo-og-image-input"
                  />
                  {form.og_image && (
                    <img src={form.og_image} alt="OG Preview" className="mt-2 w-full h-32 object-cover rounded" />
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-white/10">
              <Button variant="outline" onClick={() => setShowDialog(false)} className="btn-secondary">
                Cancel
              </Button>
              <Button onClick={handleSave} className="btn-primary" data-testid="save-seo-btn">
                <Save size={18} className="mr-2" />
                Save SEO Settings
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SEOManager;
