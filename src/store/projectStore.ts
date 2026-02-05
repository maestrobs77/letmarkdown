import { create } from "zustand";
import { supabase } from "../lib/supabase";
import type {
  Project,
  ProjectInsert,
  ProjectUpdate,
  ProjectMember,
  ProjectMemberInsert,
  Profile,
  MemberRole,
  ProjectWithMembers,
} from "../types/database";

interface ProjectState {
  projects: ProjectWithMembers[];
  currentProject: ProjectWithMembers | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchProjects: () => Promise<void>;
  fetchProject: (projectId: string) => Promise<void>;
  createProject: (project: Omit<ProjectInsert, "created_by">) => Promise<Project | null>;
  updateProject: (projectId: string, updates: ProjectUpdate) => Promise<boolean>;
  deleteProject: (projectId: string) => Promise<boolean>;
  
  // Member management
  addMember: (projectId: string, email: string, role: MemberRole) => Promise<{ error: string | null }>;
  updateMemberRole: (memberId: string, role: MemberRole) => Promise<boolean>;
  removeMember: (memberId: string) => Promise<boolean>;
  leaveProject: (projectId: string) => Promise<boolean>;
  
  setCurrentProject: (project: ProjectWithMembers | null) => void;
  clearError: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  loading: false,
  error: null,

  fetchProjects: async () => {
    set({ loading: true, error: null });
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get all projects user is a member of
      const { data: memberships, error: memberError } = await supabase
        .from("project_members")
        .select(`
          role,
          project:projects(*)
        `)
        .eq("user_id", user.id);

      if (memberError) throw memberError;

      const projects: ProjectWithMembers[] = (memberships || [])
        .filter(m => m.project)
        .map(m => ({
          ...(m.project as unknown as Project),
          userRole: m.role as MemberRole,
        }));

      set({ projects, loading: false });
    } catch (error: any) {
      console.error("Fetch projects error:", error);
      set({ error: error.message, loading: false });
    }
  },

  fetchProject: async (projectId: string) => {
    set({ loading: true, error: null });
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get project details
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (projectError) throw projectError;

      // Get user's role
      const { data: membership } = await supabase
        .from("project_members")
        .select("role")
        .eq("project_id", projectId)
        .eq("user_id", user.id)
        .single();

      // Get all members with profiles
      const { data: members } = await supabase
        .from("project_members")
        .select(`
          *,
          profile:profiles(*)
        `)
        .eq("project_id", projectId);

      const projectWithMembers: ProjectWithMembers = {
        ...project,
        userRole: membership?.role as MemberRole,
        members: members?.map(m => ({
          ...m,
          profile: m.profile as unknown as Profile,
        })),
      };

      set({ currentProject: projectWithMembers, loading: false });
    } catch (error: any) {
      console.error("Fetch project error:", error);
      set({ error: error.message, loading: false });
    }
  },

  createProject: async (projectData) => {
    set({ loading: true, error: null });
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: project, error } = await supabase
        .from("projects")
        .insert({
          ...projectData,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh projects list
      await get().fetchProjects();
      
      set({ loading: false });
      return project;
    } catch (error: any) {
      console.error("Create project error:", error);
      set({ error: error.message, loading: false });
      return null;
    }
  },

  updateProject: async (projectId, updates) => {
    set({ loading: true, error: null });
    
    try {
      const { error } = await supabase
        .from("projects")
        .update(updates)
        .eq("id", projectId);

      if (error) throw error;

      // Update local state
      set((state) => ({
        projects: state.projects.map(p => 
          p.id === projectId ? { ...p, ...updates } : p
        ),
        currentProject: state.currentProject?.id === projectId
          ? { ...state.currentProject, ...updates }
          : state.currentProject,
        loading: false,
      }));

      return true;
    } catch (error: any) {
      console.error("Update project error:", error);
      set({ error: error.message, loading: false });
      return false;
    }
  },

  deleteProject: async (projectId) => {
    set({ loading: true, error: null });
    
    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);

      if (error) throw error;

      set((state) => ({
        projects: state.projects.filter(p => p.id !== projectId),
        currentProject: state.currentProject?.id === projectId ? null : state.currentProject,
        loading: false,
      }));

      return true;
    } catch (error: any) {
      console.error("Delete project error:", error);
      set({ error: error.message, loading: false });
      return false;
    }
  },

  addMember: async (projectId, email, role) => {
    try {
      // Find user by email
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .single();

      if (profileError || !profile) {
        return { error: "User not found with this email" };
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("project_members")
        .insert({
          project_id: projectId,
          user_id: profile.id,
          role,
          invited_by: user?.id,
        });

      if (error) {
        if (error.code === "23505") {
          return { error: "User is already a member of this project" };
        }
        return { error: error.message };
      }

      // Refresh current project
      await get().fetchProject(projectId);
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  },

  updateMemberRole: async (memberId, role) => {
    try {
      const { error } = await supabase
        .from("project_members")
        .update({ role })
        .eq("id", memberId);

      if (error) throw error;

      // Update local state
      set((state) => ({
        currentProject: state.currentProject ? {
          ...state.currentProject,
          members: state.currentProject.members?.map(m =>
            m.id === memberId ? { ...m, role } : m
          ),
        } : null,
      }));

      return true;
    } catch (error: any) {
      console.error("Update member role error:", error);
      return false;
    }
  },

  removeMember: async (memberId) => {
    try {
      const { error } = await supabase
        .from("project_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      set((state) => ({
        currentProject: state.currentProject ? {
          ...state.currentProject,
          members: state.currentProject.members?.filter(m => m.id !== memberId),
        } : null,
      }));

      return true;
    } catch (error: any) {
      console.error("Remove member error:", error);
      return false;
    }
  },

  leaveProject: async (projectId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from("project_members")
        .delete()
        .eq("project_id", projectId)
        .eq("user_id", user.id);

      if (error) throw error;

      set((state) => ({
        projects: state.projects.filter(p => p.id !== projectId),
        currentProject: state.currentProject?.id === projectId ? null : state.currentProject,
      }));

      return true;
    } catch (error: any) {
      console.error("Leave project error:", error);
      return false;
    }
  },

  setCurrentProject: (project) => set({ currentProject: project }),
  clearError: () => set({ error: null }),
}));
