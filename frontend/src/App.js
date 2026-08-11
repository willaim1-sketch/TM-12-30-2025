import React, { useEffect, useRef, useState, createContext, useContext, useCallback } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import axios from "axios";
import { Toaster } from "sonner";

// Pages
import LandingPage from "./pages/LandingPage";
import MenuPage from "./pages/MenuPage";
import MerchPage from "./pages/MerchPage";
import OrderPage from "./pages/OrderPage";
import OrderSuccessPage from "./pages/OrderSuccessPage";
import BlogPage from "./pages/BlogPage";
import BlogPostPage from "./pages/BlogPostPage";
import CustomerAuth from "./pages/CustomerAuth";
import AuthCallback from "./pages/AuthCallback";
import AccountPage from "./pages/AccountPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminLogin from "./pages/admin/AdminLogin";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Auth context for customer authentication
export const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Auth Provider Component
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/auth/me`, { withCredentials: true });
      setUser(response.data);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const logout = async () => {
    try {
      await axios.post(`${BACKEND_URL}/api/auth/logout`, {}, { withCredentials: true });
    } catch (e) {
      // Ignore logout errors
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, checkAuth, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

// Visitor tracking hook
const useVisitorTracking = () => {
  const location = useLocation();
  const tracked = useRef(new Set());

  useEffect(() => {
    // Skip tracking for admin pages
    if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/auth')) {
      return;
    }

    const pageKey = `${location.pathname}-${new Date().toDateString()}`;
    if (tracked.current.has(pageKey)) return;
    tracked.current.add(pageKey);

    // Track the visit
    axios.post(`${API}/track-visit`, {
      page: location.pathname,
      referrer: document.referrer || ''
    }).catch(() => {}); // Silent fail
  }, [location.pathname]);
};

// Visitor tracking wrapper component
const VisitorTracker = ({ children }) => {
  useVisitorTracking();
  return children;
};

// Admin Auth Callback (handles hash-based session_id for admin Google OAuth)
// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
const AdminAuthCallback = () => {
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = window.location.hash;
    const sessionIdMatch = hash.match(/session_id=([^&]+)/);
    
    if (sessionIdMatch) {
      const sessionId = sessionIdMatch[1];
      
      axios.get(`${API}/auth/session?session_id=${sessionId}`, { withCredentials: true })
        .then(response => {
          window.history.replaceState(null, '', '/admin');
          navigate('/admin', { state: { user: response.data } });
        })
        .catch(error => {
          console.error('Auth error:', error);
          navigate('/admin/login');
        });
    } else {
      navigate('/admin/login');
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="text-white text-xl">Authenticating...</div>
    </div>
  );
};

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.user) {
      setUser(location.state.user);
      setIsAuthenticated(true);
      return;
    }

    const checkAuth = async () => {
      try {
        const response = await axios.get(`${API}/auth/me`, { withCredentials: true });
        setUser(response.data);
        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
        navigate('/admin/login');
      }
    };

    checkAuth();
  }, [navigate, location.state]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

function AppRouter() {
  const location = useLocation();

  // Check for session_id in hash SYNCHRONOUSLY during render (for admin Google OAuth)
  if (location.hash?.includes('session_id=')) {
    return <AdminAuthCallback />;
  }

  return (
    <VisitorTracker>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/merch" element={<MerchPage />} />
        <Route path="/order" element={<OrderPage />} />
        <Route path="/order/success" element={<OrderSuccessPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />
        {/* Customer Auth Routes */}
        <Route path="/login" element={<CustomerAuth />} />
        <Route path="/register" element={<CustomerAuth />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/*" element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        } />
      </Routes>
    </VisitorTracker>
  );
}

function App() {
  useEffect(() => {
    // Seed database on first load
    axios.post(`${API}/seed`).catch(() => {});
  }, []);

  return (
    <HelmetProvider>
      <div className="App min-h-screen bg-[#0A0A0A]">
        <Toaster position="top-right" richColors />
        <BrowserRouter>
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        </BrowserRouter>
      </div>
    </HelmetProvider>
  );
}

export default App;
