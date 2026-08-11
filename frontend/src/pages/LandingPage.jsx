import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { MapPin, Phone, Mail, Clock, Star, ChevronDown, Menu, X, Facebook, Instagram, Twitter, Youtube, Linkedin, ShoppingBag, User, LogOut } from "lucide-react";
import { Button } from "../components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/ui/accordion";
import PageRenderer from "../components/PageRenderer";
import SEO from "../components/SEO";
import { useAuth } from "../App";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

// Navbar Component
const Navbar = ({ settings }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Get custom nav items from settings
  const customNavItems = (settings?.nav_menu || []).filter(item => item.visible !== false);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? "glass border-b border-white/5" : "bg-transparent"}`}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3" data-testid="nav-logo">
          {settings?.header_logo ? (
            <img 
              src={settings.header_logo} 
              alt={settings?.site_name || "Nic Nackables"} 
              className="h-10 md:h-12 w-auto object-contain"
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'block'); }}
            />
          ) : null}
          <span className={`text-2xl font-display font-bold text-white ${settings?.header_logo ? 'hidden' : ''}`}>
            {settings?.site_name || "Nic Nackables"}
          </span>
        </Link>
        
        <div className="hidden md:flex items-center gap-8">
          <a href="#about" className="text-white/70 hover:text-white transition-colors text-lg" data-testid="nav-about">About</a>
          <Link to="/menu" className="text-white/70 hover:text-white transition-colors text-lg" data-testid="nav-menu">Menu</Link>
          <Link to="/merch" className="text-white/70 hover:text-white transition-colors text-lg" data-testid="nav-merch">Merch</Link>
          <a href="#testimonials" className="text-white/70 hover:text-white transition-colors text-lg" data-testid="nav-testimonials">Reviews</a>
          <a href="#location" className="text-white/70 hover:text-white transition-colors text-lg" data-testid="nav-location">Location</a>
          {/* Custom nav items from settings */}
          {customNavItems.map((item) => (
            item.url.startsWith('http') ? (
              <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white transition-colors text-lg">
                {item.label}
              </a>
            ) : (
              <Link key={item.id} to={item.url} className="text-white/70 hover:text-white transition-colors text-lg">
                {item.label}
              </Link>
            )
          ))}
        </div>

        <div className="hidden md:flex items-center gap-4">
          {/* User Menu */}
          {isAuthenticated ? (
            <div className="relative">
              <button 
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
                data-testid="user-menu-btn"
              >
                <User size={20} />
                <span className="text-sm">{user?.first_name || user?.name || 'Account'}</span>
                <ChevronDown size={16} className={`transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 glass rounded-lg border border-white/10 py-2 z-50">
                  <Link 
                    to="/account" 
                    className="flex items-center gap-2 px-4 py-2 text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <User size={16} />
                    My Account
                  </Link>
                  <button 
                    onClick={() => { logout(); setShowUserMenu(false); }}
                    className="flex items-center gap-2 px-4 py-2 text-white/70 hover:text-white hover:bg-white/5 transition-colors w-full text-left"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="text-white/70 hover:text-white transition-colors text-sm" data-testid="nav-login-btn">
              Sign In
            </Link>
          )}
          
          <Link to="/order">
            <Button className="btn-primary" data-testid="nav-order-btn">Order Online</Button>
          </Link>
        </div>

        <button 
          className="md:hidden text-white" 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          data-testid="mobile-menu-toggle"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden glass border-t border-white/5 px-6 py-4"
        >
          <div className="flex flex-col gap-4">
            <a href="#about" className="text-white/70 hover:text-white transition-colors py-2 text-lg">About</a>
            <Link to="/menu" className="text-white/70 hover:text-white transition-colors py-2 text-lg">Menu</Link>
            <Link to="/merch" className="text-white/70 hover:text-white transition-colors py-2 text-lg">Merch Shop</Link>
            <a href="#testimonials" className="text-white/70 hover:text-white transition-colors py-2 text-lg">Reviews</a>
            <a href="#location" className="text-white/70 hover:text-white transition-colors py-2 text-lg">Location</a>
            {/* Custom nav items for mobile */}
            {customNavItems.map((item) => (
              item.url.startsWith('http') ? (
                <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white transition-colors py-2 text-lg">
                  {item.label}
                </a>
              ) : (
                <Link key={item.id} to={item.url} className="text-white/70 hover:text-white transition-colors py-2 text-lg">
                  {item.label}
                </Link>
              )
            ))}
            
            {/* Mobile User Options */}
            <div className="border-t border-white/10 pt-4 mt-2">
              {isAuthenticated ? (
                <>
                  <Link to="/account" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors py-2 text-lg">
                    <User size={20} />
                    My Account
                  </Link>
                  <button 
                    onClick={() => { logout(); setIsMobileMenuOpen(false); }}
                    className="flex items-center gap-2 text-white/70 hover:text-white transition-colors py-2 text-lg w-full"
                  >
                    <LogOut size={20} />
                    Sign Out
                  </button>
                </>
              ) : (
                <Link to="/login" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors py-2 text-lg">
                  <User size={20} />
                  Sign In / Register
                </Link>
              )}
            </div>
            
            <Link to="/order">
              <Button className="btn-primary w-full mt-2" data-testid="mobile-order-btn">Order Online</Button>
            </Link>
          </div>
        </motion.div>
      )}
    </nav>
  );
};

