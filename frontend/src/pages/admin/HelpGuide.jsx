import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronDown, ChevronRight, ShoppingCart, UtensilsCrossed, Users,
  Settings, Image, FileText, MessageSquare, Star, Globe, Layout,
  Receipt, TrendingUp, HelpCircle, ShoppingBag, Crown
} from "lucide-react";

// Mascot images from Nic Nackables
const MASCOT_IMAGES = {
  main: "https://customer-assets-0z36b82j.emergentagent.net/job_df175a16-41d0-451b-88d8-ff076a4b992e/artifacts/b6npnx8f_photo_2026-08-23_11-38-28%20%282%29.jpg",
  grilling: "https://customer-assets-0z36b82j.emergentagent.net/job_df175a16-41d0-451b-88d8-ff076a4b992e/artifacts/tnlst7ab_photo_2026-08-23_11-38-38.jpg",
  standing: "https://customer-assets-0z36b82j.emergentagent.net/job_df175a16-41d0-451b-88d8-ff076a4b992e/artifacts/gh4dg75a_photo_2026-08-23_11-38-42.jpg",
  poses: "https://customer-assets-0z36b82j.emergentagent.net/job_df175a16-41d0-451b-88d8-ff076a4b992e/artifacts/c57qdrk8_photo_2026-08-23_11-38-48.jpg"
};

