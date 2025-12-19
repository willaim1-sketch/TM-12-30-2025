import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { Plus, Edit, Trash2, Save, Star } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Switch } from "../../components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TestimonialManager = () => {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    author_name: "",
    author_title: "",
    content: "",
    rating: 5,
    is_featured: false
  });

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async () => {
    try {
      const response = await axios.get(`${API}/admin/testimonials`, { withCredentials: true });
      setTestimonials(response.data);
    } catch (error) {
      toast.error("Failed to load testimonials");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.author_name || !form.content) {
      toast.error("Please fill in author name and content");
      return;
    }

    try {
      if (editing) {
        await axios.put(`${API}/admin/testimonials/${editing.testimonial_id}`, form, { withCredentials: true });
        toast.success("Testimonial updated");
      } else {
        await axios.post(`${API}/admin/testimonials`, form, { withCredentials: true });
        toast.success("Testimonial created");
      }

      setShowDialog(false);
      resetForm();
      fetchTestimonials();
    } catch (error) {
      toast.error("Failed to save testimonial");
    }
  };

  const handleDelete = async (testimonialId) => {
    if (!window.confirm("Delete this testimonial?")) return;

    try {
      await axios.delete(`${API}/admin/testimonials/${testimonialId}`, { withCredentials: true });
      toast.success("Testimonial deleted");
      fetchTestimonials();
    } catch (error) {
      toast.error("Failed to delete testimonial");
    }
  };

  const openEdit = (testimonial) => {
    setEditing(testimonial);
    setForm({
      author_name: testimonial.author_name,
      author_title: testimonial.author_title || "",
      content: testimonial.content,
      rating: testimonial.rating || 5,
      is_featured: testimonial.is_featured || false
    });
    setShowDialog(true);
  };

  const resetForm = () => {
    setEditing(null);
    setForm({ author_name: "", author_title: "", content: "", rating: 5, is_featured: false });
  };

  if (loading) {
    return <div className="text-white">Loading testimonials...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-display font-bold text-white">Testimonials</h1>
        <Button 
          onClick={() => { resetForm(); setShowDialog(true); }}
          className="btn-primary"
          data-testid="add-testimonial-btn"
        >
          <Plus size={18} className="mr-2" />
          Add Testimonial
        </Button>
      </div>

      {testimonials.length === 0 ? (
        <div className="text-center py-20 card-dark">
          <Star className="mx-auto mb-4 text-slate-400" size={48} />
          <p className="text-slate-400 mb-4">No testimonials yet</p>
          <Button onClick={() => { resetForm(); setShowDialog(true); }} className="btn-primary">
            Add Your First Testimonial
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial) => (
            <motion.div
              key={testimonial.testimonial_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-dark p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      size={16} 
                      className={i < testimonial.rating ? "text-red-500 fill-red-500" : "text-slate-600"} 
                    />
                  ))}
                </div>
                {testimonial.is_featured && (
                  <Badge className="bg-red-600 text-white">Featured</Badge>
                )}
              </div>

              <p className="text-slate-300 italic mb-4 line-clamp-4">"{testimonial.content}"</p>

              <div className="mb-4">
                <p className="text-white font-semibold">{testimonial.author_name}</p>
                {testimonial.author_title && (
                  <p className="text-slate-500 text-sm">{testimonial.author_title}</p>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-800">
                <Button
                  onClick={() => openEdit(testimonial)}
                  variant="outline"
                  size="sm"
                  className="flex-1 btn-secondary"
                  data-testid={`edit-testimonial-${testimonial.testimonial_id}`}
                >
                  <Edit size={14} className="mr-1" />
                  Edit
                </Button>
                <Button
                  onClick={() => handleDelete(testimonial.testimonial_id)}
                  variant="destructive"
                  size="sm"
                  data-testid={`delete-testimonial-${testimonial.testimonial_id}`}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Testimonial Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editing ? 'Edit Testimonial' : 'Add Testimonial'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <Label className="text-slate-300">Author Name *</Label>
              <Input
                value={form.author_name}
                onChange={(e) => setForm(prev => ({ ...prev, author_name: e.target.value }))}
                className="input-dark mt-1"
                placeholder="John Doe"
                data-testid="testimonial-name-input"
              />
            </div>

            <div>
              <Label className="text-slate-300">Author Title (optional)</Label>
              <Input
                value={form.author_title}
                onChange={(e) => setForm(prev => ({ ...prev, author_title: e.target.value }))}
                className="input-dark mt-1"
                placeholder="Food Blogger, Local Regular, etc."
                data-testid="testimonial-title-input"
              />
            </div>

            <div>
              <Label className="text-slate-300">Testimonial Content *</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm(prev => ({ ...prev, content: e.target.value }))}
                className="input-dark mt-1 min-h-[120px]"
                placeholder="What did they say about your tamales?"
                data-testid="testimonial-content-input"
              />
            </div>

            <div>
              <Label className="text-slate-300">Rating</Label>
              <div className="flex gap-2 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, rating: star }))}
                    className="p-1"
                    data-testid={`rating-star-${star}`}
                  >
                    <Star 
                      size={24} 
                      className={star <= form.rating ? "text-red-500 fill-red-500" : "text-slate-600"} 
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_featured}
                onCheckedChange={(checked) => setForm(prev => ({ ...prev, is_featured: checked }))}
                data-testid="testimonial-featured-switch"
              />
              <Label className="text-slate-300">Feature on homepage</Label>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-slate-800">
              <Button variant="outline" onClick={() => setShowDialog(false)} className="btn-secondary">
                Cancel
              </Button>
              <Button onClick={handleSave} className="btn-primary" data-testid="save-testimonial-btn">
                <Save size={18} className="mr-2" />
                {editing ? 'Update' : 'Add'} Testimonial
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TestimonialManager;
