import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { MapPin, Phone, Mail, Clock, Star, ChevronDown, Menu, X, Facebook, Instagram, Twitter } from "lucide-react";
import { Button } from "../components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/ui/accordion";

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
const Navbar = () => {
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
        <Link to="/" className="flex items-center gap-2" data-testid="nav-logo">
          <span className="text-2xl font-display font-bold text-white">The Tamale Man</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-8">
          <a href="#about" className="text-slate-300 hover:text-white transition-colors" data-testid="nav-about">About</a>
          <Link to="/menu" className="text-slate-300 hover:text-white transition-colors" data-testid="nav-menu">Menu</Link>
          <a href="#testimonials" className="text-slate-300 hover:text-white transition-colors" data-testid="nav-testimonials">Reviews</a>
          <a href="#location" className="text-slate-300 hover:text-white transition-colors" data-testid="nav-location">Location</a>
          <Link to="/blog" className="text-slate-300 hover:text-white transition-colors" data-testid="nav-blog">Blog</Link>
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
            <a href="#about" className="text-slate-300 hover:text-white transition-colors py-2">About</a>
            <Link to="/menu" className="text-slate-300 hover:text-white transition-colors py-2">Menu</Link>
            <a href="#testimonials" className="text-slate-300 hover:text-white transition-colors py-2">Reviews</a>
            <a href="#location" className="text-slate-300 hover:text-white transition-colors py-2">Location</a>
            <Link to="/blog" className="text-slate-300 hover:text-white transition-colors py-2">Blog</Link>
            <Link to="/order">
              <Button className="btn-primary w-full mt-2" data-testid="mobile-order-btn">Order Online</Button>
            </Link>
          </div>
        </motion.div>
      )}
    </nav>
  );
};

