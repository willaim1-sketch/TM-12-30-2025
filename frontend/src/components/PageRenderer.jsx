import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { ChevronRight } from "lucide-react";

// Dynamic Section Renderer - Renders sections from Page Builder
const PageRenderer = ({ sections = [], settings = {} }) => {
  if (!sections || sections.length === 0) {
    return null;
  }

  return (
    <div className="page-builder-content">
      {sections.filter(s => s.visible !== false).map((section, index) => (
        <SectionRenderer key={section.id || index} section={section} settings={settings} />
      ))}
    </div>
  );
};

// Individual Section Renderer
const SectionRenderer = ({ section, settings }) => {
  const content = section.content || {};

  switch (section.type) {
    case "hero":
      return (
        <section 
          className="relative min-h-[70vh] flex items-center justify-center px-6 py-20"
          style={{
            backgroundImage: content.backgroundImage ? `url(${content.backgroundImage})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}
        >
          {content.backgroundImage && (
            <div 
              className="absolute inset-0 bg-black" 
              style={{ opacity: (content.overlay || 60) / 100 }}
            />
          )}
          <div className={`relative z-10 max-w-4xl mx-auto text-${content.alignment || 'center'}`}>
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-7xl font-display font-bold text-white mb-6"
            >
              {content.title || "Your Headline"}
            </motion.h1>
            {content.subtitle && (
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xl md:text-2xl text-white/80 mb-8"
              >
                {content.subtitle}
              </motion.p>
            )}
            {content.buttonText && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Link to={content.buttonLink || "/"}>
                  <Button className="btn-primary text-xl px-8 py-4">
                    {content.buttonText}
                    <ChevronRight className="ml-2" />
                  </Button>
                </Link>
              </motion.div>
            )}
          </div>
        </section>
      );

    case "text":
      return (
        <section className="py-16 px-6 bg-[#0A0A0A]">
          <div 
            className="max-w-4xl mx-auto"
            style={{ maxWidth: content.maxWidth || "800px", textAlign: content.alignment || "left" }}
          >
            {content.heading && (
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                className="text-4xl font-display font-bold text-white mb-6"
              >
                {content.heading}
              </motion.h2>
            )}
            {content.content && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-white/80 text-lg leading-relaxed whitespace-pre-wrap"
              >
                {content.content}
              </motion.div>
            )}
          </div>
        </section>
      );

    case "image":
      return (
        <section className="py-12 px-6 bg-[#0A0A0A]">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
            >
              {content.src ? (
                <img 
                  src={content.src} 
                  alt={content.alt || "Image"} 
                  className="w-full object-cover"
                  style={{ 
                    width: content.width || "100%",
                    borderRadius: content.borderRadius || "8px"
                  }}
                />
              ) : (
                <div className="w-full h-64 bg-[#1A1A1A] rounded-lg flex items-center justify-center text-white/50">
                  No image set
                </div>
              )}
              {content.caption && (
                <p className="text-center text-white/60 mt-4 text-lg">{content.caption}</p>
              )}
            </motion.div>
          </div>
        </section>
      );

    case "cta":
      return (
        <section 
          className="py-20 px-6"
          style={{ backgroundColor: content.backgroundColor || "#DC2626" }}
        >
          <div className="max-w-4xl mx-auto text-center">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-display font-bold text-white mb-4"
            >
              {content.heading || "Ready to Order?"}
            </motion.h2>
            {content.text && (
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-xl text-white/90 mb-8"
              >
                {content.text}
              </motion.p>
            )}
            {content.buttonText && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Link to={content.buttonLink || "/order"}>
                  <Button className="bg-white text-red-600 hover:bg-gray-100 text-xl px-8 py-4 font-bold">
                    {content.buttonText}
                    <ChevronRight className="ml-2" />
                  </Button>
                </Link>
              </motion.div>
            )}
          </div>
        </section>
      );

    case "two_column":
      return (
        <section className="py-16 px-6 bg-[#0A0A0A]">
          <div 
            className="max-w-6xl mx-auto grid md:grid-cols-2"
            style={{ gap: content.gap || "2rem" }}
          >
            <div className="text-white/80 text-lg">
              {content.leftContent?.content || "Left column content"}
            </div>
            <div className="text-white/80 text-lg">
              {content.rightContent?.content || "Right column content"}
            </div>
          </div>
        </section>
      );

    case "three_column":
      return (
        <section className="py-16 px-6 bg-[#0A0A0A]">
          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
            <div className="text-white/80 text-lg">Column 1</div>
            <div className="text-white/80 text-lg">Column 2</div>
            <div className="text-white/80 text-lg">Column 3</div>
          </div>
        </section>
      );

    case "spacer":
      return (
        <div style={{ height: content.height || "100px" }} />
      );

    case "divider":
      return (
        <div className="px-6">
          <hr 
            className="max-w-4xl mx-auto"
            style={{
              borderStyle: content.style || "solid",
              borderColor: content.color || "#DC2626",
              borderWidth: content.thickness || "2px",
              width: content.width || "100%"
            }}
          />
        </div>
      );

    case "gallery":
      return (
        <section className="py-16 px-6 bg-[#0A0A0A]">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {(content.images || []).map((img, idx) => (
                <motion.img 
                  key={idx}
                  src={img.src}
                  alt={img.alt || `Gallery image ${idx + 1}`}
                  className="w-full h-48 object-cover rounded-lg"
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                />
              ))}
            </div>
          </div>
        </section>
      );

    case "video":
      return (
        <section className="py-16 px-6 bg-[#0A0A0A]">
          <div className="max-w-4xl mx-auto">
            {content.embedUrl ? (
              <div className="aspect-video">
                <iframe 
                  src={content.embedUrl}
                  className="w-full h-full rounded-lg"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="aspect-video bg-[#1A1A1A] rounded-lg flex items-center justify-center text-white/50">
                No video URL set
              </div>
            )}
          </div>
        </section>
      );

    case "custom_html":
      return (
        <section className="py-16 px-6 bg-[#0A0A0A]">
          <div 
            className="max-w-4xl mx-auto"
            dangerouslySetInnerHTML={{ __html: content.html || "" }}
          />
        </section>
      );

    default:
      return (
        <section className="py-16 px-6 bg-[#0A0A0A]">
          <div className="max-w-4xl mx-auto text-center text-white/50">
            Unknown section type: {section.type}
          </div>
        </section>
      );
  }
};

export default PageRenderer;
