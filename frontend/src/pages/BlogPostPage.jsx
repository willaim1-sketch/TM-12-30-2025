import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { ArrowLeft, Calendar, User } from "lucide-react";
import { Button } from "../components/ui/button";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const BlogPostPage = () => {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await axios.get(`${API}/blog/posts/${slug}`);
        setPost(response.data);
      } catch (error) {
        console.error("Error fetching blog post:", error);
        setError("Post not found");
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h2 className="text-3xl font-display font-bold text-white mb-4">Post Not Found</h2>
          <p className="text-white/60 mb-8">The blog post you're looking for doesn't exist.</p>
          <Link to="/blog">
            <Button className="btn-primary" data-testid="back-to-blog-btn">Back to Blog</Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <header className="glass border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/blog" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors" data-testid="post-back-btn">
            <ArrowLeft size={20} />
            <span>Back to Blog</span>
          </Link>
          <Link to="/order">
            <Button className="btn-primary" data-testid="post-order-btn">Order Online</Button>
          </Link>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-6 py-16">
        {/* Featured Image */}
        {post.featured_image && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="aspect-video rounded-lg overflow-hidden mb-8"
          >
            <img
              src={post.featured_image}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </motion.div>
        )}

        {/* Meta */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-6 text-white/60 text-sm mb-6"
        >
          <div className="flex items-center gap-2">
            <Calendar size={16} />
            <span>
              {new Date(post.created_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <User size={16} />
            <span>Nic Nackables</span>
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-4xl lg:text-5xl font-display font-bold text-white mb-8"
        >
          {post.title}
        </motion.h1>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="prose prose-invert prose-lg max-w-none"
        >
          <div 
            className="text-white/80 leading-relaxed space-y-6"
            dangerouslySetInnerHTML={{ __html: post.content.replace(/\n/g, '<br />') }}
          />
        </motion.div>

        {/* Share / Back */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-12 pt-8 border-t border-white/10"
        >
          <Link to="/blog">
            <Button variant="outline" className="btn-secondary" data-testid="post-back-blog-btn">
              <ArrowLeft size={18} className="mr-2" />
              Back to All Posts
            </Button>
          </Link>
        </motion.div>
      </article>

      {/* Footer CTA */}
      <section className="py-16 px-6 bg-[#1A1A1A] border-t border-white/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-display font-bold text-white mb-4">
            Ready to Try Our Tamales?
          </h2>
          <p className="text-white/60 mb-8">
            Order online and experience authentic gourmet flavors!
          </p>
          <Link to="/order">
            <Button className="btn-primary" data-testid="post-footer-order-btn">Order Now</Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default BlogPostPage;
