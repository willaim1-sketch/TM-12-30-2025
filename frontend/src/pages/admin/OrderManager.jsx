import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { Clock, CheckCircle, XCircle, AlertCircle, Eye } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const statusColors = {
  pending: "bg-yellow-600",
  confirmed: "bg-red-600",
  preparing: "bg-purple-600",
  ready: "bg-green-600",
  completed: "bg-white/30",
  cancelled: "bg-red-600"
};

const paymentStatusColors = {
  unpaid: "bg-red-600",
  paid: "bg-green-600",
  refunded: "bg-yellow-600"
};

const OrderManager = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/admin/orders`, { withCredentials: true });
      setOrders(response.data);
    } catch (error) {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await axios.put(`${API}/admin/orders/${orderId}`, { status: newStatus }, { withCredentials: true });
      toast.success("Order status updated");
      fetchOrders();
    } catch (error) {
      toast.error("Failed to update order");
    }
  };

  const filteredOrders = filter === "all" 
    ? orders 
    : orders.filter(order => order.status === filter);

  if (loading) {
    return <div className="text-white">Loading orders...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-display font-bold text-white">Orders</h1>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px] input-dark" data-testid="order-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent className="bg-[#1A1A1A] border-white/10">
            <SelectItem value="all" className="text-white">All Orders</SelectItem>
            <SelectItem value="pending" className="text-white">Pending</SelectItem>
            <SelectItem value="confirmed" className="text-white">Confirmed</SelectItem>
            <SelectItem value="preparing" className="text-white">Preparing</SelectItem>
            <SelectItem value="ready" className="text-white">Ready</SelectItem>
            <SelectItem value="completed" className="text-white">Completed</SelectItem>
            <SelectItem value="cancelled" className="text-white">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-20 card-dark">
          <AlertCircle className="mx-auto mb-4 text-white/60" size={48} />
          <p className="text-white/60">No orders found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <motion.div
              key={order.order_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-dark p-6"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-sm text-white/60">{order.order_id}</span>
                    <Badge className={`${statusColors[order.status]} text-white`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </Badge>
                    <Badge className={`${paymentStatusColors[order.payment_status]} text-white`}>
                      {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                    </Badge>
                  </div>
                  <h3 className="text-white font-semibold">{order.customer_name}</h3>
                  <p className="text-white/60 text-sm">{order.customer_email}</p>
                  <p className="text-white/60 text-sm">{order.customer_phone}</p>
                </div>

                <div className="text-left lg:text-right">
                  <p className="text-2xl font-bold text-red-500">${order.total?.toFixed(2)}</p>
                  <p className="text-white/60 text-sm">
                    Pickup: {order.pickup_date} at {order.pickup_time}
                  </p>
                  <p className="text-white/50 text-xs">
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setSelectedOrder(order)}
                    variant="outline"
                    size="sm"
                    className="btn-secondary"
                    data-testid={`view-order-${order.order_id}`}
                  >
                    <Eye size={16} className="mr-1" />
                    View
                  </Button>
                  <Select
                    value={order.status}
                    onValueChange={(value) => handleStatusUpdate(order.order_id, value)}
                  >
                    <SelectTrigger className="w-[140px] input-dark" data-testid={`status-select-${order.order_id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A1A1A] border-white/10">
                      <SelectItem value="pending" className="text-white">Pending</SelectItem>
                      <SelectItem value="confirmed" className="text-white">Confirmed</SelectItem>
                      <SelectItem value="preparing" className="text-white">Preparing</SelectItem>
                      <SelectItem value="ready" className="text-white">Ready</SelectItem>
                      <SelectItem value="completed" className="text-white">Completed</SelectItem>
                      <SelectItem value="cancelled" className="text-white">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Quick Items Preview */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-white/60 text-sm">
                  {order.items?.map(item => `${item.quantity}x ${item.name}`).join(', ')}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="bg-[#1A1A1A] border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Order Details</DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-mono text-sm text-white/60">{selectedOrder.order_id}</p>
                  <h3 className="text-xl text-white font-semibold">{selectedOrder.customer_name}</h3>
                  <p className="text-white/60">{selectedOrder.customer_email}</p>
                  <p className="text-white/60">{selectedOrder.customer_phone}</p>
                </div>
                <div className="text-right">
                  <Badge className={`${statusColors[selectedOrder.status]} text-white mb-2`}>
                    {selectedOrder.status}
                  </Badge>
                  <p className="text-white/60 text-sm">
                    Pickup: {selectedOrder.pickup_date}
                  </p>
                  <p className="text-white/60 text-sm">
                    at {selectedOrder.pickup_time}
                  </p>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4">
                <h4 className="text-white font-semibold mb-3">Items</h4>
                <div className="space-y-2">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-white/70">
                      <span>{item.quantity}x {item.name}</span>
                      <span>${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-white/10 pt-4 space-y-2">
                <div className="flex justify-between text-white/60">
                  <span>Subtotal</span>
                  <span>${selectedOrder.subtotal?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-white/60">
                  <span>Tax</span>
                  <span>${selectedOrder.tax?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-white">
                  <span>Total</span>
                  <span className="text-red-500">${selectedOrder.total?.toFixed(2)}</span>
                </div>
              </div>

              {selectedOrder.comments && (
                <div className="border-t border-white/10 pt-4">
                  <h4 className="text-white font-semibold mb-2">Special Instructions</h4>
                  <p className="text-white/60">{selectedOrder.comments}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderManager;
