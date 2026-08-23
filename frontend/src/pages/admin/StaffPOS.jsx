import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { 
  Plus, Minus, ShoppingCart, Search, X, DollarSign, 
  Printer, CheckCircle, User, Phone, MapPin, CreditCard,
  Package, Edit2, Image
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { toast } from "sonner";
import { AuthContext } from "../../App";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";

const API = process.env.REACT_APP_BACKEND_URL;

const StaffPOS = () => {
  const { user } = useContext(AuthContext);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Customer info
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  
  // Custom item modal
  const [showCustomItem, setShowCustomItem] = useState(false);
  const [customItem, setCustomItem] = useState({ name: "", price: "", quantity: 1 });
  
  // Order confirmation
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);

  useEffect(() => {
    fetchMenuData();
    // Log page visit
    logPageVisit();
  }, []);

  const logPageVisit = async () => {
    try {
      await axios.post(`${API}/api/admin/log-activity`, {
        page: "/admin/pos",
        action: "view"
      }, { withCredentials: true });
    } catch (error) {
      // Silent fail for activity logging
    }
  };

  const fetchMenuData = async () => {
    try {
      const [itemsRes, catsRes] = await Promise.all([
        axios.get(`${API}/api/menu/items`, { withCredentials: true }),
        axios.get(`${API}/api/menu/categories`, { withCredentials: true })
      ]);
      setMenuItems(itemsRes.data.filter(item => item.available !== false));
      setCategories(catsRes.data);
    } catch (error) {
      toast.error("Failed to load menu");
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i.item_id === item.item_id && !i.isCustom);
      if (existing) {
        return prev.map(i => 
          i.item_id === item.item_id && !i.isCustom
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { ...item, quantity: 1, cart_id: Date.now() }];
    });
    toast.success(`Added ${item.name}`);
  };

  const updateQuantity = (cartId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.cart_id === cartId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (cartId) => {
    setCart(prev => prev.filter(item => item.cart_id !== cartId));
  };

  const addCustomItem = () => {
    if (!customItem.name || !customItem.price) {
      toast.error("Please enter name and price");
      return;
    }
    const price = parseFloat(customItem.price);
    if (isNaN(price) || price <= 0) {
      toast.error("Please enter a valid price");
      return;
    }
    setCart(prev => [...prev, {
      cart_id: Date.now(),
      item_id: `custom_${Date.now()}`,
      name: customItem.name,
      price: price,
      quantity: customItem.quantity || 1,
      isCustom: true
    }]);
    setCustomItem({ name: "", price: "", quantity: 1 });
    setShowCustomItem(false);
    toast.success(`Added custom item: ${customItem.name}`);
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.0825;
  const total = subtotal + tax;

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    try {
      const orderData = {
        items: cart.map(item => ({
          item_id: item.item_id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          isCustom: item.isCustom || false
        })),
        customer_info: {
          name: customerName || "Walk-in Customer",
          phone: customerPhone || "",
          email: customerEmail || ""
        },
        notes: orderNotes,
        payment_method: "manual",
        placed_by_staff: user?.user_id,
        staff_name: user?.name || user?.email
      };

      const response = await axios.post(`${API}/api/orders/create`, orderData, { 
        withCredentials: true 
      });

      setLastOrder(response.data);
      setShowConfirmation(true);
      
      // Clear cart and customer info
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setOrderNotes("");
      
      toast.success("Order placed successfully!");
    } catch (error) {
      toast.error("Failed to place order");
      console.error(error);
    }
  };

  const printOrder = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Quick Order (POS)</h1>
          <p className="text-white/60">Create orders quickly for walk-in customers</p>
        </div>
        <Button onClick={() => setShowCustomItem(true)} className="bg-green-600 hover:bg-green-700">
          <Plus size={18} className="mr-2" />
          Custom Item
        </Button>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Menu Items - Left Side */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Search and Categories */}
          <div className="space-y-3 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search menu items..."
                className="input-dark pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  selectedCategory === "all" 
                    ? "bg-red-500 text-white" 
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                }`}
              >
                All Items
              </button>
              {categories.map(cat => (
                <button
                  key={cat.category_id}
                  onClick={() => setSelectedCategory(cat.category_id)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    selectedCategory === cat.category_id 
                      ? "bg-red-500 text-white" 
                      : "bg-white/10 text-white/70 hover:bg-white/20"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Menu Grid - Spreadsheet Style */}
          <div className="flex-1 overflow-auto bg-[#1A1A1A] rounded-lg border border-white/10">
            <table className="w-full">
              <thead className="sticky top-0 bg-[#2A2A2A] border-b border-white/10">
                <tr>
                  <th className="text-left p-3 text-white/70 font-medium w-16">Image</th>
                  <th className="text-left p-3 text-white/70 font-medium">Item</th>
                  <th className="text-left p-3 text-white/70 font-medium w-24">Price</th>
                  <th className="text-center p-3 text-white/70 font-medium w-20">Add</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => (
                  <tr 
                    key={item.item_id} 
                    className="border-b border-white/5 hover:bg-white/5 cursor-pointer"
                    onClick={() => addToCart(item)}
                  >
                    <td className="p-2">
                      {item.image ? (
                        <img 
                          src={item.image.startsWith('/api') ? `${API}${item.image}` : item.image} 
                          alt={item.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-white/10 rounded flex items-center justify-center">
                          <Package size={20} className="text-white/30" />
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="text-white font-medium">{item.name}</div>
                      <div className="text-white/50 text-sm truncate max-w-xs">{item.description}</div>
                    </td>
                    <td className="p-3 text-green-400 font-medium">${item.price?.toFixed(2)}</td>
                    <td className="p-3 text-center">
                      <button 
                        className="p-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                        onClick={(e) => { e.stopPropagation(); addToCart(item); }}
                      >
                        <Plus size={18} className="text-white" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-white/50">
                      No items found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cart - Right Side */}
        <div className="w-96 flex flex-col bg-[#1A1A1A] rounded-lg border border-white/10">
          {/* Cart Header */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center gap-2 text-white font-semibold">
              <ShoppingCart size={20} />
              <span>Current Order</span>
              <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {cart.length} items
              </span>
            </div>
          </div>

          {/* Customer Info */}
          <div className="p-4 border-b border-white/10 space-y-3">
            <div className="flex items-center gap-2">
              <User size={16} className="text-white/50" />
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer Name (optional)"
                className="input-dark text-sm h-8"
                data-testid="pos-customer-name"
              />
            </div>
            <div className="flex items-center gap-2">
              <Phone size={16} className="text-white/50" />
              <Input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Phone (optional)"
                className="input-dark text-sm h-8"
                data-testid="pos-customer-phone"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/50 text-sm">@</span>
              <Input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="Email Address (optional)"
                className="input-dark text-sm h-8"
                data-testid="pos-customer-email"
              />
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-auto p-4 space-y-2">
            {cart.length === 0 ? (
              <div className="text-center text-white/50 py-8">
                <ShoppingCart size={32} className="mx-auto mb-2 opacity-50" />
                <p>Cart is empty</p>
                <p className="text-sm">Click items to add</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.cart_id} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">
                      {item.name}
                      {item.isCustom && <span className="text-yellow-400 text-xs ml-1">(Custom)</span>}
                    </div>
                    <div className="text-white/50 text-xs">${item.price.toFixed(2)} each</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQuantity(item.cart_id, -1)}
                      className="p-1 hover:bg-white/10 rounded"
                    >
                      <Minus size={14} className="text-white/70" />
                    </button>
                    <span className="w-6 text-center text-white text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.cart_id, 1)}
                      className="p-1 hover:bg-white/10 rounded"
                    >
                      <Plus size={14} className="text-white/70" />
                    </button>
                  </div>
                  <div className="text-green-400 text-sm font-medium w-16 text-right">
                    ${(item.price * item.quantity).toFixed(2)}
                  </div>
                  <button
                    onClick={() => removeFromCart(item.cart_id)}
                    className="p-1 hover:bg-red-500/20 rounded text-red-400"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Order Notes */}
          <div className="p-4 border-t border-white/10">
            <Textarea
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder="Order notes (optional)"
              className="input-dark text-sm h-16 resize-none"
            />
          </div>

          {/* Totals */}
          <div className="p-4 border-t border-white/10 space-y-2">
            <div className="flex justify-between text-white/70 text-sm">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-white/70 text-sm">
              <span>Tax (8.25%)</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-white font-bold text-lg pt-2 border-t border-white/10">
              <span>Total</span>
              <span className="text-green-400">${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-white/10">
            <Button
              onClick={handlePlaceOrder}
              disabled={cart.length === 0}
              className="w-full btn-primary h-12 text-lg"
            >
              <CreditCard size={20} className="mr-2" />
              Place Order
            </Button>
          </div>
        </div>
      </div>

      {/* Custom Item Modal */}
      <Dialog open={showCustomItem} onOpenChange={setShowCustomItem}>
        <DialogContent className="bg-[#1A1A1A] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Add Custom Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Item Name</Label>
              <Input
                value={customItem.name}
                onChange={(e) => setCustomItem(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Special Request Item"
                className="input-dark mt-1"
              />
            </div>
            <div>
              <Label>Price ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={customItem.price}
                onChange={(e) => setCustomItem(prev => ({ ...prev, price: e.target.value }))}
                placeholder="0.00"
                className="input-dark mt-1"
              />
            </div>
            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                min="1"
                value={customItem.quantity}
                onChange={(e) => setCustomItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                className="input-dark mt-1"
              />
            </div>
            <Button onClick={addCustomItem} className="w-full btn-primary">
              Add to Order
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Confirmation Modal */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="bg-[#1A1A1A] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-400">
              <CheckCircle size={24} />
              Order Placed Successfully!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {lastOrder && (
              <>
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-white/70 text-sm">Order ID</p>
                  <p className="text-white font-mono text-lg">{lastOrder.order_id}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-white/70 text-sm">Total</p>
                  <p className="text-green-400 text-2xl font-bold">${lastOrder.total?.toFixed(2)}</p>
                </div>
              </>
            )}
            <div className="flex gap-3">
              <Button onClick={printOrder} variant="outline" className="flex-1 border-white/20">
                <Printer size={18} className="mr-2" />
                Print
              </Button>
              <Button onClick={() => setShowConfirmation(false)} className="flex-1 btn-primary">
                New Order
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffPOS;
