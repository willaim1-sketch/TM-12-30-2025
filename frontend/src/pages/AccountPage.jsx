import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, User, Mail, Phone, ArrowLeft, Save, LogOut, ShoppingBag } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

const AccountPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orders, setOrders] = useState([]);
  
  // Editable fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get(`${API}/api/auth/me`, { withCredentials: true });
        setUser(response.data);
        setFirstName(response.data.first_name || "");
        setLastName(response.data.last_name || "");
        setPhone(response.data.phone || "");
        setNewsletterSubscribed(response.data.newsletter_subscribed !== false);
        
        // Fetch user's orders
        try {
          const ordersRes = await axios.get(`${API}/api/orders/my-orders`, { withCredentials: true });
          setOrders(ordersRes.data || []);
        } catch (e) {
          // Orders endpoint might not exist yet
          setOrders([]);
        }
      } catch (error) {
        // Not authenticated
        navigate("/login", { state: { redirectTo: "/account" } });
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [navigate]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await axios.put(
        `${API}/api/auth/profile`,
        {
          first_name: firstName,
          last_name: lastName,
          phone: phone || null,
          newsletter_subscribed: newsletterSubscribed
        },
        { withCredentials: true }
      );
      setUser(response.data);
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/api/auth/logout`, {}, { withCredentials: true });
      toast.success("Logged out successfully");
      navigate("/");
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] py-12 px-6">
      <div className="max-w-2xl mx-auto">
        {/* Back link */}
        <Link to="/" className="inline-flex items-center text-white/60 hover:text-white mb-6 transition-colors">
          <ArrowLeft size={18} className="mr-2" />
          Back to Website
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-display font-bold text-white">My Account</h1>
              <p className="text-white/60 mt-1">{user?.email}</p>
            </div>
            <Button onClick={handleLogout} variant="outline" className="btn-secondary">
              <LogOut size={18} className="mr-2" />
              Logout
            </Button>
          </div>

          {/* Profile Section */}
          <div className="card-dark p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <User className="text-red-500" size={20} />
              Profile Information
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/70">First Name</Label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="input-dark mt-1"
                    placeholder="John"
                    data-testid="profile-first-name"
                  />
                </div>
                <div>
                  <Label className="text-white/70">Last Name</Label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="input-dark mt-1"
                    placeholder="Doe"
                    data-testid="profile-last-name"
                  />
                </div>
              </div>

              <div>
                <Label className="text-white/70">Email</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                  <Input
                    value={user?.email || ""}
                    disabled
                    className="input-dark pl-10 opacity-60 cursor-not-allowed"
                  />
                </div>
                <p className="text-white/40 text-xs mt-1">Email cannot be changed</p>
              </div>

              <div>
                <Label className="text-white/70">Phone Number</Label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input-dark pl-10"
                    placeholder="(555) 123-4567"
                    data-testid="profile-phone"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Checkbox
                  id="newsletter"
                  checked={newsletterSubscribed}
                  onCheckedChange={setNewsletterSubscribed}
                  className="border-white/30 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                />
                <Label htmlFor="newsletter" className="text-white/70 cursor-pointer">
                  Receive newsletter and special offers via email
                </Label>
              </div>

              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="btn-primary mt-4"
                data-testid="save-profile"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save size={18} className="mr-2" />}
                Save Changes
              </Button>
            </div>
          </div>

          {/* Order History Section */}
          <div className="card-dark p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <ShoppingBag className="text-red-500" size={20} />
              Order History
            </h2>

            {orders.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingBag className="mx-auto text-white/30 mb-4" size={48} />
                <p className="text-white/60 mb-4">You haven&apos;t placed any orders yet</p>
                <Link to="/order">
                  <Button className="btn-primary">
                    Order Now
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.order_id} className="bg-[#2A2A2A] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">Order #{order.order_id?.slice(-8)}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        order.status === 'completed' ? 'bg-green-600/20 text-green-400' :
                        order.status === 'pending' ? 'bg-yellow-600/20 text-yellow-400' :
                        'bg-red-600/20 text-red-400'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-white/60 text-sm">
                      {new Date(order.created_at).toLocaleDateString()} - ${order.total?.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AccountPage;
