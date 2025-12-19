import React, { useState, useEffect } from "react";
import axios from "axios";
import { Save, Plus, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Switch } from "../../components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SettingsManager = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/settings`);
      setSettings(response.data);
    } catch (error) {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/admin/settings`, settings, { withCredentials: true });
      toast.success("Settings saved successfully");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateOpeningHours = (index, field, value) => {
    const newHours = [...(settings.opening_hours || [])];
    newHours[index] = { ...newHours[index], [field]: value };
    updateSettings("opening_hours", newHours);
  };

  if (loading || !settings) {
    return <div className="text-white">Loading settings...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-display font-bold text-white">Site Settings</h1>
        <Button onClick={handleSave} disabled={saving} className="btn-primary" data-testid="save-settings-btn">
          <Save size={18} className="mr-2" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="general" className="data-[state=active]:bg-red-600">General</TabsTrigger>
          <TabsTrigger value="hero" className="data-[state=active]:bg-red-600">Hero Section</TabsTrigger>
          <TabsTrigger value="about" className="data-[state=active]:bg-red-600">About</TabsTrigger>
          <TabsTrigger value="contact" className="data-[state=active]:bg-red-600">Contact</TabsTrigger>
          <TabsTrigger value="hours" className="data-[state=active]:bg-red-600">Hours</TabsTrigger>
          <TabsTrigger value="design" className="data-[state=active]:bg-red-600">Design</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="card-dark p-6 space-y-6">
            <div>
              <Label className="text-slate-300">Site Name</Label>
              <Input
                value={settings.site_name || ""}
                onChange={(e) => updateSettings("site_name", e.target.value)}
                className="input-dark mt-1"
                data-testid="setting-site-name"
              />
            </div>
            <div>
              <Label className="text-slate-300">Tagline</Label>
              <Input
                value={settings.tagline || ""}
                onChange={(e) => updateSettings("tagline", e.target.value)}
                className="input-dark mt-1"
                data-testid="setting-tagline"
              />
            </div>
            <div>
              <Label className="text-slate-300">Meta Title (SEO)</Label>
              <Input
                value={settings.meta_title || ""}
                onChange={(e) => updateSettings("meta_title", e.target.value)}
                className="input-dark mt-1"
                data-testid="setting-meta-title"
              />
            </div>
            <div>
              <Label className="text-slate-300">Meta Description (SEO)</Label>
              <Textarea
                value={settings.meta_description || ""}
                onChange={(e) => updateSettings("meta_description", e.target.value)}
                className="input-dark mt-1"
                data-testid="setting-meta-description"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="hero">
          <div className="card-dark p-6 space-y-6">
            <div>
              <Label className="text-slate-300">Hero Title</Label>
              <Input
                value={settings.hero_title || ""}
                onChange={(e) => updateSettings("hero_title", e.target.value)}
                className="input-dark mt-1"
                data-testid="setting-hero-title"
              />
            </div>
            <div>
              <Label className="text-slate-300">Hero Subtitle</Label>
              <Textarea
                value={settings.hero_subtitle || ""}
                onChange={(e) => updateSettings("hero_subtitle", e.target.value)}
                className="input-dark mt-1"
                data-testid="setting-hero-subtitle"
              />
            </div>
            <div>
              <Label className="text-slate-300">Hero Image URL</Label>
              <Input
                value={settings.hero_image || ""}
                onChange={(e) => updateSettings("hero_image", e.target.value)}
                className="input-dark mt-1"
                placeholder="https://..."
                data-testid="setting-hero-image"
              />
              {settings.hero_image && (
                <img src={settings.hero_image} alt="Hero preview" className="mt-4 w-full h-48 object-cover rounded-lg" />
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="about">
          <div className="card-dark p-6 space-y-6">
            <div>
              <Label className="text-slate-300">About Title</Label>
              <Input
                value={settings.about_title || ""}
                onChange={(e) => updateSettings("about_title", e.target.value)}
                className="input-dark mt-1"
                data-testid="setting-about-title"
              />
            </div>
            <div>
              <Label className="text-slate-300">About Content</Label>
              <Textarea
                value={settings.about_content || ""}
                onChange={(e) => updateSettings("about_content", e.target.value)}
                className="input-dark mt-1 min-h-[150px]"
                data-testid="setting-about-content"
              />
            </div>
            <div>
              <Label className="text-slate-300">Chef Name</Label>
              <Input
                value={settings.chef_name || ""}
                onChange={(e) => updateSettings("chef_name", e.target.value)}
                className="input-dark mt-1"
                data-testid="setting-chef-name"
              />
            </div>
            <div>
              <Label className="text-slate-300">Chef Image URL</Label>
              <Input
                value={settings.chef_image || ""}
                onChange={(e) => updateSettings("chef_image", e.target.value)}
                className="input-dark mt-1"
                placeholder="https://..."
                data-testid="setting-chef-image"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="contact">
          <div className="card-dark p-6 space-y-6">
            <div>
              <Label className="text-slate-300">Address</Label>
              <Input
                value={settings.address || ""}
                onChange={(e) => updateSettings("address", e.target.value)}
                className="input-dark mt-1"
                data-testid="setting-address"
              />
            </div>
            <div>
              <Label className="text-slate-300">Phone</Label>
              <Input
                value={settings.phone || ""}
                onChange={(e) => updateSettings("phone", e.target.value)}
                className="input-dark mt-1"
                data-testid="setting-phone"
              />
            </div>
            <div>
              <Label className="text-slate-300">Email</Label>
              <Input
                value={settings.email || ""}
                onChange={(e) => updateSettings("email", e.target.value)}
                className="input-dark mt-1"
                data-testid="setting-email"
              />
            </div>
            <div className="border-t border-slate-800 pt-6">
              <h3 className="text-white font-semibold mb-4">Social Media</h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-slate-300">Facebook URL</Label>
                  <Input
                    value={settings.facebook_url || ""}
                    onChange={(e) => updateSettings("facebook_url", e.target.value)}
                    className="input-dark mt-1"
                    placeholder="https://facebook.com/..."
                    data-testid="setting-facebook"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Instagram URL</Label>
                  <Input
                    value={settings.instagram_url || ""}
                    onChange={(e) => updateSettings("instagram_url", e.target.value)}
                    className="input-dark mt-1"
                    placeholder="https://instagram.com/..."
                    data-testid="setting-instagram"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Twitter URL</Label>
                  <Input
                    value={settings.twitter_url || ""}
                    onChange={(e) => updateSettings("twitter_url", e.target.value)}
                    className="input-dark mt-1"
                    placeholder="https://twitter.com/..."
                    data-testid="setting-twitter"
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="hours">
          <div className="card-dark p-6">
            <h3 className="text-white font-semibold mb-6">Opening Hours</h3>
            <div className="space-y-4">
              {(settings.opening_hours || []).map((hour, index) => (
                <div key={hour.day} className="flex items-center gap-4 p-4 bg-slate-800 rounded-lg">
                  <span className="w-28 text-white font-semibold">{hour.day}</span>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={!hour.is_closed}
                      onCheckedChange={(checked) => updateOpeningHours(index, "is_closed", !checked)}
                      data-testid={`hours-toggle-${hour.day}`}
                    />
                    <span className="text-slate-400 text-sm w-16">
                      {hour.is_closed ? "Closed" : "Open"}
                    </span>
                  </div>
                  {!hour.is_closed && (
                    <>
                      <Input
                        type="time"
                        value={hour.open_time || ""}
                        onChange={(e) => updateOpeningHours(index, "open_time", e.target.value)}
                        className="input-dark w-32"
                        data-testid={`hours-open-${hour.day}`}
                      />
                      <span className="text-slate-400">to</span>
                      <Input
                        type="time"
                        value={hour.close_time || ""}
                        onChange={(e) => updateOpeningHours(index, "close_time", e.target.value)}
                        className="input-dark w-32"
                        data-testid={`hours-close-${hour.day}`}
                      />
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="design">
          <div className="card-dark p-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label className="text-slate-300">Primary Color</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={settings.primary_color || "#DC2626"}
                    onChange={(e) => updateSettings("primary_color", e.target.value)}
                    className="w-12 h-12 rounded cursor-pointer"
                    data-testid="setting-primary-color"
                  />
                  <Input
                    value={settings.primary_color || "#DC2626"}
                    onChange={(e) => updateSettings("primary_color", e.target.value)}
                    className="input-dark"
                  />
                </div>
              </div>
              <div>
                <Label className="text-slate-300">Secondary Color</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={settings.secondary_color || "#020617"}
                    onChange={(e) => updateSettings("secondary_color", e.target.value)}
                    className="w-12 h-12 rounded cursor-pointer"
                    data-testid="setting-secondary-color"
                  />
                  <Input
                    value={settings.secondary_color || "#020617"}
                    onChange={(e) => updateSettings("secondary_color", e.target.value)}
                    className="input-dark"
                  />
                </div>
              </div>
            </div>
            <div>
              <Label className="text-slate-300">Heading Font</Label>
              <Input
                value={settings.font_heading || "Playfair Display"}
                onChange={(e) => updateSettings("font_heading", e.target.value)}
                className="input-dark mt-1"
                data-testid="setting-font-heading"
              />
            </div>
            <div>
              <Label className="text-slate-300">Body Font</Label>
              <Input
                value={settings.font_body || "Manrope"}
                onChange={(e) => updateSettings("font_body", e.target.value)}
                className="input-dark mt-1"
                data-testid="setting-font-body"
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsManager;
