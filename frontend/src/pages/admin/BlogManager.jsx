import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { Plus, Edit, Trash2, Save, Eye, EyeOff, Info } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Switch } from "../../components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Image dimension guide component
const ImageDimensionGuide = ({ width, height, description }) => (
  <div className="flex items-center gap-2 mt-1 text-xs">
    <Info size={12} className="text-red-500" />
    <span className="text-white/50">
      Recommended: <span className="text-red-400 font-mono">{width} × {height}px</span>
      {description && <span className="text-white/40"> • {description}</span>}
    </span>
  </div>
);

const BlogManager = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    featured_image: "",
    meta_title: "",
    meta_description: "",
    is_published: false
  });

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await axios.get(`${API}/admin/blog/posts`, { withCredentials: true });
      setPosts(response.data);
    } catch (error) {
      toast.error("Failed to load blog posts");
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleTitleChange = (title) => {
    setForm(prev => ({
      ...prev,
      title,
      slug: editing ? prev.slug : generateSlug(title)
    }));
  };

  const handleSave = async () => {
    if (!form.title || !form.slug || !form.content) {
      toast.error("Please fill in required fields");
      return;
    }

    try {
      if (editing) {
        await axios.put(`${API}/admin/blog/posts/${editing.post_id}`, form, { withCredentials: true });
        toast.success("Post updated");
      } else {
        await axios.post(`${API}/admin/blog/posts`, form, { withCredentials: true });
        toast.success("Post created");
      }

      setShowDialog(false);
      resetForm();
      fetchPosts();
    } catch (error) {
      toast.error("Failed to save post");
    }
  };

  const handleDelete = async (postId) => {
    if (!window.confirm("Delete this post?")) return;

    try {
      await axios.delete(`${API}/admin/blog/posts/${postId}`, { withCredentials: true });
      toast.success("Post deleted");
      fetchPosts();
    } catch (error) {
      toast.error("Failed to delete post");
    }
  };

  const openEdit = (post) => {
    setEditing(post);
    setForm({
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt || "",
      featured_image: post.featured_image || "",
      meta_title: post.meta_title || "",
      meta_description: post.meta_description || "",
      is_published: post.is_published
    });
    setShowDialog(true);
  };

  const resetForm = () => {
    setEditing(null);
    setForm({
      title: "", slug: "", content: "", excerpt: "",
      featured_image: "", meta_title: "", meta_description: "", is_published: false
    });
  };

  if (loading) {
    return <div className="text-white">Loading posts...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-display font-bold text-white">Blog Posts</h1>
        <Button 
          onClick={() => { resetForm(); setShowDialog(true); }}
          className="btn-primary"
          data-testid="add-post-btn"
        >
          <Plus size={18} className="mr-2" />
          New Post
        </Button>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-20 card-dark">
          <p className="text-white/60 mb-4">No blog posts yet</p>
          <Button onClick={() => { resetForm(); setShowDialog(true); }} className="btn-primary">
            Write Your First Post
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <motion.div
              key={post.post_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-dark p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-white font-semibold text-lg">{post.title}</h3>
                    <Badge className={post.is_published ? "bg-green-600" : "bg-white/30"}>
                      {post.is_published ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  <p className="text-white/60 text-sm mb-2">/{post.slug}</p>
                  <p className="text-white/50 text-sm line-clamp-2">
                    {post.excerpt || post.content?.substring(0, 150)}...
                  </p>
                  <p className="text-white/40 text-xs mt-2">
                    {new Date(post.created_at).toLocaleDateString()}
                  </p>
                </div>

                {post.featured_image && (
                  <img 
                    src={post.featured_image} 
                    alt={post.title}
                    className="w-32 h-20 object-cover rounded-lg"
                  />
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={() => openEdit(post)}
                    variant="outline"
                    size="sm"
                    className="btn-secondary"
                    data-testid={`edit-post-${post.post_id}`}
                  >
                    <Edit size={14} className="mr-1" />
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleDelete(post.post_id)}
                    variant="destructive"
                    size="sm"
                    data-testid={`delete-post-${post.post_id}`}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Post Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-[#1A1A1A] border-white/10 max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editing ? 'Edit Post' : 'New Post'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <Label className="text-white/70">Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="input-dark mt-1"
                placeholder="My Amazing Blog Post"
                data-testid="post-title-input"
              />
            </div>

            <div>
              <Label className="text-white/70">Slug *</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm(prev => ({ ...prev, slug: e.target.value }))}
                className="input-dark mt-1"
                placeholder="my-amazing-blog-post"
                data-testid="post-slug-input"
              />
            </div>

            <div>
              <Label className="text-white/70">Content *</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm(prev => ({ ...prev, content: e.target.value }))}
                className="input-dark mt-1 min-h-[200px]"
                placeholder="Write your post content here..."
                data-testid="post-content-input"
              />
            </div>

            <div>
              <Label className="text-white/70">Excerpt (Short description)</Label>
              <Textarea
                value={form.excerpt}
                onChange={(e) => setForm(prev => ({ ...prev, excerpt: e.target.value }))}
                className="input-dark mt-1"
                placeholder="Brief summary of the post"
                data-testid="post-excerpt-input"
              />
            </div>

            <div>
              <Label className="text-white/70">Featured Image URL</Label>
              <Input
                value={form.featured_image}
                onChange={(e) => setForm(prev => ({ ...prev, featured_image: e.target.value }))}
                className="input-dark mt-1"
                placeholder="https://..."
                data-testid="post-image-input"
              />
            </div>

            <div className="border-t border-white/10 pt-6">
              <h4 className="text-white font-semibold mb-4">SEO Settings</h4>
              <div className="space-y-4">
                <div>
                  <Label className="text-white/70">Meta Title</Label>
                  <Input
                    value={form.meta_title}
                    onChange={(e) => setForm(prev => ({ ...prev, meta_title: e.target.value }))}
                    className="input-dark mt-1"
                    placeholder="Custom SEO title"
                    data-testid="post-meta-title-input"
                  />
                </div>
                <div>
                  <Label className="text-white/70">Meta Description</Label>
                  <Textarea
                    value={form.meta_description}
                    onChange={(e) => setForm(prev => ({ ...prev, meta_description: e.target.value }))}
                    className="input-dark mt-1"
                    placeholder="Custom SEO description"
                    data-testid="post-meta-description-input"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_published}
                onCheckedChange={(checked) => setForm(prev => ({ ...prev, is_published: checked }))}
                data-testid="post-publish-switch"
              />
              <Label className="text-white/70">
                {form.is_published ? (
                  <span className="flex items-center gap-1"><Eye size={16} /> Published</span>
                ) : (
                  <span className="flex items-center gap-1"><EyeOff size={16} /> Draft</span>
                )}
              </Label>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-white/10">
              <Button variant="outline" onClick={() => setShowDialog(false)} className="btn-secondary">
                Cancel
              </Button>
              <Button onClick={handleSave} className="btn-primary" data-testid="save-post-btn">
                <Save size={18} className="mr-2" />
                {editing ? 'Update Post' : 'Create Post'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BlogManager;
