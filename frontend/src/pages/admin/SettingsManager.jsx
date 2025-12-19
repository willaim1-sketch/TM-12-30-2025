import React, { useState, useEffect } from "react";
import axios from "axios";
import { Save, CreditCard, Image, Eye, EyeOff, Info, AlertCircle, Upload, Plus, X, Mail } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Switch } from "../../components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Image dimension guide component
const ImageGuide = ({ label, width, height, description }) => (
  <div className="flex items-start gap-2 p-3 bg-[#2A2A2A]/50 rounded-lg text-sm">
    <Info size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
    <div>
      <span className="text-white/70 font-medium">{label}</span>
      <p className="text-white/60 text-xs mt-1">
        Recommended: <span className="text-red-400 font-mono">{width} x {height}px</span>
      </p>
      {description && <p className="text-white/50 text-xs mt-1">{description}</p>}
    </div>
  </div>
);

// Logo/Image upload component
const ImageUploader = ({ label, value, onChange, width, height, description }) => {
  const [uploading, setUploading] = useState(false);
  
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (max 5MB)
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
      
      onChange(response.data.url);
      toast.success("Image uploaded successfully");
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-white/70">{label}</Label>
        <span className="text-white/50 text-xs font-mono">{width} × {height}px</span>
      </div>
      
      <div className="flex gap-4 items-start">
        {/* Preview */}
        <div 
          className="border-2 border-dashed border-white/20 rounded-lg flex items-center justify-center bg-[#2A2A2A] overflow-hidden"
          style={{ width: Math.min(width, 200), height: Math.min(height, 100) }}
        >
          {value ? (
            <img src={value} alt={label} className="w-full h-full object-contain" />
          ) : (
            <Image size={32} className="text-white/30" />
          )}
        </div>
        
        {/* Upload controls */}
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className={`inline-flex items-center gap-2 px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg text-white/70 text-sm transition-colors ${uploading ? 'opacity-50' : ''}`}>
                <Upload size={16} />
                {uploading ? "Uploading..." : "Upload"}
              </div>
            </label>
            {value && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onChange("")}
                className="text-red-400 border-red-400/30 hover:bg-red-500/10"
              >
                Remove
              </Button>
            )}
          </div>
          
          <Input
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Or paste image URL..."
            className="input-dark text-sm"
          />
          
          {description && <p className="text-white/50 text-xs">{description}</p>}
        </div>
      </div>
    </div>
  );
};

