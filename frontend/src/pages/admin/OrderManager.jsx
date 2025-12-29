import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { Clock, CheckCircle, XCircle, AlertCircle, Eye, Mail, Download, Printer, X, DollarSign, TrendingUp, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
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

// Printable Order Component
const PrintableOrder = React.forwardRef(({ order, settings }, ref) => {
  if (!order) return null;
  
  return (
    <div ref={ref} className="bg-white text-black p-8 min-h-[11in] w-[8.5in] mx-auto" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header with Logo */}
      <div className="flex justify-between items-start mb-8 pb-4 border-b-2 border-gray-300">
        <div className="flex items-center gap-4">
          {settings?.header_logo || settings?.footer_logo ? (
            <img 
              src={settings?.header_logo || settings?.footer_logo} 
              alt="Logo" 
              className="h-16 w-auto object-contain"
            />
          ) : (
            <div className="text-2xl font-bold">{settings?.site_name || "The Tamale Man"}</div>
          )}
        </div>
        <div className="text-right text-sm text-gray-600">
          <p className="font-bold text-lg text-black">ORDER</p>
          <p className="font-mono">{order.order_id}</p>
          <p>{new Date(order.created_at).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Customer Info & Pickup */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="font-bold text-gray-700 mb-2 uppercase text-sm">Customer Information</h3>
          <p className="font-semibold text-lg">{order.customer_name}</p>
          <p className="text-gray-600">{order.customer_email}</p>
          <p className="text-gray-600">{order.customer_phone}</p>
        </div>
        <div>
          <h3 className="font-bold text-gray-700 mb-2 uppercase text-sm">Pickup Details</h3>
          <p className="font-semibold text-lg">{order.pickup_date}</p>
          <p className="text-gray-600">at {order.pickup_time}</p>
          <div className="mt-2">
            <span className={`inline-block px-3 py-1 rounded text-white text-sm font-semibold ${
              order.status === 'completed' ? 'bg-green-600' :
              order.status === 'pending' ? 'bg-yellow-600' :
              order.status === 'preparing' ? 'bg-purple-600' :
              order.status === 'ready' ? 'bg-green-500' : 'bg-gray-600'
            }`}>
              {order.status.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className="mb-8">
        <h3 className="font-bold text-gray-700 mb-4 uppercase text-sm border-b pb-2">Order Items</h3>
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 font-semibold">Item</th>
              <th className="text-center py-2 font-semibold w-20">Qty</th>
              <th className="text-right py-2 font-semibold w-24">Price</th>
              <th className="text-right py-2 font-semibold w-24">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.map((item, idx) => (
              <React.Fragment key={idx}>
                <tr className="border-b border-gray-200">
                  <td className="py-3">
                    <span className="font-medium">{item.name}</span>
                    {item.meat_choice && (
                      <span className="text-gray-600 text-sm ml-2">({item.meat_choice})</span>
                    )}
                  </td>
                  <td className="text-center py-3">{item.quantity}</td>
                  <td className="text-right py-3">${item.price.toFixed(2)}</td>
                  <td className="text-right py-3 font-medium">${(item.price * item.quantity).toFixed(2)}</td>
                </tr>
                {item.toppings && item.toppings.length > 0 && (
                  <tr>
                    <td colSpan="4" className="py-1 pl-4 text-sm text-gray-600">
                      Add-ons: {item.toppings.map(t => `${t.name} (+$${t.price.toFixed(2)})`).join(', ')}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-64">
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">Subtotal</span>
            <span>${order.subtotal?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">Tax</span>
            <span>${order.tax?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-3 font-bold text-lg">
            <span>TOTAL</span>
            <span>${order.total?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-1 text-sm">
            <span className="text-gray-600">Payment Status</span>
            <span className={`font-semibold ${order.payment_status === 'paid' ? 'text-green-600' : 'text-red-600'}`}>
              {order.payment_status?.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Notes Section */}
      {order.comments && (
        <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
          <h3 className="font-bold text-gray-700 mb-2 uppercase text-sm">📝 Notes / Special Instructions</h3>
          <p className="text-gray-800 whitespace-pre-wrap">{order.comments}</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-4 border-t text-center text-sm text-gray-500">
        <p>Thank you for your order!</p>
        <p>{settings?.address || ''} • {settings?.phone || ''}</p>
      </div>
    </div>
  );
});

PrintableOrder.displayName = 'PrintableOrder';

const OrderManager = () => {
  const [orders, setOrders] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const printRef = useRef();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [ordersRes, settingsRes] = await Promise.all([
        axios.get(`${API}/admin/orders`, { withCredentials: true }),
        axios.get(`${API}/settings`)
      ]);
      setOrders(ordersRes.data);
      setSettings(settingsRes.data);
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
      fetchData();
    } catch (error) {
      toast.error("Failed to update order");
    }
  };

  const handlePrintPDF = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Order ${selectedOrder.order_id}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; }
            @media print {
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const handleSendEmail = async () => {
    if (!emailTo) {
      toast.error("Please enter an email address");
      return;
    }

    setSendingEmail(true);
    try {
      await axios.post(`${API}/admin/orders/${selectedOrder.order_id}/send-email`, 
        { email: emailTo },
        { withCredentials: true }
      );
      toast.success(`Order sent to ${emailTo}`);
      setShowEmailDialog(false);
      setEmailTo("");
    } catch (error) {
      toast.error("Failed to send email. Check SendGrid configuration.");
    } finally {
      setSendingEmail(false);
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
                {order.comments && (
                  <p className="text-yellow-500 text-sm mt-1">📝 Has special instructions</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder && !showEmailDialog} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="bg-[#1A1A1A] border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {(settings?.header_logo || settings?.footer_logo) && (
                  <img 
                    src={settings?.header_logo || settings?.footer_logo} 
                    alt="Logo" 
                    className="h-10 w-auto object-contain"
                  />
                )}
                <DialogTitle className="text-white">Order Details</DialogTitle>
              </div>
            </div>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Action Buttons */}
              <div className="flex gap-2 pb-4 border-b border-white/10">
                <Button
                  onClick={() => setShowEmailDialog(true)}
                  className="btn-primary"
                >
                  <Mail size={16} className="mr-2" />
                  Email to Chef
                </Button>
                <Button
                  onClick={handlePrintPDF}
                  variant="outline"
                  className="btn-secondary"
                >
                  <Printer size={16} className="mr-2" />
                  Print / PDF
                </Button>
              </div>

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
                <div className="space-y-3">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="bg-[#2A2A2A] rounded-lg p-3">
                      <div className="flex justify-between text-white">
                        <span className="font-medium">{item.quantity}x {item.name}</span>
                        <span>${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                      {item.meat_choice && (
                        <p className="text-white/60 text-sm mt-1">Meat: {item.meat_choice}</p>
                      )}
                      {item.toppings && item.toppings.length > 0 && (
                        <p className="text-white/60 text-sm mt-1">
                          Add-ons: {item.toppings.map(t => t.name).join(', ')}
                        </p>
                      )}
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

              {/* Notes Section - Always visible, highlighted if has content */}
              <div className={`border-t border-white/10 pt-4 ${selectedOrder.comments ? 'bg-yellow-500/10 -mx-6 px-6 py-4 border border-yellow-500/30 rounded-lg' : ''}`}>
                <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                  📝 Notes / Special Instructions
                </h4>
                {selectedOrder.comments ? (
                  <p className="text-white whitespace-pre-wrap">{selectedOrder.comments}</p>
                ) : (
                  <p className="text-white/40 italic">No special instructions</p>
                )}
              </div>
            </div>
          )}

          {/* Hidden printable version */}
          <div className="hidden">
            <PrintableOrder ref={printRef} order={selectedOrder} settings={settings} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="bg-[#1A1A1A] border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Mail size={20} className="text-red-500" />
              Send Order to Kitchen
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-white/70">Send to Email</Label>
              <Input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="chef@restaurant.com"
                className="input-dark mt-1"
              />
              <p className="text-white/50 text-xs mt-1">
                The order details will be formatted nicely with all items and notes
              </p>
            </div>

            {selectedOrder && (
              <div className="bg-[#2A2A2A] rounded-lg p-4 text-sm">
                <p className="text-white/60">Order: <span className="text-white font-mono">{selectedOrder.order_id}</span></p>
                <p className="text-white/60">Customer: <span className="text-white">{selectedOrder.customer_name}</span></p>
                <p className="text-white/60">Total: <span className="text-red-500 font-bold">${selectedOrder.total?.toFixed(2)}</span></p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowEmailDialog(false)} className="btn-secondary">
                Cancel
              </Button>
              <Button onClick={handleSendEmail} disabled={sendingEmail} className="btn-primary">
                <Mail size={16} className="mr-2" />
                {sendingEmail ? 'Sending...' : 'Send Email'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderManager;
