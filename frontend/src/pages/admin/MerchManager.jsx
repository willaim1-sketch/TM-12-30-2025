import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { Plus, Edit, Trash2, Save, ShoppingBag } from "lucide-react";
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

const categories = [
  { id: "apparel", name: "Apparel" },
  { id: "drinkware", name: "Drinkware" },
  { id: "accessories", name: "Accessories" },
  { id: "souvenirs", name: "Souvenirs" }
];

const MerchManager = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    image_url: "",
    category: "apparel",
    sizes: "S, M, L, XL",
    is_featured: false
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await axios.get(`${API}/admin/merch/items`, { withCredentials: true });
      setItems(response.data);
    } catch (error) {
      toast.error("Failed to load merch items");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.price) {
      toast.error("Please fill in name and price");
      return;
    }

    const data = {
      ...form,
      price: parseFloat(form.price),
      sizes: form.sizes.split(",").map(s => s.trim()).filter(Boolean)
    };

    try {
      if (editing) {
        await axios.put(`${API}/admin/merch/items/${editing.item_id}`, data, { withCredentials: true });
        toast.success("Merch item updated");
      } else {
        await axios.post(`${API}/admin/merch/items`, data, { withCredentials: true });
        toast.success("Merch item created");
      }

      setShowDialog(false);
      resetForm();
      fetchItems();
    } catch (error) {
      toast.error("Failed to save merch item");
    }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm("Delete this merch item?")) return;

    try {
      await axios.delete(`${API}/admin/merch/items/${itemId}`, { withCredentials: true });
      toast.success("Merch item deleted");
      fetchItems();
    } catch (error) {
      toast.error("Failed to delete merch item");
    }
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description || "",
      price: item.price.toString(),
      image_url: item.image_url || "",
      category: item.category || "apparel",
      sizes: (item.sizes || []).join(", "),
      is_featured: item.is_featured || false
    });
    setShowDialog(true);
  };

  const resetForm = () => {
    setEditing(null);
    setForm({
      name: "", description: "", price: "", image_url: "",
      category: "apparel", sizes: "S, M, L, XL", is_featured: false
    });
  };

  if (loading) {
    return <div className="text-white">Loading merch...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Merch Shop</h1>
          <p className="text-white/60 mt-1">{items.length} items in store</p>
        </div>
        <Button 
          onClick={() => { resetForm(); setShowDialog(true); }}
          className="btn-primary"
          data-testid="add-merch-btn"
        >
          <Plus size={18} className="mr-2" />
          Add Item
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 card-dark">
          <ShoppingBag className="mx-auto mb-4 text-white/60" size={48} />
          <p className="text-white/60 mb-4">No merch items yet</p>
          <Button onClick={() => { resetForm(); setShowDialog(true); }} className="btn-primary">
            Add Your First Merch Item
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((item) => (
            <motion.div
              key={item.item_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-dark overflow-hidden"
            >
              <div className="aspect-square bg-[#2A2A2A] overflow-hidden">
                <img
                  src={item.image_url || "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400"}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-white font-semibold line-clamp-1">{item.name}</h3>
                    <p className="text-red-500 font-bold">${item.price.toFixed(2)}</p>
                  </div>
                  {item.is_featured && (
                    <Badge className="bg-red-600 text-white text-xs">Featured</Badge>
                  )}
                </div>
                <p className="text-white/60 text-sm mb-2 line-clamp-2">{item.description}</p>
                <div className="flex flex-wrap gap-1 mb-4">
                  <Badge className="bg-[#3A3A3A] text-white/70 text-xs">{item.category}</Badge>
                  {item.sizes?.slice(0, 3).map((size, idx) => (
                    <Badge key={idx} className="bg-[#2A2A2A] text-white/60 text-xs">{size}</Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => openEdit(item)}
                    variant="outline"
                    size="sm"
                    className="flex-1 btn-secondary"
                    data-testid={`edit-merch-${item.item_id}`}
                  >
                    <Edit size={14} className="mr-1" />
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleDelete(item.item_id)}
                    variant="destructive"
                    size="sm"
                    data-testid={`delete-merch-${item.item_id}`}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Merch Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-[#1A1A1A] border-white/10 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editing ? 'Edit Merch Item' : 'Add Merch Item'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <Label className="text-white/70">Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                className="input-dark mt-1"
                placeholder="Super Dooper T-Shirt"
                data-testid="merch-name-input"
              />
            </div>

            <div>
              <Label className="text-white/70">Price *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm(prev => ({ ...prev, price: e.target.value }))}
                className="input-dark mt-1"
                placeholder="24.99"
                data-testid="merch-price-input"
              />
            </div>

            <div>
              <Label className="text-white/70">Category</Label>
              <Select
                value={form.category}
                onValueChange={(value) => setForm(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger className="input-dark mt-1" data-testid="merch-category-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-white/10">
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id} className="text-white">
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white/70">Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                className="input-dark mt-1"
                placeholder="Product description..."
                data-testid="merch-description-input"
              />
            </div>

            <div>
              <Label className="text-white/70">Image URL</Label>
              <Input
                value={form.image_url}
                onChange={(e) => setForm(prev => ({ ...prev, image_url: e.target.value }))}
                className="input-dark mt-1"
                placeholder="https://..."
                data-testid="merch-image-input"
              />
              {form.image_url && (
                <img src={form.image_url} alt="Preview" className="mt-4 w-full h-32 object-cover rounded-lg" />
              )}
            </div>

            <div>
              <Label className="text-white/70">Sizes (comma separated)</Label>
              <Input
                value={form.sizes}
                onChange={(e) => setForm(prev => ({ ...prev, sizes: e.target.value }))}
                className="input-dark mt-1"
                placeholder="S, M, L, XL, 2XL"
                data-testid="merch-sizes-input"
              />
              <p className="text-white/50 text-xs mt-1">For one-size items, enter "One Size"</p>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_featured}
                onCheckedChange={(checked) => setForm(prev => ({ ...prev, is_featured: checked }))}
                data-testid="merch-featured-switch"
              />
              <Label className="text-white/70">Featured item</Label>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-white/10">
              <Button variant="outline" onClick={() => setShowDialog(false)} className="btn-secondary">
                Cancel
              </Button>
              <Button onClick={handleSave} className="btn-primary" data-testid="save-merch-btn">
                <Save size={18} className="mr-2" />
                {editing ? 'Update' : 'Add'} Item
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MerchManager;
