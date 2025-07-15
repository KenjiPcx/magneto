🧠 CreatorHeat — Intelligent Lead Magnet Platform with Attention Analytics
🔥 Vision
Turn any blog post, guide, or digital resource into an intelligent lead magnet.

Most creators share free content — but they have no idea what readers actually engage with. We change that.

CreatorHeat is a platform where creators can write and publish content, then track exactly what parts of the content their audience cares about, using heatmaps generated from real user session recordings.

We imagine a world where creators have:

Live attention heatmaps over their guides and content

Zero-effort lead magnets — just write your blog post and publish

Session replay with comprehensive user behavior analysis

Full visitor analytics (even for guest users) — no setup needed

🎯 MVP Scope
Goal: Help creators publish lead magnets and track user attention through session recordings, without code.

✅ Core Features - IMPLEMENTED
✅ Text editor for creators (using Tiptap) - DocumentEditor component created
✅ Public sharable link for every document - Slug-based sharing system
✅ Guest and logged-in visitor tracking - Analytics schema and functions ready
✅ Session recording with rrweb - Complete user interaction capture
✅ Dashboard to view attention patterns per document - Creator dashboard complete

✅ COMPLETED

- rrweb-based session recording system
- Automatic session capture on document sharing
- File storage for session recordings in Convex
- Batch processing of recordings into heatmap data
- Real-time recording status indicators
- Session replay capability (infrastructure ready)
- Analytics dashboard with engagement metrics from processed recordings

🚧 IN PROGRESS

- Document editing functionality (not needed for MVP)
- Advanced session processing algorithms
- Session replay player interface

🚫 Out of Scope for MVP
Creator chatbot assistant (future)

Smart recommendations or sales funnels

Integrations with CRM/email tools

📋 Current Implementation Status
✅ rrweb session recording system with Convex backend
✅ Convex schema with sessionRecordings, heatmapData, and analyticsSessions tables
✅ Document CRUD operations (create, read, update, delete, publish/unpublish)
✅ Automatic session recording on document visits
✅ Document creation page with enhanced TipTap editor
✅ Creator dashboard with document management and analytics
✅ Public document sharing with comprehensive session recording
✅ Enhanced editor with slash commands and clever features
✅ Session recording processing into heatmap data
✅ Analytics dashboard showing visits, engagement, and processing status
✅ File-based recording storage with automatic upload
✅ Recording status tracking and debug panels

🔧 Key Routes Implemented

- /create - Document creation with TipTap editor
- /dashboard - Creator dashboard for document management
- /signin - Authentication (existing)
- /share/[slug] - Public document sharing with rrweb session recording
- /edit/[id] - Document editing (not implemented for MVP)

🎯 RRWEB SESSION RECORDING SYSTEM

- Built comprehensive session recording with rrweb library
- Automatic capture of all user interactions (mouse, scroll, clicks, navigation)
- File storage in Convex for scalable recording management
- Background processing to extract heatmap data from recordings
- Session status tracking (recording → completed → processing → analyzed)
- Debug panels for monitoring recording status and events
- Ready for session replay implementation
- Paragraph-level engagement analysis from recorded sessions

🚀 ENHANCED EDITOR FEATURES

- Slash commands (/ for quick formatting)
- Emoji replacer (:) -> 😊, :fire: -> 🔥, etc.)
- Enhanced typography (-> → , -- — , ... … , etc.)
- Smart quotes ("" and '')
- Auto-link detection (URLs become clickable)
- Markdown shortcuts (# for headings, \* for lists, etc.)
- Improved scroll and theme support
- 70vh editor height for better UX

🧱 Tech Stack
💻 Frontend
Next.js – Web framework

Tiptap – Rich text editor

Tailwind CSS – UI styling

📊 Analytics & Tracking
rrweb – Session recording and replay

Convex file storage – Recording data storage

Background processing – Heatmap extraction from recordings

Real-time analytics dashboard with processed engagement data

🗂 Backend (Setup)

- Convex Auth
- Convex DB
- Convex File Storage

☁️ Infra
Vercel – Hosting frontend

Convex – Real-time backend with file storage and session recording management

🧪 Tracking Approach
Visitors don't need to log in to trigger recording.

Comprehensive session recording with rrweb:

✅ **Complete DOM capture** - Every user interaction recorded automatically

✅ **File-based storage** - Recordings stored as JSON files in Convex storage

✅ **Background processing** - Recordings analyzed to extract engagement metrics

✅ **Paragraph-level tracking** - Data-paragraph-id attributes for precise analysis

✅ **Session status tracking** - Real-time status from recording → analyzed

✅ **Debug panels** - Monitor recording status and troubleshoot issues

Each document paragraph gets a `data-paragraph-id` attribute for precise heatmap analysis.

Session recordings capture:
- 🖱️ All mouse movements and clicks
- 📜 Scroll behavior and viewport changes
- ⌨️ Keyboard interactions
- 👀 Element visibility and focus
- 🔄 Navigation and page interactions

Processed heatmap data shows:
- 🔥 Red = Very high engagement (80%+ of max dwell time)
- 🟡 Orange = High engagement (60-79%) 
- 🟢 Green = Medium engagement (30-59%)
- 🔵 Blue = Low engagement (<30%)

🛠 How It Works
Creator signs up → writes content in our editor

Hits publish → gets a public link

Visitors (guests or logged-in) visit → rrweb automatically starts recording

We capture:

Complete user session with rrweb

All interactions: mouse, scroll, clicks, navigation

Background processing extracts engagement metrics

Creator sees processed heatmaps + can replay sessions

Future: Advanced analytics and session replay player interface
