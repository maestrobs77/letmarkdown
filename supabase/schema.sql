-- ============================================
-- Supabase Schema for LetsMarkdown Collaborative Publishing
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    slug VARCHAR(255) UNIQUE NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project members table (roles: owner, editor, viewer)
CREATE TABLE project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- Documents table (tree structure with parent_id)
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL DEFAULT 'Untitled',
    content TEXT DEFAULT '',
    is_folder BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document versions for history tracking
CREATE TABLE document_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    version_number INTEGER NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Publishes table (records of published builds)
CREATE TABLE publishes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,
    storage_path TEXT NOT NULL,
    preview_url TEXT,
    published_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    published_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- User profiles (extends auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255),
    full_name VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Projects indexes
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_slug ON projects(slug);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);

-- Project members indexes
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
CREATE INDEX idx_project_members_role ON project_members(role);

-- Documents indexes
CREATE INDEX idx_documents_project_id ON documents(project_id);
CREATE INDEX idx_documents_parent_id ON documents(parent_id);
CREATE INDEX idx_documents_is_published ON documents(is_published);
CREATE INDEX idx_documents_sort_order ON documents(project_id, parent_id, sort_order);

-- Document versions indexes
CREATE INDEX idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX idx_document_versions_created_at ON document_versions(created_at DESC);

-- Publishes indexes
CREATE INDEX idx_publishes_project_id ON publishes(project_id);
CREATE INDEX idx_publishes_published_at ON publishes(published_at DESC);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has access to project
CREATE OR REPLACE FUNCTION has_project_access(p_project_id UUID, p_user_id UUID, p_min_role TEXT DEFAULT 'viewer')
RETURNS BOOLEAN AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role
    FROM project_members
    WHERE project_id = p_project_id AND user_id = p_user_id;
    
    IF v_role IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Role hierarchy: owner > editor > viewer
    IF p_min_role = 'viewer' THEN
        RETURN TRUE;
    ELSIF p_min_role = 'editor' THEN
        RETURN v_role IN ('owner', 'editor');
    ELSIF p_min_role = 'owner' THEN
        RETURN v_role = 'owner';
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's role in a project
CREATE OR REPLACE FUNCTION get_user_project_role(p_project_id UUID, p_user_id UUID)
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT role
        FROM project_members
        WHERE project_id = p_project_id AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-add owner as project member
CREATE OR REPLACE FUNCTION handle_new_project()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO project_members (project_id, user_id, role, invited_by)
    VALUES (NEW.id, NEW.created_by, 'owner', NEW.created_by);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS
-- ============================================

-- Update timestamps triggers
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_members_updated_at
    BEFORE UPDATE ON project_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Auto-add owner as project member
CREATE TRIGGER on_project_created
    AFTER INSERT ON projects
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_project();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE publishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES POLICIES
-- ============================================

-- Users can view any profile
CREATE POLICY "Profiles are viewable by everyone"
    ON profiles FOR SELECT
    USING (true);

-- Users can update only their own profile
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- ============================================
-- PROJECTS POLICIES
-- ============================================

-- Users can view projects they are members of
CREATE POLICY "Users can view their projects"
    ON projects FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM project_members
            WHERE project_members.project_id = projects.id
            AND project_members.user_id = auth.uid()
        )
    );

-- Any authenticated user can create a project
CREATE POLICY "Authenticated users can create projects"
    ON projects FOR INSERT
    WITH CHECK (auth.uid() = created_by);

-- Only owners can update projects
CREATE POLICY "Owners can update projects"
    ON projects FOR UPDATE
    USING (
        has_project_access(id, auth.uid(), 'owner')
    );

-- Only owners can delete projects
CREATE POLICY "Owners can delete projects"
    ON projects FOR DELETE
    USING (
        has_project_access(id, auth.uid(), 'owner')
    );

-- ============================================
-- PROJECT MEMBERS POLICIES
-- ============================================

-- Members can view other members of their projects
CREATE POLICY "Members can view project members"
    ON project_members FOR SELECT
    USING (
        has_project_access(project_id, auth.uid(), 'viewer')
    );

-- Owners can add members
CREATE POLICY "Owners can add members"
    ON project_members FOR INSERT
    WITH CHECK (
        has_project_access(project_id, auth.uid(), 'owner')
    );

