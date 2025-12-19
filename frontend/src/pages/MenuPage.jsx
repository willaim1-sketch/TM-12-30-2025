import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { ArrowLeft, Plus, Minus, Star, Share2, Facebook, Twitter, Copy, X, Check } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

// Share Modal Component
const ShareModal = ({ item, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/menu?item=${item?.item_id}`;
  const shareText = `Check out ${item?.name} at The Tamale Man! 🌽`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copied to clipboard!");
  };

  const shareToFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`, '_blank');
  };

  const shareToTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: item?.name,
          text: shareText,
          url: shareUrl
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    }
  };

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1A1A1A] border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Share {item.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Item Preview */}
          <div className="flex gap-4 p-4 bg-[#2A2A2A] rounded-lg">
            <img 
              src={item.image_url || "https://images.unsplash.com/photo-1582170090097-b251ddbbf7f3?w=100"} 
              alt={item.name}
              className="w-20 h-20 object-cover rounded-lg"
            />
            <div>
              <h4 className="text-white font-semibold">{item.name}</h4>
              <p className="text-red-500 font-bold">${item.price?.toFixed(2)}</p>
              <p className="text-white/60 text-base line-clamp-2">{item.description}</p>
            </div>
          </div>

          {/* Share Options */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={shareToFacebook}
              className="flex flex-col items-center gap-2 p-4 bg-[#2A2A2A] rounded-lg hover:bg-red-600/20 transition-colors"
              data-testid="share-facebook"
            >
              <Facebook className="text-red-500" size={24} />
              <span className="text-white/80 text-base">Facebook</span>
            </button>
            <button
              onClick={shareToTwitter}
              className="flex flex-col items-center gap-2 p-4 bg-[#2A2A2A] rounded-lg hover:bg-red-600/20 transition-colors"
              data-testid="share-twitter"
            >
              <Twitter className="text-red-400" size={24} />
              <span className="text-white/80 text-base">Twitter</span>
            </button>
            {navigator.share && (
              <button
                onClick={shareNative}
                className="flex flex-col items-center gap-2 p-4 bg-[#2A2A2A] rounded-lg hover:bg-[#3A3A3A] transition-colors"
                data-testid="share-native"
              >
                <Share2 className="text-white/60" size={24} />
                <span className="text-white/80 text-base">More</span>
              </button>
            )}
          </div>

          {/* Copy Link */}
          <div className="flex gap-2">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 bg-[#2A2A2A] border border-white/20 rounded-lg px-3 py-2 text-white/80 text-base"
            />
            <Button onClick={handleCopy} className="btn-primary" data-testid="copy-link-btn">
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Rating Component
const RatingStars = ({ item, onRate }) => {
  const [hoveredRating, setHoveredRating] = useState(0);
  const [userRated, setUserRated] = useState(false);

  const handleRate = async (rating) => {
    try {
      const response = await axios.post(`${API}/menu/items/${item.item_id}/rate`, { rating });
      onRate(item.item_id, response.data.average_rating, response.data.rating_count);
      setUserRated(true);
      toast.success("Thanks for rating!");
    } catch (error) {
      toast.error("Failed to submit rating");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => !userRated && handleRate(star)}
            onMouseEnter={() => !userRated && setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            disabled={userRated}
            className={`transition-transform ${!userRated ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}
            data-testid={`rate-star-${star}`}
          >
            <Star 
              size={16} 
              className={`${
                (hoveredRating || item.average_rating || 0) >= star 
                  ? 'text-yellow-500 fill-yellow-500' 
                  : 'text-white/30'
              } transition-colors`}
            />
          </button>
        ))}
      </div>
      {item.rating_count > 0 && (
        <span className="text-white/60 text-sm">
          ({item.average_rating?.toFixed(1)}) {item.rating_count} ratings
        </span>
      )}
    </div>
  );
};

// Item Detail Modal
const ItemDetailModal = ({ item, isOpen, onClose, onAddToCart, cartQuantity, onUpdateQuantity }) => {
  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1A1A1A] border-white/10 max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="relative">
          <img 
            src={item.image_url || "https://images.unsplash.com/photo-1582170090097-b251ddbbf7f3?w=600"} 
            alt={item.name}
            className="w-full h-64 object-cover rounded-lg"
          />
          {item.is_featured && (
            <Badge className="absolute top-4 left-4 bg-red-600 text-white">Chef's Pick</Badge>
          )}
        </div>

        <div className="space-y-4 mt-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-display font-bold text-white">{item.name}</h2>
              <p className="text-red-500 font-bold text-xl">${item.price?.toFixed(2)}</p>
            </div>
          </div>

          <p className="text-white/80 text-lg">{item.description}</p>

          {/* Toppings */}
          {item.toppings && item.toppings.length > 0 && (
            <div>
              <h4 className="text-white font-semibold mb-2">Available Add-ons</h4>
              <div className="flex flex-wrap gap-2">
                {item.toppings.map((topping, idx) => (
                  <span key={idx} className="text-base text-white/80 bg-[#2A2A2A] px-3 py-1 rounded-full">
                    {topping.name} +${topping.price?.toFixed(2)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Image dimensions note */}
          <p className="text-white/40 text-sm">
            Image size: 600 x 450px (4:3 ratio recommended)
          </p>

          {/* Add to Cart */}
          <div className="flex gap-4 pt-4 border-t border-white/10">
            {cartQuantity > 0 ? (
              <div className="flex items-center gap-4 flex-1">
                <button
                  onClick={() => onUpdateQuantity(item.item_id, -1)}
                  className="p-3 bg-[#2A2A2A] rounded-lg hover:bg-[#3A3A3A] transition-colors"
                >
                  <Minus size={20} className="text-white" />
                </button>
                <span className="text-white font-semibold text-xl w-12 text-center">{cartQuantity}</span>
                <button
                  onClick={() => onUpdateQuantity(item.item_id, 1)}
                  className="p-3 bg-[#2A2A2A] rounded-lg hover:bg-[#3A3A3A] transition-colors"
                >
                  <Plus size={20} className="text-white" />
                </button>
              </div>
            ) : (
              <Button onClick={() => onAddToCart(item)} className="btn-primary flex-1 py-3">
                Add to Cart
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const MenuPage = () => {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shareItem, setShareItem] = useState(null);
  const [detailItem, setDetailItem] = useState(null);

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
    toast.success(`${item.name} added to cart`);
  };

  const updateQuantity = (itemId, delta) => {
    const existingItem = cart.find(i => i.item_id === itemId);
    let newCart;
    
    if (existingItem && existingItem.quantity + delta <= 0) {
      newCart = cart.filter(i => i.item_id !== itemId);
    } else if (existingItem) {
      newCart = cart.map(i => 
        i.item_id === itemId 
          ? { ...i, quantity: i.quantity + delta }
          : i
      );
    } else {
      return;
    }
    
    setCart(newCart);
    localStorage.setItem("tamaleCart", JSON.stringify(newCart));
  };

  const getCartQuantity = (itemId) => {
    const item = cart.find(i => i.item_id === itemId);
    return item ? item.quantity : 0;
  };

  const updateItemRating = (itemId, avgRating, count) => {
    setItems(prev => prev.map(item => 
      item.item_id === itemId 
        ? { ...item, average_rating: avgRating, rating_count: count }
        : item
    ));
  };

  const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-white text-2xl">Loading menu...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <header className="glass border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-lg" data-testid="menu-back-btn">
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
              className={`px-6 py-3 rounded-md whitespace-nowrap transition-all duration-300 text-lg ${
                activeCategory === category.category_id
                  ? "bg-red-600 text-white"
                  : "bg-[#1A1A1A] text-white/60 hover:bg-[#2A2A2A] hover:text-white border border-white/10"
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
                <div 
                  className="aspect-[4/3] overflow-hidden relative cursor-pointer"
                  onClick={() => setDetailItem(item)}
                >
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
                  {/* Share button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setShareItem(item); }}
                    className="absolute top-4 right-4 p-2 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                    data-testid={`share-${item.item_id}`}
                  >
                    <Share2 size={18} className="text-white" />
                  </button>
                  {/* Image size overlay on hover */}
                  <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 rounded text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                    600 x 450px
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 
                      className="text-xl font-display font-bold text-white cursor-pointer hover:text-red-500 transition-colors"
                      onClick={() => setDetailItem(item)}
                    >
                      {item.name}
                    </h3>
                    <span className="text-red-500 font-bold text-lg">${item.price.toFixed(2)}</span>
                  </div>
                  
                  <p className="text-white/60 text-base mb-3 line-clamp-2">{item.description}</p>
                  
                  {/* Rating */}
                  <div className="mb-4">
                    <RatingStars item={item} onRate={updateItemRating} />
                  </div>
                  
                  {/* Toppings */}
                  {item.toppings && item.toppings.length > 0 && (
                    <div className="mb-4">
                      <p className="text-white/50 text-sm uppercase tracking-wider mb-1">Add-ons</p>
                      <div className="flex flex-wrap gap-2">
                        {item.toppings.slice(0, 2).map((topping, idx) => (
                          <span key={idx} className="text-sm text-white/60 bg-[#2A2A2A] px-2 py-1 rounded">
                            {topping.name} +${topping.price?.toFixed(2)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Add to Cart */}
                  <div className="flex items-center justify-between mt-4">
                    {quantity > 0 ? (
                      <div className="flex items-center gap-4 w-full justify-between">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => updateQuantity(item.item_id, -1)}
                            className="p-2 bg-[#2A2A2A] rounded-md hover:bg-[#3A3A3A] transition-colors"
                            data-testid={`remove-${item.item_id}`}
                          >
                            <Minus size={18} className="text-white" />
                          </button>
                          <span className="text-white font-semibold w-8 text-center">{quantity}</span>
                          <button
                            onClick={() => addToCart(item)}
                            className="p-2 bg-[#2A2A2A] rounded-md hover:bg-[#3A3A3A] transition-colors"
                            data-testid={`add-${item.item_id}`}
                          >
                            <Plus size={18} className="text-white" />
                          </button>
                        </div>
                        <button
                          onClick={() => setShareItem(item)}
                          className="p-2 text-white/60 hover:text-red-500 transition-colors"
                        >
                          <Share2 size={18} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2 w-full">
                        <Button 
                          onClick={() => addToCart(item)}
                          className="btn-primary flex-1"
                          data-testid={`add-to-cart-${item.item_id}`}
                        >
                          Add to Cart
                        </Button>
                        <button
                          onClick={() => setShareItem(item)}
                          className="p-3 bg-slate-800 rounded-md hover:bg-slate-700 transition-colors"
                        >
                          <Share2 size={18} className="text-slate-400" />
                        </button>
                      </div>
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

      {/* Share Modal */}
      <ShareModal 
        item={shareItem} 
        isOpen={!!shareItem} 
        onClose={() => setShareItem(null)} 
      />

      {/* Item Detail Modal */}
      <ItemDetailModal
        item={detailItem}
        isOpen={!!detailItem}
        onClose={() => setDetailItem(null)}
        onAddToCart={addToCart}
        cartQuantity={detailItem ? getCartQuantity(detailItem.item_id) : 0}
        onUpdateQuantity={updateQuantity}
      />
    </div>
  );
};

export default MenuPage;
