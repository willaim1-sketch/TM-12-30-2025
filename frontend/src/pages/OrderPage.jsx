import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { ArrowLeft, Trash2, Plus, Minus, CreditCard, CheckCircle, Copy, Check, Square, CheckSquare } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

// Payment method icons/logos
const PaymentMethodIcon = ({ type, size = 24 }) => {
  switch (type) {
    case 'stripe':
      return <CreditCard className="text-white" size={size} />;
    case 'paypal':
      return (
        <div className={`bg-[#003087] rounded flex items-center justify-center`} style={{ width: size, height: size }}>
          <span className="text-white font-bold" style={{ fontSize: size * 0.5 }}>PP</span>
        </div>
      );
    case 'venmo':
      return (
        <div className={`bg-[#3D95CE] rounded flex items-center justify-center`} style={{ width: size, height: size }}>
          <span className="text-white font-bold" style={{ fontSize: size * 0.5 }}>V</span>
        </div>
      );
    case 'cashapp':
      return (
        <div className={`bg-[#00D632] rounded flex items-center justify-center`} style={{ width: size, height: size }}>
          <span className="text-white font-bold" style={{ fontSize: size * 0.5 }}>$</span>
        </div>
      );
    default:
      return <CreditCard className="text-white" size={size} />;
  }
};

// Generate payment URL for QR code
const getPaymentUrl = (type, info) => {
  switch (type) {
    case 'paypal':
      return `https://paypal.me/${info.email?.split('@')[0] || info.email}/${info.total?.toFixed(2)}`;
    case 'venmo':
      return `https://venmo.com/${info.username}?txn=pay&amount=${info.total?.toFixed(2)}&note=Order%20${info.orderId}`;
    case 'cashapp':
      return `https://cash.app/$${info.cashtag}/${info.total?.toFixed(2)}`;
    default:
      return '';
  }
};

const OrderPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState('stripe');
  const [showManualPaymentDialog, setShowManualPaymentDialog] = useState(false);
  const [manualPaymentInfo, setManualPaymentInfo] = useState(null);
  const [orderPlaced, setOrderPlaced] = useState(false); // Track if order was placed successfully
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

    // Fetch available payment methods
    fetchPaymentMethods();

    // Check if order was cancelled
    if (searchParams.get("cancelled") === "true") {
      toast.error("Order was cancelled. Please try again.");
    }
  }, [searchParams]);

  const fetchPaymentMethods = async () => {
    try {
      const response = await axios.get(`${API}/payment-methods`);
      setPaymentMethods(response.data);
      // Default to stripe if available, otherwise first method
      if (response.data.length > 0) {
        const stripeMethod = response.data.find(m => m.type === 'stripe');
        setSelectedPayment(stripeMethod ? 'stripe' : response.data[0].type);
      }
    } catch (error) {
      console.error("Failed to fetch payment methods");
    }
  };

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
        payment_method: selectedPayment,
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

      // Handle different payment methods
      if (selectedPayment === 'stripe' && response.data.checkout_url) {
        // Clear cart and redirect to Stripe
        localStorage.removeItem("tamaleCart");
        window.location.href = response.data.checkout_url;
      } else if (['paypal', 'venmo', 'cashapp'].includes(selectedPayment)) {
        // Show manual payment instructions
        const method = paymentMethods.find(m => m.type === selectedPayment);
        
        // Set order as placed BEFORE clearing cart to prevent empty cart screen
        setOrderPlaced(true);
        
        setManualPaymentInfo({
          type: selectedPayment,
          orderId: response.data.order_id,
          total: total,
          ...method
        });
        setShowManualPaymentDialog(true);
        
        // Clear cart from localStorage (but keep state for display purposes)
        localStorage.removeItem("tamaleCart");
      }
    } catch (error) {
      console.error("Order error:", error);
      toast.error("Failed to create order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
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

              {/* Payment Method Selection */}
              {paymentMethods.length > 0 && (
                <div className="card-dark p-8">
                  <h2 className="text-2xl font-display font-bold text-white mb-2">Select Payment Method</h2>
                  <p className="text-white/60 mb-6">Choose how you'd like to pay for your order</p>
                  
                  <div className="space-y-3">
                    {paymentMethods.map((method) => {
                      const isSelected = selectedPayment === method.type;
                      return (
                        <button
                          key={method.type}
                          type="button"
                          onClick={() => setSelectedPayment(method.type)}
                          className={`w-full flex items-center gap-4 p-5 rounded-xl border-2 transition-all ${
                            isSelected
                              ? 'border-red-600 bg-red-600/20 shadow-lg shadow-red-600/20'
                              : 'border-white/20 bg-[#1A1A1A] hover:border-white/40 hover:bg-[#222]'
                          }`}
                        >
                          {/* Checkbox */}
                          <div className={`w-7 h-7 rounded-md border-2 flex items-center justify-center transition-all ${
                            isSelected 
                              ? 'bg-red-600 border-red-600' 
                              : 'border-white/40 bg-transparent'
                          }`}>
                            {isSelected && <Check className="text-white" size={18} strokeWidth={3} />}
                          </div>
                          
                          {/* Icon */}
                          <PaymentMethodIcon type={method.type} size={32} />
                          
                          {/* Label */}
                          <div className="flex-1 text-left">
                            <span className={`font-semibold text-lg ${isSelected ? 'text-white' : 'text-white/80'}`}>
                              {method.name}
                            </span>
                            {method.type === 'stripe' && (
                              <p className="text-white/50 text-sm">Visa, Mastercard, Amex, etc.</p>
                            )}
                            {method.type === 'paypal' && method.email && (
                              <p className="text-white/50 text-sm">{method.email}</p>
                            )}
                            {method.type === 'venmo' && method.username && (
                              <p className="text-white/50 text-sm">@{method.username}</p>
                            )}
                            {method.type === 'cashapp' && method.cashtag && (
                              <p className="text-white/50 text-sm">${method.cashtag}</p>
                            )}
                          </div>
                          
                          {/* Selected Badge */}
                          {isSelected && (
                            <span className="px-3 py-1 bg-red-600 text-white text-sm font-semibold rounded-full">
                              SELECTED
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* Selected Payment Summary */}
                  <div className="mt-6 p-4 bg-[#2A2A2A] rounded-lg border border-white/10">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="text-green-500" size={20} />
                      <span className="text-white">
                        You will pay with: <strong>{paymentMethods.find(m => m.type === selectedPayment)?.name || 'Credit Card'}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button (Desktop) */}
              <div className="hidden lg:block">
                <Button 
                  type="submit" 
                  className="btn-primary w-full py-4 text-lg animate-pulse-glow"
                  disabled={loading}
                  data-testid="submit-order-btn"
                >
                  <PaymentMethodIcon type={selectedPayment} />
                  <span className="ml-2">{loading ? "Processing..." : `Place Order - $${total.toFixed(2)}`}</span>
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
            <PaymentMethodIcon type={selectedPayment} />
            <span className="ml-2">{loading ? "Processing..." : `Place Order - $${total.toFixed(2)}`}</span>
          </Button>
        </div>

        {/* Manual Payment Dialog */}
        <Dialog open={showManualPaymentDialog} onOpenChange={setShowManualPaymentDialog}>
          <DialogContent className="bg-[#1A1A1A] border-white/10 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-3">
                <PaymentMethodIcon type={manualPaymentInfo?.type} />
                <span>Complete Your Payment</span>
              </DialogTitle>
            </DialogHeader>

            {manualPaymentInfo && (
              <div className="space-y-6">
                {/* Order Confirmation */}
                <div className="bg-green-950/50 border border-green-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-400 mb-2">
                    <CheckCircle size={20} />
                    <span className="font-semibold">Order Placed Successfully!</span>
                  </div>
                  <p className="text-white/60 text-sm">Order ID: {manualPaymentInfo.orderId}</p>
                </div>

                {/* Payment Amount */}
                <div className="text-center py-4 bg-[#2A2A2A] rounded-lg">
                  <p className="text-white/60 text-sm mb-1">Amount to Pay</p>
                  <p className="text-4xl font-bold text-red-500">${manualPaymentInfo.total?.toFixed(2)}</p>
                </div>

                {/* QR Code Section */}
                <div className="flex flex-col items-center bg-white rounded-xl p-6">
                  <p className="text-gray-700 text-sm mb-3 font-medium">Scan to Pay</p>
                  <QRCodeSVG
                    value={getPaymentUrl(manualPaymentInfo.type, manualPaymentInfo)}
                    size={180}
                    level="H"
                    includeMargin={true}
                    bgColor="#FFFFFF"
                    fgColor="#000000"
                  />
                  <p className="text-gray-500 text-xs mt-3 text-center">
                    Scan with your {manualPaymentInfo.type === 'paypal' ? 'PayPal' : manualPaymentInfo.type === 'venmo' ? 'Venmo' : 'Cash App'} app
                  </p>
                </div>

                {/* Payment Instructions */}
                <div className="space-y-4">
                  {manualPaymentInfo.type === 'paypal' && (
                    <>
                      <p className="text-white/70 text-center">Or send payment manually to:</p>
                      <div className="flex items-center gap-2 bg-[#2A2A2A] rounded-lg p-4">
                        <span className="text-white font-mono flex-1">{manualPaymentInfo.email}</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => copyToClipboard(manualPaymentInfo.email)}
                          className="text-white/60 hover:text-white"
                        >
                          <Copy size={18} />
                        </Button>
                      </div>
                      <a 
                        href={`https://paypal.me/${manualPaymentInfo.email?.split('@')[0]}/${manualPaymentInfo.total?.toFixed(2)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full"
                      >
                        <Button className="w-full bg-[#003087] hover:bg-[#002060] text-white">
                          Open PayPal
                        </Button>
                      </a>
                    </>
                  )}

                  {manualPaymentInfo.type === 'venmo' && (
                    <>
                      <p className="text-white/70 text-center">Or send payment manually to:</p>
                      <div className="flex items-center gap-2 bg-[#2A2A2A] rounded-lg p-4">
                        <span className="text-white font-mono flex-1">@{manualPaymentInfo.username}</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => copyToClipboard(`@${manualPaymentInfo.username}`)}
                          className="text-white/60 hover:text-white"
                        >
                          <Copy size={18} />
                        </Button>
                      </div>
                      <a 
                        href={`https://venmo.com/${manualPaymentInfo.username}?txn=pay&amount=${manualPaymentInfo.total?.toFixed(2)}&note=Order%20${manualPaymentInfo.orderId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full"
                      >
                        <Button className="w-full bg-[#3D95CE] hover:bg-[#2D85BE] text-white">
                          Open Venmo
                        </Button>
                      </a>
                    </>
                  )}

                  {manualPaymentInfo.type === 'cashapp' && (
                    <>
                      <p className="text-white/70 text-center">Or send payment manually to:</p>
                      <div className="flex items-center gap-2 bg-[#2A2A2A] rounded-lg p-4">
                        <span className="text-white font-mono flex-1">${manualPaymentInfo.cashtag}</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => copyToClipboard(`$${manualPaymentInfo.cashtag}`)}
                          className="text-white/60 hover:text-white"
                        >
                          <Copy size={18} />
                        </Button>
                      </div>
                      <a 
                        href={`https://cash.app/$${manualPaymentInfo.cashtag}/${manualPaymentInfo.total?.toFixed(2)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full"
                      >
                        <Button className="w-full bg-[#00D632] hover:bg-[#00B62A] text-white">
                          Open Cash App
                        </Button>
                      </a>
                    </>
                  )}
                </div>

                {/* Important Note */}
                <div className="bg-yellow-950/50 border border-yellow-700 rounded-lg p-4">
                  <p className="text-yellow-200 text-sm">
                    <strong>Important:</strong> Please include your order ID ({manualPaymentInfo.orderId}) in the payment note so we can match your payment.
                  </p>
                </div>

                {/* Done Button */}
                <Button 
                  onClick={() => {
                    setShowManualPaymentDialog(false);
                    navigate('/');
                    toast.success("Thank you! We'll confirm your order once payment is received.");
                  }}
                  className="w-full btn-primary"
                >
                  Done
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default OrderPage;
