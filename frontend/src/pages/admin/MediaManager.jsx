import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { Plus, Trash2, Copy, Image, Wand2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const MediaManager = () => {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState({
    url: "",
    filename: "",
    alt_text: ""
  });
  const [generatePrompt, setGeneratePrompt] = useState("");

  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    try {
      const response = await axios.get(`${API}/admin/media`, { withCredentials: true });
      setMedia(response.data);
    } catch (error) {
      toast.error("Failed to load media");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!form.url) {
      toast.error("Please enter an image URL");
      return;
    }

    try {
      await axios.post(`${API}/admin/media`, {
        url: form.url,
        filename: form.filename || "image",
        file_type: "image",
        alt_text: form.alt_text
      }, { withCredentials: true });

      toast.success("Media added");
      setShowDialog(false);
      setForm({ url: "", filename: "", alt_text: "" });
      fetchMedia();
    } catch (error) {
      toast.error("Failed to add media");
    }
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
        const imageUrl = `data:image/png;base64,${response.data.image_base64}`;
        setForm(prev => ({ ...prev, url: imageUrl, filename: "ai-generated" }));
        toast.success("Image generated!");
      }
    } catch (error) {
      toast.error("Failed to generate image");
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (mediaId) => {
    if (!window.confirm("Delete this image?")) return;

    try {
      await axios.delete(`${API}/admin/media/${mediaId}`, { withCredentials: true });
      toast.success("Media deleted");
      fetchMedia();
    } catch (error) {
      toast.error("Failed to delete media");
    }
  };

  const copyUrl = (url) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copied to clipboard");
  };

  if (loading) {
    return <div className="text-white">Loading media...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-display font-bold text-white">Media Library</h1>
        <Button 
          onClick={() => setShowDialog(true)}
          className="btn-primary"
          data-testid="add-media-btn"
        >
          <Plus size={18} className="mr-2" />
          Add Media
        </Button>
      </div>

      {media.length === 0 ? (
        <div className="text-center py-20 card-dark">
          <Image className="mx-auto mb-4 text-slate-400" size={48} />
          <p className="text-slate-400 mb-4">No media files yet</p>
          <Button onClick={() => setShowDialog(true)} className="btn-primary">
            Add Your First Image
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {media.map((item) => (
            <motion.div
              key={item.media_id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card-dark overflow-hidden group"
            >
              <div className="aspect-square bg-slate-800 relative">
                <img
                  src={item.url}
                  alt={item.alt_text || item.filename}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    onClick={() => copyUrl(item.url)}
                    variant="outline"
                    size="sm"
                    className="bg-slate-800 border-slate-600 text-white"
                    data-testid={`copy-url-${item.media_id}`}
                  >
                    <Copy size={14} />
                  </Button>
                  <Button
                    onClick={() => handleDelete(item.media_id)}
                    variant="destructive"
                    size="sm"
                    data-testid={`delete-media-${item.media_id}`}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
              <div className="p-3">
                <p className="text-white text-sm truncate">{item.filename}</p>
                <p className="text-slate-500 text-xs truncate">{item.alt_text || 'No alt text'}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Media Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Add Media</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* AI Generation */}
            <div className="p-4 bg-slate-800 rounded-lg">
              <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Wand2 size={18} className="text-red-500" />
                AI Image Generation
              </h4>
              <div className="flex gap-2">
                <Input
                  value={generatePrompt}
                  onChange={(e) => setGeneratePrompt(e.target.value)}
                  placeholder="Describe the image you want..."
                  className="input-dark flex-1"
                  data-testid="generate-prompt-input"
                />
                <Button
                  onClick={handleGenerateImage}
                  disabled={generating}
                  className="btn-primary"
                  data-testid="generate-media-btn"
                >
                  {generating ? "Generating..." : "Generate"}
                </Button>
              </div>
            </div>

            <div className="text-center text-slate-400">— or add URL —</div>

            <div>
              <Label className="text-slate-300">Image URL</Label>
              <Input
                value={form.url}
                onChange={(e) => setForm(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://..."
                className="input-dark mt-1"
                data-testid="media-url-input"
              />
            </div>

            <div>
              <Label className="text-slate-300">Filename</Label>
              <Input
                value={form.filename}
                onChange={(e) => setForm(prev => ({ ...prev, filename: e.target.value }))}
                placeholder="my-image"
                className="input-dark mt-1"
                data-testid="media-filename-input"
              />
            </div>

            <div>
              <Label className="text-slate-300">Alt Text (for SEO)</Label>
              <Input
                value={form.alt_text}
                onChange={(e) => setForm(prev => ({ ...prev, alt_text: e.target.value }))}
                placeholder="Description of the image"
                className="input-dark mt-1"
                data-testid="media-alt-input"
              />
            </div>

            {form.url && (
              <div className="border border-slate-800 rounded-lg overflow-hidden">
                <img src={form.url} alt="Preview" className="w-full h-48 object-cover" />
              </div>
            )}

            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={() => setShowDialog(false)} className="btn-secondary">
                Cancel
              </Button>
              <Button onClick={handleAdd} className="btn-primary" data-testid="save-media-btn">
                Add to Library
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MediaManager;
