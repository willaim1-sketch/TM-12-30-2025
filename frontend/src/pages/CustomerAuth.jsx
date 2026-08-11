import React, { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Mail, Lock, Eye, EyeOff, User, Phone, ArrowLeft } from "lucide-react";
import { useAuth } from "../App";

const API = process.env.REACT_APP_BACKEND_URL;

const CustomerAuth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { checkAuth } = useAuth();
  const redirectTo = location.state?.redirectTo || "/";
  
  // Initialize isLogin based on the current path
  const [checking, setChecking] = useState(true);
  const [isLogin, setIsLogin] = useState(location.pathname !== "/register");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  
  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(true);

  useEffect(() => {
    // Check if already authenticated
    const checkAuth = async () => {
      try {
        const response = await axios.get(`${API}/api/auth/me`, { withCredentials: true });
        if (response.data) {
          // Already logged in, redirect
          if (redirectTo === "/order") {
            navigate("/order");
          } else {
            navigate("/");
          }
        }
      } catch (error) {
        // Not authenticated, show login form
      }
      setChecking(false);
    };
    checkAuth();
  }, [navigate, redirectTo]);

  const handleGoogleLogin = () => {
    // Store redirect URL for after auth
    sessionStorage.setItem("authRedirect", redirectTo);
    const callbackUrl = window.location.origin + '/auth/callback';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(callbackUrl)}`;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await axios.post(
        `${API}/api/auth/login`,
        { email, password },
        { withCredentials: true }
      );
      
      toast.success(`Welcome back, ${response.data.first_name || response.data.name}!`);
      await checkAuth(); // Refresh auth state in context
      navigate(redirectTo);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || "Login failed. Please try again.";
      setError(typeof errorMsg === "string" ? errorMsg : "Login failed");
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter your first and last name");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${API}/api/auth/customer/register`,
        { 
          email, 
          password, 
          first_name: firstName,
          last_name: lastName,
          phone: phone || null,
          newsletter_subscribed: newsletterSubscribed
        },
        { withCredentials: true }
      );
      
      toast.success(`Welcome, ${response.data.first_name}! Your account has been created.`);
      await checkAuth(); // Refresh auth state in context
      navigate(redirectTo);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || "Registration failed. Please try again.";
      setError(typeof errorMsg === "string" ? errorMsg : "Registration failed");
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        {/* Back link */}
        <Link to="/" className="inline-flex items-center text-white/60 hover:text-white mb-6 transition-colors">
          <ArrowLeft size={18} className="mr-2" />
          Back to Website
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-bold text-white mb-2">
            {isLogin ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="text-white/60">
            {isLogin 
              ? "Sign in to place orders and track your purchases" 
              : "Join us to place orders and get exclusive updates"}
          </p>
        </div>

        <div className="card-dark p-8 space-y-6">
          {/* Form */}
          <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-4">
            {!isLogin && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName" className="text-white/70">First Name *</Label>
                    <div className="relative mt-1">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                      <Input
                        id="firstName"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="John"
                        className="input-dark pl-10"
                        required={!isLogin}
                        data-testid="register-first-name"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-white/70">Last Name *</Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      className="input-dark mt-1"
                      required={!isLogin}
                      data-testid="register-last-name"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="phone" className="text-white/70">Phone Number (optional)</Label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(555) 123-4567"
                      className="input-dark pl-10"
                      data-testid="register-phone"
                    />
                  </div>
                </div>
              </>
            )}
            
            <div>
              <Label htmlFor="email" className="text-white/70">Email *</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input-dark pl-10"
                  required
                  data-testid="auth-email"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="text-white/70">Password *</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-dark pl-10 pr-10"
                  required
                  minLength={6}
                  data-testid="auth-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div className="flex items-center gap-3">
                <Checkbox
                  id="newsletter"
                  checked={newsletterSubscribed}
                  onCheckedChange={setNewsletterSubscribed}
                  className="border-white/30 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                  data-testid="newsletter-checkbox"
                />
                <Label htmlFor="newsletter" className="text-white/70 text-sm cursor-pointer">
                  Subscribe to newsletter for updates and special offers
                </Label>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm" data-testid="auth-error">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-lg"
              data-testid="auth-submit"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin mr-2" />}
              {isLogin ? "Sign In" : "Create Account"}
            </Button>
          </form>

          {isLogin && (
            <div className="text-center">
              <Link 
                to="/forgot-password" 
                className="text-red-500 hover:text-red-400 text-sm"
              >
                Forgot your password?
              </Link>
            </div>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#1A1A1A] text-white/50">or continue with</span>
            </div>
          </div>

          <Button
            onClick={handleGoogleLogin}
            type="button"
            className="w-full bg-white text-[#1A1A1A] hover:bg-gray-100 font-semibold py-3 flex items-center justify-center gap-3"
            data-testid="google-login-btn"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(""); }}
              className="text-white/60 hover:text-white text-sm"
              data-testid="toggle-auth-mode"
            >
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <span className="text-red-500 font-medium">
                {isLogin ? "Sign Up" : "Sign In"}
              </span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CustomerAuth;