// Hero Section
const HeroSection = ({ settings }) => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src={settings?.hero_image || "https://images.unsplash.com/photo-1670943544416-81155850b6f7?w=1920"}
          alt="Restaurant ambiance"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 gradient-overlay"></div>
        <div className="absolute inset-0 bg-slate-950/60"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="space-y-8"
        >
          <motion.p variants={fadeInUp} className="text-red-500 uppercase tracking-[0.3em] text-sm font-semibold">
            Authentic Gourmet Experience
          </motion.p>
          
          <motion.h1 variants={fadeInUp} className="text-5xl sm:text-6xl lg:text-7xl font-display font-bold text-white leading-tight">
            {settings?.hero_title || "Authentic Gourmet"}<br />
            <span className="text-red-500 italic">Tamales</span>
          </motion.h1>
          
          <motion.p variants={fadeInUp} className="text-slate-300 text-lg max-w-2xl mx-auto">
            {settings?.hero_subtitle || "Crafted with passion, served with pride. Experience the finest handmade tamales in town."}
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
            className="text-slate-400"
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
    <section id="about" className="py-24 px-6 bg-slate-950 noise-overlay">
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
                alt="Our Chef"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -right-6 bg-red-600 text-white p-6 rounded-lg">
              <p className="text-4xl font-display font-bold">25+</p>
              <p className="text-sm uppercase tracking-wider">Years of Tradition</p>
            </div>
          </motion.div>

          {/* Content */}
          <motion.div variants={fadeInUp} className="space-y-6">
            <p className="text-red-500 uppercase tracking-[0.2em] text-sm font-semibold">Our Story</p>
            <h2 className="text-4xl lg:text-5xl font-display font-bold text-white">
              {settings?.about_title || "A Family Legacy of Flavor"}
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed">
              {settings?.about_content || "For generations, our family has been crafting tamales using recipes passed down from our grandmother's kitchen in Mexico. Every tamale we make carries the love and tradition of authentic Mexican cuisine."}
            </p>
            <p className="text-slate-400 leading-relaxed">
              Our commitment to quality means we use only the freshest ingredients, hand-select our chilies, and slow-cook our meats to perfection. Each tamale is wrapped by hand, just as it has been done for centuries.
            </p>
            <div className="pt-4">
              <p className="text-white font-display text-xl italic">— {settings?.chef_name || "Chef Carlos"}</p>
              <p className="text-slate-400 text-sm">Head Chef & Founder</p>
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
    <section className="py-24 px-6 bg-slate-900">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.p variants={fadeInUp} className="text-red-500 uppercase tracking-[0.2em] text-sm font-semibold mb-4">
            Chef's Recommendations
          </motion.p>
          <motion.h2 variants={fadeInUp} className="text-4xl lg:text-5xl font-display font-bold text-white">
            Signature Dishes
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
                <p className="text-slate-400 text-sm line-clamp-2">{item.description}</p>
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
        <div className="absolute inset-0 bg-slate-950/80"></div>
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
            Ready to Order?
          </motion.p>
          <motion.h2 variants={fadeInUp} className="text-4xl lg:text-5xl font-display font-bold text-white">
            Skip the Line, <span className="text-red-500 italic">Order Online</span>
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-slate-300 text-lg max-w-2xl mx-auto">
            Place your order now and have your tamales ready for pickup. Fresh, hot, and waiting for you.
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
    <section id="testimonials" className="py-24 px-6 bg-slate-950 noise-overlay">
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
            Customer Reviews
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
              <p className="text-slate-300 italic mb-6">"{testimonial.content}"</p>
              <div>
                <p className="text-white font-semibold">{testimonial.author_name}</p>
                {testimonial.author_title && (
                  <p className="text-slate-400 text-sm">{testimonial.author_title}</p>
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
    <section id="location" className="py-24 px-6 bg-slate-900">
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
              <p className="text-red-500 uppercase tracking-[0.2em] text-sm font-semibold mb-4">Visit Us</p>
              <h2 className="text-4xl lg:text-5xl font-display font-bold text-white">Find Us Here</h2>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <MapPin className="text-red-500 mt-1 flex-shrink-0" size={24} />
                <div>
                  <p className="text-white font-semibold mb-1">Address</p>
                  <p className="text-slate-400">{settings?.address || "123 Main Street, Austin, TX"}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Phone className="text-red-500 mt-1 flex-shrink-0" size={24} />
                <div>
                  <p className="text-white font-semibold mb-1">Phone</p>
                  <p className="text-slate-400">{settings?.phone || "(512) 555-0123"}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Mail className="text-red-500 mt-1 flex-shrink-0" size={24} />
                <div>
                  <p className="text-white font-semibold mb-1">Email</p>
                  <p className="text-slate-400">{settings?.email || "hello@thetamaleman.com"}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Clock className="text-red-500 mt-1 flex-shrink-0" size={24} />
                <div>
                  <p className="text-white font-semibold mb-1">Hours</p>
                  <div className="text-slate-400 space-y-1">
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
    <section id="faq" className="py-24 px-6 bg-slate-950 noise-overlay">
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
                className="card-dark px-6 border-slate-800"
              >
                <AccordionTrigger className="text-white hover:text-red-500 text-left py-4" data-testid={`faq-${faq.faq_id}`}>
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-slate-400 pb-4">
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
    <footer className="bg-slate-900 border-t border-slate-800 py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <h3 className="text-2xl font-display font-bold text-white mb-4">The Tamale Man</h3>
            <p className="text-slate-400 mb-6 max-w-md">
              Authentic gourmet tamales made with love and tradition. Experience the finest Mexican cuisine in town.
            </p>
            <div className="flex gap-4">
              {settings?.facebook_url && (
                <a href={settings.facebook_url} className="text-slate-400 hover:text-red-500 transition-colors" data-testid="footer-facebook">
                  <Facebook size={24} />
                </a>
              )}
              {settings?.instagram_url && (
                <a href={settings.instagram_url} className="text-slate-400 hover:text-red-500 transition-colors" data-testid="footer-instagram">
                  <Instagram size={24} />
                </a>
              )}
              {settings?.twitter_url && (
                <a href={settings.twitter_url} className="text-slate-400 hover:text-red-500 transition-colors" data-testid="footer-twitter">
                  <Twitter size={24} />
                </a>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li><Link to="/menu" className="text-slate-400 hover:text-red-500 transition-colors">Menu</Link></li>
              <li><Link to="/order" className="text-slate-400 hover:text-red-500 transition-colors">Order Online</Link></li>
              <li><Link to="/blog" className="text-slate-400 hover:text-red-500 transition-colors">Blog</Link></li>
              <li><a href="#about" className="text-slate-400 hover:text-red-500 transition-colors">About Us</a></li>
              <li><Link to="/admin/login" className="text-slate-400 hover:text-red-500 transition-colors" data-testid="footer-admin-login">Admin Login</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-slate-400">
              <li>{settings?.address || "123 Main Street, Austin, TX"}</li>
              <li>{settings?.phone || "(512) 555-0123"}</li>
              <li>{settings?.email || "hello@thetamaleman.com"}</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8 text-center text-slate-500 text-sm">
          <p>&copy; {new Date().getFullYear()} The Tamale Man. All rights reserved.</p>
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <HeroSection settings={settings} />
      <AboutSection settings={settings} />
      <FeaturedMenuSection items={featuredItems} />
      <OrderCTASection />
      <TestimonialsSection testimonials={testimonials} />
      <LocationSection settings={settings} />
      <FAQSection faqs={faqs} />
      <Footer settings={settings} />
    </div>
  );
};

export default LandingPage;
