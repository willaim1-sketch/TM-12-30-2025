import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { MapPin, Phone, Mail, Clock, Star, ChevronDown, Menu, X, Facebook, Instagram, Twitter, ShoppingBag } from "lucide-react";
import { Button } from "../components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/ui/accordion";
import PageRenderer from "../components/PageRenderer";

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

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? "glass border-b border-white/5" : "bg-transparent"}`}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3" data-testid="nav-logo">
          {settings?.header_logo ? (
            <img 
              src={settings.header_logo} 
              alt={settings?.site_name || "The Tamale Man"} 
              className="h-10 md:h-12 w-auto object-contain"
            />
          ) : (
            <span className="text-2xl font-display font-bold text-white">{settings?.site_name || "The Tamale Man"}</span>
          )}
        </Link>
        
        <div className="hidden md:flex items-center gap-8">
          <a href="#about" className="text-white/70 hover:text-white transition-colors text-lg" data-testid="nav-about">About</a>
          <Link to="/menu" className="text-white/70 hover:text-white transition-colors text-lg" data-testid="nav-menu">Menu</Link>
          <Link to="/merch" className="text-white/70 hover:text-white transition-colors text-lg" data-testid="nav-merch">Merch</Link>
          <a href="#testimonials" className="text-white/70 hover:text-white transition-colors text-lg" data-testid="nav-testimonials">Reviews</a>
          <a href="#location" className="text-white/70 hover:text-white transition-colors text-lg" data-testid="nav-location">Location</a>
        </div>

        <div className="hidden md:block">
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
            {settings?.hero_title || "Big, Bold"}<br />
            <span className="text-red-500 italic">Tamales</span>
          </motion.h1>

          {/* Silhouette Section - The Legend */}
          <motion.div 
            variants={fadeInUp}
            className="flex flex-col items-center py-8"
          >
            <div className="relative">
              {/* Silhouette figure */}
              <div className="w-40 h-48 relative">
                <svg viewBox="0 0 100 140" className="w-full h-full drop-shadow-2xl">
                  {/* Chef silhouette with tamale - using dark grays instead of blue */}
                  <defs>
                    <linearGradient id="silhouetteGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#333333" />
                      <stop offset="100%" stopColor="#1a1a1a" />
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
              {settings?.about_content || "Started in a small kitchen with big dreams, The Tamale Man has been serving up home-style Mexican comfort food for over 25 years. No fancy stuff here - just real food, big portions, and flavors that remind you of mom's cooking."}
            </p>
            <p className="text-white/60 leading-relaxed text-lg">
              Our Super Dooper Dooper Tamale isn't just a menu item - it's a legend. Packed with seasoned meat, wrapped in love, and big enough to make you say "WOW!" Every tamale, every plate of beans and rice, every scoop of guac is made fresh daily.
            </p>
            <div className="pt-4">
              <p className="text-white font-display text-xl italic">— {settings?.chef_name || "The Tamale Man"}</p>
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
const MerchPromoSection = () => {
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
              Rep The Tamale Man
            </p>
            <h2 className="text-4xl lg:text-5xl font-display font-bold text-white">
              Get Your <span className="text-red-500">Merch!</span>
            </h2>
            <p className="text-white/80 text-lg">
              Show your love for The Tamale Man! T-shirts, cups, souvenirs, and gear featuring our famous Super Dooper Dooper Tamale. Perfect gifts or just to flex your tamale pride!
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
            <div className="card-dark p-4 text-center">
              <div className="aspect-square bg-[#2A2A2A] rounded-lg flex items-center justify-center mb-3 overflow-hidden">
                <div className="text-6xl">👕</div>
              </div>
              <p className="text-white font-semibold">T-Shirts</p>
              <p className="text-red-500 font-bold">From $24.99</p>
            </div>
            <div className="card-dark p-4 text-center">
              <div className="aspect-square bg-[#2A2A2A] rounded-lg flex items-center justify-center mb-3 overflow-hidden">
                <div className="text-6xl">🥤</div>
              </div>
              <p className="text-white font-semibold">Cups & Mugs</p>
              <p className="text-red-500 font-bold">From $14.99</p>
            </div>
            <div className="card-dark p-4 text-center">
              <div className="aspect-square bg-[#2A2A2A] rounded-lg flex items-center justify-center mb-3 overflow-hidden">
                <div className="text-6xl">🧢</div>
              </div>
              <p className="text-white font-semibold">Hats</p>
              <p className="text-red-500 font-bold">From $19.99</p>
            </div>
            <div className="card-dark p-4 text-center">
              <div className="aspect-square bg-[#2A2A2A] rounded-lg flex items-center justify-center mb-3 overflow-hidden">
                <div className="text-6xl">🎁</div>
              </div>
              <p className="text-white font-semibold">Souvenirs</p>
              <p className="text-red-500 font-bold">From $9.99</p>
            </div>
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
  return (
    <section id="location" className="py-24 px-6 bg-[#1A1A1A]">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="grid lg:grid-cols-2 gap-16"
        >
          {/* Info */}
          <motion.div variants={fadeInUp} className="space-y-8">
            <div>
              <p className="text-red-500 uppercase tracking-[0.2em] text-sm font-semibold mb-4">Come Visit</p>
              <h2 className="text-4xl lg:text-5xl font-display font-bold text-white">Find Us Here</h2>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <MapPin className="text-red-500 mt-1 flex-shrink-0" size={24} />
                <div>
                  <p className="text-white font-semibold mb-1">Address</p>
                  <p className="text-white/60">{settings?.address || "123 Main Street, Austin, TX"}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Phone className="text-red-500 mt-1 flex-shrink-0" size={24} />
                <div>
                  <p className="text-white font-semibold mb-1">Phone</p>
                  <p className="text-white/60">{settings?.phone || "(512) 555-0123"}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Mail className="text-red-500 mt-1 flex-shrink-0" size={24} />
                <div>
                  <p className="text-white font-semibold mb-1">Email</p>
                  <p className="text-white/60">{settings?.email || "hello@thetamaleman.com"}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Clock className="text-red-500 mt-1 flex-shrink-0" size={24} />
                <div>
                  <p className="text-white font-semibold mb-1">Hours</p>
                  <div className="text-white/60 space-y-1">
                    {settings?.opening_hours?.map((hour, idx) => (
                      <p key={idx}>
                        {hour.day}: {hour.is_closed ? "Closed" : `${hour.open_time} - ${hour.close_time}`}
                      </p>
                    )) || (
                      <>
                        <p>Mon-Sat: 10:00 AM - 8:00 PM</p>
                        <p>Sunday: 11:00 AM - 6:00 PM</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Map placeholder */}
          <motion.div variants={fadeInUp} className="h-[400px] lg:h-auto rounded-lg overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1744928869793-3908b4649ad6?w=800"
              alt="Restaurant location"
              className="w-full h-full object-cover"
            />
          </motion.div>
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
                alt={settings?.site_name || "The Tamale Man"} 
                className="max-w-full h-auto max-h-36 object-contain mb-6"
                style={{ maxWidth: "250px" }}
              />
            ) : (
              <h3 className="text-3xl font-display font-bold text-white mb-4">{settings?.site_name || "The Tamale Man"}</h3>
            )}
            <p className="text-white/60 mb-6 text-lg">
              Home-style fast food tamales made with love. Big portions, bold flavors!
            </p>
            <div className="flex gap-4">
              {settings?.facebook_url && (
                <a href={settings.facebook_url} className="text-white/60 hover:text-red-500 transition-colors" data-testid="footer-facebook">
                  <Facebook size={24} />
                </a>
              )}
              {settings?.instagram_url && (
                <a href={settings.instagram_url} className="text-white/60 hover:text-red-500 transition-colors" data-testid="footer-instagram">
                  <Instagram size={24} />
                </a>
              )}
              {settings?.twitter_url && (
                <a href={settings.twitter_url} className="text-white/60 hover:text-red-500 transition-colors" data-testid="footer-twitter">
                  <Twitter size={24} />
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
              <li>{settings?.email || "hello@thetamaleman.com"}</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 text-center text-white/50 text-base">
          <p>&copy; {new Date().getFullYear()} {settings?.site_name || "The Tamale Man"}. All rights reserved.</p>
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
  const [pageBuilderSections, setPageBuilderSections] = useState([]);
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
        
        // Try to fetch Page Builder sections for homepage
        try {
          const pageRes = await axios.get(`${API}/page-content/home`);
          if (pageRes.data && pageRes.data.sections) {
            setPageBuilderSections(pageRes.data.sections);
          }
        } catch (e) {
          // Page builder content may not exist yet, that's okay
          console.log("No page builder content found for homepage");
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
      <Navbar settings={settings} />
      
      {/* Page Builder Sections - Shown FIRST if any exist */}
      {pageBuilderSections.length > 0 && (
        <PageRenderer sections={pageBuilderSections} settings={settings} />
      )}
      
      {/* Default sections - Only show if NO page builder sections exist */}
      {pageBuilderSections.length === 0 && (
        <>
          <HeroSection settings={settings} />
          <AboutSection settings={settings} />
          <FeaturedMenuSection items={featuredItems} />
          <MerchPromoSection />
          <OrderCTASection />
          <TestimonialsSection testimonials={testimonials} />
          <LocationSection settings={settings} />
          <FAQSection faqs={faqs} />
        </>
      )}
      
      <Footer settings={settings} />
    </div>
  );
};

export default LandingPage;
