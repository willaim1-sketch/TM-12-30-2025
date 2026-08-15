import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Users, Search, Trash2, Key, Mail, Phone, Calendar,
  Shield, User as UserIcon, AlertTriangle, Eye, EyeOff, UserCog
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "../../components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "../../components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../../components/ui/select";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const UserManager = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("customer");
  const [showPassword, setShowPassword] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/admin/users`, { withCredentials: true });
      setUsers(response.data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) return;
    
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      setActionLoading(true);
      await axios.post(
        `${API}/admin/users/${selectedUser.user_id}/reset-password`,
        { new_password: newPassword },
        { withCredentials: true }
      );
      toast.success(`Password reset for ${selectedUser.email}`);
      setShowResetDialog(false);
      setNewPassword("");
      setSelectedUser(null);
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error(error.response?.data?.detail || "Failed to reset password");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      setActionLoading(true);
      await axios.delete(
        `${API}/admin/users/${selectedUser.user_id}`,
        { withCredentials: true }
      );
      toast.success(`User ${selectedUser.email} deleted`);
      setUsers(users.filter(u => u.user_id !== selectedUser.user_id));
      setShowDeleteDialog(false);
      setSelectedUser(null);
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error(error.response?.data?.detail || "Failed to delete user");
    } finally {
      setActionLoading(false);
    }
  };

  const openResetDialog = (user) => {
    setSelectedUser(user);
    setNewPassword("");
    setShowPassword(false);
    setShowResetDialog(true);
  };

  const openDeleteDialog = (user) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  const openRoleDialog = (user) => {
    setSelectedUser(user);
    setNewRole(user.role || "customer");
    setShowRoleDialog(true);
  };

  const handleChangeRole = async () => {
    if (!selectedUser) return;

    try {
      setActionLoading(true);
      const response = await axios.put(
        `${API}/admin/users/${selectedUser.user_id}/role`,
        { role: newRole },
        { withCredentials: true }
      );
      toast.success(`${selectedUser.email} is now a ${newRole}`);
      // Update local state
      setUsers(users.map(u => 
        u.user_id === selectedUser.user_id ? response.data : u
      ));
      setShowRoleDialog(false);
      setSelectedUser(null);
    } catch (error) {
      console.error("Error changing role:", error);
      toast.error(error.response?.data?.detail || "Failed to change role");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.email?.toLowerCase().includes(searchLower) ||
      user.first_name?.toLowerCase().includes(searchLower) ||
      user.last_name?.toLowerCase().includes(searchLower) ||
      user.phone?.includes(searchTerm)
    );
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    } catch {
      return "N/A";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div data-testid="user-manager">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
            <Users className="text-red-500" />
            User Management
          </h1>
          <p className="text-white/60 mt-1">
            {users.length} registered user{users.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={20} />
          <Input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
            data-testid="user-search-input"
          />
        </div>
      </div>

      {/* Users List */}
      <div className="space-y-4">
        {filteredUsers.length === 0 ? (
          <div className="card-dark p-8 text-center">
            <Users className="mx-auto text-white/20 mb-4" size={48} />
            <p className="text-white/60">
              {searchTerm ? "No users match your search" : "No registered users yet"}
            </p>
          </div>
        ) : (
          filteredUsers.map((user, idx) => (
            <motion.div
              key={user.user_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="card-dark p-4 sm:p-6"
              data-testid={`user-card-${user.user_id}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* User Info */}
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    user.is_admin ? "bg-red-500/20" : "bg-white/10"
                  }`}>
                    {user.is_admin ? (
                      <Shield className="text-red-500" size={24} />
                    ) : (
                      <UserIcon className="text-white/60" size={24} />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-semibold text-white truncate">
                        {user.first_name || user.name || "User"} {user.last_name || ""}
                      </h3>
                      {user.is_admin && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-400 rounded-full">
                          Admin
                        </span>
                      )}
                      {user.is_store_owner && !user.is_admin && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-green-500/20 text-green-400 rounded-full">
                          Store Owner
                        </span>
                      )}
                      {user.is_staff && !user.is_admin && !user.is_store_owner && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-purple-500/20 text-purple-400 rounded-full">
                          Staff
                        </span>
                      )}
                      {user.role === "customer" && !user.is_admin && !user.is_staff && !user.is_store_owner && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-400 rounded-full">
                          Customer
                        </span>
                      )}
                    </div>
                    
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-2 text-sm text-white/60">
                        <Mail size={14} />
                        <span className="truncate">{user.email}</span>
                      </div>
                      
                      {user.phone && (
                        <div className="flex items-center gap-2 text-sm text-white/60">
                          <Phone size={14} />
                          <span>{user.phone}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 text-sm text-white/40">
                        <Calendar size={14} />
                        <span>Joined {formatDate(user.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 sm:flex-shrink-0 flex-wrap">
                  {!user.is_admin && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openRoleDialog(user)}
                        className="btn-secondary text-sm"
                        data-testid={`change-role-btn-${user.user_id}`}
                      >
                        <UserCog size={16} className="mr-1" />
                        {user.is_staff ? 'Staff' : 'Customer'}
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openResetDialog(user)}
                        className="btn-secondary text-sm"
                        data-testid={`reset-password-btn-${user.user_id}`}
                      >
                        <Key size={16} className="mr-1" />
                        Reset
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDeleteDialog(user)}
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                        data-testid={`delete-user-btn-${user.user_id}`}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </>
                  )}
                  
                  {user.is_admin && (
                    <span className="text-sm text-white/40 italic">
                      Protected account
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Reset Password Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="bg-[#1A1A1A] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="text-red-500" size={20} />
              Reset Password
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Set a new password for {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <label className="block text-sm font-medium text-white/80 mb-2">
              New Password
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
                className="bg-white/5 border-white/10 text-white pr-10"
                data-testid="new-password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowResetDialog(false)}
              className="btn-secondary"
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResetPassword}
              className="btn-primary"
              disabled={!newPassword || newPassword.length < 6 || actionLoading}
              data-testid="confirm-reset-password-btn"
            >
              {actionLoading ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-[#1A1A1A] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle size={20} />
              Delete User Account
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Are you sure you want to delete the account for{" "}
              <span className="text-white font-medium">{selectedUser?.email}</span>?
              <br /><br />
              This action cannot be undone. The user will lose access to their account
              and any associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="bg-transparent border-white/10 text-white hover:bg-white/5"
              disabled={actionLoading}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={actionLoading}
              data-testid="confirm-delete-user-btn"
            >
              {actionLoading ? "Deleting..." : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="bg-[#1A1A1A] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="text-purple-500" size={20} />
              Change User Role
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Update the role for {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <label className="block text-sm font-medium text-white/80 mb-2">
              Select Role
            </label>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A1A] border-white/10">
                <SelectItem value="customer" className="text-white hover:bg-white/10">
                  Customer - Can place orders only
                </SelectItem>
                <SelectItem value="staff" className="text-white hover:bg-white/10">
                  Staff - Can manage orders & messages
                </SelectItem>
                <SelectItem value="store_owner" className="text-white hover:bg-white/10">
                  Store Owner - Full store access (no platform fees)
                </SelectItem>
              </SelectContent>
            </Select>
            
            <div className="mt-4 p-3 rounded-lg bg-white/5 text-sm text-white/60">
              {newRole === "store_owner" ? (
                <div>
                  <strong className="text-green-400">Store Owner permissions:</strong>
                  <ul className="mt-2 list-disc list-inside space-y-1">
                    <li>Manage menu, orders, and messages</li>
                    <li>Access analytics and media</li>
                    <li>Edit site settings and blog</li>
                    <li className="text-yellow-400">Cannot see platform fees or user management</li>
                  </ul>
                </div>
              ) : newRole === "staff" ? (
                <div>
                  <strong className="text-purple-400">Staff permissions:</strong>
                  <ul className="mt-2 list-disc list-inside space-y-1">
                    <li>View and manage orders</li>
                    <li>Update order status</li>
                    <li>Respond to customer messages</li>
                  </ul>
                </div>
              ) : (
                <div>
                  <strong className="text-blue-400">Customer permissions:</strong>
                  <ul className="mt-2 list-disc list-inside space-y-1">
                    <li>Browse menu and place orders</li>
                    <li>View order history</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRoleDialog(false)}
              className="btn-secondary"
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangeRole}
              className="btn-primary"
              disabled={actionLoading}
              data-testid="confirm-change-role-btn"
            >
              {actionLoading ? "Updating..." : "Update Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManager;
