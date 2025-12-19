import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { ArrowLeft, Calendar, ArrowRight } from "lucide-react";
import { Button } from "../components/ui/button";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const BlogPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await axios.get(`${API}/blog/posts`);
        setPosts(response.data);
      } catch (error) {
        console.error("Error fetching blog posts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="glass border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors" data-testid="blog-back-btn">
            <ArrowLeft size={20} />
            <span>Back</span>
          </Link>
          <h1 className="text-xl font-display font-bold text-white">Our Blog</h1>
          <Link to="/order">
            <Button className="btn-primary" data-testid="blog-order-btn">Order Online</Button>
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Page Title */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <p className="text-red-500 uppercase tracking-[0.2em] text-sm font-semibold mb-4">
            News & Updates
          </p>
          <h1 className="text-4xl lg:text-5xl font-display font-bold text-white">
            From Our Kitchen
          </h1>
        </motion.div>

        {posts.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <p className="text-slate-400 text-lg mb-6">No blog posts yet. Check back soon!</p>
            <Link to="/">
              <Button className="btn-secondary" data-testid="blog-home-btn">Back to Home</Button>
            </Link>
          </motion.div>
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {posts.map((post) => (
              <motion.article
                key={post.post_id}
                variants={fadeInUp}
                className="card-dark overflow-hidden group"
              >
                {/* Featured Image */}
                <div className="aspect-video overflow-hidden">
                  <img
                    src={post.featured_image || "https://images.unsplash.com/photo-1582170090097-b251ddbbf7f3?w=600"}
                    alt={post.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="flex items-center gap-2 text-slate-400 text-sm mb-3">
                    <Calendar size={14} />
                    <span>
                      {new Date(post.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>

                  <h2 className="text-xl font-display font-bold text-white mb-3 group-hover:text-red-500 transition-colors">
                    {post.title}
                  </h2>

                  <p className="text-slate-400 text-sm line-clamp-3 mb-4">
                    {post.excerpt || post.content?.substring(0, 150) + "..."}
                  </p>

                  <Link 
                    to={`/blog/${post.slug}`}
                    className="inline-flex items-center gap-2 text-red-500 font-semibold hover:gap-4 transition-all"
                    data-testid={`read-post-${post.post_id}`}
                  >
                    Read More <ArrowRight size={16} />
                  </Link>
                </div>
              </motion.article>
            ))}
          </motion.div>
        )}
      </div>

      {/* Footer CTA */}
      <section className="py-16 px-6 bg-slate-900 border-t border-slate-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-display font-bold text-white mb-4">
            Hungry Yet?
          </h2>
          <p className="text-slate-400 mb-8">
            Order our delicious tamales online and pick them up fresh!
          </p>
          <Link to="/order">
            <Button className="btn-primary" data-testid="blog-footer-order-btn">Order Now</Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default BlogPage;
