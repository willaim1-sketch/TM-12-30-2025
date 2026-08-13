import { Helmet } from "react-helmet-async";

const SEO = ({ 
  title, 
  description, 
  keywords,
  ogTitle,
  ogDescription,
  ogImage,
  canonicalUrl,
  settings 
}) => {
  // Use settings as fallbacks if available
  const siteTitle = title || settings?.meta_title || settings?.site_name || "Nic Nackables BBQ & More";
  const siteDescription = description || settings?.meta_description || "Los Angeles, California Food Catering Service. BBQ, comfort food, and more!";
  const siteKeywords = keywords || "BBQ, barbecue, catering, Los Angeles, California, Nic Nackables, food service";
  
  return (
    <Helmet>
      <title>{siteTitle}</title>
      <meta name="description" content={siteDescription} />
      <meta name="keywords" content={siteKeywords} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={ogTitle || siteTitle} />
      <meta property="og:description" content={ogDescription || siteDescription} />
      {ogImage && <meta property="og:image" content={ogImage} />}
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={ogTitle || siteTitle} />
      <meta name="twitter:description" content={ogDescription || siteDescription} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}
      
      {/* Canonical URL */}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      
      {/* Favicon from settings */}
      {settings?.favicon && <link rel="icon" href={settings.favicon} />}
    </Helmet>
  );
};

export default SEO;
