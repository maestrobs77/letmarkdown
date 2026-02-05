// Supabase Edge Function: Publish Markdown to Static Site
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { JSZip } from "https://deno.land/x/jszip@0.11.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Markdown to HTML converter (simple implementation)
function markdownToHtml(markdown: string): string {
  let html = markdown;
  
  // Escape HTML
  html = html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  
  // Headers
  html = html.replace(/^###### (.*)$/gm, "<h6>$1</h6>");
  html = html.replace(/^##### (.*)$/gm, "<h5>$1</h5>");
  html = html.replace(/^#### (.*)$/gm, "<h4>$1</h4>");
  html = html.replace(/^### (.*)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.*)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.*)$/gm, "<h1>$1</h1>");
  
  // Bold and Italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
  html = html.replace(/___(.*?)___/g, "<strong><em>$1</em></strong>");
  html = html.replace(/__(.*?)__/g, "<strong>$1</strong>");
  html = html.replace(/_(.*?)_/g, "<em>$1</em>");
  
  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code class="language-${lang || 'text'}">${code.trim()}</code></pre>`;
  });
  
  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  
  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');
  
  // Blockquotes
  html = html.replace(/^> (.*)$/gm, "<blockquote>$1</blockquote>");
  
  // Horizontal rules
  html = html.replace(/^---$/gm, "<hr />");
  html = html.replace(/^\*\*\*$/gm, "<hr />");
  
  // Unordered lists
  html = html.replace(/^\* (.*)$/gm, "<li>$1</li>");
  html = html.replace(/^- (.*)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>");
  
  // Ordered lists
  html = html.replace(/^\d+\. (.*)$/gm, "<li>$1</li>");
  
  // Paragraphs
  html = html.replace(/\n\n([^<].*?)(?=\n\n|$)/g, "\n\n<p>$1</p>");
  
  // Line breaks
  html = html.replace(/\n/g, "<br />\n");
  
  // Clean up extra breaks in block elements
  html = html.replace(/<br \/>\n(<\/?(h[1-6]|p|ul|ol|li|blockquote|pre|hr))/g, "\n$1");
  html = html.replace(/(<(h[1-6]|p|ul|ol|li|blockquote|pre|hr)[^>]*>)<br \/>\n/g, "$1\n");
  
  return html;
}

// HTML Template
function generateHtmlTemplate(title: string, content: string, styles: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        ${styles}
    </style>
</head>
<body>
    <div class="container">
        ${content}
    </div>
</body>
</html>`;
}

// Default CSS styles
const defaultStyles = `
:root {
    --primary-color: #2563eb;
    --text-color: #1f2937;
    --bg-color: #ffffff;
    --code-bg: #f3f4f6;
    --border-color: #e5e7eb;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.7;
    color: var(--text-color);
    background-color: var(--bg-color);
    padding: 2rem;
}

.container {
    max-width: 800px;
    margin: 0 auto;
}

h1, h2, h3, h4, h5, h6 {
    margin: 1.5em 0 0.5em;
    font-weight: 600;
    line-height: 1.3;
}

h1 { font-size: 2.25rem; border-bottom: 2px solid var(--border-color); padding-bottom: 0.5rem; }
h2 { font-size: 1.875rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.3rem; }
h3 { font-size: 1.5rem; }
h4 { font-size: 1.25rem; }
h5 { font-size: 1.125rem; }
h6 { font-size: 1rem; color: #6b7280; }

p {
    margin: 1em 0;
}

a {
    color: var(--primary-color);
    text-decoration: none;
}

a:hover {
    text-decoration: underline;
}

code {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.875em;
    background-color: var(--code-bg);
    padding: 0.2em 0.4em;
    border-radius: 4px;
}

pre {
    background-color: var(--code-bg);
    padding: 1rem;
    border-radius: 8px;
    overflow-x: auto;
    margin: 1em 0;
}

pre code {
    background: none;
    padding: 0;
}

blockquote {
    border-left: 4px solid var(--primary-color);
    padding-left: 1rem;
    margin: 1em 0;
    color: #6b7280;
    font-style: italic;
}

ul, ol {
    margin: 1em 0;
    padding-left: 2em;
}

li {
    margin: 0.5em 0;
}

img {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    margin: 1em 0;
}

hr {
    border: none;
    border-top: 1px solid var(--border-color);
    margin: 2em 0;
}

table {
    width: 100%;
    border-collapse: collapse;
    margin: 1em 0;
}

th, td {
    border: 1px solid var(--border-color);
    padding: 0.75rem;
    text-align: left;
}

th {
    background-color: var(--code-bg);
    font-weight: 600;
}

@media (max-width: 768px) {
    body {
        padding: 1rem;
    }
    
    h1 { font-size: 1.75rem; }
    h2 { font-size: 1.5rem; }
    h3 { font-size: 1.25rem; }
}
`;

// Navigation template
function generateNavigation(documents: Array<{ id: string; title: string; slug: string }>): string {
  if (documents.length <= 1) return "";
  
  const navItems = documents.map(doc => 
    `<li><a href="${doc.slug}.html">${doc.title}</a></li>`
  ).join("\n");
  
  return `
    <nav class="site-nav">
      <ul>${navItems}</ul>
    </nav>
  `;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's token for RLS
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Parse request body
    const { projectId, template = "default" } = await req.json();

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: "Project ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid user token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check user has access to project
    const { data: memberData, error: memberError } = await supabaseClient
      .from("project_members")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .single();

    if (memberError || !memberData || !["owner", "editor"].includes(memberData.role)) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Editor or owner access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get project details
    const { data: project, error: projectError } = await supabaseClient
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: "Project not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all published documents (non-folders)
    const { data: documents, error: docsError } = await supabaseClient
      .from("documents")
      .select("*")
      .eq("project_id", projectId)
      .eq("is_published", true)
      .eq("is_folder", false)
      .order("sort_order", { ascending: true });

    if (docsError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch documents" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!documents || documents.length === 0) {
      return new Response(
        JSON.stringify({ error: "No published documents found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create ZIP file
    const zip = new JSZip();

    // Generate slug for each document
    const docsWithSlugs = documents.map((doc, index) => ({
      ...doc,
      slug: doc.title.toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || `document-${index}`,
    }));

    // Navigation data
    const navDocs = docsWithSlugs.map(doc => ({
      id: doc.id,
      title: doc.title,
      slug: doc.slug,
    }));

    // Process each document
    for (const doc of docsWithSlugs) {
      const htmlContent = markdownToHtml(doc.content || "");
      const navigation = generateNavigation(navDocs);
      
      const fullHtml = generateHtmlTemplate(
        `${doc.title} - ${project.name}`,
        `${navigation}<article>${htmlContent}</article>`,
        defaultStyles
      );

      zip.file(`${doc.slug}.html`, fullHtml);
    }

    // Create index.html (first document or custom)
    const firstDoc = docsWithSlugs[0];
    const indexHtml = generateHtmlTemplate(
      project.name,
      `${generateNavigation(navDocs)}<article>${markdownToHtml(firstDoc.content || "")}</article>`,
      defaultStyles
    );
    zip.file("index.html", indexHtml);

    // Add a simple CSS file
    zip.file("styles.css", defaultStyles);

    // Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({ type: "uint8array" });

    // Generate version and storage path
    const version = `v${Date.now()}`;
    const storagePath = `${projectId}/${version}/site.zip`;

    // Upload to storage using service role client
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const { error: uploadError } = await adminClient.storage
      .from("published-sites")
      .upload(storagePath, zipBuffer, {
        contentType: "application/zip",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to upload published site" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get public URL
    const { data: urlData } = adminClient.storage
      .from("published-sites")
      .getPublicUrl(storagePath);

    const previewUrl = urlData.publicUrl;

    // Record publish in database
    const { data: publishRecord, error: publishError } = await adminClient
      .from("publishes")
      .insert({
        project_id: projectId,
        version: version,
        storage_path: storagePath,
        preview_url: previewUrl,
        published_by: user.id,
        metadata: {
          document_count: documents.length,
          template: template,
          documents: navDocs,
        },
      })
      .select()
      .single();

    if (publishError) {
      console.error("Publish record error:", publishError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        version: version,
        previewUrl: previewUrl,
        storagePath: storagePath,
        documentCount: documents.length,
        publishId: publishRecord?.id,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Publish error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