// Hero Section with Silhouette
const HeroSection = ({ settings }) => {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src={settings?.hero_image || "https://images.unsplash.com/photo-1670943544416-81155850b6f7?w=1920"}
          alt="Restaurant ambiance"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 gradient-overlay"></div>
        <div className="absolute inset-0 bg-black/60"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="space-y-8"
        >
          <motion.p variants={fadeInUp} className="text-red-500 uppercase tracking-[0.3em] text-base md:text-lg font-bold">
            Home-Style Fast Food Since 1998
          </motion.p>
          
          <motion.h1 variants={fadeInUp} className="text-6xl sm:text-7xl lg:text-8xl font-display font-bold text-white leading-tight">
            <span className="text-white">{settings?.hero_title || "Big, Bold Tamales"}</span>
          </motion.h1>
          
          <motion.p variants={fadeInUp} className="text-xl md:text-2xl text-white/80 max-w-2xl mt-4">
            {settings?.hero_subtitle || "Crafted with passion, served with pride"}
          </motion.p>

          {/* Silhouette/Mascot Section - The Legend */}
          <motion.div 
            variants={fadeInUp}
            className="flex flex-col items-center py-8"
          >
            <div className="relative">
              {/* Custom mascot image or default silhouette */}
              <div className="w-40 h-48 relative">
                {settings?.mascot_image ? (
                  <img 
                    src={settings.mascot_image} 
                    alt="Nic Nackables" 
                    className="w-full h-full object-contain drop-shadow-2xl"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : null}
                <svg viewBox="0 0 100 140" className={`w-full h-full drop-shadow-2xl ${settings?.mascot_image ? 'hidden' : ''}`}>
                  {/* Chef silhouette with tamale - using warm red/maroon tones for visibility */}
                  <defs>
                    <linearGradient id="silhouetteGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#7f1d1d" />
                      <stop offset="100%" stopColor="#450a0a" />
                    </linearGradient>
                  </defs>
                  {/* Head */}
                  <ellipse cx="50" cy="20" rx="18" ry="20" fill="url(#silhouetteGrad)" />
                  {/* Chef hat */}
                  <path d="M30 15 Q30 0 50 0 Q70 0 70 15 L68 20 L32 20 Z" fill="url(#silhouetteGrad)" />
                  {/* Body */}
                  <path d="M30 40 Q25 45 25 60 L25 100 Q25 110 35 115 L65 115 Q75 110 75 100 L75 60 Q75 45 70 40 Z" fill="url(#silhouetteGrad)" />
                  {/* Arms holding tamale */}
                  <path d="M25 50 Q10 55 15 75 L35 85" fill="url(#silhouetteGrad)" stroke="url(#silhouetteGrad)" strokeWidth="8" />
                  <path d="M75 50 Q90 55 85 75 L65 85" fill="url(#silhouetteGrad)" stroke="url(#silhouetteGrad)" strokeWidth="8" />
                  {/* Giant Tamale - Red and cream/white */}
                  <ellipse cx="50" cy="85" rx="25" ry="12" fill="#DC2626" />
                  <ellipse cx="50" cy="85" rx="20" ry="8" fill="#FEF3C7" />
                  {/* Legs */}
                  <rect x="35" y="115" width="12" height="25" fill="url(#silhouetteGrad)" />
                  <rect x="53" y="115" width="12" height="25" fill="url(#silhouetteGrad)" />
                </svg>
              </div>
              {/* Glow effect */}
              <div className="absolute inset-0 bg-red-600/20 blur-3xl rounded-full"></div>
            </div>
            <p className="text-white/60 text-lg mt-4 italic font-semibold">The Legend Behind the Tamale</p>
          </motion.div>
          
          <motion.p variants={fadeInUp} className="text-white/80 text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed">
            {settings?.hero_subtitle || "Just like Mom makes! Big portions, bold flavors, and the famous Super Dooper Dooper Tamale that put us on the map."}
          </motion.p>
          
          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link to="/order">
              <Button className="btn-primary text-lg px-8 py-4 animate-pulse-glow" data-testid="hero-order-btn">
                Order Online
              </Button>
            </Link>
            <Link to="/menu">
              <Button variant="outline" className="btn-secondary text-lg px-8 py-4" data-testid="hero-menu-btn">
                View Menu
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <motion.div 
            animate={{ y: [0, 10, 0] }} 
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="text-white/50"
          >
            <ChevronDown size={32} />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

// Video Section - Full Width Autoplay Loop (YouTube or Direct Video)
const VideoSection = ({ settings }) => {
  const [videoLoaded, setVideoLoaded] = React.useState(false);
  const [videoError, setVideoError] = React.useState(false);
  const videoRef = React.useRef(null);
  const videoUrl = settings?.homepage_video || null;
  
  if (!videoUrl) return null;
  
  // Check if it's a YouTube URL
  const youtubeMatch = videoUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  const youtubeVideoId = youtubeMatch ? youtubeMatch[1] : null;
  
  // YouTube embed
  if (youtubeVideoId) {
    return (
      <section className="w-full bg-black">
        <div className="relative w-full overflow-hidden" style={{ paddingBottom: '56.25%' /* 16:9 aspect ratio */ }}>
          <iframe
            className="absolute top-0 left-0 w-full h-full"
            src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&mute=1&loop=1&playlist=${youtubeVideoId}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`}
            title="Promotional Video"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
          {/* Optional overlay for text */}
          {settings?.video_overlay_text && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
              <h2 className="text-white text-3xl md:text-5xl font-display font-bold text-center px-4">
                {settings.video_overlay_text}
              </h2>
            </div>
          )}
        </div>
      </section>
    );
  }
  
  // Direct video (fallback)
  // Convert relative URLs to full URLs using the API base
  const fullVideoUrl = videoUrl.startsWith('/api') 
    ? `${process.env.REACT_APP_BACKEND_URL}${videoUrl}`
    : videoUrl;

  const handleLoadedData = () => {
    setVideoLoaded(true);
    if (videoRef.current) {
      videoRef.current.play().catch(e => console.log('Autoplay prevented:', e));
    }
  };

  const handleError = (e) => {
    console.error('Video error:', e);
    setVideoError(true);
  };
  
  return (
    <section className="w-full bg-black py-0">
      <div className="relative w-full overflow-hidden" style={{ maxHeight: '80vh', minHeight: videoLoaded ? 'auto' : '400px' }}>
        {!videoLoaded && !videoError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-white/50 text-lg">Loading video...</div>
          </div>
        )}
        
        {videoError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-white/50 text-lg">Video unavailable</div>
          </div>
        )}
        
        <video
          ref={videoRef}
          className={`w-full h-auto object-cover ${videoLoaded ? 'block' : 'invisible'}`}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onLoadedData={handleLoadedData}
          onError={handleError}
        >
          <source src={fullVideoUrl} type="video/mp4" />
          <source src={fullVideoUrl} type="video/quicktime" />
          Your browser does not support the video tag.
        </video>
        
        {settings?.video_overlay_text && videoLoaded && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <h2 className="text-white text-3xl md:text-5xl font-display font-bold text-center px-4">
              {settings.video_overlay_text}
            </h2>
          </div>
        )}
      </div>
    </section>
  );
};

// About Section
const AboutSection = ({ settings }) => {
  return (
    <section id="about" className="py-24 px-6 bg-[#0A0A0A] noise-overlay">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="grid lg:grid-cols-2 gap-16 items-center"
        >
          {/* Image */}
          <motion.div variants={fadeInUp} className="relative">
            <div className="aspect-[4/5] rounded-lg overflow-hidden">
              <img 
                src={settings?.chef_image || "https://images.unsplash.com/photo-1695909287955-9c349a13a813?w=800"}
                alt="Our Kitchen"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -right-6 bg-red-600 text-white p-6 rounded-lg">
              <p className="text-4xl font-display font-bold">25+</p>
              <p className="text-sm uppercase tracking-wider">Years of Flavor</p>
            </div>
          </motion.div>

          {/* Content */}
          <motion.div variants={fadeInUp} className="space-y-6">
            <p className="text-red-500 uppercase tracking-[0.2em] text-sm font-semibold">Our Story</p>
            <h2 className="text-4xl lg:text-5xl font-display font-bold text-white">
              {settings?.about_title || "Mom's Kitchen, Your Table"}
            </h2>
            <p className="text-white/80 text-lg leading-relaxed">
              {settings?.about_content || "Started in a small kitchen with big dreams, Nic Nackables BBQ & More has been serving up home-style comfort food for years. No fancy stuff here - just real food, big portions, and flavors that remind you of mom's cooking."}
            </p>
            <p className="text-white/60 leading-relaxed text-lg">
              Our Super Dooper Dooper Tamale isn't just a menu item - it's a legend. Packed with seasoned meat, wrapped in love, and big enough to make you say "WOW!" Every tamale, every plate of beans and rice, every scoop of guac is made fresh daily.
            </p>
            <div className="pt-4">
              <p className="text-white font-display text-xl italic">— {settings?.chef_name || "Nic Nackables"}</p>
              <p className="text-white/50 text-base">Founder & Head Cook</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

// Featured Menu Section
const FeaturedMenuSection = ({ items }) => {
  return (
    <section className="py-24 px-6 bg-[#1A1A1A]">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.p variants={fadeInUp} className="text-red-500 uppercase tracking-[0.2em] text-sm font-semibold mb-4">
            Fan Favorites
          </motion.p>
          <motion.h2 variants={fadeInUp} className="text-4xl lg:text-5xl font-display font-bold text-white">
            Big Flavors, Big Portions
          </motion.h2>
        </motion.div>

        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {items.slice(0, 3).map((item) => (
            <motion.div 
              key={item.item_id}
              variants={fadeInUp}
              className="card-dark overflow-hidden group"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img 
                  src={item.image_url || "https://images.unsplash.com/photo-1582170090097-b251ddbbf7f3?w=400"}
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-display font-bold text-white">{item.name}</h3>
                  <span className="text-red-500 font-bold text-lg">${item.price.toFixed(2)}</span>
                </div>
                <p className="text-white/60 text-base line-clamp-2">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <Link to="/menu">
            <Button className="btn-secondary" data-testid="view-full-menu-btn">
              View Full Menu
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

// Merch Promo Section
const MerchPromoSection = ({ settings }) => {
  const merchItems = [
    { 
      name: "T-Shirts", 
      price: "From $24.99", 
      emoji: "👕",
      image: settings?.merch_tshirt_image 
    },
    { 
      name: "Cups & Mugs", 
      price: "From $14.99", 
      emoji: "🥤",
      image: settings?.merch_cups_image 
    },
    { 
      name: "Hats", 
      price: "From $19.99", 
      emoji: "🧢",
      image: settings?.merch_hats_image 
    },
    { 
      name: "Souvenirs", 
      price: "From $9.99", 
      emoji: "🎁",
      image: settings?.merch_souvenirs_image 
    }
  ];

  return (
    <section className="py-20 px-6 bg-gradient-to-br from-red-900/40 to-[#0A0A0A]">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="grid lg:grid-cols-2 gap-12 items-center"
        >
          {/* Content */}
          <motion.div variants={fadeInUp} className="space-y-6">
            <p className="text-red-500 uppercase tracking-[0.2em] text-sm font-semibold">
              Rep Nic Nackables
            </p>
            <h2 className="text-4xl lg:text-5xl font-display font-bold text-white">
              Get Your <span className="text-red-500">Merch!</span>
            </h2>
            <p className="text-white/80 text-lg">
              Show your love for Nic Nackables! T-shirts, cups, souvenirs, and gear. Perfect gifts or just to flex your BBQ pride!
            </p>
            <Link to="/merch">
              <Button className="btn-primary text-lg px-8 py-4" data-testid="shop-merch-btn">
                <ShoppingBag className="mr-2" size={20} />
                Shop Merch
              </Button>
            </Link>
          </motion.div>

          {/* Merch Preview */}
          <motion.div variants={fadeInUp} className="grid grid-cols-2 gap-4">
            {merchItems.map((item, idx) => (
              <div key={idx} className="card-dark p-4 text-center">
                <div className="aspect-square bg-[#2A2A2A] rounded-lg flex items-center justify-center mb-3 overflow-hidden">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-6xl">{item.emoji}</div>
                  )}
                </div>
                <p className="text-white font-semibold">{item.name}</p>
                <p className="text-red-500 font-bold">{item.price}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

// Order CTA Section
const OrderCTASection = () => {
  return (
    <section className="py-24 px-6 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1730302737756-0bf0cb6b496b?w=1920"
          alt="Service"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-[#0A0A0A]/80"></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="space-y-8"
        >
          <motion.p variants={fadeInUp} className="text-red-500 uppercase tracking-[0.2em] text-sm font-semibold">
            Hungry? We Got You!
          </motion.p>
          <motion.h2 variants={fadeInUp} className="text-4xl lg:text-5xl font-display font-bold text-white">
            Skip the Line, <span className="text-red-500 italic">Order Online</span>
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-white/80 text-lg max-w-2xl mx-auto">
            Big tamales, beans, rice, and guac - ready when you are. Order now and pick up hot & fresh!
          </motion.p>
          <motion.div variants={fadeInUp}>
            <Link to="/order">
              <Button className="btn-primary text-lg px-10 py-5 animate-pulse-glow" data-testid="cta-order-btn">
                Order Now
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

// Testimonials Section
const TestimonialsSection = ({ testimonials }) => {
  return (
    <section id="testimonials" className="py-24 px-6 bg-[#0A0A0A] noise-overlay">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.p variants={fadeInUp} className="text-red-500 uppercase tracking-[0.2em] text-sm font-semibold mb-4">
            What People Say
          </motion.p>
          <motion.h2 variants={fadeInUp} className="text-4xl lg:text-5xl font-display font-bold text-white">
            Customer Love
          </motion.h2>
        </motion.div>

        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="grid md:grid-cols-3 gap-8"
        >
          {testimonials.map((testimonial) => (
            <motion.div 
              key={testimonial.testimonial_id}
              variants={fadeInUp}
              className="card-dark p-8"
            >
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} size={18} className="text-red-500 fill-red-500" />
                ))}
              </div>
              <p className="text-white/80 italic mb-6">"{testimonial.content}"</p>
              <div>
                <p className="text-white font-semibold">{testimonial.author_name}</p>
                {testimonial.author_title && (
                  <p className="text-white/50 text-base">{testimonial.author_title}</p>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

// Location Section
const LocationSection = ({ settings }) => {
  // Helper to format time (24h to 12h)
  const formatTime = (time) => {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  return (
    <section id="location" className="py-24 px-6 bg-[#1A1A1A]">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          <div className="text-center mb-12">
            <p className="text-red-500 uppercase tracking-[0.2em] text-sm font-semibold mb-4">Come Visit</p>
            <h2 className="text-4xl lg:text-5xl font-display font-bold text-white">Find Us Here</h2>
          </div>

          {/* Opening Hours Block - Cute Card */}
          <motion.div variants={fadeInUp} className="mb-12">
            <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-2xl p-8 max-w-3xl mx-auto shadow-2xl">
              <div className="flex items-center justify-center gap-3 mb-6">
                <Clock className="text-white" size={28} />
                <h3 className="text-2xl font-display font-bold text-white">Opening Hours</h3>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(settings?.opening_hours || []).slice(0, 7).map((hour, idx) => (
                  <div key={idx} className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
                    <p className="text-white/80 text-sm font-medium mb-1">{hour.day?.slice(0, 3)}</p>
                    {hour.is_closed ? (
                      <p className="text-white/60 text-sm">Closed</p>
                    ) : (
                      <p className="text-white font-bold text-lg">
                        {formatTime(hour.open_time)}<br/>
                        <span className="text-white/70 text-sm">to</span><br/>
                        {formatTime(hour.close_time)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              
              {(!settings?.opening_hours || settings.opening_hours.length === 0) && (
                <div className="text-center text-white/80">
                  <p className="text-lg">Mon - Sat: 10:00 AM - 8:00 PM</p>
                  <p className="text-lg">Sunday: 11:00 AM - 6:00 PM</p>
                </div>
              )}
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-16">
            {/* Contact Info */}
            <motion.div variants={fadeInUp} className="space-y-6">
              <div className="flex items-start gap-4 p-4 bg-[#2A2A2A] rounded-xl">
                <MapPin className="text-red-500 mt-1 flex-shrink-0" size={24} />
                <div>
                  <p className="text-white font-semibold mb-1 text-lg">Address</p>
                  <p className="text-white/70 text-lg">{settings?.address || "123 Main Street, Austin, TX"}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-[#2A2A2A] rounded-xl">
                <Phone className="text-red-500 mt-1 flex-shrink-0" size={24} />
                <div>
                  <p className="text-white font-semibold mb-1 text-lg">Phone</p>
                  <p className="text-white/70 text-lg">{settings?.phone || "(512) 555-0123"}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-[#2A2A2A] rounded-xl">
                <Mail className="text-red-500 mt-1 flex-shrink-0" size={24} />
                <div>
                  <p className="text-white font-semibold mb-1 text-lg">Email</p>
                  <p className="text-white/70 text-lg">{settings?.email || "hello@nicnackables.com"}</p>
                </div>
              </div>
            </motion.div>

            {/* Map placeholder */}
            <motion.div variants={fadeInUp} className="h-[350px] lg:h-auto rounded-2xl overflow-hidden shadow-xl">
              <img 
                src="https://images.unsplash.com/photo-1744928869793-3908b4649ad6?w=800"
                alt="Restaurant location"
                className="w-full h-full object-cover"
              />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// FAQ Section
const FAQSection = ({ faqs }) => {
  return (
    <section id="faq" className="py-24 px-6 bg-[#0A0A0A] noise-overlay">
      <div className="max-w-3xl mx-auto">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.p variants={fadeInUp} className="text-red-500 uppercase tracking-[0.2em] text-sm font-semibold mb-4">
            Got Questions?
          </motion.p>
          <motion.h2 variants={fadeInUp} className="text-4xl lg:text-5xl font-display font-bold text-white">
            Frequently Asked
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq) => (
              <AccordionItem 
                key={faq.faq_id} 
                value={faq.faq_id}
                className="card-dark px-6 border-white/10"
              >
                <AccordionTrigger className="text-white hover:text-red-500 text-left py-4" data-testid={`faq-${faq.faq_id}`}>
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-white/60 pb-4 text-lg">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};

// Footer
const Footer = ({ settings }) => {
  return (
    <footer className="bg-[#1A1A1A] border-t border-white/10 py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-3 gap-12 mb-12">
          {/* Brand & Logo - Takes 1/3 of footer */}
          <div>
            {settings?.footer_logo ? (
              <img 
                src={settings.footer_logo} 
                alt={settings?.site_name || "Nic Nackables"} 
                className="max-w-full h-auto max-h-36 object-contain mb-6"
                style={{ maxWidth: "250px" }}
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'block'); }}
              />
            ) : null}
            <h3 className={`text-3xl font-display font-bold text-white mb-4 ${settings?.footer_logo ? 'hidden' : ''}`}>
              {settings?.site_name || "Nic Nackables"}
            </h3>
            <p className="text-white/60 mb-6 text-lg">
              Home-style fast food tamales made with love. Big portions, bold flavors!
            </p>
            <div className="flex flex-wrap gap-4">
              {settings?.facebook_url && (
                <a href={settings.facebook_url} target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-red-500 transition-colors" data-testid="footer-facebook">
                  <Facebook size={24} />
                </a>
              )}
              {settings?.instagram_url && (
                <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-red-500 transition-colors" data-testid="footer-instagram">
                  <Instagram size={24} />
                </a>
              )}
              {settings?.twitter_url && (
                <a href={settings.twitter_url} target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-red-500 transition-colors" data-testid="footer-twitter">
                  <Twitter size={24} />
                </a>
              )}
              {settings?.tiktok_url && (
                <a href={settings.tiktok_url} target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-red-500 transition-colors" data-testid="footer-tiktok">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>
                </a>
              )}
              {settings?.snapchat_url && (
                <a href={settings.snapchat_url} target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-red-500 transition-colors" data-testid="footer-snapchat">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509-.015.25-.198.449-.495.51-.45.074-.949.252-1.461.428-.233.074-.465.149-.48.152-.975.269-.765.449-.615 2.194.045.329-.015.555-.211.688-.149.104-.358.134-.553.134-.39 0-.81-.104-1.050-.134-.12-.015-.268-.03-.42-.044-.51-.045-1.139-.091-1.828.119-.074.03-.149.061-.24.105-.45.209-.975.435-1.664.435-.045 0-.089 0-.12-.015h-.121c-.689 0-1.199-.24-1.649-.435-.091-.045-.165-.074-.24-.105-.689-.21-1.319-.164-1.828-.119-.165.015-.315.029-.435.044-.24.03-.66.134-1.050.134-.195 0-.404-.029-.554-.134-.195-.134-.255-.359-.21-.688.135-1.745.359-1.925-.615-2.194-.016-.003-.248-.078-.48-.152-.511-.176-1.011-.354-1.461-.428-.297-.061-.48-.26-.494-.51-.016-.239.164-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869-.195-.449-.884-.674-1.333-.809-.136-.045-.256-.09-.346-.12-.809-.329-1.228-.72-1.213-1.168 0-.36.285-.689.734-.839.151-.06.329-.089.51-.089.12 0 .299.015.449.104.375.18.734.301 1.05.301.183 0 .315-.045.389-.091l-.015-.12-.03-.51-.003-.06c-.104-1.628-.23-3.654.3-4.847C7.859 1.069 11.217.793 12.206.793"/></svg>
                </a>
              )}
              {settings?.youtube_url && (
                <a href={settings.youtube_url} target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-red-500 transition-colors" data-testid="footer-youtube">
                  <Youtube size={24} />
                </a>
              )}
              {settings?.linkedin_url && (
                <a href={settings.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-red-500 transition-colors" data-testid="footer-linkedin">
                  <Linkedin size={24} />
                </a>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-lg">Quick Links</h4>
            <ul className="space-y-3">
              <li><Link to="/menu" className="text-white/60 hover:text-red-500 transition-colors text-lg">Menu</Link></li>
              <li><Link to="/order" className="text-white/60 hover:text-red-500 transition-colors text-lg">Order Online</Link></li>
              <li><Link to="/merch" className="text-white/60 hover:text-red-500 transition-colors text-lg">Merch Shop</Link></li>
              <li><Link to="/blog" className="text-white/60 hover:text-red-500 transition-colors text-lg">Blog</Link></li>
              <li><a href="#about" className="text-white/60 hover:text-red-500 transition-colors text-lg">About Us</a></li>
              <li><Link to="/admin/login" className="text-white/60 hover:text-red-500 transition-colors text-lg" data-testid="footer-admin-login">Admin Login</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-lg">Contact Us</h4>
            <ul className="space-y-3 text-white/60 text-lg">
              <li>{settings?.address || "123 Main Street, Austin, TX"}</li>
              <li>{settings?.phone || "(512) 555-0123"}</li>
              <li>{settings?.email || "hello@nicnackables.com"}</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 text-center text-white/50 text-base">
          <p>&copy; {new Date().getFullYear()} {settings?.site_name || "Nic Nackables"}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

// Main Landing Page Component
const LandingPage = () => {
  const [settings, setSettings] = useState(null);
  const [featuredItems, setFeaturedItems] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [sectionsTop, setSectionsTop] = useState([]);
  const [sectionsBottom, setSectionsBottom] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [settingsRes, itemsRes, testimonialsRes, faqsRes] = await Promise.all([
          axios.get(`${API}/settings`),
          axios.get(`${API}/menu/items?featured=true`),
          axios.get(`${API}/testimonials?featured=true`),
          axios.get(`${API}/faq`)
        ]);

        setSettings(settingsRes.data);
        setFeaturedItems(itemsRes.data);
        setTestimonials(testimonialsRes.data);
        setFaqs(faqsRes.data);
        
        // Fetch Page Builder sections
        try {
          const pageRes = await axios.get(`${API}/page-content/home`);
          if (pageRes.data) {
            setSectionsTop(pageRes.data.sections_top || pageRes.data.sections || []);
            setSectionsBottom(pageRes.data.sections_bottom || []);
          }
        } catch (e) {
          console.log("No page builder content found");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <SEO settings={settings} />
      <Navbar settings={settings} />
      
      {/* TOP Sections from Page Builder */}
      {sectionsTop.length > 0 && (
        <PageRenderer sections={sectionsTop} settings={settings} />
      )}
      
      {/* Default Page Content */}
      <HeroSection settings={settings} />
      <VideoSection settings={settings} />
      <AboutSection settings={settings} />
      <FeaturedMenuSection items={featuredItems} />
      <MerchPromoSection settings={settings} />
      <OrderCTASection />
      <TestimonialsSection testimonials={testimonials} />
      <LocationSection settings={settings} />
      <FAQSection faqs={faqs} />
      
      {/* BOTTOM Sections from Page Builder (above footer) */}
      {sectionsBottom.length > 0 && (
        <PageRenderer sections={sectionsBottom} settings={settings} />
      )}
      
      <Footer settings={settings} />
    </div>
  );
};

export default LandingPage;
