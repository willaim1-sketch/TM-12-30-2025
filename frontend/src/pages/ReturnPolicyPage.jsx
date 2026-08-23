import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, ShieldCheck, AlertCircle, Phone, Mail, CheckCircle } from "lucide-react";
import { Button } from "../components/ui/button";

const API = process.env.REACT_APP_BACKEND_URL;

const ReturnPolicyPage = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await axios.get(`${API}/api/settings`);
        setSettings(response.data);
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // Default values
  const phone = settings?.return_policy_phone || settings?.phone || "(512) 555-0123";
  const email = settings?.return_policy_email || settings?.email || "support@nicnackables.com";
  const foodPolicyText = settings?.return_policy_food_text || "Due to the nature of our products, we cannot accept returns on food items. Once your order has been prepared and picked up or delivered, it cannot be returned for health and safety reasons. All sales of food products are final.";
  const fixPolicyText = settings?.return_policy_fix_text || "If there&apos;s an issue with your order, we will fix it. Our goal is your complete satisfaction.";
  const merchPolicyText = settings?.return_policy_merch_text || "For non-food merchandise (t-shirts, hats, etc.), we accept returns within 14 days of purchase for unworn, unwashed items with original tags attached. Please contact us to initiate a return. Shipping costs for returns are the responsibility of the customer unless the item is defective.";
  const siteName = settings?.site_name || "Nic Nackables BBQ & More";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      {/* Header */}
      <header className="bg-[#1A1A1A] border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
            <ArrowLeft size={20} />
            <span>Back to Home</span>
          </Link>
          <Link to="/" className="text-2xl font-display font-bold text-red-500">
            {siteName}
          </Link>
        </div>
      </header>

      {/* Hero Section with Mascot Theme */}
      <section className="relative py-16 px-6 bg-gradient-to-b from-red-900/30 to-[#0D0D0D]">
        <div className="max-w-4xl mx-auto text-center">
          {/* Mascot/Brand Element */}
          <div className="w-24 h-24 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center border-4 border-red-500">
            <ShieldCheck className="text-red-500" size={48} />
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
            Return &amp; Refund Policy
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            At {siteName}, we&apos;re committed to your satisfaction with every order.
          </p>
        </div>
      </section>

      {/* Policy Content */}
      <section className="py-12 px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* No Returns Policy */}
          <div className="bg-[#1A1A1A] rounded-xl p-8 border border-white/10">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-500/20 rounded-lg flex-shrink-0">
                <AlertCircle className="text-red-500" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-display font-bold text-white mb-3">
                  No Returns on Food Items
                </h2>
                <p className="text-white/70 leading-relaxed">
                  {foodPolicyText}
                </p>
              </div>
            </div>
          </div>

          {/* We Make It Right */}
          <div className="bg-[#1A1A1A] rounded-xl p-8 border border-green-500/30">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-500/20 rounded-lg flex-shrink-0">
                <CheckCircle className="text-green-500" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-display font-bold text-white mb-3">
                  We&apos;ll Make It Right
                </h2>
                <p className="text-white/70 leading-relaxed mb-4">
                  {fixPolicyText} If you receive:
                </p>
                <ul className="space-y-3 text-white/70">
                  <li className="flex items-start gap-3">
                    <span className="text-red-500 mt-1">•</span>
                    <span><strong className="text-white">Wrong items</strong> - We&apos;ll replace them with the correct items at no additional charge</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-500 mt-1">•</span>
                    <span><strong className="text-white">Missing items</strong> - We&apos;ll prepare and provide the missing items</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-500 mt-1">•</span>
                    <span><strong className="text-white">Quality concerns</strong> - Contact us immediately and we&apos;ll work with you to resolve the issue</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* How to Report an Issue */}
          <div className="bg-[#1A1A1A] rounded-xl p-8 border border-white/10">
            <h2 className="text-2xl font-display font-bold text-white mb-4">
              How to Report an Issue
            </h2>
            <p className="text-white/70 mb-6">
              If you have a problem with your order, please contact us <strong className="text-white">within 24 hours</strong> of receiving it. 
              Be sure to include:
            </p>
            <ul className="space-y-2 text-white/70 mb-6">
              <li className="flex items-center gap-2">
                <span className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold">1</span>
                Your order number
              </li>
              <li className="flex items-center gap-2">
                <span className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold">2</span>
                Description of the issue
              </li>
              <li className="flex items-center gap-2">
                <span className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold">3</span>
                Photos if applicable
              </li>
            </ul>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <a href={`tel:${phone.replace(/[^0-9+]/g, '')}`} className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors">
                <Phone size={20} />
                <span>{phone}</span>
              </a>
              <a href={`mailto:${email}`} className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
                <Mail size={20} />
                <span>{email}</span>
              </a>
            </div>
          </div>

          {/* Merch Returns */}
          <div className="bg-[#1A1A1A] rounded-xl p-8 border border-white/10">
            <h2 className="text-2xl font-display font-bold text-white mb-3">
              Merchandise Returns
            </h2>
            <p className="text-white/70 leading-relaxed">
              {merchPolicyText}
            </p>
          </div>

        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-12 px-6 bg-[#1A1A1A] border-t border-white/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-display font-bold text-white mb-4">
            Questions About Your Order?
          </h2>
          <p className="text-white/60 mb-6">
            We&apos;re here to help. Reach out to us anytime.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/order">
              <Button className="btn-primary">Place an Order</Button>
            </Link>
            <Link to="/#contact">
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ReturnPolicyPage;
