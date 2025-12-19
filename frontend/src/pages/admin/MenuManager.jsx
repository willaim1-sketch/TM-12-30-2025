import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { Plus, Edit, Trash2, Save, X, ImagePlus, Wand2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Switch } from "../../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const MenuManager = () => {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [generatingImage, setGeneratingImage] = useState(false);

  const [itemForm, setItemForm] = useState({
    name: "", description: "", price: "", category_id: "",
    image_url: "", is_featured: false, toppings: [], meat_choices: []
  });

  const [categoryForm, setCategoryForm] = useState({
    name: "", description: "", display_order: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [catRes, itemsRes] = await Promise.all([
        axios.get(`${API}/admin/menu/categories`, { withCredentials: true }),
        axios.get(`${API}/admin/menu/items`, { withCredentials: true })
      ]);
      setCategories(catRes.data);
      setItems(itemsRes.data);
    } catch (error) {
      toast.error("Failed to load menu data");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!itemForm.name) {
      toast.error("Please enter an item name first");
      return;
    }

    setGeneratingImage(true);
    try {
      const response = await axios.post(
        `${API}/admin/generate-image`,
        { prompt: `A delicious gourmet ${itemForm.name} on a dark elegant plate, professional food photography, moody lighting` },
        { withCredentials: true }
      );

      if (response.data.image_base64) {
        const imageUrl = `data:image/png;base64,${response.data.image_base64}`;
        setItemForm(prev => ({ ...prev, image_url: imageUrl }));
        toast.success("Image generated!");
      }
    } catch (error) {
      toast.error("Failed to generate image");
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleSaveItem = async () => {
    if (!itemForm.name || !itemForm.price || !itemForm.category_id) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const data = {
        ...itemForm,
        price: parseFloat(itemForm.price)
      };

      if (editingItem) {
        await axios.put(`${API}/admin/menu/items/${editingItem.item_id}`, data, { withCredentials: true });
        toast.success("Item updated");
      } else {
        await axios.post(`${API}/admin/menu/items`, data, { withCredentials: true });
        toast.success("Item created");
      }

      setShowItemDialog(false);
      resetItemForm();
      fetchData();
    } catch (error) {
      toast.error("Failed to save item");
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;

    try {
      await axios.delete(`${API}/admin/menu/items/${itemId}`, { withCredentials: true });
      toast.success("Item deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete item");
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name) {
      toast.error("Please enter a category name");
      return;
    }

    try {
      if (editingCategory) {
        await axios.put(`${API}/admin/menu/categories/${editingCategory.category_id}`, categoryForm, { withCredentials: true });
        toast.success("Category updated");
      } else {
        await axios.post(`${API}/admin/menu/categories`, categoryForm, { withCredentials: true });
        toast.success("Category created");
      }

      setShowCategoryDialog(false);
      resetCategoryForm();
      fetchData();
    } catch (error) {
      toast.error("Failed to save category");
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm("Are you sure? This will affect all items in this category.")) return;

    try {
      await axios.delete(`${API}/admin/menu/categories/${categoryId}`, { withCredentials: true });
      toast.success("Category deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete category");
    }
  };

  const openEditItem = (item) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      category_id: item.category_id,
      image_url: item.image_url || "",
      is_featured: item.is_featured,
      toppings: item.toppings || [],
      meat_choices: item.meat_choices || []
    });
    setShowItemDialog(true);
  };

  const openEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description || "",
      display_order: category.display_order || 0
    });
    setShowCategoryDialog(true);
  };

  const resetItemForm = () => {
    setEditingItem(null);
    setItemForm({
      name: "", description: "", price: "", category_id: "",
      image_url: "", is_featured: false, toppings: [], meat_choices: []
    });
  };

  const resetCategoryForm = () => {
    setEditingCategory(null);
    setCategoryForm({ name: "", description: "", display_order: 0 });
  };

  if (loading) {
    return <div className="text-white">Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-display font-bold text-white">Menu Manager</h1>
        <div className="flex gap-4">
          <Button 
            onClick={() => { resetCategoryForm(); setShowCategoryDialog(true); }}
            variant="outline"
            className="btn-secondary"
            data-testid="add-category-btn"
          >
            <Plus size={18} className="mr-2" />
            Add Category
          </Button>
          <Button 
            onClick={() => { resetItemForm(); setShowItemDialog(true); }}
            className="btn-primary"
            data-testid="add-item-btn"
          >
            <Plus size={18} className="mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      <Tabs defaultValue="items" className="space-y-6">
        <TabsList className="bg-[#1A1A1A] border border-white/10">
          <TabsTrigger value="items" className="data-[state=active]:bg-red-600">Menu Items</TabsTrigger>
          <TabsTrigger value="categories" className="data-[state=active]:bg-red-600">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="items">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <motion.div
                key={item.item_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-dark overflow-hidden"
              >
                <div className="aspect-video bg-[#2A2A2A] overflow-hidden">
                  <img
                    src={item.image_url || "https://images.unsplash.com/photo-1582170090097-b251ddbbf7f3?w=400"}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-white font-semibold">{item.name}</h3>
                      <p className="text-red-500 font-bold">${item.price.toFixed(2)}</p>
                    </div>
                    {item.is_featured && (
                      <span className="text-xs bg-red-600 text-white px-2 py-1 rounded">Featured</span>
                    )}
                  </div>
                  <p className="text-white/60 text-sm line-clamp-2 mb-4">{item.description}</p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => openEditItem(item)}
                      variant="outline"
                      size="sm"
                      className="flex-1 btn-secondary"
                      data-testid={`edit-item-${item.item_id}`}
                    >
                      <Edit size={14} className="mr-1" />
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDeleteItem(item.item_id)}
                      variant="destructive"
                      size="sm"
                      data-testid={`delete-item-${item.item_id}`}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {items.length === 0 && (
            <div className="text-center py-20 card-dark">
              <p className="text-white/60 mb-4">No menu items yet</p>
              <Button onClick={() => { resetItemForm(); setShowItemDialog(true); }} className="btn-primary">
                Add Your First Item
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="categories">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <motion.div
                key={category.category_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-dark p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-white font-semibold text-lg">{category.name}</h3>
                    <p className="text-white/60 text-sm">Order: {category.display_order}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${category.is_active ? 'bg-green-600' : 'bg-white/30'} text-white`}>
                    {category.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-white/60 text-sm mb-4">{category.description || 'No description'}</p>
                <p className="text-white/50 text-sm mb-4">
                  {items.filter(i => i.category_id === category.category_id).length} items
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => openEditCategory(category)}
                    variant="outline"
                    size="sm"
                    className="flex-1 btn-secondary"
                    data-testid={`edit-category-${category.category_id}`}
                  >
                    <Edit size={14} className="mr-1" />
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleDeleteCategory(category.category_id)}
                    variant="destructive"
                    size="sm"
                    data-testid={`delete-category-${category.category_id}`}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>

          {categories.length === 0 && (
            <div className="text-center py-20 card-dark">
              <p className="text-white/60 mb-4">No categories yet</p>
              <Button onClick={() => { resetCategoryForm(); setShowCategoryDialog(true); }} className="btn-primary">
                Add Your First Category
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Item Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="bg-[#1A1A1A] border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-white/70">Name *</Label>
                <Input
                  value={itemForm.name}
                  onChange={(e) => setItemForm(prev => ({ ...prev, name: e.target.value }))}
                  className="input-dark mt-1"
                  placeholder="Pork Carnitas Tamale"
                  data-testid="item-name-input"
                />
              </div>
              <div>
                <Label className="text-white/70">Price *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={itemForm.price}
                  onChange={(e) => setItemForm(prev => ({ ...prev, price: e.target.value }))}
                  className="input-dark mt-1"
                  placeholder="4.99"
                  data-testid="item-price-input"
                />
              </div>
            </div>

            <div>
              <Label className="text-white/70">Category *</Label>
              <Select
                value={itemForm.category_id}
                onValueChange={(value) => setItemForm(prev => ({ ...prev, category_id: value }))}
              >
                <SelectTrigger className="input-dark mt-1" data-testid="item-category-select">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-white/10">
                  {categories.map((cat) => (
                    <SelectItem key={cat.category_id} value={cat.category_id} className="text-white">
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white/70">Description</Label>
              <Textarea
                value={itemForm.description}
                onChange={(e) => setItemForm(prev => ({ ...prev, description: e.target.value }))}
                className="input-dark mt-1 min-h-[100px]"
                placeholder="Describe this delicious item..."
                data-testid="item-description-input"
              />
            </div>

            <div>
              <Label className="text-white/70">Image</Label>
              <div className="mt-1 flex gap-4">
                <Input
                  value={itemForm.image_url}
                  onChange={(e) => setItemForm(prev => ({ ...prev, image_url: e.target.value }))}
                  className="input-dark flex-1"
                  placeholder="Image URL"
                  data-testid="item-image-input"
                />
                <Button
                  type="button"
                  onClick={handleGenerateImage}
                  disabled={generatingImage}
                  variant="outline"
                  className="btn-secondary"
                  data-testid="generate-image-btn"
                >
                  <Wand2 size={18} className="mr-2" />
                  {generatingImage ? 'Generating...' : 'AI Generate'}
                </Button>
              </div>
              {itemForm.image_url && (
                <img src={itemForm.image_url} alt="Preview" className="mt-4 w-full h-48 object-cover rounded-lg" />
              )}
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={itemForm.is_featured}
                onCheckedChange={(checked) => setItemForm(prev => ({ ...prev, is_featured: checked }))}
                data-testid="item-featured-switch"
              />
              <Label className="text-white/70">Featured item (shown on homepage)</Label>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-white/10">
              <Button variant="outline" onClick={() => setShowItemDialog(false)} className="btn-secondary">
                Cancel
              </Button>
              <Button onClick={handleSaveItem} className="btn-primary" data-testid="save-item-btn">
                <Save size={18} className="mr-2" />
                Save Item
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="bg-[#1A1A1A] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingCategory ? 'Edit Category' : 'Add Category'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-white/70">Name *</Label>
              <Input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                className="input-dark mt-1"
                placeholder="Signature Tamales"
                data-testid="category-name-input"
              />
            </div>

            <div>
              <Label className="text-white/70">Description</Label>
              <Textarea
                value={categoryForm.description}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                className="input-dark mt-1"
                placeholder="Category description..."
                data-testid="category-description-input"
              />
            </div>

            <div>
              <Label className="text-white/70">Display Order</Label>
              <Input
                type="number"
                value={categoryForm.display_order}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                className="input-dark mt-1"
                data-testid="category-order-input"
              />
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-white/10">
              <Button variant="outline" onClick={() => setShowCategoryDialog(false)} className="btn-secondary">
                Cancel
              </Button>
              <Button onClick={handleSaveCategory} className="btn-primary" data-testid="save-category-btn">
                <Save size={18} className="mr-2" />
                Save Category
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MenuManager;
