# 🧠 CreatorHeat — Intelligent Lead Magnet Platform with Scroll Analytics

## 🔥 Vision

Turn any blog post, guide, or digital resource into an intelligent lead magnet with deep reader engagement insights.

Most creators share free content but have no idea what readers actually engage with. **CreatorHeat** changes that by providing:

- **Scroll depth heatmaps** showing which paragraphs capture attention
- **Time-based engagement tracking** per content section  
- **User journey analytics** to understand repeat visitor behavior
- **Personalized insights** to craft better user experiences

## 🎯 MVP Scope

**Goal**: Help creators publish lead magnets and track detailed user engagement through scroll analytics and time tracking.

### ✅ Core Features

- **Rich text editor** for creators (using Tiptap)
- **Public sharable links** for every document  
- **Guest and logged-in visitor tracking**
- **Scroll depth analytics** with paragraph-level heatmaps
- **Time tracking** per page and paragraph
- **User journey mapping** for repeat visitors
- **Creator dashboard** to view engagement patterns

### 📊 Analytics We Track

#### Scroll & Engagement Metrics
- **Viewport-based scroll tracking** - precise scroll depth as percentage of document height
- **Scroll reach heatmap** - visual overlay showing percentage of users who reached each section
- **Drop-off analysis** - identify exactly where readers stop engaging  
- **Max scroll depth** - furthest point reached (content completion rate)
- **Scroll behavior patterns** - rage scrolling vs deliberate reading analysis
- **Total time on page** - complete session duration tracking
- **Detailed scroll events** - stored for future advanced analytics

#### User Journey Analytics  
- **Unique page visits** - first-time vs returning visitors
- **Visit frequency charts** - how often users return
- **Page visit history by user** - complete visitor journey
- **Cross-document engagement** - which content performs best

#### Personalization Data
- **User behavior patterns** - scroll habits and preferences  
- **Content affinity** - which topics engage specific users
- **Visit timing** - when users are most active
- **Engagement progression** - how user interest evolves over time

## 🛠 Technical Implementation

### Frontend Stack
- **Next.js** - Web framework
- **Tiptap** - Rich text editor  
- **Tailwind CSS** - UI styling
- **Framer Motion** - Smooth animations

### Analytics & Tracking
- **Intersection Observer API** - Paragraph visibility tracking
- **Scroll event listeners** - Real-time scroll depth measurement
- **Performance API** - Accurate time tracking
- **Local storage** - Client-side session management

### Backend (Convex)
- **Convex Auth** - User authentication
- **Convex DB** - Real-time database
- **Convex Functions** - Analytics processing

### Hosting
- **Vercel** - Frontend deployment
- **Convex** - Backend and database hosting

## 🗂 Database Schema

### Core Tables
- `documents` - Creator content
- `analyticsSessions` - User visit tracking with scroll behavior
- `documentAnalytics` - Aggregated analytics data for efficient querying

## 🛣 Key Routes

- `/create` - Document creation with Tiptap editor
- `/dashboard` - Creator analytics dashboard  
- `/signin` - Authentication
- `/share/[slug]` - Public document with analytics tracking
- `/analytics/[documentId]` - Detailed engagement insights
- `/sales` - **🆕 Sales intelligence dashboard** with:
  - User document engagement profiles
  - Sales insights and talking points
  - Prospect identification and scoring

## 📈 Analytics Dashboard Features

### Document Overview
- **Total visits** and **unique visitors**
- **Average time on page** and **bounce rate**  
- **Scroll completion percentage**
- **Most engaged paragraphs**

### Scroll Heatmap
- **Visual heatmap** overlaid on content
- **Color-coded engagement levels**:
  - 🔴 High engagement (80%+ time spent)
  - 🟠 Medium-high engagement (60-79%)  
  - 🟡 Medium engagement (40-59%)
  - 🔵 Low engagement (<40%)

### User Journey Analytics
- **Visitor timeline** showing repeat visits
- **Engagement progression** over multiple sessions
- **Cross-document navigation** patterns
- **Personalization opportunities** based on behavior

## 🎯 Tracking Implementation

### Client-Side Tracking
```javascript
// Comprehensive scroll behavior tracking
const handleScroll = () => {
  const scrollEvent = {
    timestamp: Date.now(),
    scrollY: window.scrollY,
    scrollPercentage: calculateScrollPercentage(),
    viewportHeight: window.innerHeight,
    documentHeight: document.documentElement.scrollHeight
  };
  
  // Store individual events for pattern analysis
  scrollEvents.push(scrollEvent);
  
  // Update max scroll reached
  maxScrollPercentage = Math.max(maxScrollPercentage, scrollEvent.scrollPercentage);
};

// Analyze scroll patterns for insights
const analyzeScrollBehavior = (events) => {
  // Detect rage scrolling vs deliberate reading
  // Identify reading zones vs skipping zones  
  // Measure engagement depth and patterns
};
```

### Data Collection
- **No user interaction required** - automatic tracking
- **Privacy-focused** - no personal data collection
- **Real-time processing** - immediate analytics updates
- **Cross-session tracking** - user journey mapping

## 🚀 Implementation Status

### ✅ Completed
- Document CRUD operations
- Tiptap editor with enhanced features
- Public document sharing
- Creator dashboard foundation
- **Complete analytics schema** with session tracking and aggregated data
- **Scroll depth tracking implementation** with efficient aggregation
- **Iterative analytics processing** - processes unprocessed sessions when analytics load
- **Aggregated analytics queries** that work without file storage
- **Viewport-based scroll heatmap** showing exact scroll depth reach percentages
- **Analytics dashboard** with multiple views (overview, heatmap, sessions)
- **Navigation integration** from main dashboard to analytics
- **Performance optimized** - no scroll event file storage, direct session aggregation
- **🆕 Sales Intelligence** - Focused user engagement tracking for sales outreach:
  - **Document engagement analysis** - Shows which documents each user has read
  - **User engagement scoring** - Identifies high-value prospects automatically  
  - **Sales insights generation** - Actionable talking points for each user
  - **Reading behavior patterns** - Deep reads, returning readers, engagement trends
  - **Perfect for sales teams** - Uses existing analytics data, no complex tracking needed

### 🚧 In Progress  
- Advanced paragraph-level engagement analysis based on document structure
- Reading flow analytics (skimming vs careful reading patterns)

### 📋 Next Steps
1. Add more advanced heatmap features (click tracking, hover analytics)
2. Implement user journey flow visualization across multiple documents
3. Add export capabilities for analytics data (CSV, PDF reports)
4. Build A/B testing framework for content optimization
5. Add real-time analytics notifications for creators

## 🎨 User Experience

### For Creators
1. **Write content** in rich editor
2. **Publish** and get shareable link
3. **Track engagement** through visual analytics
4. **Optimize content** based on reader behavior
5. **Build user journeys** with personalized insights

### For Readers  
1. **Seamless reading experience** - no signup required
2. **Fast loading** with optimized performance
3. **Mobile-friendly** responsive design
4. **Privacy-respecting** analytics tracking

---

*CreatorHeat: Where content meets intelligence* 🔥
