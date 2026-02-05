import { create } from "zustand";
import { supabase } from "../lib/supabase";
import type {
  Document,
  DocumentInsert,
  DocumentUpdate,
  DocumentTreeNode,
} from "../types/database";

interface DocumentState {
  documents: Document[];
  documentTree: DocumentTreeNode[];
  currentDocument: Document | null;
  loading: boolean;
  saving: boolean;
  error: string | null;

  // Actions
  fetchDocuments: (projectId: string) => Promise<void>;
  createDocument: (doc: Omit<DocumentInsert, "created_by">) => Promise<Document | null>;
  createFolder: (projectId: string, title: string, parentId?: string | null) => Promise<Document | null>;
  updateDocument: (documentId: string, updates: DocumentUpdate) => Promise<boolean>;
  deleteDocument: (documentId: string) => Promise<boolean>;
  moveDocument: (documentId: string, newParentId: string | null, newSortOrder: number) => Promise<boolean>;
  togglePublished: (documentId: string) => Promise<boolean>;
  
  setCurrentDocument: (doc: Document | null) => void;
  clearError: () => void;
}

// Helper to build tree from flat list
function buildDocumentTree(documents: Document[]): DocumentTreeNode[] {
  const map = new Map<string, DocumentTreeNode>();
  const roots: DocumentTreeNode[] = [];

  // First pass: create all nodes
  documents.forEach(doc => {
    map.set(doc.id, { ...doc, children: [] });
  });

  // Second pass: build tree structure
  documents.forEach(doc => {
    const node = map.get(doc.id)!;
    if (doc.parent_id && map.has(doc.parent_id)) {
      map.get(doc.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // Sort children by sort_order
  const sortNodes = (nodes: DocumentTreeNode[]) => {
    nodes.sort((a, b) => a.sort_order - b.sort_order);
    nodes.forEach(node => sortNodes(node.children));
  };
  sortNodes(roots);

  return roots;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: [],
  documentTree: [],
  currentDocument: null,
  loading: false,
  saving: false,
  error: null,

  fetchDocuments: async (projectId: string) => {
    set({ loading: true, error: null });
    
    try {
      const { data: documents, error } = await supabase
        .from("documents")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true });

      if (error) throw error;

      const tree = buildDocumentTree(documents || []);
      set({ documents: documents || [], documentTree: tree, loading: false });
    } catch (error: any) {
      console.error("Fetch documents error:", error);
      set({ error: error.message, loading: false });
    }
  },

  createDocument: async (docData) => {
    set({ loading: true, error: null });
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get max sort_order for siblings
      const { data: siblings } = await supabase
        .from("documents")
        .select("sort_order")
        .eq("project_id", docData.project_id)
        .eq("parent_id", docData.parent_id || null)
        .order("sort_order", { ascending: false })
        .limit(1);

      const maxOrder = siblings?.[0]?.sort_order ?? -1;

      const { data: document, error } = await supabase
        .from("documents")
        .insert({
          ...docData,
          created_by: user.id,
          sort_order: maxOrder + 1,
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      set((state) => {
        const newDocuments = [...state.documents, document];
        return {
          documents: newDocuments,
          documentTree: buildDocumentTree(newDocuments),
          loading: false,
        };
      });

      return document;
    } catch (error: any) {
      console.error("Create document error:", error);
      set({ error: error.message, loading: false });
      return null;
    }
  },

  createFolder: async (projectId, title, parentId = null) => {
    return get().createDocument({
      project_id: projectId,
      title,
      parent_id: parentId,
      is_folder: true,
      content: "",
    });
  },

  updateDocument: async (documentId, updates) => {
    set({ saving: true, error: null });
    
    try {
      const { error } = await supabase
        .from("documents")
        .update(updates)
        .eq("id", documentId);

      if (error) throw error;

      // Update local state
      set((state) => {
        const newDocuments = state.documents.map(d =>
          d.id === documentId ? { ...d, ...updates } : d
        );
        return {
          documents: newDocuments,
          documentTree: buildDocumentTree(newDocuments),
          currentDocument: state.currentDocument?.id === documentId
            ? { ...state.currentDocument, ...updates }
            : state.currentDocument,
          saving: false,
        };
      });

      return true;
    } catch (error: any) {
      console.error("Update document error:", error);
      set({ error: error.message, saving: false });
      return false;
    }
  },

  deleteDocument: async (documentId) => {
    set({ loading: true, error: null });
    
    try {
      const { error } = await supabase
        .from("documents")
        .delete()
        .eq("id", documentId);

      if (error) throw error;

      // Update local state (cascade delete handled by DB)
      set((state) => {
        // Remove document and all children
        const idsToRemove = new Set<string>();
        const collectIds = (id: string) => {
          idsToRemove.add(id);
          state.documents
            .filter(d => d.parent_id === id)
            .forEach(d => collectIds(d.id));
        };
        collectIds(documentId);

        const newDocuments = state.documents.filter(d => !idsToRemove.has(d.id));
        return {
          documents: newDocuments,
          documentTree: buildDocumentTree(newDocuments),
          currentDocument: idsToRemove.has(state.currentDocument?.id || "")
            ? null
            : state.currentDocument,
          loading: false,
        };
      });

      return true;
    } catch (error: any) {
      console.error("Delete document error:", error);
      set({ error: error.message, loading: false });
      return false;
    }
  },

  moveDocument: async (documentId, newParentId, newSortOrder) => {
    try {
      const { error } = await supabase
        .from("documents")
        .update({
          parent_id: newParentId,
          sort_order: newSortOrder,
        })
        .eq("id", documentId);

      if (error) throw error;

      // Update local state
      set((state) => {
        const newDocuments = state.documents.map(d =>
          d.id === documentId
            ? { ...d, parent_id: newParentId, sort_order: newSortOrder }
            : d
        );
        return {
          documents: newDocuments,
          documentTree: buildDocumentTree(newDocuments),
        };
      });

      return true;
    } catch (error: any) {
      console.error("Move document error:", error);
      return false;
    }
  },

  togglePublished: async (documentId) => {
    const doc = get().documents.find(d => d.id === documentId);
    if (!doc) return false;

    return get().updateDocument(documentId, { is_published: !doc.is_published });
  },

  setCurrentDocument: (doc) => set({ currentDocument: doc }),
  clearError: () => set({ error: null }),
}));
