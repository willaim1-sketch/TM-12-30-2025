import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { ArrowLeft, ShoppingCart, Plus, Minus, Star, Truck } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

// Default merch items
const defaultMerchItems = [
  {
    item_id: "merch_tshirt_black",
    name: "Super Dooper Dooper T-Shirt - Black",
    description: "Classic black tee featuring our legendary Super Dooper Dooper Tamale design. 100% cotton, pre-shrunk.",
    price: 24.99,
    image_url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400",
    category: "apparel",
    sizes: ["S", "M", "L", "XL", "2XL"],
    is_featured: true
  },
  {
    item_id: "merch_tshirt_red",
    name: "The Tamale Man Logo Tee - Red",
    description: "Show your tamale pride with our signature red logo tee. Soft, comfortable, and ready to flex.",
    price: 24.99,
    image_url: "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400",
    category: "apparel",
    sizes: ["S", "M", "L", "XL", "2XL"],
    is_featured: true
  },
  {
    item_id: "merch_hoodie",
    name: "Tamale Man Hoodie",
    description: "Stay cozy with our premium hoodie. Features the Super Dooper Dooper Tamale on the back.",
    price: 49.99,
    image_url: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400",
    category: "apparel",
    sizes: ["S", "M", "L", "XL", "2XL"],
    is_featured: false
  },
  {
    item_id: "merch_cap",
    name: "Tamale Man Dad Cap",
    description: "Classic dad cap with embroidered Tamale Man logo. Adjustable strap, one size fits most.",
    price: 19.99,
    image_url: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400",
    category: "accessories",
    sizes: ["One Size"],
    is_featured: true
  },
  {
    item_id: "merch_mug",
    name: "Super Dooper Coffee Mug",
    description: "Start your morning right with our 12oz ceramic mug. Dishwasher and microwave safe.",
    price: 14.99,
    image_url: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400",
    category: "drinkware",
    sizes: ["12oz"],
    is_featured: true
  },
  {
    item_id: "merch_tumbler",
    name: "Tamale Man Tumbler",
    description: "20oz insulated tumbler keeps drinks hot or cold for hours. Perfect for on-the-go!",
    price: 29.99,
    image_url: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400",
    category: "drinkware",
    sizes: ["20oz"],
    is_featured: false
  },
  {
    item_id: "merch_keychain",
    name: "Tamale Keychain",
    description: "Cute tamale-shaped keychain. A little piece of The Tamale Man wherever you go!",
    price: 9.99,
    image_url: "https://images.unsplash.com/photo-1622547748225-3fc4abd2cca0?w=400",
    category: "souvenirs",
    sizes: ["One Size"],
    is_featured: false
  },
  {
    item_id: "merch_magnet",
    name: "Logo Fridge Magnet",
    description: "Decorate your fridge with The Tamale Man! Set of 3 magnets.",
    price: 12.99,
    image_url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400",
    category: "souvenirs",
    sizes: ["Set of 3"],
    is_featured: false
  },
  {
    item_id: "merch_tote",
    name: "Canvas Tote Bag",
    description: "Eco-friendly canvas tote with our logo. Perfect for groceries or everyday use.",
    price: 18.99,
    image_url: "https://images.unsplash.com/photo-1597633425046-08f5110420b5?w=400",
    category: "accessories",
    sizes: ["One Size"],
    is_featured: false
  },
  {
    item_id: "merch_sticker",
    name: "Sticker Pack",
    description: "Pack of 5 vinyl stickers featuring various Tamale Man designs. Waterproof!",
    price: 7.99,
    image_url: "https://images.unsplash.com/photo-1589384267710-7a170981ca78?w=400",
    category: "souvenirs",
    sizes: ["Pack of 5"],
    is_featured: false
  }
];

const categories = [
  { id: "all", name: "All Items" },
  { id: "apparel", name: "Apparel" },
  { id: "drinkware", name: "Drinkware" },
  { id: "accessories", name: "Accessories" },
  { id: "souvenirs", name: "Souvenirs" }
];

