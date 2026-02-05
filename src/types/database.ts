export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          slug: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          slug: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          slug?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      project_members: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          role: "owner" | "editor" | "viewer";
          invited_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          role: "owner" | "editor" | "viewer";
          invited_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          role?: "owner" | "editor" | "viewer";
          invited_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      documents: {
        Row: {
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
        };
        Insert: {
          id?: string;
          project_id: string;
          parent_id?: string | null;
          title?: string;
          content?: string;
          is_folder?: boolean;
          is_published?: boolean;
          sort_order?: number;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          parent_id?: string | null;
          title?: string;
          content?: string;
          is_folder?: boolean;
          is_published?: boolean;
          sort_order?: number;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      document_versions: {
        Row: {
          id: string;
          document_id: string;
          content: string;
          version_number: number;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          content: string;
          version_number: number;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          content?: string;
          version_number?: number;
          created_by?: string;
          created_at?: string;
        };
      };
      publishes: {
        Row: {
          id: string;
          project_id: string;
          version: string;
          storage_path: string;
          preview_url: string | null;
          published_by: string;
          published_at: string;
          metadata: Json;
        };
        Insert: {
          id?: string;
          project_id: string;
          version: string;
          storage_path: string;
          preview_url?: string | null;
          published_by: string;
          published_at?: string;
          metadata?: Json;
        };
        Update: {
          id?: string;
          project_id?: string;
          version?: string;
          storage_path?: string;
          preview_url?: string | null;
          published_by?: string;
          published_at?: string;
          metadata?: Json;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {};
    Functions: {
      has_project_access: {
        Args: {
          p_project_id: string;
          p_user_id: string;
          p_min_role?: string;
        };
        Returns: boolean;
      };
      get_user_project_role: {
        Args: {
          p_project_id: string;
          p_user_id: string;
        };
        Returns: string;
      };
    };
    Enums: {};
  };
}

export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];
export type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];

export type ProjectMember = Database["public"]["Tables"]["project_members"]["Row"];
export type ProjectMemberInsert = Database["public"]["Tables"]["project_members"]["Insert"];

export type Document = Database["public"]["Tables"]["documents"]["Row"];
export type DocumentInsert = Database["public"]["Tables"]["documents"]["Insert"];
export type DocumentUpdate = Database["public"]["Tables"]["documents"]["Update"];

export type DocumentVersion = Database["public"]["Tables"]["document_versions"]["Row"];
export type Publish = Database["public"]["Tables"]["publishes"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export type MemberRole = "owner" | "editor" | "viewer";

export interface ProjectWithMembers extends Project {
  members?: (ProjectMember & { profile?: Profile })[];
  userRole?: MemberRole;
}

export interface DocumentTreeNode extends Document {
  children: DocumentTreeNode[];
}
