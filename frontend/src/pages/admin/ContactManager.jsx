import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { Mail, Phone, Trash2, CheckCircle, Circle } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ContactManager = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const response = await axios.get(`${API}/admin/contacts`, { withCredentials: true });
      setContacts(response.data);
    } catch (error) {
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (submissionId, isRead) => {
    try {
      await axios.put(`${API}/admin/contacts/${submissionId}`, { is_read: isRead }, { withCredentials: true });
      toast.success(isRead ? "Marked as read" : "Marked as unread");
      fetchContacts();
    } catch (error) {
      toast.error("Failed to update contact");
    }
  };

  const handleDelete = async (submissionId) => {
    if (!window.confirm("Are you sure you want to delete this message?")) return;

    try {
      await axios.delete(`${API}/admin/contacts/${submissionId}`, { withCredentials: true });
      toast.success("Message deleted");
      fetchContacts();
    } catch (error) {
      toast.error("Failed to delete message");
    }
  };

  if (loading) {
    return <div className="text-white">Loading messages...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Contact Messages</h1>
          <p className="text-white/60 mt-1">
            {contacts.filter(c => !c.is_read).length} unread messages
          </p>
        </div>
      </div>

      {contacts.length === 0 ? (
        <div className="text-center py-20 card-dark">
          <Mail className="mx-auto mb-4 text-white/60" size={48} />
          <p className="text-white/60">No messages yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {contacts.map((contact) => (
            <motion.div
              key={contact.submission_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`card-dark p-6 ${!contact.is_read ? 'border-l-4 border-l-red-600' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-white font-semibold">{contact.name}</h3>
                    {!contact.is_read && (
                      <Badge className="bg-red-600 text-white">New</Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4 text-white/60 text-sm mb-4">
                    <span className="flex items-center gap-1">
                      <Mail size={14} />
                      {contact.email}
                    </span>
                    {contact.phone && (
                      <span className="flex items-center gap-1">
                        <Phone size={14} />
                        {contact.phone}
                      </span>
                    )}
                  </div>

                  <p className="text-white/70">{contact.message}</p>

                  <p className="text-white/50 text-sm mt-4">
                    {new Date(contact.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Button
                    onClick={() => handleMarkRead(contact.submission_id, !contact.is_read)}
                    variant="outline"
                    size="sm"
                    className="btn-secondary"
                    data-testid={`toggle-read-${contact.submission_id}`}
                  >
                    {contact.is_read ? (
                      <>
                        <Circle size={14} className="mr-1" />
                        Unread
                      </>
                    ) : (
                      <>
                        <CheckCircle size={14} className="mr-1" />
                        Read
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => handleDelete(contact.submission_id)}
                    variant="destructive"
                    size="sm"
                    data-testid={`delete-contact-${contact.submission_id}`}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContactManager;
