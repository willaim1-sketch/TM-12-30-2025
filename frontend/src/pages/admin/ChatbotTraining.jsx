import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bot, Plus, Trash2, Edit2, Save, X, Search, 
  BookOpen, MessageSquare, FileText, HelpCircle, 
  Tag, ToggleLeft, ToggleRight, Sparkles, Brain
} from "lucide-react";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import { Badge } from "../../components/ui/badge";
import { Switch } from "../../components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { toast } from "sonner";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL;

const CATEGORIES = [
  { value: "general", label: "General Info", icon: FileText, color: "bg-blue-600" },
  { value: "menu", label: "Menu & Food", icon: BookOpen, color: "bg-green-600" },
  { value: "catering", label: "Catering", icon: MessageSquare, color: "bg-purple-600" },
  { value: "policies", label: "Policies", icon: HelpCircle, color: "bg-yellow-600" },
  { value: "hours", label: "Hours & Location", icon: Tag, color: "bg-red-600" },
  { value: "faq", label: "FAQ", icon: HelpCircle, color: "bg-orange-600" },
];

const ChatbotTraining = () => {
  const [knowledge, setKnowledge] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "general",
    is_active: true,
  });

  useEffect(() => {
    fetchKnowledge();
  }, []);

  const fetchKnowledge = async () => {
    try {
      const response = await axios.get(`${API}/api/admin/chatbot/knowledge`, {
        withCredentials: true,
      });
      setKnowledge(response.data || []);
    } catch (error) {
      toast.error("Failed to fetch knowledge base");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error("Title and content are required");
      return;
    }

    try {
      if (editingEntry) {
        await axios.put(
          `${API}/api/admin/chatbot/knowledge/${editingEntry.knowledge_id}`,
          formData,
          { withCredentials: true }
        );
        toast.success("Knowledge updated successfully");
      } else {
        await axios.post(`${API}/api/admin/chatbot/knowledge`, formData, {
          withCredentials: true,
        });
        toast.success("Knowledge added successfully");
      }
      fetchKnowledge();
      closeDialog();
    } catch (error) {
      toast.error("Failed to save knowledge");
    }
  };

  const handleDelete = async (knowledgeId) => {
    if (!window.confirm("Are you sure you want to delete this knowledge entry?")) return;

    try {
      await axios.delete(`${API}/api/admin/chatbot/knowledge/${knowledgeId}`, {
        withCredentials: true,
      });
      setKnowledge((prev) => prev.filter((k) => k.knowledge_id !== knowledgeId));
      toast.success("Knowledge deleted");
    } catch (error) {
      toast.error("Failed to delete knowledge");
    }
  };

  const toggleActive = async (entry) => {
    try {
      await axios.put(
        `${API}/api/admin/chatbot/knowledge/${entry.knowledge_id}`,
        { is_active: !entry.is_active },
        { withCredentials: true }
      );
      setKnowledge((prev) =>
        prev.map((k) =>
          k.knowledge_id === entry.knowledge_id ? { ...k, is_active: !k.is_active } : k
        )
      );
      toast.success(entry.is_active ? "Knowledge deactivated" : "Knowledge activated");
    } catch (error) {
      toast.error("Failed to update knowledge");
    }
  };

  const openDialog = (entry = null) => {
    if (entry) {
      setEditingEntry(entry);
      setFormData({
        title: entry.title,
        content: entry.content,
        category: entry.category,
        is_active: entry.is_active,
      });
    } else {
      setEditingEntry(null);
      setFormData({
        title: "",
        content: "",
        category: "general",
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingEntry(null);
    setFormData({ title: "", content: "", category: "general", is_active: true });
  };

  const filteredKnowledge = knowledge.filter((entry) => {
    const matchesSearch =
      entry.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.content?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || entry.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getCategoryInfo = (categoryValue) => {
    return CATEGORIES.find((c) => c.value === categoryValue) || CATEGORIES[0];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
      </div>
    );
  }

  return (
    <div data-testid="chatbot-training">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
            <Brain className="text-red-500" />
            Chatbot Training (RAG)
          </h1>
          <p className="text-white/60 mt-1">
            Add knowledge to make your chatbot smarter. {knowledge.length} entries total.
          </p>
        </div>
        <Button onClick={() => openDialog()} className="btn-primary" data-testid="add-knowledge-btn">
          <Plus size={18} className="mr-2" />
          Add Knowledge
        </Button>
      </div>

      {/* Info Card */}
      <div className="card-dark p-5 mb-6 border-l-4 border-l-yellow-500">
        <div className="flex items-start gap-3">
          <Sparkles className="text-yellow-500 flex-shrink-0 mt-1" size={20} />
          <div>
            <h3 className="text-white font-semibold mb-1">How RAG Training Works</h3>
            <p className="text-white/70 text-sm">
              Add information below that your chatbot should know. This could be business hours, 
              special policies, catering details, or answers to common questions. The AI will 
              use this knowledge to give better, more accurate responses to customers.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
          <Input
            type="text"
            placeholder="Search knowledge base..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-dark pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[200px] input-dark">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent className="bg-[#1A1A1A] border-white/10">
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Knowledge List */}
      {filteredKnowledge.length === 0 ? (
        <div className="card-dark p-12 text-center">
          <Bot className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h3 className="text-xl text-white mb-2">No knowledge entries yet</h3>
          <p className="text-white/60 mb-4">
            {searchTerm || categoryFilter !== "all"
              ? "Try adjusting your filters"
              : "Start training your chatbot by adding knowledge entries"}
          </p>
          <Button onClick={() => openDialog()} className="btn-primary">
            <Plus size={18} className="mr-2" />
            Add Your First Entry
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredKnowledge.map((entry) => {
            const categoryInfo = getCategoryInfo(entry.category);
            const CategoryIcon = categoryInfo.icon;
            return (
              <motion.div
                key={entry.knowledge_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`card-dark p-5 ${!entry.is_active ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className={`${categoryInfo.color} text-white`}>
                        <CategoryIcon size={12} className="mr-1" />
                        {categoryInfo.label}
                      </Badge>
                      {!entry.is_active && (
                        <Badge className="bg-gray-600 text-white">Inactive</Badge>
                      )}
                    </div>
                    <h3 className="text-white font-semibold text-lg mb-2">{entry.title}</h3>
                    <p className="text-white/70 text-sm line-clamp-3 whitespace-pre-wrap">
                      {entry.content}
                    </p>
                    <p className="text-white/40 text-xs mt-3">
                      Updated: {new Date(entry.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDialog(entry)}
                        className="text-white/60 hover:text-white"
                      >
                        <Edit2 size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(entry.knowledge_id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                    <button
                      onClick={() => toggleActive(entry)}
                      className="flex items-center gap-2 text-sm text-white/60 hover:text-white"
                    >
                      {entry.is_active ? (
                        <ToggleRight size={24} className="text-green-500" />
                      ) : (
                        <ToggleLeft size={24} className="text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[#1A1A1A] border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Brain className="text-red-500" />
              {editingEntry ? "Edit Knowledge" : "Add Knowledge"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 mt-4">
            {/* Title */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Title / Topic <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Catering Minimum Order, Business Hours, Special Dietary Options"
                className="input-dark"
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Category
              </label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="input-dark">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-white/10">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <SelectItem key={cat.value} value={cat.value}>
                        <div className="flex items-center gap-2">
                          <Icon size={14} />
                          {cat.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Content */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Knowledge Content <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter the information your chatbot should know about this topic. Be specific and clear. For example:

'Our minimum catering order is $200. We require 48 hours advance notice for catering orders. We can accommodate groups of up to 200 people.'"
                className="input-dark min-h-[200px] resize-none"
                required
              />
              <p className="text-white/40 text-xs mt-1">
                Tip: Be specific and include actual numbers, policies, or facts the chatbot should reference.
              </p>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between bg-white/5 rounded-lg p-4">
              <div>
                <p className="text-white font-medium">Active</p>
                <p className="text-white/60 text-sm">
                  When active, this knowledge will be used by the chatbot
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button type="button" onClick={closeDialog} className="btn-secondary flex-1">
                Cancel
              </Button>
              <Button type="submit" className="btn-primary flex-1">
                <Save size={16} className="mr-2" />
                {editingEntry ? "Update" : "Add"} Knowledge
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatbotTraining;
