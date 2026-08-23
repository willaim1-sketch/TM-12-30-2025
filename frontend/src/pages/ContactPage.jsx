import React, { useState } from "react";
import { motion } from "framer-motion";
import { Send, User, Phone, Mail, MessageSquare, CheckCircle, Loader2 } from "lucide-react";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import axios from "axios";
import SEO from "../components/SEO";

const API = process.env.REACT_APP_BACKEND_URL;

// Mascot images with transparent backgrounds
const MASCOT_IMAGES = {
  thumbsUp: "https://customer-assets-0z36b82j.emergentagent.net/job_df175a16-41d0-451b-88d8-ff076a4b992e/artifacts/c57qdrk8_photo_2026-08-23_11-38-48.jpg",
  pointing: "https://customer-assets-0z36b82j.emergentagent.net/job_df175a16-41d0-451b-88d8-ff076a4b992e/artifacts/gh4dg75a_photo_2026-08-23_11-38-42.jpg",
};

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.message) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post(`${API}/api/contact`, formData);
      setIsSubmitted(true);
      toast.success("Message sent successfully! We'll get back to you soon.");
      setFormData({ name: "", phone: "", email: "", message: "" });
    } catch (error) {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] relative overflow-hidden">
      <SEO 
        title="Contact Us | Nic Nackables BBQ & More"
        description="Get in touch with Nic Nackables BBQ & More. We'd love to hear from you!"
      />

      {/* Background Mascot - Left Side */}
      <div className="absolute left-0 bottom-0 w-80 h-auto opacity-20 pointer-events-none hidden lg:block">
        <img 
          src={MASCOT_IMAGES.pointing}
          alt=""
          className="w-full h-auto object-contain"
          style={{ filter: "grayscale(30%)" }}
        />
      </div>

      {/* Background Mascot - Right Side */}
      <div className="absolute right-0 top-20 w-72 h-auto opacity-15 pointer-events-none hidden lg:block">
        <img 
          src={MASCOT_IMAGES.thumbsUp}
          alt=""
          className="w-full h-auto object-contain transform scale-x-[-1]"
          style={{ filter: "grayscale(30%)" }}
        />
      </div>

      {/* Gradient Overlays */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-red-900/20 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-full h-96 bg-gradient-to-t from-red-900/10 to-transparent pointer-events-none" />

      <div className="relative z-10 container mx-auto px-4 py-16 md:py-24">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white mb-4">
            Get In <span className="text-red-500">Touch</span>
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            Have a question, feedback, or just want to say hello? We&apos;d love to hear from you! 
            Fill out the form below and we&apos;ll get back to you as soon as possible.
          </p>
        </motion.div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-5 gap-8 items-start">
            {/* Mascot Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="md:col-span-2 hidden md:block"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-yellow-500/10 rounded-3xl blur-3xl" />
                <div className="relative bg-gradient-to-br from-[#1A1A1A] to-[#0D0D0D] rounded-3xl p-6 border border-white/10">
                  <img 
                    src={MASCOT_IMAGES.thumbsUp}
                    alt="Nic Nackables BBQ Mascot"
                    className="w-full h-auto rounded-2xl mb-4"
                  />
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-white mb-2">We&apos;re Here to Help!</h3>
                    <p className="text-white/60 text-sm">
                      Whether it&apos;s about catering, menu questions, or feedback - 
                      we love hearing from our customers!
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="md:col-span-3"
            >
              {isSubmitted ? (
                <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0D0D0D] rounded-3xl p-8 border border-green-500/30 text-center">
                  <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-10 h-10 text-green-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-3">Message Sent!</h2>
                  <p className="text-white/70 mb-6">
                    Thank you for reaching out. We&apos;ll get back to you within 24-48 hours.
                  </p>
                  <Button 
                    onClick={() => setIsSubmitted(false)}
                    className="btn-primary"
                  >
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="bg-gradient-to-br from-[#1A1A1A] to-[#0D0D0D] rounded-3xl p-6 md:p-8 border border-white/10">
                  <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                    <MessageSquare className="text-red-500" />
                    Send Us a Message
                  </h2>

                  <div className="space-y-5">
                    {/* Name Field */}
                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-2">
                        Your Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                        <Input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="John Doe"
                          className="input-dark pl-10"
                          required
                          data-testid="contact-name"
                        />
                      </div>
                    </div>

                    {/* Phone Field */}
                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-2">
                        Phone Number
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                        <Input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="(555) 123-4567"
                          className="input-dark pl-10"
                          data-testid="contact-phone"
                        />
                      </div>
                    </div>

                    {/* Email Field */}
                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-2">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                        <Input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="john@example.com"
                          className="input-dark pl-10"
                          required
                          data-testid="contact-email"
                        />
                      </div>
                    </div>

                    {/* Message Field */}
                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-2">
                        Your Message <span className="text-red-500">*</span>
                      </label>
                      <Textarea
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        placeholder="Tell us what's on your mind... Questions about our menu? Catering inquiry? Feedback on your last order?"
                        className="input-dark min-h-[150px] resize-none"
                        required
                        data-testid="contact-message"
                      />
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full btn-primary py-4 text-lg"
                      data-testid="contact-submit"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 animate-spin" size={20} />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2" size={20} />
                          Send Message
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>

          {/* Contact Info Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-12 grid sm:grid-cols-3 gap-4"
          >
            <div className="bg-[#1A1A1A] rounded-xl p-5 border border-white/10 text-center">
              <Phone className="w-8 h-8 text-red-500 mx-auto mb-3" />
              <h3 className="text-white font-semibold mb-1">Call Us</h3>
              <p className="text-white/60 text-sm">(323) 555-RIBS</p>
            </div>
            <div className="bg-[#1A1A1A] rounded-xl p-5 border border-white/10 text-center">
              <Mail className="w-8 h-8 text-red-500 mx-auto mb-3" />
              <h3 className="text-white font-semibold mb-1">Email Us</h3>
              <p className="text-white/60 text-sm">info@nicnackablesbbq.com</p>
            </div>
            <div className="bg-[#1A1A1A] rounded-xl p-5 border border-white/10 text-center">
              <MessageSquare className="w-8 h-8 text-red-500 mx-auto mb-3" />
              <h3 className="text-white font-semibold mb-1">Response Time</h3>
              <p className="text-white/60 text-sm">Within 24-48 hours</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