const SettingsManager = () => {
  const [settings, setSettings] = useState(null);
  const [stripeSettings, setStripeSettings] = useState({ stripe_api_key: "", stripe_webhook_secret: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showStripeKey, setShowStripeKey] = useState(false);
  const [newEmail, setNewEmail] = useState("");

  useEffect(() => {
    fetchSettings();
    fetchStripeSettings();
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

  const fetchStripeSettings = async () => {
    try {
      const response = await axios.get(`${API}/admin/stripe-settings`, { withCredentials: true });
      setStripeSettings(response.data);
    } catch (error) {
      // Settings may not exist yet
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

  const handleSaveStripe = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/admin/stripe-settings`, stripeSettings, { withCredentials: true });
      toast.success("Stripe settings saved successfully");
    } catch (error) {
      toast.error("Failed to save Stripe settings");
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

  // Notification emails management
  const addNotificationEmail = () => {
    if (!newEmail || !newEmail.includes("@")) {
      toast.error("Please enter a valid email");
      return;
    }
    const emails = settings.notification_emails || [];
    if (emails.includes(newEmail)) {
      toast.error("Email already added");
      return;
    }
    updateSettings("notification_emails", [...emails, newEmail]);
    setNewEmail("");
    toast.success("Email added");
  };

  const removeNotificationEmail = (email) => {
    const emails = (settings.notification_emails || []).filter(e => e !== email);
    updateSettings("notification_emails", emails);
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
        <TabsList className="bg-[#1A1A1A] border border-white/10 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="general" className="data-[state=active]:bg-red-600">General</TabsTrigger>
          <TabsTrigger value="logos" className="data-[state=active]:bg-red-600">
            <Image size={16} className="mr-1" />
            Logos
          </TabsTrigger>
          <TabsTrigger value="hero" className="data-[state=active]:bg-red-600">Hero Section</TabsTrigger>
          <TabsTrigger value="about" className="data-[state=active]:bg-red-600">About</TabsTrigger>
          <TabsTrigger value="images" className="data-[state=active]:bg-red-600">All Images</TabsTrigger>
          <TabsTrigger value="contact" className="data-[state=active]:bg-red-600">Contact</TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-red-600">
            <Mail size={16} className="mr-1" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="hours" className="data-[state=active]:bg-red-600">Hours</TabsTrigger>
          <TabsTrigger value="design" className="data-[state=active]:bg-red-600">Design</TabsTrigger>
          <TabsTrigger value="stripe" className="data-[state=active]:bg-red-600">
            <CreditCard size={16} className="mr-1" />
            Payments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="card-dark p-6 space-y-6">
            <div>
              <Label className="text-white/70">Site Name</Label>
              <Input
                value={settings.site_name || ""}
                onChange={(e) => updateSettings("site_name", e.target.value)}
                className="input-dark mt-1"
                data-testid="setting-site-name"
              />
            </div>
            <div>
              <Label className="text-white/70">Tagline</Label>
              <Input
                value={settings.tagline || ""}
                onChange={(e) => updateSettings("tagline", e.target.value)}
                className="input-dark mt-1"
                data-testid="setting-tagline"
              />
            </div>
            <div>
              <Label className="text-white/70">Meta Title (SEO)</Label>
              <Input
                value={settings.meta_title || ""}
                onChange={(e) => updateSettings("meta_title", e.target.value)}
                className="input-dark mt-1"
                data-testid="setting-meta-title"
              />
            </div>
            <div>
              <Label className="text-white/70">Meta Description (SEO)</Label>
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
              <Label className="text-white/70">Hero Title</Label>
              <Input
                value={settings.hero_title || ""}
                onChange={(e) => updateSettings("hero_title", e.target.value)}
                className="input-dark mt-1"
                data-testid="setting-hero-title"
              />
            </div>
            <div>
              <Label className="text-white/70">Hero Subtitle</Label>
              <Textarea
                value={settings.hero_subtitle || ""}
                onChange={(e) => updateSettings("hero_subtitle", e.target.value)}
                className="input-dark mt-1"
                data-testid="setting-hero-subtitle"
              />
            </div>
            <div>
              <Label className="text-white/70">Hero Background Image</Label>
              <ImageGuide 
                label="Hero Background" 
                width="1920" 
                height="1080" 
                description="Full-width background. Use high-quality restaurant interior or signature dish photo."
              />
              <Input
                value={settings.hero_image || ""}
                onChange={(e) => updateSettings("hero_image", e.target.value)}
                className="input-dark mt-2"
                placeholder="https://..."
                data-testid="setting-hero-image"
              />
              {settings.hero_image && (
                <div className="mt-4 relative">
                  <img src={settings.hero_image} alt="Hero preview" className="w-full h-48 object-cover rounded-lg" />
                  <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    1920 x 1080px recommended
                  </span>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="about">
          <div className="card-dark p-6 space-y-6">
            <div>
              <Label className="text-white/70">About Title</Label>
              <Input
                value={settings.about_title || ""}
                onChange={(e) => updateSettings("about_title", e.target.value)}
                className="input-dark mt-1"
                data-testid="setting-about-title"
              />
            </div>
            <div>
              <Label className="text-white/70">About Content</Label>
              <Textarea
                value={settings.about_content || ""}
                onChange={(e) => updateSettings("about_content", e.target.value)}
                className="input-dark mt-1 min-h-[150px]"
                data-testid="setting-about-content"
              />
            </div>
            <div>
              <Label className="text-white/70">Chef Name</Label>
              <Input
                value={settings.chef_name || ""}
                onChange={(e) => updateSettings("chef_name", e.target.value)}
                className="input-dark mt-1"
                data-testid="setting-chef-name"
              />
            </div>
            <div>
              <Label className="text-white/70">Chef Image</Label>
              <ImageGuide 
                label="Chef/Team Photo" 
                width="800" 
                height="1000" 
                description="Portrait orientation. Show chef cooking or team in kitchen."
              />
              <Input
                value={settings.chef_image || ""}
                onChange={(e) => updateSettings("chef_image", e.target.value)}
                className="input-dark mt-2"
                placeholder="https://..."
                data-testid="setting-chef-image"
              />
              {settings.chef_image && (
                <div className="mt-4 relative w-48">
                  <img src={settings.chef_image} alt="Chef preview" className="w-full h-60 object-cover rounded-lg" />
                  <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    800 x 1000px
                  </span>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="images">
          <div className="card-dark p-6">
            <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
              <Image size={20} className="text-red-500" />
              Image Dimension Guide
            </h3>
            
            <Alert className="bg-[#2A2A2A] border-white/20 mb-6">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-white/70">
                For best results, use images that match the recommended dimensions. Larger images will be cropped to fit.
              </AlertDescription>
            </Alert>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-white font-medium">Homepage Images</h4>
                <ImageGuide label="Hero Background" width="1920" height="1080" description="Main banner image" />
                <ImageGuide label="Chef/About Photo" width="800" height="1000" description="Portrait, shows in About section" />
                <ImageGuide label="Order CTA Background" width="1920" height="600" description="Call-to-action section" />
                <ImageGuide label="Location Photo" width="800" height="600" description="Restaurant exterior or interior" />
              </div>
              
              <div className="space-y-4">
                <h4 className="text-white font-medium">Menu & Content Images</h4>
                <ImageGuide label="Menu Item Photo" width="600" height="450" description="4:3 ratio, food photography" />
                <ImageGuide label="Blog Featured Image" width="1200" height="630" description="Social share optimized" />
                <ImageGuide label="Social OG Image" width="1200" height="630" description="Facebook/Twitter preview" />
                <ImageGuide label="Logo/Favicon" width="512" height="512" description="Square, PNG with transparency" />
              </div>
            </div>

            <div className="mt-8 p-4 bg-[#2A2A2A] rounded-lg">
              <h4 className="text-white font-medium mb-3">Quick Image URLs</h4>
              <div className="space-y-3">
                <div>
                  <Label className="text-white/60 text-sm">Hero Image</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={settings.hero_image || ""}
                      onChange={(e) => updateSettings("hero_image", e.target.value)}
                      className="input-dark flex-1"
                      placeholder="https://..."
                    />
                    <Button onClick={handleSave} size="sm" className="btn-primary">Update</Button>
                  </div>
                </div>
                <div>
                  <Label className="text-white/60 text-sm">Chef Image</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={settings.chef_image || ""}
                      onChange={(e) => updateSettings("chef_image", e.target.value)}
                      className="input-dark flex-1"
                      placeholder="https://..."
                    />
                    <Button onClick={handleSave} size="sm" className="btn-primary">Update</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="contact">
          <div className="card-dark p-6 space-y-6">
            <div>
              <Label className="text-white/70">Address</Label>
              <Input
                value={settings.address || ""}
                onChange={(e) => updateSettings("address", e.target.value)}
                className="input-dark mt-1"
                data-testid="setting-address"
              />
            </div>
            <div>
              <Label className="text-white/70">Phone</Label>
              <Input
                value={settings.phone || ""}
                onChange={(e) => updateSettings("phone", e.target.value)}
                className="input-dark mt-1"
                data-testid="setting-phone"
              />
            </div>
            <div>
              <Label className="text-white/70">Email</Label>
              <Input
                value={settings.email || ""}
                onChange={(e) => updateSettings("email", e.target.value)}
                className="input-dark mt-1"
                data-testid="setting-email"
              />
            </div>
            <div>
              <Label className="text-white/70">Google Maps Embed URL</Label>
              <Input
                value={settings.google_maps_embed || ""}
                onChange={(e) => updateSettings("google_maps_embed", e.target.value)}
                className="input-dark mt-1"
                placeholder="https://www.google.com/maps/embed?..."
                data-testid="setting-maps"
              />
            </div>
            <div className="border-t border-white/10 pt-6">
              <h3 className="text-white font-semibold mb-4">Social Media</h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-white/70">Facebook URL</Label>
                  <Input
                    value={settings.facebook_url || ""}
                    onChange={(e) => updateSettings("facebook_url", e.target.value)}
                    className="input-dark mt-1"
                    placeholder="https://facebook.com/..."
                    data-testid="setting-facebook"
                  />
                </div>
                <div>
                  <Label className="text-white/70">Instagram URL</Label>
                  <Input
                    value={settings.instagram_url || ""}
                    onChange={(e) => updateSettings("instagram_url", e.target.value)}
                    className="input-dark mt-1"
                    placeholder="https://instagram.com/..."
                    data-testid="setting-instagram"
                  />
                </div>
                <div>
                  <Label className="text-white/70">Twitter URL</Label>
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
                <div key={hour.day} className="flex items-center gap-4 p-4 bg-[#2A2A2A] rounded-lg">
                  <span className="w-28 text-white font-semibold">{hour.day}</span>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={!hour.is_closed}
                      onCheckedChange={(checked) => updateOpeningHours(index, "is_closed", !checked)}
                      data-testid={`hours-toggle-${hour.day}`}
                    />
                    <span className="text-white/60 text-sm w-16">
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
                      <span className="text-white/60">to</span>
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
                <Label className="text-white/70">Primary Color</Label>
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
                <Label className="text-white/70">Secondary Color</Label>
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
              <Label className="text-white/70">Heading Font</Label>
              <Input
                value={settings.font_heading || "Playfair Display"}
                onChange={(e) => updateSettings("font_heading", e.target.value)}
                className="input-dark mt-1"
                data-testid="setting-font-heading"
              />
            </div>
            <div>
              <Label className="text-white/70">Body Font</Label>
              <Input
                value={settings.font_body || "Manrope"}
                onChange={(e) => updateSettings("font_body", e.target.value)}
                className="input-dark mt-1"
                data-testid="setting-font-body"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="stripe">
          <div className="card-dark p-6 space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="text-red-500" size={24} />
              <div>
                <h3 className="text-white font-semibold text-lg">Stripe Payment Settings</h3>
                <p className="text-white/60 text-sm">Configure your Stripe account to receive payments</p>
              </div>
            </div>

            <Alert className="bg-red-950/50 border-red-800">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-200">
                Get your API keys from{" "}
                <a 
                  href="https://dashboard.stripe.com/apikeys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-red-400 underline hover:text-red-300"
                >
                  Stripe Dashboard → Developers → API Keys
                </a>
              </AlertDescription>
            </Alert>

            <div>
              <Label className="text-white/70">Stripe Secret Key</Label>
              <p className="text-white/50 text-xs mb-2">Starts with sk_live_ (production) or sk_test_ (testing)</p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showStripeKey ? "text" : "password"}
                    value={stripeSettings.stripe_api_key || ""}
                    onChange={(e) => setStripeSettings(prev => ({ ...prev, stripe_api_key: e.target.value }))}
                    className="input-dark pr-10"
                    placeholder="sk_live_..."
                    data-testid="stripe-api-key-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowStripeKey(!showStripeKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                  >
                    {showStripeKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-white/70">Webhook Secret (Optional)</Label>
              <p className="text-white/50 text-xs mb-2">For receiving payment notifications. Starts with whsec_</p>
              <Input
                type="password"
                value={stripeSettings.stripe_webhook_secret || ""}
                onChange={(e) => setStripeSettings(prev => ({ ...prev, stripe_webhook_secret: e.target.value }))}
                className="input-dark"
                placeholder="whsec_..."
                data-testid="stripe-webhook-input"
              />
            </div>

            <div className="pt-4 border-t border-white/10">
              <Button 
                onClick={handleSaveStripe} 
                disabled={saving} 
                className="btn-primary"
                data-testid="save-stripe-btn"
              >
                <Save size={18} className="mr-2" />
                {saving ? "Saving..." : "Save Stripe Settings"}
              </Button>
            </div>

            <div className="mt-6 p-4 bg-[#2A2A2A] rounded-lg">
              <h4 className="text-white font-medium mb-2">Payment Status</h4>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${stripeSettings.stripe_api_key ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <span className="text-white/70 text-sm">
                  {stripeSettings.stripe_api_key 
                    ? "Stripe is configured and ready to receive payments" 
                    : "Add your Stripe API key to start receiving payments"}
                </span>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsManager;