const guideCategories = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: Crown,
    mascotTip: "Welcome to the Flavorhood! Let me show you around your admin kitchen.",
    sections: [
      {
        title: "Dashboard Overview",
        content: `Your Dashboard is home base—the first thing you'll see when you log in. Here you can:
        
• Check today's order count and revenue at a glance
• See how many unread messages are waiting
• Monitor which staff members are currently online
• Get quick stats on menu items and testimonials

Think of it as your BBQ command center. One look and you know exactly what's cooking!`
      },
      {
        title: "Understanding User Roles",
        content: `We've got three types of folks who can access this admin panel:

**Admin (You!)** - Full access to everything. You can manage users, see platform fees, change any setting.

**Store Owner** - Can manage orders, menu, and most settings. Can't see platform fees or manage user roles.

**Staff** - Limited access for day-to-day operations. Can process orders via POS, view messages, and help with basic tasks.

Only you (the admin) can promote someone to Staff or Store Owner through the Users page.`
      }
    ]
  },
  {
    id: "pos",
    title: "Quick Order (POS)",
    icon: Receipt,
    mascotTip: "When customers walk up hungry, this is your go-to! Fast ordering, no fuss.",
    sections: [
      {
        title: "Taking Walk-In Orders",
        content: `The POS system is built for speed when customers are standing right in front of you:

1. **Browse or Search** - Use the search bar or tap category buttons to find items fast
2. **Add to Cart** - Click any item to add it. Click the + button to add more
3. **Customer Info** - Enter their name, phone, and email (all optional for walk-ins)
4. **Order Notes** - Add special requests like "extra sauce" or "no onions"
5. **Place Order** - Hit that button and you're done!

The system automatically tracks who took the order, so you always know which staff member processed it.`
      },
      {
        title: "Custom Items",
        content: `Sometimes customers want something special that's not on the menu:

1. Click the green **"Custom Item"** button at the top
2. Enter the item name (e.g., "Extra Large Brisket Special")
3. Set the price
4. Choose quantity
5. Add to order!

Custom items show up with a yellow "(Custom)" tag so you can track them separately.`
      }
    ]
  },
  {
    id: "orders",
    title: "Managing Orders",
    icon: ShoppingCart,
    mascotTip: "This is where the magic happens! Keep those orders flowing smooth.",
    sections: [
      {
        title: "Order Statuses",
        content: `Every order goes through stages. Here's what each status means:

• **Pending** - Just came in, hasn't been looked at yet
• **Confirmed** - You've seen it and accepted it
• **Preparing** - Currently being made in the kitchen
• **Ready** - Done cooking, waiting for pickup
• **Completed** - Customer picked it up, all done!
• **Cancelled** - Order was cancelled

Use the dropdown on each order to update its status as it moves through your kitchen.`
      },
      {
        title: "Viewing Order Details",
        content: `Click **"View"** on any order to see everything:

• Full customer contact info
• Complete item list with quantities and prices
• Any special instructions (highlighted in yellow!)
• Order totals including tax
• Who took the order (for POS orders)

From here you can also **Email to Chef** to send order details to the kitchen, or **Print/PDF** for a paper copy.`
      },
      {
        title: "Financials Tab",
        content: `The Financials tab gives you the money breakdown:

• See orders by day for the whole week
• Track total revenue
• View admin fees
• Navigate between weeks to compare performance

This helps you understand your busiest days and plan accordingly.`
      }
    ]
  },
  {
    id: "menu",
    title: "Menu Management",
    icon: UtensilsCrossed,
    mascotTip: "Keep that menu looking good and tasting better! This is where you build your food empire.",
    sections: [
      {
        title: "Adding Menu Items",
        content: `To add a new menu item:

1. Click **"Add Item"** button
2. Fill in the basics:
   - **Name** - What you call it
   - **Description** - Make it sound delicious!
   - **Price** - What you're charging
   - **Category** - Which section it belongs to
3. Add an image (recommended size: 600x450px)
4. Save and it's live!

Pro tip: Good photos sell food. Take pics in natural light for best results.`
      },
      {
        title: "Managing Categories",
        content: `Categories organize your menu into sections like "Flavor Hood", "Sides", "Desserts", etc.

To add a category:
1. Click the **"Add Category"** button
2. Give it a name
3. Optionally add a description
4. Save!

You can drag categories to reorder them. Items will display in the order you set.`
      },
      {
        title: "Item Availability",
        content: `Run out of something? No problem!

Toggle the **"Available"** switch on any item to hide it from customers without deleting it. When you restock, just flip it back on.

This is better than deleting because you keep all your item info and can bring it back instantly.`
      }
    ]
  },
  {
    id: "media",
    title: "Media Library",
    icon: Image,
    mascotTip: "A picture's worth a thousand words—and hungry customers! Keep your images organized here.",
    sections: [
      {
        title: "Uploading Images",
        content: `Your Media Library stores all images for the site:

**To upload:**
1. Go to Media in the sidebar
2. Click **"Upload"** or drag-and-drop files
3. Images are automatically stored in the cloud

**Recommended sizes:**
• Menu items: 600 x 450px
• Hero images: 1920 x 800px
• About section: 800 x 1000px

Larger images work but will be resized automatically.`
      },
      {
        title: "Site Images Tab",
        content: `The Site Images tab shows where images are used across your site:

• Header Logo
• Footer Logo
• Hero Background
• About Section Image
• And more...

Click any slot to open the Media Picker and choose an image from your library.`
      },
      {
        title: "Storage Dashboard",
        content: `The Storage tab shows you:

• How much cloud storage you're using
• Which files are stored locally vs. in the cloud
• Option to migrate local files to cloud

Cloud storage means your images survive even when the site updates. Always migrate important images to the cloud!`
      }
    ]
  },
  {
    id: "users",
    title: "User Management",
    icon: Users,
    mascotTip: "Your people are your power! Manage your team and customers right here.",
    sections: [
      {
        title: "Viewing Users",
        content: `The Users page shows everyone who's registered:

• Search by name, email, or phone
• See their role (Customer, Staff, Store Owner)
• View when they joined
• Check if they're subscribed to newsletters

Admin accounts are marked with a shield icon.`
      },
      {
        title: "Changing User Roles",
        content: `To promote someone to Staff or Store Owner:

1. Find them in the user list
2. Click the **role badge** (e.g., "Customer")
3. Select the new role from the dropdown
4. Confirm the change

**Staff** can: Process POS orders, view messages, manage media
**Store Owner** can: Everything except user management and platform fees`
      },
      {
        title: "Exporting Customer Emails",
        content: `Need to send a marketing email or newsletter?

Click the **"Export Emails CSV"** button to download a spreadsheet with:
• All customer emails
• Names and phone numbers
• Newsletter subscription status
• Join dates

Import this into Mailchimp, Constant Contact, or any email marketing tool.`
      }
    ]
  },
  {
    id: "settings",
    title: "Settings",
    icon: Settings,
    mascotTip: "Fine-tune your restaurant's online presence. Every detail matters!",
    sections: [
      {
        title: "General Settings",
        content: `Basic info that appears throughout your site:

• **Site Name** - Your restaurant name
• **Tagline** - Short slogan or description
• **Contact Info** - Phone, email, address
• **Social Links** - Facebook, Instagram, Twitter, etc.

These show up in the header, footer, and contact section automatically.`
      },
      {
        title: "Navigation Menu",
        content: `Customize what links appear in your main navigation:

1. Go to Settings > Navigation
2. Add, remove, or reorder menu items
3. Toggle visibility for each link
4. Set external links to open in new tabs

Changes appear immediately on the live site.`
      },
      {
        title: "Payment Settings",
        content: `Configure how you get paid:

**Stripe** - For credit card payments. Enter your API keys to go live.

**Manual Payments** - Enable CashApp, Venmo, or PayPal with QR codes that customers can scan.

You can have both active—customers choose at checkout.`
      }
    ]
  },
  {
    id: "analytics",
    title: "Analytics",
    icon: TrendingUp,
    mascotTip: "Numbers don't lie! See how your site's performing and who's visiting.",
    sections: [
      {
        title: "Visitor Statistics",
        content: `The Analytics page tracks everyone who visits your site:

• **Total Visits** - How many people came
• **Unique Visitors** - Individual people (not repeat visits)
• **Page Views** - Which pages are most popular
• **Traffic Sources** - Where visitors come from

Use this to understand your busiest times and most popular content.`
      },
      {
        title: "Online Users",
        content: `See who's currently active on your admin panel:

• Staff members currently logged in
• Which pages they're viewing
• How long they've been active

Great for knowing who's on duty and coordinating with your team.`
      }
    ]
  }
];

