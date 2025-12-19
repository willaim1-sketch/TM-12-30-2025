import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { ArrowLeft, Trash2, Plus, Minus, CreditCard } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

const OrderPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    pickup_date: "",
    pickup_time: "",
    comments: ""
  });

  useEffect(() => {
    // Load cart from localStorage
    const savedCart = localStorage.getItem("tamaleCart");
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }

    // Check if order was cancelled
    if (searchParams.get("cancelled") === "true") {
      toast.error("Order was cancelled. Please try again.");
    }
  }, [searchParams]);

  const updateCart = (newCart) => {
    setCart(newCart);
    localStorage.setItem("tamaleCart", JSON.stringify(newCart));
  };

  const updateQuantity = (cartItemId, delta) => {
    const newCart = cart.map(item => {
      if ((item.cart_item_id || item.item_id) === cartItemId) {
        const newQuantity = item.quantity + delta;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : null;
      }
      return item;
    }).filter(Boolean);
    
    updateCart(newCart);
  };

  const removeItem = (cartItemId) => {
    const newCart = cart.filter(item => (item.cart_item_id || item.item_id) !== cartItemId);
    updateCart(newCart);
  };

  const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const tax = subtotal * 0.0825;
  const total = subtotal + tax;

  // Generate available dates (next 7 days)
  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  // Generate time slots
  const timeSlots = [
    "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
    "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM",
    "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM",
    "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM",
    "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM"
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (cart.length === 0) {
      toast.error("Your cart is empty!");
      return;
    }

    if (!formData.customer_name || !formData.customer_email || !formData.customer_phone || !formData.pickup_date || !formData.pickup_time) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setLoading(true);

    try {
      const orderData = {
        ...formData,
        items: cart.map(item => ({
          item_id: item.item_id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          toppings: item.toppings || [],
          meat_choice: item.meat_choice || null
        }))
      };

      const response = await axios.post(`${API}/orders/create`, orderData, {
        headers: {
          'Origin': window.location.origin
        }
      });

      // Clear cart
      localStorage.removeItem("tamaleCart");
      
      // Redirect to Stripe checkout
      if (response.data.checkout_url) {
        window.location.href = response.data.checkout_url;
      }
    } catch (error) {
      console.error("Order error:", error);
      toast.error("Failed to create order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0 && !searchParams.get("cancelled")) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h2 className="text-3xl font-display font-bold text-white mb-4">Your cart is empty</h2>
          <p className="text-white/60 mb-8">Add some delicious tamales to get started!</p>
          <Link to="/menu">
            <Button className="btn-primary" data-testid="browse-menu-btn">Browse Menu</Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <header className="glass border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/menu" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors" data-testid="order-back-btn">
            <ArrowLeft size={20} />
            <span>Back to Menu</span>
          </Link>
          <h1 className="text-xl font-display font-bold text-white">Checkout</h1>
          <div className="w-24"></div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-3 gap-12">
          {/* Order Form */}
          <div className="lg:col-span-2">
            <motion.form
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              onSubmit={handleSubmit}
              className="space-y-8"
            >
              {/* Contact Information */}
              <div className="card-dark p-8">
                <h2 className="text-2xl font-display font-bold text-white mb-6">Contact Information</h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="customer_name" className="text-white/70 mb-2 block">Full Name *</Label>
                    <Input
                      id="customer_name"
                      name="customer_name"
                      value={formData.customer_name}
                      onChange={handleInputChange}
                      className="input-dark"
                      placeholder="John Doe"
                      required
                      data-testid="input-name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="customer_email" className="text-white/70 mb-2 block">Email *</Label>
                    <Input
                      id="customer_email"
                      name="customer_email"
                      type="email"
                      value={formData.customer_email}
                      onChange={handleInputChange}
                      className="input-dark"
                      placeholder="john@example.com"
                      required
                      data-testid="input-email"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label htmlFor="customer_phone" className="text-white/70 mb-2 block">Phone *</Label>
                    <Input
                      id="customer_phone"
                      name="customer_phone"
                      type="tel"
                      value={formData.customer_phone}
                      onChange={handleInputChange}
                      className="input-dark"
                      placeholder="(555) 123-4567"
                      required
                      data-testid="input-phone"
                    />
                  </div>
                </div>
              </div>

              {/* Pickup Details */}
              <div className="card-dark p-8">
                <h2 className="text-2xl font-display font-bold text-white mb-6">Pickup Details</h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="pickup_date" className="text-white/70 mb-2 block">Pickup Date *</Label>
                    <Select onValueChange={(value) => handleSelectChange("pickup_date", value)} required>
                      <SelectTrigger className="input-dark" data-testid="select-date">
                        <SelectValue placeholder="Select date" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1A1A1A] border-white/10">
                        {getAvailableDates().map((date) => (
                          <SelectItem key={date} value={date} className="text-white hover:bg-[#2A2A2A]">
                            {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="pickup_time" className="text-white/70 mb-2 block">Pickup Time *</Label>
                    <Select onValueChange={(value) => handleSelectChange("pickup_time", value)} required>
                      <SelectTrigger className="input-dark" data-testid="select-time">
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1A1A1A] border-white/10">
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time} className="text-white hover:bg-[#2A2A2A]">
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Special Instructions */}
              <div className="card-dark p-8">
                <h2 className="text-2xl font-display font-bold text-white mb-6">Special Instructions</h2>
                <Textarea
                  name="comments"
                  value={formData.comments}
                  onChange={handleInputChange}
                  className="input-dark min-h-[120px]"
                  placeholder="Any dietary restrictions, allergies, or special requests?"
                  data-testid="input-comments"
                />
              </div>

              {/* Submit Button (Desktop) */}
              <div className="hidden lg:block">
                <Button 
                  type="submit" 
                  className="btn-primary w-full py-4 text-lg animate-pulse-glow"
                  disabled={loading}
                  data-testid="submit-order-btn"
                >
                  <CreditCard className="mr-2" size={20} />
                  {loading ? "Processing..." : `Pay $${total.toFixed(2)}`}
                </Button>
              </div>
            </motion.form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              className="card-dark p-6 sticky top-24"
            >
              <h2 className="text-2xl font-display font-bold text-white mb-6">Order Summary</h2>
              
              <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.cart_item_id || item.item_id} className="flex items-center gap-4 py-4 border-b border-white/10">
                    <div className="flex-1">
                      <h4 className="text-white font-semibold">{item.name}</h4>
                      {item.toppings && item.toppings.length > 0 && (
                        <p className="text-red-400 text-sm">
                          + {item.toppings.map(t => t.name).join(', ')}
                        </p>
                      )}
                      <p className="text-white/60 text-sm">${item.price.toFixed(2)} each</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.cart_item_id || item.item_id, -1)}
                        className="p-1 bg-[#2A2A2A] rounded hover:bg-[#3A3A3A] transition-colors"
                        data-testid={`qty-minus-${item.item_id}`}
                      >
                        <Minus size={14} className="text-white" />
                      </button>
                      <span className="text-white w-6 text-center">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.cart_item_id || item.item_id, 1)}
                        className="p-1 bg-[#2A2A2A] rounded hover:bg-[#3A3A3A] transition-colors"
                        data-testid={`qty-plus-${item.item_id}`}
                      >
                        <Plus size={14} className="text-white" />
                      </button>
                    </div>
                    
                    <span className="text-white font-semibold w-16 text-right">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                    
                    <button
                      type="button"
                      onClick={() => removeItem(item.cart_item_id || item.item_id)}
                      className="text-white/60 hover:text-red-500 transition-colors"
                      data-testid={`remove-item-${item.item_id}`}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-3 pt-4 border-t border-white/10">
                <div className="flex justify-between text-white/60">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-white/60">
                  <span>Tax (8.25%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-white pt-3 border-t border-white/10">
                  <span>Total</span>
                  <span className="text-red-500">${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Add More Items Link */}
              <Link to="/menu" className="block mt-6">
                <Button variant="outline" className="btn-secondary w-full" data-testid="add-more-btn">
                  Add More Items
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Submit Button (Mobile) */}
        <div className="fixed bottom-0 left-0 right-0 p-4 glass border-t border-white/5 lg:hidden">
          <Button 
            type="submit"
            onClick={handleSubmit}
            className="btn-primary w-full py-4 text-lg animate-pulse-glow"
            disabled={loading}
            data-testid="mobile-submit-order-btn"
          >
            <CreditCard className="mr-2" size={20} />
            {loading ? "Processing..." : `Pay $${total.toFixed(2)}`}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrderPage;
