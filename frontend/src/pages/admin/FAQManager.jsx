import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { Plus, Edit, Trash2, Save, GripVertical } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Switch } from "../../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const FAQManager = () => {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    question: "",
    answer: "",
    category: "general",
    display_order: 0
  });

  useEffect(() => {
    fetchFaqs();
  }, []);

  const fetchFaqs = async () => {
    try {
      const response = await axios.get(`${API}/admin/faq`, { withCredentials: true });
      setFaqs(response.data);
    } catch (error) {
      toast.error("Failed to load FAQs");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.question || !form.answer) {
      toast.error("Please fill in question and answer");
      return;
    }

    try {
      if (editing) {
        await axios.put(`${API}/admin/faq/${editing.faq_id}`, form, { withCredentials: true });
        toast.success("FAQ updated");
      } else {
        await axios.post(`${API}/admin/faq`, form, { withCredentials: true });
        toast.success("FAQ created");
      }

      setShowDialog(false);
      resetForm();
      fetchFaqs();
    } catch (error) {
      toast.error("Failed to save FAQ");
    }
  };

  const handleDelete = async (faqId) => {
    if (!window.confirm("Delete this FAQ?")) return;

    try {
      await axios.delete(`${API}/admin/faq/${faqId}`, { withCredentials: true });
      toast.success("FAQ deleted");
      fetchFaqs();
    } catch (error) {
      toast.error("Failed to delete FAQ");
    }
  };

  const handleToggleActive = async (faq) => {
    try {
      await axios.put(`${API}/admin/faq/${faq.faq_id}`, 
        { is_active: !faq.is_active }, 
        { withCredentials: true }
      );
      toast.success(faq.is_active ? "FAQ hidden" : "FAQ visible");
      fetchFaqs();
    } catch (error) {
      toast.error("Failed to update FAQ");
    }
  };

  const openEdit = (faq) => {
    setEditing(faq);
    setForm({
      question: faq.question,
      answer: faq.answer,
      category: faq.category || "general",
      display_order: faq.display_order || 0
    });
    setShowDialog(true);
  };

  const resetForm = () => {
    setEditing(null);
    setForm({ question: "", answer: "", category: "general", display_order: 0 });
  };

  const categoryLabels = {
    general: "General",
    dietary: "Dietary",
    ordering: "Ordering",
    parking: "Parking & Location"
  };

  if (loading) {
    return <div className="text-white">Loading FAQs...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-display font-bold text-white">FAQ Manager</h1>
        <Button 
          onClick={() => { resetForm(); setShowDialog(true); }}
          className="btn-primary"
          data-testid="add-faq-btn"
        >
          <Plus size={18} className="mr-2" />
          Add FAQ
        </Button>
      </div>

      {faqs.length === 0 ? (
        <div className="text-center py-20 card-dark">
          <p className="text-slate-400 mb-4">No FAQs yet</p>
          <Button onClick={() => { resetForm(); setShowDialog(true); }} className="btn-primary">
            Add Your First FAQ
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={faq.faq_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`card-dark p-6 ${!faq.is_active ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start gap-4">
                <div className="text-slate-600 cursor-grab">
                  <GripVertical size={20} />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-slate-500 text-sm">#{faq.display_order}</span>
                    <Badge className="bg-slate-700 text-slate-300">
                      {categoryLabels[faq.category] || faq.category}
                    </Badge>
                    {!faq.is_active && (
                      <Badge className="bg-slate-600">Hidden</Badge>
                    )}
                  </div>
                  <h3 className="text-white font-semibold mb-2">{faq.question}</h3>
                  <p className="text-slate-400 text-sm">{faq.answer}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={faq.is_active}
                    onCheckedChange={() => handleToggleActive(faq)}
                    data-testid={`toggle-faq-${faq.faq_id}`}
                  />
                  <Button
                    onClick={() => openEdit(faq)}
                    variant="outline"
                    size="sm"
                    className="btn-secondary"
                    data-testid={`edit-faq-${faq.faq_id}`}
                  >
                    <Edit size={14} />
                  </Button>
                  <Button
                    onClick={() => handleDelete(faq.faq_id)}
                    variant="destructive"
                    size="sm"
                    data-testid={`delete-faq-${faq.faq_id}`}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* FAQ Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editing ? 'Edit FAQ' : 'Add FAQ'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <Label className="text-slate-300">Question *</Label>
              <Input
                value={form.question}
                onChange={(e) => setForm(prev => ({ ...prev, question: e.target.value }))}
                className="input-dark mt-1"
                placeholder="What would customers ask?"
                data-testid="faq-question-input"
              />
            </div>

            <div>
              <Label className="text-slate-300">Answer *</Label>
              <Textarea
                value={form.answer}
                onChange={(e) => setForm(prev => ({ ...prev, answer: e.target.value }))}
                className="input-dark mt-1 min-h-[120px]"
                placeholder="Provide a helpful answer..."
                data-testid="faq-answer-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(value) => setForm(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger className="input-dark mt-1" data-testid="faq-category-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800">
                    <SelectItem value="general" className="text-white">General</SelectItem>
                    <SelectItem value="dietary" className="text-white">Dietary</SelectItem>
                    <SelectItem value="ordering" className="text-white">Ordering</SelectItem>
                    <SelectItem value="parking" className="text-white">Parking & Location</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-slate-300">Display Order</Label>
                <Input
                  type="number"
                  value={form.display_order}
                  onChange={(e) => setForm(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                  className="input-dark mt-1"
                  data-testid="faq-order-input"
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-slate-800">
              <Button variant="outline" onClick={() => setShowDialog(false)} className="btn-secondary">
                Cancel
              </Button>
              <Button onClick={handleSave} className="btn-primary" data-testid="save-faq-btn">
                <Save size={18} className="mr-2" />
                {editing ? 'Update FAQ' : 'Add FAQ'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FAQManager;