const MerchPage = () => {
  const [merchItems, setMerchItems] = useState(defaultMerchItems);
  const [activeCategory, setActiveCategory] = useState("all");
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSizes, setSelectedSizes] = useState({});

  useEffect(() => {
    // Load merch cart from localStorage
    const savedCart = localStorage.getItem("tamaleCartMerch");
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }

    // Try to load merch items from API
    const fetchMerch = async () => {
      try {
        const response = await axios.get(`${API}/merch/items`);
        if (response.data && response.data.length > 0) {
          setMerchItems(response.data);
        }
      } catch (error) {
        // Use default items if API not available
        console.log("Using default merch items");
      }
    };
    fetchMerch();
  }, []);

  const filteredItems = activeCategory === "all" 
    ? merchItems 
    : merchItems.filter(item => item.category === activeCategory);

  const addToCart = (item) => {
    const size = selectedSizes[item.item_id] || item.sizes[0];
    const cartItemId = `${item.item_id}_${size}`;
    const existingItem = cart.find(i => i.cart_id === cartItemId);
    let newCart;
    
    if (existingItem) {
      newCart = cart.map(i => 
        i.cart_id === cartItemId 
          ? { ...i, quantity: i.quantity + 1 }
          : i
      );
    } else {
      newCart = [...cart, { 
        cart_id: cartItemId,
        item_id: item.item_id, 
        name: item.name, 
        price: item.price, 
        size: size,
        quantity: 1,
        image_url: item.image_url
      }];
    }
    
    setCart(newCart);
    localStorage.setItem("tamaleCartMerch", JSON.stringify(newCart));
    toast.success(`${item.name} (${size}) added to cart`);
  };

  const updateQuantity = (cartId, delta) => {
    const existingItem = cart.find(i => i.cart_id === cartId);
    let newCart;
    
    if (existingItem && existingItem.quantity + delta <= 0) {
      newCart = cart.filter(i => i.cart_id !== cartId);
    } else if (existingItem) {
      newCart = cart.map(i => 
        i.cart_id === cartId 
          ? { ...i, quantity: i.quantity + delta }
          : i
      );
    } else {
      return;
    }
    
    setCart(newCart);
    localStorage.setItem("tamaleCartMerch", JSON.stringify(newCart));
  };

  const getCartQuantity = (itemId, size) => {
    const cartItemId = `${itemId}_${size || selectedSizes[itemId] || ""}`;
    const item = cart.find(i => i.cart_id === cartItemId);
    return item ? item.quantity : 0;
  };

  const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="glass border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors" data-testid="merch-back-btn">
            <ArrowLeft size={20} />
            <span>Back</span>
          </Link>
          <h1 className="text-xl font-display font-bold text-white">Merch Shop</h1>
          <div className="relative">
            <Button className="btn-primary" data-testid="merch-cart-btn">
              <ShoppingCart size={18} className="mr-2" />
              Cart ({cartCount}) - ${cartTotal.toFixed(2)}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="bg-gradient-to-br from-red-900/40 to-slate-950 py-16 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h1 className="text-4xl lg:text-5xl font-display font-bold text-white">
              Rep The <span className="text-red-500">Tamale Man</span>
            </h1>
            <p className="text-slate-300 text-lg max-w-2xl mx-auto">
              T-shirts, cups, souvenirs & more! Show off your love for the Super Dooper Dooper Tamale.
            </p>
            <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
              <Truck size={16} />
              <span>Free shipping on orders over $50</span>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Category Tabs */}
        <div className="flex gap-4 overflow-x-auto pb-4 mb-12 scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`px-6 py-3 rounded-md whitespace-nowrap transition-all duration-300 ${
                activeCategory === category.id
                  ? "bg-red-600 text-white"
                  : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800"
              }`}
              data-testid={`merch-category-${category.id}`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Merch Items Grid */}
        <motion.div
          key={activeCategory}
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          {filteredItems.map((item) => {
            const selectedSize = selectedSizes[item.item_id] || item.sizes[0];
            const quantity = getCartQuantity(item.item_id, selectedSize);
            
            return (
              <motion.div
                key={item.item_id}
                variants={fadeInUp}
                className="card-dark overflow-hidden group"
                data-testid={`merch-item-${item.item_id}`}
              >
                <div className="aspect-square overflow-hidden relative">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  {item.is_featured && (
                    <Badge className="absolute top-4 left-4 bg-red-600 text-white">
                      Popular
                    </Badge>
                  )}
                </div>
                
                <div className="p-5">
                  <h3 className="text-lg font-display font-bold text-white mb-1 line-clamp-1">
                    {item.name}
                  </h3>
                  <p className="text-red-500 font-bold text-xl mb-2">${item.price.toFixed(2)}</p>
                  <p className="text-slate-400 text-sm mb-4 line-clamp-2">{item.description}</p>
                  
                  {/* Size Selector */}
                  {item.sizes.length > 1 && (
                    <div className="mb-4">
                      <Select 
                        value={selectedSizes[item.item_id] || item.sizes[0]}
                        onValueChange={(value) => setSelectedSizes(prev => ({ ...prev, [item.item_id]: value }))}
                      >
                        <SelectTrigger className="input-dark" data-testid={`size-select-${item.item_id}`}>
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800">
                          {item.sizes.map((size) => (
                            <SelectItem key={size} value={size} className="text-white">
                              {size}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {/* Add to Cart */}
                  {quantity > 0 ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateQuantity(`${item.item_id}_${selectedSize}`, -1)}
                          className="p-2 bg-slate-800 rounded-md hover:bg-slate-700 transition-colors"
                          data-testid={`merch-remove-${item.item_id}`}
                        >
                          <Minus size={16} className="text-white" />
                        </button>
                        <span className="text-white font-semibold w-6 text-center">{quantity}</span>
                        <button
                          onClick={() => addToCart(item)}
                          className="p-2 bg-slate-800 rounded-md hover:bg-slate-700 transition-colors"
                          data-testid={`merch-add-${item.item_id}`}
                        >
                          <Plus size={16} className="text-white" />
                        </button>
                      </div>
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
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Cart Sidebar / Floating Button */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-80">
          <div className="card-dark p-4">
            <h3 className="text-white font-semibold mb-3">Your Cart ({cartCount} items)</h3>
            <div className="max-h-48 overflow-y-auto space-y-2 mb-4">
              {cart.map((item) => (
                <div key={item.cart_id} className="flex justify-between items-center text-sm">
                  <div className="flex-1">
                    <p className="text-white truncate">{item.name}</p>
                    <p className="text-slate-400 text-xs">{item.size} × {item.quantity}</p>
                  </div>
                  <p className="text-red-500 font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-slate-800 mb-4">
              <span className="text-white font-semibold">Total</span>
              <span className="text-red-500 font-bold text-lg">${cartTotal.toFixed(2)}</span>
            </div>
            <Button className="btn-primary w-full" data-testid="checkout-merch-btn">
              Checkout
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MerchPage;
