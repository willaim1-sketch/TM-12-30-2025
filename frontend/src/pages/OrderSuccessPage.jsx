import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { CheckCircle, Clock, MapPin, Phone, XCircle, Loader2 } from "lucide-react";
import { Button } from "../components/ui/button";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const OrderSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const [orderStatus, setOrderStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 5;
  const pollInterval = 2000;

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    
    if (!sessionId) {
      setLoading(false);
      return;
    }

    const pollPaymentStatus = async () => {
      try {
        const response = await axios.get(`${API}/orders/status/${sessionId}`);
        setOrderStatus(response.data);

        if (response.data.payment_status === "paid" || response.data.status === "expired") {
          setLoading(false);
        } else if (attempts < maxAttempts) {
          setTimeout(() => setAttempts(prev => prev + 1), pollInterval);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error("Error checking payment status:", error);
        if (attempts < maxAttempts) {
          setTimeout(() => setAttempts(prev => prev + 1), pollInterval);
        } else {
          setLoading(false);
        }
      }
    };

    pollPaymentStatus();
  }, [searchParams, attempts]);

  const isPaid = orderStatus?.payment_status === "paid";
  const order = orderStatus?.order;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Loader2 className="w-16 h-16 text-red-500 animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-display font-bold text-white mb-2">Processing Payment</h2>
          <p className="text-white/60">Please wait while we confirm your order...</p>
        </motion.div>
      </div>
    );
  }

  if (!isPaid) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <XCircle className="w-20 h-20 text-red-500 mx-auto mb-6" />
          <h2 className="text-3xl font-display font-bold text-white mb-4">Payment Failed</h2>
          <p className="text-white/60 mb-8">
            We couldn't process your payment. Please try again or contact support if the issue persists.
          </p>
          <div className="flex flex-col gap-4">
            <Link to="/order">
              <Button className="btn-primary w-full" data-testid="try-again-btn">Try Again</Button>
            </Link>
            <Link to="/">
              <Button variant="outline" className="btn-secondary w-full" data-testid="back-home-btn">Back to Home</Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6 py-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg w-full"
      >
        {/* Success Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
          >
            <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-6" />
          </motion.div>
          <h1 className="text-4xl font-display font-bold text-white mb-4">Order Confirmed!</h1>
          <p className="text-white/60">
            Thank you for your order. We've sent a confirmation email to <span className="text-white">{order?.customer_email}</span>
          </p>
        </div>

        {/* Order Details Card */}
        <div className="card-dark p-8 mb-8">
          <h2 className="text-xl font-display font-bold text-white mb-6">Order Details</h2>
          
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-3 text-white/70">
              <div className="p-2 bg-[#2A2A2A] rounded-lg">
                <Clock size={20} className="text-red-500" />
              </div>
              <div>
                <p className="text-sm text-white/60">Pickup Time</p>
                <p className="font-semibold">{order?.pickup_date} at {order?.pickup_time}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 text-white/70">
              <div className="p-2 bg-[#2A2A2A] rounded-lg">
                <MapPin size={20} className="text-red-500" />
              </div>
              <div>
                <p className="text-sm text-white/60">Pickup Location</p>
                <p className="font-semibold">123 Main Street, Austin, TX</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 text-white/70">
              <div className="p-2 bg-[#2A2A2A] rounded-lg">
                <Phone size={20} className="text-red-500" />
              </div>
              <div>
                <p className="text-sm text-white/60">Questions?</p>
                <p className="font-semibold">(512) 555-0123</p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="border-t border-white/10 pt-6">
            <h3 className="text-lg font-semibold text-white mb-4">Order Items</h3>
            <div className="space-y-3">
              {order?.items?.map((item, idx) => (
                <div key={idx} className="flex justify-between text-white/70">
                  <span>{item.quantity}x {item.name}</span>
                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            
            <div className="border-t border-white/10 mt-4 pt-4 space-y-2">
              <div className="flex justify-between text-white/60">
                <span>Subtotal</span>
                <span>${order?.subtotal?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>Tax</span>
                <span>${order?.tax?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-white pt-2">
                <span>Total Paid</span>
                <span className="text-green-500">${order?.total?.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Order ID */}
          <div className="mt-6 pt-6 border-t border-white/10 text-center">
            <p className="text-white/60 text-sm">Order ID</p>
            <p className="text-white font-mono text-lg">{order?.order_id}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-4">
          <Link to="/menu">
            <Button className="btn-primary w-full" data-testid="order-more-btn">Order More</Button>
          </Link>
          <Link to="/">
            <Button variant="outline" className="btn-secondary w-full" data-testid="success-home-btn">Back to Home</Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default OrderSuccessPage;
