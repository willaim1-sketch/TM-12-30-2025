import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../App";

const API = process.env.REACT_APP_BACKEND_URL;

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(null);
  const { checkAuth } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const sessionId = searchParams.get("session_id");
      
      if (!sessionId) {
        setError("No session ID received from authentication provider");
        setTimeout(() => navigate("/login"), 3000);
        return;
      }

      try {
        // Exchange session_id for user data
        const response = await axios.get(
          `${API}/api/auth/session?session_id=${sessionId}`,
          { withCredentials: true }
        );

        if (response.data) {
          toast.success(`Welcome, ${response.data.first_name || response.data.name || 'there'}!`);
          
          // Refresh auth state in context
          await checkAuth();
          
          // Check where to redirect
          const redirectTo = sessionStorage.getItem("authRedirect") || "/";
          sessionStorage.removeItem("authRedirect");
          
          // If user is admin and was trying to access admin, go there
          if (response.data.is_admin && redirectTo.includes("/admin")) {
            navigate("/admin");
          } else {
            navigate(redirectTo);
          }
        }
      } catch (err) {
        console.error("Auth callback error:", err);
        setError("Authentication failed. Please try again.");
        toast.error("Authentication failed");
        setTimeout(() => navigate("/login"), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate, checkAuth]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">{error}</div>
          <p className="text-white/60">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-red-500 animate-spin mx-auto mb-4" />
        <p className="text-white text-xl">Completing sign in...</p>
        <p className="text-white/60 mt-2">Please wait</p>
      </div>
    </div>
  );
};

export default AuthCallback;
