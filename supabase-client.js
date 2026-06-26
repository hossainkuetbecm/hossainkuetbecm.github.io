(function () {
  const PLACEHOLDER_URL = "PASTE_YOUR_SUPABASE_PROJECT_URL_HERE";
  const PLACEHOLDER_KEY = "PASTE_YOUR_SUPABASE_ANON_PUBLIC_KEY_HERE";

  function hasConfig() {
    return Boolean(
      window.SUPABASE_URL &&
      window.SUPABASE_ANON_KEY &&
      window.SUPABASE_URL !== PLACEHOLDER_URL &&
      window.SUPABASE_ANON_KEY !== PLACEHOLDER_KEY &&
      window.supabase &&
      typeof window.supabase.createClient === "function"
    );
  }

  let client = null;

  function getClient() {
    if (!hasConfig()) return null;
    if (!client) {
      client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    }
    return client;
  }

  function slugify(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "project";
  }

  function toArray(value) {
    if (Array.isArray(value)) return value.map(item => String(item || "").trim()).filter(Boolean);
    return String(value || "")
      .split(/\n|,/)
      .map(item => item.trim())
      .filter(Boolean);
  }


  const ADMIN_UPLOAD_BUCKET = "site-uploads";

  function getFileExtension(file) {
    const fallback = file && file.type ? file.type.split("/").pop() : "file";
    const nameExt = file && file.name && file.name.includes(".") ? file.name.split(".").pop() : fallback;
    return String(nameExt || "file").toLowerCase().replace(/[^a-z0-9]/g, "") || "file";
  }

  function isAllowedUpload(file) {
    const type = String(file && file.type || "").toLowerCase();
    const ext = getFileExtension(file);
    const allowedExt = ["jpg", "jpeg", "png", "webp", "gif", "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "dwg", "dxf", "txt", "csv"];
    return type.startsWith("image/") ||
      type === "application/pdf" ||
      type.includes("word") || type.includes("excel") || type.includes("spreadsheet") ||
      type.includes("presentation") || type.includes("powerpoint") ||
      type === "text/plain" || type === "text/csv" ||
      allowedExt.includes(ext);
  }

  async function uploadAdminFile(file, folderName = "general") {
    const sb = getClient();
    if (!sb) throw new Error("Supabase is not configured.");
    if (!file) throw new Error("Please choose a file first.");
    if (!isAllowedUpload(file)) throw new Error("This file type is not allowed. Use image, PDF, Office, DWG/DXF, TXT or CSV.");
    if (file.size > 20 * 1024 * 1024) throw new Error("File is too large. Keep it under 20 MB.");

    const folder = slugify(folderName || "general");
    const baseName = slugify((file.name || "uploaded-file").replace(/\.[^.]+$/, ""));
    const ext = getFileExtension(file);
    const filePath = `${folder}/${Date.now()}-${baseName}.${ext}`;

    const { error } = await sb.storage
      .from(ADMIN_UPLOAD_BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type || undefined
      });

    if (error) throw error;

    const { data } = sb.storage.from(ADMIN_UPLOAD_BUCKET).getPublicUrl(filePath);
    if (!data || !data.publicUrl) throw new Error("Upload completed, but public URL could not be generated.");
    return data.publicUrl;
  }

  async function uploadProjectImage(file, projectId) {
    if (!file) throw new Error("Please choose an image file first.");
    if (!String(file.type || "").startsWith("image/")) throw new Error("Only image files are allowed for project image.");
    return uploadAdminFile(file, `projects/${projectId || "project"}`);
  }

  function fromDbCategory(row) {
    return {
      id: row.id,
      label: row.label || row.id,
      sortOrder: row.sort_order || 0
    };
  }

  function toDbCategory(category) {
    const id = slugify(category.id || category.label);
    return {
      id,
      label: category.label || id,
      sort_order: Number(category.sortOrder || category.sort_order || 0) || 0
    };
  }

  function fromDbProject(row) {
    return {
      id: row.id,
      title: row.title || "Untitled Project",
      tag: row.tag || "Project",
      category: row.category || "technical",
      year: row.year || "",
      image: row.image || "",
      galleryImages: Array.isArray(row.gallery_images) ? row.gallery_images : [],
      description: row.description || "",
      location: row.location || "",
      client: row.client || "",
      role: row.role || "",
      overview: row.overview || "",
      responsibilities: Array.isArray(row.responsibilities) ? row.responsibilities : [],
      deliverables: Array.isArray(row.deliverables) ? row.deliverables : [],
      tools: Array.isArray(row.tools) ? row.tools : [],
      scheduleDate: row.schedule_date || "",
      isPublished: row.is_published !== false,
      link: `project-detail.html?id=${encodeURIComponent(row.id)}`
    };
  }

  function toDbProject(project) {
    const id = slugify(project.id || project.title);
    return {
      id,
      title: project.title || "Untitled Project",
      tag: project.tag || "Project",
      category: project.category || "technical",
      year: project.year || "",
      image: project.image || "",
      gallery_images: toArray(project.galleryImages || project.gallery_images),
      description: project.description || "",
      location: project.location || "",
      client: project.client || "",
      role: project.role || "",
      overview: project.overview || "",
      responsibilities: toArray(project.responsibilities),
      deliverables: toArray(project.deliverables),
      tools: toArray(project.tools),
      schedule_date: project.scheduleDate || project.schedule_date || null,
      is_published: project.isPublished !== false && project.is_published !== false,
      updated_at: new Date().toISOString()
    };
  }

  async function fetchCategories() {
    const sb = getClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from("project_categories")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true });
    if (error) throw error;
    return (data || []).map(fromDbCategory);
  }

  async function fetchProjects(options = {}) {
    const sb = getClient();
    if (!sb) return null;
    const includeUnpublished = Boolean(options.includeUnpublished);
    let query = sb.from("projects").select("*");
    if (!includeUnpublished) query = query.eq("is_published", true);
    const { data, error } = await query
      .order("schedule_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(fromDbProject);
  }

  async function fetchProject(id, options = {}) {
    const sb = getClient();
    if (!sb) return null;
    let query = sb.from("projects").select("*").eq("id", id);
    if (!options.includeUnpublished) query = query.eq("is_published", true);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data ? fromDbProject(data) : null;
  }



  async function fetchSiteContent() {
    const sb = getClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from("site_content")
      .select("content")
      .eq("id", "main")
      .maybeSingle();
    if (error) throw error;
    return data && data.content ? data.content : null;
  }

  async function saveSiteContent(content) {
    const sb = getClient();
    if (!sb) throw new Error("Supabase is not configured.");
    const { data, error } = await sb
      .from("site_content")
      .upsert({ id: "main", content, updated_at: new Date().toISOString() }, { onConflict: "id" })
      .select()
      .single();
    if (error) throw error;
    return data && data.content ? data.content : content;
  }

  async function upsertCategory(category) {
    const sb = getClient();
    if (!sb) throw new Error("Supabase is not configured.");
    const { data, error } = await sb
      .from("project_categories")
      .upsert(toDbCategory(category), { onConflict: "id" })
      .select()
      .single();
    if (error) throw error;
    return fromDbCategory(data);
  }

  async function deleteCategory(id) {
    const sb = getClient();
    if (!sb) throw new Error("Supabase is not configured.");
    const { error } = await sb.from("project_categories").delete().eq("id", id);
    if (error) throw error;
  }

  async function upsertProject(project) {
    const sb = getClient();
    if (!sb) throw new Error("Supabase is not configured.");
    const dbProject = toDbProject(project);
    const { data, error } = await sb
      .from("projects")
      .upsert(dbProject, { onConflict: "id" })
      .select()
      .single();
    if (error) throw error;
    return fromDbProject(data);
  }

  async function deleteProject(id) {
    const sb = getClient();
    if (!sb) throw new Error("Supabase is not configured.");
    const { error } = await sb.from("projects").delete().eq("id", id);
    if (error) throw error;
  }

  async function signIn(email, password) {
    const sb = getClient();
    if (!sb) throw new Error("Supabase is not configured.");
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    const sb = getClient();
    if (!sb) return;
    await sb.auth.signOut();
  }

  async function getUser() {
    const sb = getClient();
    if (!sb) return null;
    const { data, error } = await sb.auth.getUser();
    if (error) return null;
    return data.user || null;
  }

  async function isAdminUser() {
    const sb = getClient();
    if (!sb) return false;
    const user = await getUser();
    if (!user) return false;
    const { data, error } = await sb
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) return false;
    return Boolean(data);
  }

  window.HossainSupabase = {
    hasConfig,
    getClient,
    slugify,
    toArray,
    fromDbProject,
    toDbProject,
    fetchCategories,
    fetchProjects,
    fetchProject,
    fetchSiteContent,
    saveSiteContent,
    upsertCategory,
    deleteCategory,
    upsertProject,
    deleteProject,
    uploadAdminFile,
    uploadProjectImage,
    signIn,
    signOut,
    getUser,
    isAdminUser
  };
})();
