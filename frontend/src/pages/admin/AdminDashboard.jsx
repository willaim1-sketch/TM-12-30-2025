import React, { useState, useContext, useEffect } from "react";
import { Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, UtensilsCrossed, ShoppingCart, MessageSquare, 
  Settings, Image, FileText, HelpCircle, LogOut, Menu, X,
  Star, Globe, ShoppingBag, Layout, Palette, TrendingUp, Users
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { AuthContext } from "../../App";

// Admin Pages
import MenuManager from "./MenuManager";
import MerchManager from "./MerchManager";
import OrderManager from "./OrderManager";
import ContactManager from "./ContactManager";
import SettingsManager from "./SettingsManager";
import MediaManager from "./MediaManager";
import BlogManager from "./BlogManager";
import FAQManager from "./FAQManager";
import TestimonialManager from "./TestimonialManager";
import SEOManager from "./SEOManager";
import PageBuilder from "./PageBuilder";
import VisitorStats from "./VisitorStats";
import UserManager from "./UserManager";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// All sidebar items with role restrictions
const allSidebarItems = [
  { path: "/admin", icon: LayoutDashboard, label: "Dashboard", exact: true, staffAllowed: true, storeOwnerAllowed: true },
  { path: "/admin/analytics", icon: TrendingUp, label: "Analytics", staffAllowed: false, storeOwnerAllowed: true },
  { path: "/admin/page-builder", icon: Layout, label: "Page Builder", staffAllowed: false, storeOwnerAllowed: true },
  { path: "/admin/menu", icon: UtensilsCrossed, label: "Menu", staffAllowed: false, storeOwnerAllowed: true },
  { path: "/admin/merch", icon: ShoppingBag, label: "Merch Shop", staffAllowed: false, storeOwnerAllowed: true },
  { path: "/admin/orders", icon: ShoppingCart, label: "Orders", staffAllowed: true, storeOwnerAllowed: true },
  { path: "/admin/contacts", icon: MessageSquare, label: "Messages", staffAllowed: true, storeOwnerAllowed: true },
  { path: "/admin/testimonials", icon: Star, label: "Testimonials", staffAllowed: false, storeOwnerAllowed: true },
  { path: "/admin/blog", icon: FileText, label: "Blog", staffAllowed: false, storeOwnerAllowed: true },
  { path: "/admin/faq", icon: HelpCircle, label: "FAQ", staffAllowed: false, storeOwnerAllowed: true },
  { path: "/admin/media", icon: Image, label: "Media", staffAllowed: false, storeOwnerAllowed: true },
  { path: "/admin/seo", icon: Globe, label: "SEO", staffAllowed: false, storeOwnerAllowed: true },
  { path: "/admin/users", icon: Users, label: "Users", staffAllowed: false, storeOwnerAllowed: false }, // Admin only
  { path: "/admin/settings", icon: Settings, label: "Settings", staffAllowed: false, storeOwnerAllowed: true }, // But platform fees hidden
];

const DashboardHome = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState({
    orders: 0,
    menuItems: 0,
    contacts: 0,
    testimonials: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Staff can only see orders and contacts
        const requests = [
          axios.get(`${API}/admin/orders`, { withCredentials: true }),
          axios.get(`${API}/admin/contacts`, { withCredentials: true })
        ];
        
        // Admins and store owners can see all stats
        if (user?.is_admin || user?.is_store_owner) {
          requests.push(
            axios.get(`${API}/admin/menu/items`, { withCredentials: true }),
            axios.get(`${API}/admin/testimonials`, { withCredentials: true })
          );
        }

        const responses = await Promise.all(requests);
        
        setStats({
          orders: responses[0].data?.length || 0,
          contacts: responses[1].data?.filter(c => !c.is_read)?.length || 0,
          menuItems: (user?.is_admin || user?.is_store_owner) ? (responses[2]?.data?.length || 0) : 0,
          testimonials: (user?.is_admin || user?.is_store_owner) ? (responses[3]?.data?.length || 0) : 0
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };

    fetchStats();
  }, [user]);

  // Show different stat cards based on role
  const statCards = (user?.is_admin || user?.is_store_owner) ? [
    { label: "Total Orders", value: stats.orders, icon: ShoppingCart, color: "text-green-500" },
    { label: "Menu Items", value: stats.menuItems, icon: UtensilsCrossed, color: "text-red-400" },
    { label: "Unread Messages", value: stats.contacts, icon: MessageSquare, color: "text-yellow-500" },
    { label: "Testimonials", value: stats.testimonials, icon: Star, color: "text-red-500" },
  ] : [
    { label: "Total Orders", value: stats.orders, icon: ShoppingCart, color: "text-green-500" },
    { label: "Unread Messages", value: stats.contacts, icon: MessageSquare, color: "text-yellow-500" },
  ];

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-white mb-8">Dashboard</h1>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="card-dark p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <stat.icon className={`${stat.color}`} size={24} />
            </div>
            <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
            <p className="text-white/60 text-sm">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card-dark p-6">
          <h2 className="text-xl font-display font-bold text-white mb-4">Quick Actions</h2>
          <div className="space-y-3">
            {user?.is_admin && (
              <Link to="/admin/menu" className="block p-4 bg-[#2A2A2A] rounded-lg hover:bg-[#3A3A3A] transition-colors">
                <p className="text-white font-semibold">Manage Menu</p>
                <p className="text-white/60 text-sm">Add or edit menu items</p>
              </Link>
            )}
            <Link to="/admin/orders" className="block p-4 bg-[#2A2A2A] rounded-lg hover:bg-[#3A3A3A] transition-colors">
              <p className="text-white font-semibold">View Orders</p>
              <p className="text-white/60 text-sm">Check recent orders</p>
            </Link>
            <Link to="/admin/contacts" className="block p-4 bg-[#2A2A2A] rounded-lg hover:bg-[#3A3A3A] transition-colors">
              <p className="text-white font-semibold">Messages</p>
              <p className="text-white/60 text-sm">View customer messages</p>
            </Link>
            {user?.is_admin && (
              <Link to="/admin/settings" className="block p-4 bg-[#2A2A2A] rounded-lg hover:bg-[#3A3A3A] transition-colors">
                <p className="text-white font-semibold">Site Settings</p>
                <p className="text-white/60 text-sm">Update content and design</p>
              </Link>
            )}
          </div>
        </div>

        <div className="card-dark p-6">
          <h2 className="text-xl font-display font-bold text-white mb-4">
            {user?.is_admin ? 'Getting Started' : 'Staff Dashboard'}
          </h2>
          <div className="space-y-4 text-white/80">
            {user?.is_admin ? (
              <>
                <p>Welcome to your restaurant admin dashboard! Here you can:</p>
                <ul className="list-disc list-inside space-y-2 text-white/60">
                  <li>Manage your menu items and categories</li>
                  <li>View and process customer orders</li>
                  <li>Respond to contact form submissions</li>
                  <li>Update testimonials and FAQ</li>
                  <li>Write blog posts and announcements</li>
                  <li>Customize your site design and SEO</li>
                </ul>
              </>
            ) : (
              <>
                <p>Welcome, {user?.first_name || 'Staff'}! As a staff member, you can:</p>
                <ul className="list-disc list-inside space-y-2 text-white/60">
                  <li>View and process customer orders</li>
                  <li>Update order status and payment status</li>
                  <li>Send order confirmation emails</li>
                  <li>Respond to customer messages</li>
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setUser } = useContext(AuthContext);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Filter sidebar items based on user role
  const sidebarItems = allSidebarItems.filter(item => {
    // Admins see everything
    if (user?.is_admin) return true;
    // Store owners see most things except Users
    if (user?.is_store_owner) return item.storeOwnerAllowed;
    // Staff only see allowed items
    return item.staffAllowed;
  });

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
      setUser(null);
      navigate('/admin/login');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const isActive = (path, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#1A1A1A] border-r border-white/10 
        transform transition-transform duration-300 lg:transform-none
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-white/10">
            <Link to="/admin" className="flex items-center gap-2">
              <span className="text-xl font-display font-bold text-white">Nic Nackables</span>
            </Link>
            <p className="text-white/50 text-sm mt-1">Admin Dashboard</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <ul className="space-y-1">
              {sidebarItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                      ${isActive(item.path, item.exact)
                        ? 'bg-red-600 text-white'
                        : 'text-white/60 hover:bg-[#2A2A2A] hover:text-white'
                      }
                    `}
                    data-testid={`nav-${item.label.toLowerCase()}`}
                  >
                    <item.icon size={20} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-3 mb-4">
              {user?.picture ? (
                <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-full" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#2A2A2A] flex items-center justify-center text-white">
                  {user?.name?.charAt(0) || 'A'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold truncate">{user?.name || 'Admin'}</p>
                <p className="text-white/50 text-sm truncate">{user?.email}</p>
              </div>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full btn-secondary"
              data-testid="logout-btn"
            >
              <LogOut size={18} className="mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-[#0A0A0A]/80 backdrop-blur-md border-b border-white/10 px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              className="lg:hidden text-white p-2"
              onClick={() => setSidebarOpen(true)}
              data-testid="mobile-menu-btn"
            >
              <Menu size={24} />
            </button>

            <div className="flex items-center gap-4 ml-auto">
              <a 
                href="/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white/60 hover:text-white transition-colors text-sm"
              >
                View Website &rarr;
              </a>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-6 lg:p-8 overflow-auto">
          <Routes>
            <Route path="/" element={<DashboardHome />} />
            <Route path="/analytics/*" element={<VisitorStats />} />
            <Route path="/page-builder/*" element={<PageBuilder />} />
            <Route path="/menu/*" element={<MenuManager />} />
            <Route path="/merch/*" element={<MerchManager />} />
            <Route path="/orders/*" element={<OrderManager />} />
            <Route path="/contacts/*" element={<ContactManager />} />
            <Route path="/testimonials/*" element={<TestimonialManager />} />
            <Route path="/blog/*" element={<BlogManager />} />
            <Route path="/faq/*" element={<FAQManager />} />
            <Route path="/media/*" element={<MediaManager />} />
            <Route path="/seo/*" element={<SEOManager />} />
            <Route path="/users/*" element={<UserManager />} />
            <Route path="/settings/*" element={<SettingsManager />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
