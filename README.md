# 📝 Let's Markdown - Supabase Edition

**Collaborative Markdown Editor + Web Publishing Platform**

A modern, full-featured collaborative markdown editing platform built with React, TypeScript, and Supabase. Fork of [LetsMarkdown.com](https://github.com/Cveinnt/LetsMarkdown.com) with enhanced features for team collaboration and static site publishing.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)
![React](https://img.shields.io/badge/React-18.2-61dafb.svg)
![Supabase](https://img.shields.io/badge/Supabase-Powered-3ECF8E.svg)

## ✨ Features

### 🔐 Authentication
- Email/Password authentication
- Google OAuth integration
- Secure session management

### 📁 Project Management
- Create and manage multiple projects
- Invite team members with role-based access
- **Roles**: Owner, Editor, Viewer

### 📄 Document Management
- Hierarchical document tree (folders + files)
- Drag & drop organization
- Real-time auto-save
- Version history

### ✍️ Editor
- Monaco Editor (VS Code's editor)
- Split-pane markdown preview
- Syntax highlighting
- Image upload with automatic markdown insertion
- Dark mode support

### 🚀 Publishing
- One-click static site generation
- Markdown → HTML conversion with templates
- ZIP download of published site
- Version tracking for all publishes

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Chakra UI, Zustand
- **Editor**: Monaco Editor
- **Markdown**: markdown-it with plugins
- **Backend**: Supabase (Auth, Database, Storage, Edge Functions)
- **Build**: Vite

## 📦 Installation

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase CLI (optional, for local development)
- Supabase account (for production)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/letsmarkdown-supabase.git
cd letsmarkdown-supabase
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

#### Option A: Using Supabase Cloud (Recommended)

1. Create a new project at [supabase.com](https://supabase.com)

2. Run the schema in SQL Editor:
   - Go to **SQL Editor** in Supabase Dashboard
   - Copy contents of `supabase/schema.sql`
   - Execute the SQL

3. Create storage buckets:
   - Go to **Storage** in Supabase Dashboard
   - Create bucket: `project-assets` (public)
   - Create bucket: `published-sites` (public)

4. Deploy Edge Function:
   ```bash
   # Install Supabase CLI
   npm install -g supabase
   
   # Login to Supabase
   supabase login
   
   # Link to your project
   supabase link --project-ref your-project-ref
   
   # Deploy the publish function
   supabase functions deploy publish
   ```

5. Configure Auth Providers:
   - Go to **Authentication > Providers**
   - Enable Email provider
   - (Optional) Enable Google OAuth with your credentials

#### Option B: Local Development with Supabase CLI

```bash
# Start local Supabase
supabase start

# Apply database schema
supabase db push

# Start Edge Functions locally
supabase functions serve
```

### 4. Configure Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

For local development:
```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-local-anon-key
```

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🗄️ Database Schema

### Tables

| Table | Description |
|-------|-------------|
| `projects` | Project metadata |
| `project_members` | Project membership with roles |
| `documents` | Document tree (folders + files) |
| `document_versions` | Document version history |
| `publishes` | Published site records |
| `profiles` | User profile data |

### Row Level Security (RLS)

All tables have RLS policies ensuring:
- Users can only access projects they're members of
- Role-based permissions (owner > editor > viewer)
- Secure data isolation between projects

## 🔌 Edge Functions

### `publish`

Converts published markdown documents to a static HTML site.

**Request:**
```json
POST /functions/v1/publish
{
  "projectId": "uuid",
  "template": "default"
}
```

**Response:**
```json
{
  "success": true,
  "version": "v1234567890",
  "previewUrl": "https://..../site.zip",
  "documentCount": 5
}
```

## 📁 Project Structure

```
letsmarkdown-supabase/
├── src/
│   ├── components/
│   │   ├── auth/           # Authentication pages
│   │   ├── dashboard/      # Dashboard/project list
│   │   ├── documents/      # Document tree, editor, preview
│   │   └── project/        # Project page, members, publish
│   ├── lib/
│   │   └── supabase.ts     # Supabase client
│   ├── store/
│   │   ├── authStore.ts    # Auth state management
│   │   ├── projectStore.ts # Project state management
│   │   └── documentStore.ts # Document state management
│   ├── types/
│   │   └── database.ts     # TypeScript types
│   ├── App.tsx
│   └── index.tsx
├── supabase/
│   ├── schema.sql          # Database schema + RLS
│   ├── config.toml         # Local dev config
│   └── functions/
│       └── publish/        # Edge function
│           └── index.ts
├── package.json
└── README.md
```

## 🚀 Deployment

### Frontend (Vercel/Netlify)

1. Push to GitHub
2. Connect to Vercel/Netlify
3. Set environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy

### Edge Functions (Supabase)

```bash
supabase functions deploy publish
```

## 🔧 Configuration

### Google OAuth Setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com)
2. Enable OAuth consent screen
3. Create OAuth 2.0 credentials
4. Add authorized redirect URIs:
   - `https://your-project.supabase.co/auth/v1/callback`
   - `http://localhost:54321/auth/v1/callback` (for local dev)
5. Add credentials to Supabase Dashboard > Auth > Providers > Google

### Custom Templates

Modify the template in `supabase/functions/publish/index.ts`:
- `generateHtmlTemplate()` - HTML structure
- `defaultStyles` - CSS styling
- `markdownToHtml()` - Markdown conversion

## 📝 API Reference

### Supabase Tables

#### Projects
```typescript
interface Project {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}
```

#### Documents
```typescript
interface Document {
  id: string;
  project_id: string;
  parent_id: string | null;
  title: string;
  content: string;
  is_folder: boolean;
  is_published: boolean;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Original [LetsMarkdown.com](https://github.com/Cveinnt/LetsMarkdown.com) by Cveinnt
- [Supabase](https://supabase.com) for the amazing backend platform
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) for the editor
- [Chakra UI](https://chakra-ui.com) for the component library

---

Made with ❤️ for the markdown community
