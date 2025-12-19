import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { ArrowLeft, Plus, Minus } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const MenuPage = () => {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesRes, itemsRes] = await Promise.all([
          axios.get(`${API}/menu/categories`),
          axios.get(`${API}/menu/items`)
        ]);

        setCategories(categoriesRes.data);
        setItems(itemsRes.data);
        if (categoriesRes.data.length > 0) {
          setActiveCategory(categoriesRes.data[0].category_id);
        }
      } catch (error) {
        console.error("Error fetching menu:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Load cart from localStorage
    const savedCart = localStorage.getItem("tamaleCart");
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, []);

  const filteredItems = activeCategory 
    ? items.filter(item => item.category_id === activeCategory)
    : items;

  const addToCart = (item) => {
    const existingItem = cart.find(i => i.item_id === item.item_id);
    let newCart;
    
    if (existingItem) {
      newCart = cart.map(i => 
        i.item_id === item.item_id 
          ? { ...i, quantity: i.quantity + 1 }
          : i
      );
    } else {
      newCart = [...cart, { 
        item_id: item.item_id, 
        name: item.name, 
        price: item.price, 
        quantity: 1 
      }];
    }
    
    setCart(newCart);
    localStorage.setItem("tamaleCart", JSON.stringify(newCart));
  };

  const removeFromCart = (itemId) => {
    const existingItem = cart.find(i => i.item_id === itemId);
    let newCart;
    
    if (existingItem && existingItem.quantity > 1) {
      newCart = cart.map(i => 
        i.item_id === itemId 
          ? { ...i, quantity: i.quantity - 1 }
          : i
      );
    } else {
      newCart = cart.filter(i => i.item_id !== itemId);
    }
    
    setCart(newCart);
    localStorage.setItem("tamaleCart", JSON.stringify(newCart));
  };

  const getCartQuantity = (itemId) => {
    const item = cart.find(i => i.item_id === itemId);
    return item ? item.quantity : 0;
  };

  const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading menu...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="glass border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors" data-testid="menu-back-btn">
            <ArrowLeft size={20} />
            <span>Back</span>
          </Link>
          <h1 className="text-xl font-display font-bold text-white">Our Menu</h1>
          <Link to="/order" className="relative" data-testid="menu-cart-btn">
            <Button className="btn-primary">
              Cart ({cartCount}) - ${cartTotal.toFixed(2)}
            </Button>
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Category Tabs */}
        <div className="flex gap-4 overflow-x-auto pb-4 mb-12 scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category.category_id}
              onClick={() => setActiveCategory(category.category_id)}
              className={`px-6 py-3 rounded-md whitespace-nowrap transition-all duration-300 ${
                activeCategory === category.category_id
                  ? "bg-red-600 text-white"
                  : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800"
              }`}
              data-testid={`category-tab-${category.category_id}`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Menu Items Grid */}
        <motion.div
          key={activeCategory}
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredItems.map((item) => {
            const quantity = getCartQuantity(item.item_id);
            
            return (
              <motion.div
                key={item.item_id}
                variants={fadeInUp}
                className="card-dark overflow-hidden group"
                data-testid={`menu-item-${item.item_id}`}
              >
                <div className="aspect-[4/3] overflow-hidden relative">
                  <img
                    src={item.image_url || "https://images.unsplash.com/photo-1582170090097-b251ddbbf7f3?w=400"}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  {item.is_featured && (
                    <Badge className="absolute top-4 left-4 bg-red-600 text-white">
                      Chef's Pick
                    </Badge>
                  )}
                </div>
                
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-display font-bold text-white">{item.name}</h3>
                    <span className="text-red-500 font-bold text-lg">${item.price.toFixed(2)}</span>
                  </div>
                  
                  <p className="text-slate-400 text-sm mb-4 line-clamp-2">{item.description}</p>
                  
                  {/* Toppings */}
                  {item.toppings && item.toppings.length > 0 && (
                    <div className="mb-4">
                      <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Add-ons</p>
                      <div className="flex flex-wrap gap-2">
                        {item.toppings.map((topping, idx) => (
                          <span key={idx} className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">
                            {topping.name} +${topping.price?.toFixed(2)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Add to Cart */}
                  <div className="flex items-center justify-between mt-4">
                    {quantity > 0 ? (
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => removeFromCart(item.item_id)}
                          className="p-2 bg-slate-800 rounded-md hover:bg-slate-700 transition-colors"
                          data-testid={`remove-${item.item_id}`}
                        >
                          <Minus size={18} className="text-white" />
                        </button>
                        <span className="text-white font-semibold w-8 text-center">{quantity}</span>
                        <button
                          onClick={() => addToCart(item)}
                          className="p-2 bg-slate-800 rounded-md hover:bg-slate-700 transition-colors"
                          data-testid={`add-${item.item_id}`}
                        >
                          <Plus size={18} className="text-white" />
                        </button>
                      </div>
                    ) : (
                      <Button 
                        onClick={() => addToCart(item)}
                        className="btn-primary w-full"
                        data-testid={`add-to-cart-${item.item_id}`}
                      >
                        Add to Cart
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Empty State */}
        {filteredItems.length === 0 && (
          <div className="text-center py-20">
            <p className="text-slate-400 text-lg">No items in this category yet.</p>
          </div>
        )}
      </div>

      {/* Floating Cart Button (Mobile) */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 left-6 right-6 md:hidden">
          <Link to="/order">
            <Button className="btn-primary w-full py-4 text-lg animate-pulse-glow" data-testid="mobile-checkout-btn">
              Checkout ({cartCount}) - ${cartTotal.toFixed(2)}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default MenuPage;
