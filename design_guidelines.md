# Design Guidelines: Restaurant Dish Selling Platform

## Design Approach
**Reference-Based:** Drawing from Toast POS, Square for Restaurants, and Shopify's merchant experience, combined with Linear's clean efficiency and Airbnb's product showcase aesthetics. This hybrid B2B tool requires both operational efficiency and visual appeal to showcase food beautifully.

## Core Design Elements

### Typography
- **Primary Font:** Inter (Google Fonts) - clean, modern, highly legible
- **Headings:** Font weights 600-700, sizes from text-3xl (dashboard titles) to text-lg (card headers)
- **Body Text:** Font weight 400-500, text-base for descriptions, text-sm for metadata
- **Numbers/Prices:** Font weight 600, slightly larger for emphasis

### Layout System
**Spacing Primitives:** Use Tailwind units of 3, 4, 6, and 8 primarily
- Component padding: p-4, p-6
- Section spacing: py-8, py-12
- Grid gaps: gap-4, gap-6
- Margins: m-3, m-4, m-6

**Grid Structure:**
- Dashboard: 12-column responsive grid
- Dish cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Forms: Single column max-w-2xl for focused input

### Component Library

**Navigation:**
- Left sidebar (fixed, w-64) with collapsible menu on mobile
- Logo/restaurant name at top
- Main sections: Dashboard, Menu Items, Orders, Analytics, Settings
- Active state with subtle background indicator

**Dish Cards:**
- Square aspect ratio food images (essential)
- Image hover zoom effect (subtle scale-105)
- Overlay gradient on images for text readability
- Price badge (top-right corner, semi-transparent backdrop)
- Quick action buttons (Edit, Duplicate, Archive) on hover
- Status indicator (Active/Inactive) as colored dot + text

**Forms & Inputs:**
- Clean, bordered inputs (border-2) with focus states
- Image upload with drag-drop zone and preview
- Price input with currency symbol prefix
- Category dropdown with search
- Description textarea with character count
- Toggle switches for availability status

**Dashboard Stats:**
- 4-column grid (stacks on mobile) showing: Today's Sales, Active Dishes, Total Orders, Top Seller
- Each stat card has large number (text-3xl), label (text-sm), and trend indicator

**Data Tables:**
- Recent orders table with: Order ID, Items, Total, Status, Time
- Sortable columns, search filter at top
- Row actions dropdown (View, Print, Refund)

**Action Buttons:**
- Primary CTA: "Add New Dish" (prominent, top-right of menu section)
- Secondary actions: outlined style
- Destructive actions: text-red-600 with confirmation modal

**Modals:**
- Add/Edit dish modal (full-screen on mobile, centered on desktop)
- Image preview lightbox
- Confirmation dialogs (centered, max-w-md)

### Images

**Hero Section:** 
Large hero banner (h-64 lg:h-80) on the main dashboard welcome area showing a high-quality, appetizing spread of restaurant dishes with warm lighting. Text overlay with blurred backdrop (backdrop-blur-md bg-white/20) containing restaurant name and quick stats.

**Dish Images:**
Square thumbnails (aspect-square) throughout the interface - these are critical for the selling experience. Each dish needs a high-quality, well-lit photo showing the food appealingly plated.

**Empty States:**
Illustrative placeholder when no dishes are added yet - friendly image encouraging owners to "Add your first dish."

**Image Guidelines:**
- Professional food photography aesthetic
- Consistent aspect ratios across all dish photos
- Warm, natural lighting preferred
- Focus on the dish, minimal props
- Upload size recommendations: 800x800px minimum

### Animations
Use sparingly - card hover states (scale, shadow), smooth modal transitions (fade-in), loading spinners for data fetch. No distracting animations that slow down workflow.

### Key UX Patterns
- Inline editing for quick price/availability updates
- Bulk actions for managing multiple dishes
- Quick filters (All, Active, Out of Stock, By Category)
- Toast notifications for successful actions
- Auto-save drafts for dish creation
- Mobile-optimized touch targets (min 44x44px)

**Critical Features:**
- Real-time order notifications
- One-click dish activation/deactivation
- Revenue analytics with visual charts
- Customer feedback section per dish
- QR code generator for menu sharing

This platform prioritizes speed and visual appeal - restaurant owners need to manage their menu efficiently while presenting dishes beautifully to customers.