const HelpGuide = () => {
  const [expandedCategory, setExpandedCategory] = useState("getting-started");
  const [expandedSection, setExpandedSection] = useState(null);

  const toggleCategory = (categoryId) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
    setExpandedSection(null);
  };

  const toggleSection = (sectionIndex) => {
    setExpandedSection(expandedSection === sectionIndex ? null : sectionIndex);
  };

  const currentCategory = guideCategories.find(c => c.id === expandedCategory);

  return (
    <div className="max-w-6xl mx-auto" data-testid="help-guide">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-900/40 via-[#1A1A1A] to-[#1A1A1A] border border-white/10 mb-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl"></div>
        <div className="relative p-8 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                <HelpCircle className="text-red-500" size={24} />
              </div>
              <div>
                <h1 className="text-3xl font-display font-bold text-white">Help & Guide</h1>
                <p className="text-white/60">Your complete admin manual</p>
              </div>
            </div>
            <p className="text-white/80 text-lg leading-relaxed">
              Welcome to the Nic Nackables Admin Guide! Everything you need to know about 
              running your BBQ empire is right here. Click any section to learn more.
            </p>
          </div>
          <div className="w-48 h-48 flex-shrink-0">
            <img 
              src={MASCOT_IMAGES.standing}
              alt="Nic Nackables Mascot"
              className="w-full h-full object-contain drop-shadow-2xl"
            />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <div className="card-dark p-4 sticky top-4">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Crown className="text-yellow-500" size={18} />
              Guide Sections
            </h2>
            <nav className="space-y-1">
              {guideCategories.map((category) => {
                const Icon = category.icon;
                const isActive = expandedCategory === category.id;
                return (
                  <button
                    key={category.id}
                    onClick={() => toggleCategory(category.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                      isActive 
                        ? "bg-red-500/20 text-red-400 border border-red-500/30" 
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Icon size={18} className={isActive ? "text-red-400" : "text-white/50"} />
                    <span className="flex-1 font-medium">{category.title}</span>
                    <ChevronRight 
                      size={16} 
                      className={`transition-transform ${isActive ? "rotate-90" : ""}`}
                    />
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {currentCategory && (
              <motion.div
                key={currentCategory.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                {/* Category Header with Mascot Tip */}
                <div className="card-dark p-6 mb-6">
                  <div className="flex items-start gap-4">
                    <img 
                      src={MASCOT_IMAGES.poses}
                      alt="Nic Tips"
                      className="w-20 h-20 object-cover rounded-xl border-2 border-yellow-500/30"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-yellow-500 font-bold">Nic&apos;s Tip:</span>
                      </div>
                      <p className="text-white/90 text-lg italic">&ldquo;{currentCategory.mascotTip}&rdquo;</p>
                    </div>
                  </div>
                </div>

                {/* Sections */}
                <div className="space-y-4">
                  {currentCategory.sections.map((section, idx) => (
                    <div 
                      key={idx}
                      className="card-dark overflow-hidden"
                    >
                      <button
                        onClick={() => toggleSection(idx)}
                        className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition-colors"
                      >
                        <h3 className="text-white font-semibold text-lg">{section.title}</h3>
                        <ChevronDown 
                          size={20} 
                          className={`text-white/50 transition-transform ${
                            expandedSection === idx ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      <AnimatePresence>
                        {expandedSection === idx && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="px-5 pb-5 border-t border-white/10">
                              <div className="pt-4 text-white/80 whitespace-pre-line leading-relaxed">
                                {section.content}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer with Mascot */}
      <div className="mt-12 card-dark p-8">
        <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
          <img 
            src={MASCOT_IMAGES.main}
            alt="Nic Nackables BBQ"
            className="w-32 h-auto object-contain"
          />
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-2">Still Got Questions?</h3>
            <p className="text-white/70">
              If you can&apos;t find what you&apos;re looking for in this guide, don&apos;t hesitate to reach out! 
              We&apos;re here to help you succeed. Contact support or check the FAQ section for more answers.
            </p>
          </div>
          <div className="flex-shrink-0">
            <a 
              href="/admin/faq" 
              className="btn-primary px-6 py-3 rounded-lg inline-flex items-center gap-2"
            >
              <HelpCircle size={18} />
              View FAQ
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpGuide;