-- Owners can update member roles (but not change owner)
CREATE POLICY "Owners can update member roles"
    ON project_members FOR UPDATE
    USING (
        has_project_access(project_id, auth.uid(), 'owner')
        AND role != 'owner' -- Cannot change owner's role
    );

-- Owners can remove members (except themselves)
CREATE POLICY "Owners can remove members"
    ON project_members FOR DELETE
    USING (
        has_project_access(project_id, auth.uid(), 'owner')
        AND user_id != auth.uid() -- Cannot remove themselves
    );

-- Members can leave projects (remove themselves)
CREATE POLICY "Members can leave projects"
    ON project_members FOR DELETE
    USING (
        user_id = auth.uid()
        AND role != 'owner' -- Owners cannot leave
    );

-- ============================================
-- DOCUMENTS POLICIES
-- ============================================

-- Members can view documents in their projects
CREATE POLICY "Members can view documents"
    ON documents FOR SELECT
    USING (
        has_project_access(project_id, auth.uid(), 'viewer')
    );

-- Editors and owners can create documents
CREATE POLICY "Editors can create documents"
    ON documents FOR INSERT
    WITH CHECK (
        has_project_access(project_id, auth.uid(), 'editor')
        AND auth.uid() = created_by
    );

-- Editors and owners can update documents
CREATE POLICY "Editors can update documents"
    ON documents FOR UPDATE
    USING (
        has_project_access(project_id, auth.uid(), 'editor')
    );

-- Editors and owners can delete documents
CREATE POLICY "Editors can delete documents"
    ON documents FOR DELETE
    USING (
        has_project_access(project_id, auth.uid(), 'editor')
    );

-- ============================================
-- DOCUMENT VERSIONS POLICIES
-- ============================================

-- Members can view document versions
CREATE POLICY "Members can view document versions"
    ON document_versions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM documents
            WHERE documents.id = document_versions.document_id
            AND has_project_access(documents.project_id, auth.uid(), 'viewer')
        )
    );

-- Editors can create document versions
CREATE POLICY "Editors can create document versions"
    ON document_versions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM documents
            WHERE documents.id = document_versions.document_id
            AND has_project_access(documents.project_id, auth.uid(), 'editor')
        )
        AND auth.uid() = created_by
    );

-- ============================================
-- PUBLISHES POLICIES
-- ============================================

-- Members can view publishes
CREATE POLICY "Members can view publishes"
    ON publishes FOR SELECT
    USING (
        has_project_access(project_id, auth.uid(), 'viewer')
    );

-- Editors can create publishes
CREATE POLICY "Editors can create publishes"
    ON publishes FOR INSERT
    WITH CHECK (
        has_project_access(project_id, auth.uid(), 'editor')
        AND auth.uid() = published_by
    );

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Note: Run these in Supabase Dashboard SQL Editor or via API

-- Create project-assets bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-assets', 'project-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Create published-sites bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('published-sites', 'published-sites', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STORAGE POLICIES
-- ============================================

-- Project assets: Members can view
CREATE POLICY "Project members can view assets"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'project-assets'
        AND has_project_access(
            (storage.foldername(name))[1]::UUID,
            auth.uid(),
            'viewer'
        )
    );

-- Project assets: Editors can upload
CREATE POLICY "Editors can upload assets"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'project-assets'
        AND has_project_access(
            (storage.foldername(name))[1]::UUID,
            auth.uid(),
            'editor'
        )
    );

-- Project assets: Editors can update
CREATE POLICY "Editors can update assets"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'project-assets'
        AND has_project_access(
            (storage.foldername(name))[1]::UUID,
            auth.uid(),
            'editor'
        )
    );

-- Project assets: Editors can delete
CREATE POLICY "Editors can delete assets"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'project-assets'
        AND has_project_access(
            (storage.foldername(name))[1]::UUID,
            auth.uid(),
            'editor'
        )
    );

-- Published sites: Public read access
CREATE POLICY "Anyone can view published sites"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'published-sites');

-- Published sites: Editors can upload
CREATE POLICY "Editors can publish sites"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'published-sites'
        AND has_project_access(
            (storage.foldername(name))[1]::UUID,
            auth.uid(),
            'editor'
        )
    );
