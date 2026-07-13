// ========================================
// NZSL Cultural Foundation — Admin CMS
// ========================================

const API_BASE = "/api";
let currentToken = null;

// --- Token Management ---
function getToken() {
  return localStorage.getItem("nzsl_admin_token");
}
function setToken(token) {
  localStorage.setItem("nzsl_admin_token", token);
}
function clearToken() {
  localStorage.removeItem("nzsl_admin_token");
}

// --- Date Helpers ---
// The API returns dates as RFC 1123 strings (e.g. "Sat, 01 Aug 2026 00:00:00
// GMT"), not ISO — <input type="date"> silently rejects anything that isn't
// exactly YYYY-MM-DD, so form fields must be normalized through this first.
function toDateInputValue(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

// --- API Fetch ---
async function adminFetch(endpoint, { token, method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// --- Toasts ---
function showToast(message, type = "success", duration = 4000) {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("leaving");
    setTimeout(() => toast.remove(), 200);
  }, duration);
}

// --- Loading helpers ---
function skeletonRows(cols, rows = 5) {
  return Array.from({ length: rows }, () =>
    `<tr>${Array.from({ length: cols }, () => `<td><div class="skeleton" style="height:14px;"></div></td>`).join("")}</tr>`
  ).join("");
}

function setBtnLoading(btn, loading, idleLabel) {
  if (loading) {
    btn.dataset.idleLabel = idleLabel ?? btn.textContent;
    btn.disabled = true;
    btn.innerHTML = `<span class="loader" style="width:14px;height:14px;"></span> Saving...`;
  } else {
    btn.disabled = false;
    btn.textContent = idleLabel ?? btn.dataset.idleLabel;
  }
}

// --- Navigation ---
function switchSection(section) {
  document
    .querySelectorAll(".admin-section")
    .forEach((s) => (s.style.display = "none"));
  document.getElementById(`section-${section}`).style.display = "block";
  document.querySelectorAll(".admin-sidebar-nav a").forEach((a) => {
    a.classList.toggle("active", a.dataset.section === section);
  });
  if (section === "dashboard") loadDashboardStats();
  if (section === "events") loadEventsTable();
  if (section === "productions") loadProductionsTable();
  if (section === "posts") loadPostsTable();
  if (section === "gallery") loadGalleryTable();
  if (section === "stories") loadStoriesTable();
  if (section === "leadership") loadLeadershipTable();
  if (section === "sponsors") loadSponsorsTable();
  if (section === "programmes") loadProgrammesTable();
  if (section === "classes") loadClassesTable();
  if (section === "tutors") loadTutorsTable();
  if (section === "membership") loadMembershipTable();
  if (section === "videos") loadVideosTable();
  if (section === "enquiries") loadEnquiriesTable();
  if (section === "settings") { loadSettings(); loadHeroBannerSetting(); initHeroBannerDrag(); }
  if (section === "adminusers") loadAdminUsersTable();
  if (section === "account") loadAccountSection();
}

// --- Dashboard ---
async function loadDashboardStats() {
  try {
    const [events, posts, gallery, stories, leadership] = await Promise.all([
      adminFetch("/events/admin/all", { token: currentToken }),
      adminFetch("/news/admin/all", { token: currentToken }),
      adminFetch("/gallery/admin/all", { token: currentToken }),
      adminFetch("/stories/admin/all", { token: currentToken }),
      adminFetch("/leadership/admin/all", { token: currentToken }),
    ]);
    document.getElementById("statEvents").textContent =
      events.events?.length || 0;
    document.getElementById("statPosts").textContent =
      posts.news?.length || 0;
    document.getElementById("statGallery").textContent =
      gallery.images?.length || 0;
    document.getElementById("statStories").textContent =
      stories.stories?.length || 0;
    document.getElementById("statLeadership").textContent =
      leadership.leaders?.length || 0;

    const profile = await adminFetch("/auth/profile", { token: currentToken });
    document.getElementById("adminProfile").textContent = `Signed in as ${
      profile.admin?.name || "Admin"
    }`;
  } catch (e) {
    console.error("Stats error:", e);
  }
}

// --- Events ---
async function loadEventsTable() {
  const tbody = document.getElementById("eventsTableBody");
  tbody.innerHTML = skeletonRows(5);
  try {
    const data = await adminFetch("/events/admin/all", { token: currentToken });
    tbody.innerHTML = (data.events || [])
      .map(
        (e) => `
      <tr>
        <td><div class="admin-table-title">${e.title}</div><div class="admin-table-subtitle">${e.location || ""}</div></td>
        <td>${new Date(e.date).toLocaleDateString("en-NZ")}</td>
        <td>${e.category}</td>
        <td><span class="status-badge ${e.status}">${e.status}</span></td>
        <td class="admin-actions-cell"><div class="admin-actions">
          <button class="admin-btn" onclick="editEvent('${e.id}')">Edit</button>
          <button class="admin-btn admin-btn-danger" onclick="deleteEvent('${e.id}')">Delete</button>
        </div></td>
      </tr>
    `
      )
      .join("");
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:2rem;">Failed to load. <a href="#" onclick="loadEventsTable();return false;">Retry</a></td></tr>`;
  }
}

function showEventModal(event = null) {
  const isEdit = !!event;
  document.getElementById("modalContainer").innerHTML = `
    <div class="admin-modal-overlay" onclick="closeModal(event)">
      <div class="admin-modal" onclick="event.stopPropagation()">
        <h2>${isEdit ? "Edit Event" : "New Event"}</h2>
        <form id="eventForm" onsubmit="saveEvent(event, ${
          isEdit ? `'${event.id}'` : "null"
        })">
          <div class="admin-form-group"><label>Title</label><input name="title" value="${
            event?.title || ""
          }" required /></div>
          <div class="admin-form-row">
            <div class="admin-form-group"><label>Date</label><input name="date" type="date" value="${
              toDateInputValue(event?.date)
            }" required /></div>
            <div class="admin-form-group"><label>Category</label><select name="category">
              <option value="festival" ${
                event?.category === "festival" ? "selected" : ""
              }>Festival</option>
              <option value="cultural" ${
                event?.category === "cultural" ? "selected" : ""
              }>Cultural</option>
              <option value="performance" ${
                event?.category === "performance" ? "selected" : ""
              }>Performance</option>
              <option value="workshop" ${
                event?.category === "workshop" ? "selected" : ""
              }>Workshop</option>
              <option value="community" ${
                event?.category === "community" ? "selected" : ""
              }>Community</option>
              <option value="production" ${
                event?.category === "production" ? "selected" : ""
              }>Production</option>
              <option value="classes" ${
                event?.category === "classes" ? "selected" : ""
              }>Classes</option>
            </select></div>
          </div>
          <div class="admin-form-row">
            <div class="admin-form-group"><label>Time Start</label><input name="time_start" value="${
              event?.time_start || ""
            }" /></div>
            <div class="admin-form-group"><label>Time End</label><input name="time_end" value="${
              event?.time_end || ""
            }" /></div>
          </div>
          <div class="admin-form-group"><label>Location</label><input name="location" value="${
            event?.location || ""
          }" /></div>
          <div class="admin-form-group"><label>Cover Image URL (optional)</label><input name="cover_image" value="${
            event?.cover_image || ""
          }" placeholder="https://..." /></div>
          <div class="admin-form-group"><label>Description</label><textarea name="description" rows="4">${
            event?.description || ""
          }</textarea></div>
          <div class="admin-form-group"><label>Status</label><select name="status">
            <option value="published" ${
              event?.status === "published" ? "selected" : ""
            }>Published</option>
            <option value="draft" ${
              event?.status === "draft" ? "selected" : ""
            }>Draft</option>
          </select></div>
          <div class="admin-form-actions">
            <button type="button" class="admin-btn" onclick="closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary btn-sm">${
              isEdit ? "Update" : "Create"
            }</button>
          </div>
        </form>
      </div>
    </div>`;
}

async function saveEvent(e, id) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  setBtnLoading(btn, true);
  const form = new FormData(e.target);
  const body = Object.fromEntries(form.entries());
  try {
    if (id) {
      await adminFetch(`/events/admin/${id}`, {
        token: currentToken,
        method: "PUT",
        body,
      });
    } else {
      await adminFetch("/events/admin", {
        token: currentToken,
        method: "POST",
        body,
      });
    }
    closeModal();
    loadEventsTable();
  } catch (err) {
    showToast(err.message, "error");
    setBtnLoading(btn, false, id ? "Update" : "Create");
  }
}

async function editEvent(id) {
  try {
    const data = await adminFetch(`/events/admin/all`, { token: currentToken });
    const event = data.events.find((e) => e.id === id);
    if (event) showEventModal(event);
  } catch (e) {
    showToast(e.message, "error");
  }
}

async function deleteEvent(id) {
  if (!confirm("Delete this event?")) return;
  try {
    await adminFetch(`/events/admin/${id}`, {
      token: currentToken,
      method: "DELETE",
    });
    loadEventsTable();
  } catch (e) {
    showToast(e.message, "error");
  }
}

// --- Productions ---
async function productionOptionsHtml(selectedId) {
  try {
    const data = await adminFetch("/productions/admin/all", { token: currentToken });
    const options = (data.productions || [])
      .map((p) => `<option value="${p.id}" ${selectedId === p.id ? "selected" : ""}>${p.title}</option>`)
      .join("");
    return `<option value="">— None —</option>${options}`;
  } catch (e) {
    return `<option value="">— None —</option>`;
  }
}

async function eventOptionsHtml(selectedId) {
  try {
    const data = await adminFetch("/events/admin/all", { token: currentToken });
    const options = (data.events || [])
      .map((ev) => `<option value="${ev.id}" ${selectedId === ev.id ? "selected" : ""}>${ev.title}</option>`)
      .join("");
    return `<option value="">— None —</option>${options}`;
  } catch (e) {
    return `<option value="">— None —</option>`;
  }
}

function slugifyClient(text) {
  return (text || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function loadProductionsTable() {
  const tbody = document.getElementById("productionsTableBody");
  tbody.innerHTML = skeletonRows(5);
  try {
    const data = await adminFetch("/productions/admin/all", { token: currentToken });
    tbody.innerHTML = (data.productions || [])
      .map(
        (p) => `
      <tr>
        <td>${p.cover_image ? `<img src="${p.cover_image}" style="width:64px;height:48px;object-fit:cover;border-radius:4px;border:1px solid var(--border)" />` : "—"}</td>
        <td><div class="admin-table-title">${p.title}</div><div class="admin-table-subtitle">/productions/${p.slug}</div></td>
        <td><span class="status-badge ${p.status === "published" ? "published" : "pending"}">${p.status}</span></td>
        <td>${p.sort_order}</td>
        <td class="admin-actions-cell"><div class="admin-actions">
          <button class="admin-btn" onclick="editProduction('${p.id}')">Edit</button>
          <button class="admin-btn admin-btn-danger" onclick="deleteProduction('${p.id}')">Delete</button>
        </div></td>
      </tr>
    `
      )
      .join("");
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:2rem;">Failed to load. <a href="#" onclick="loadProductionsTable();return false;">Retry</a></td></tr>`;
  }
}

function showProductionModal(production = null) {
  const isEdit = !!production;
  const currentCover = production?.cover_image || "";
  document.getElementById("modalContainer").innerHTML = `
    <div class="admin-modal-overlay" onclick="closeModal(event)">
      <div class="admin-modal" onclick="event.stopPropagation()">
        <h2>${isEdit ? "Edit Production" : "Add Production"}</h2>
        <form id="productionForm" onsubmit="saveProduction(event, ${isEdit ? `'${production.id}'` : "null"})">

          <div class="admin-form-group">
            <label>Cover Image</label>
            <div style="display:flex;align-items:center;gap:16px;margin-bottom:8px">
              <div id="coverPreviewWrap" style="
                width:96px;height:72px;border-radius:6px;overflow:hidden;
                background:var(--bg-elevated);border:2px solid var(--border);
                display:flex;align-items:center;justify-content:center;flex-shrink:0;
              ">
                ${currentCover
                  ? `<img id="coverPreview" src="${currentCover}" style="width:100%;height:100%;object-fit:cover" />`
                  : `<span id="coverPreview" style="font-size:1.4rem;color:var(--text-tertiary)">&#127916;</span>`}
              </div>
              <div style="flex:1">
                <input type="file" id="coverFileInput" accept="image/*" style="font-size:0.8rem;width:100%" onchange="previewProductionCover(this)" />
                <p style="font-size:0.75rem;color:var(--text-muted);margin-top:4px">JPG, PNG, WebP — max 10MB</p>
              </div>
            </div>
            <input type="hidden" name="cover_image" id="coverUrlInput" value="${currentCover}" />
          </div>

          <div class="admin-form-group"><label>Title</label><input name="title" id="productionTitleInput" value="${production?.title || ""}" required oninput="if(!document.getElementById('productionSlugInput').dataset.touched) document.getElementById('productionSlugInput').value = slugifyClient(this.value)" /></div>
          <div class="admin-form-group"><label>Slug (URL)</label><input name="slug" id="productionSlugInput" value="${production?.slug || ""}" placeholder="auto-generated from title" oninput="this.dataset.touched = 'true'" /></div>
          <div class="admin-form-group"><label>Tagline</label><input name="tagline" value="${production?.tagline || ""}" placeholder="e.g. The Beauty of Sri Lanka in Every Step and Beat" /></div>
          <div class="admin-form-group"><label>Short Description</label><textarea name="description" rows="2" placeholder="Shown on the productions hub cards...">${production?.description || ""}</textarea></div>
          <div class="admin-form-group"><label>Full Description</label><textarea name="full_description" rows="5" placeholder="Shown on the production's own page...">${production?.full_description || ""}</textarea></div>
          <div class="admin-form-row">
            <div class="admin-form-group"><label>Location</label><input name="location" value="${production?.location || ""}" /></div>
            <div class="admin-form-group"><label>Display Order</label><input name="sort_order" type="number" value="${production?.sort_order || 0}" /></div>
          </div>
          <div class="admin-form-group"><label>Status</label><select name="status">
            <option value="published" ${production?.status === "published" ? "selected" : ""}>Published</option>
            <option value="draft" ${production?.status === "draft" ? "selected" : ""}>Draft</option>
          </select></div>

          <div class="admin-form-actions">
            <button type="button" class="admin-btn" onclick="closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary btn-sm" id="productionSaveBtn">${isEdit ? "Update" : "Add Production"}</button>
          </div>
        </form>
      </div>
    </div>`;
}

function previewProductionCover(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const wrap = document.getElementById("coverPreviewWrap");
  const reader = new FileReader();
  reader.onload = (e) => {
    wrap.innerHTML = `<img id="coverPreview" src="${e.target.result}" style="width:100%;height:100%;object-fit:cover" />`;
  };
  reader.readAsDataURL(file);
}

async function saveProduction(e, id) {
  e.preventDefault();
  const btn = document.getElementById("productionSaveBtn");
  setBtnLoading(btn, true);

  try {
    let cover_image = document.getElementById("coverUrlInput")?.value || "";
    const fileInput = document.getElementById("coverFileInput");

    if (fileInput && fileInput.files && fileInput.files[0]) {
      const fd = new FormData();
      fd.append("cover", fileInput.files[0]);
      const res = await fetch(`${API_BASE}/productions/admin/cover`, {
        method: "POST",
        headers: { Authorization: `Bearer ${currentToken}` },
        body: fd,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Cover image upload failed");
      }
      const uploadData = await res.json();
      cover_image = uploadData.cover_image;
    }

    const form = new FormData(e.target);
    const body = Object.fromEntries(form.entries());
    body.sort_order = parseInt(body.sort_order) || 0;
    if (cover_image) body.cover_image = cover_image;

    if (id) {
      await adminFetch(`/productions/admin/${id}`, { token: currentToken, method: "PUT", body });
    } else {
      await adminFetch("/productions/admin", { token: currentToken, method: "POST", body });
    }
    closeModal();
    loadProductionsTable();
  } catch (err) {
    showToast(err.message, "error");
    setBtnLoading(btn, false, id ? "Update" : "Add Production");
  }
}

async function editProduction(id) {
  try {
    const data = await adminFetch("/productions/admin/all", { token: currentToken });
    const production = data.productions.find((p) => p.id === id);
    if (production) showProductionModal(production);
  } catch (e) {
    showToast(e.message, "error");
  }
}

async function deleteProduction(id) {
  if (!confirm("Delete this production? Linked gallery images and videos will be unlinked, not deleted.")) return;
  try {
    await adminFetch(`/productions/admin/${id}`, { token: currentToken, method: "DELETE" });
    loadProductionsTable();
  } catch (e) {
    showToast(e.message, "error");
  }
}

// --- Posts (News) ---
async function loadPostsTable() {
  const tbody = document.getElementById("postsTableBody");
  tbody.innerHTML = skeletonRows(5);
  try {
    const data = await adminFetch("/news/admin/all", { token: currentToken });
    tbody.innerHTML = (data.news || [])
      .map(
        (p) => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:12px">
            ${p.thumbnail
              ? `<img src="${p.thumbnail}" style="width:48px;height:36px;object-fit:cover;border-radius:4px;flex-shrink:0;border:1px solid var(--border)" />`
              : `<div style="width:48px;height:36px;border-radius:4px;background:var(--bg-elevated);border:1px solid var(--border);flex-shrink:0"></div>`}
            <div>
              <div class="admin-table-title">${p.title}</div>
              <div class="admin-table-subtitle">${p.summary || ""}</div>
            </div>
          </div>
        </td>
        <td>${p.category}</td>
        <td>${p.author || ""}</td>
        <td><span class="status-badge ${p.status}">${p.status}</span></td>
        <td class="admin-actions-cell"><div class="admin-actions">
          <button class="admin-btn" onclick="editPost('${p.id}')">Edit</button>
          <button class="admin-btn admin-btn-danger" onclick="deletePost('${p.id}')">Delete</button>
        </div></td>
      </tr>
    `
      )
      .join("");
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:2rem;">Failed to load. <a href="#" onclick="loadPostsTable();return false;">Retry</a></td></tr>`;
  }
}

function showPostModal(post = null) {
  const isEdit = !!post;
  const currentThumb = post?.thumbnail || "";
  document.getElementById("modalContainer").innerHTML = `
    <div class="admin-modal-overlay" onclick="closeModal(event)">
      <div class="admin-modal" onclick="event.stopPropagation()">
        <h2>${isEdit ? "Edit Post" : "New Post"}</h2>
        <form id="postForm" onsubmit="savePost(event, ${isEdit ? `'${post.id}'` : "null"})">

          <div class="admin-form-group">
            <label>Cover Image</label>
            ${currentThumb ? `<div id="postThumbPreviewWrap" style="margin-bottom:8px;border-radius:6px;overflow:hidden;max-height:160px;">
              <img id="postThumbPreview" src="${currentThumb}" style="width:100%;height:160px;object-fit:cover;display:block;" />
            </div>` : `<div id="postThumbPreviewWrap" style="display:none;margin-bottom:8px;border-radius:6px;overflow:hidden;max-height:160px;">
              <img id="postThumbPreview" src="" style="width:100%;height:160px;object-fit:cover;display:block;" />
            </div>`}
            <input type="file" id="postImageInput" accept="image/*" style="font-size:0.8rem;width:100%" onchange="previewPostImage(this)" />
            <p style="font-size:0.75rem;color:var(--text-muted);margin-top:4px">JPG, PNG, WebP — max 10MB</p>
            <input type="hidden" name="thumbnail" id="postThumbInput" value="${currentThumb}" />
          </div>

          <div class="admin-form-group"><label>Title</label><input name="title" value="${post?.title || ""}" required /></div>
          <div class="admin-form-group"><label>Summary</label><input name="summary" value="${post?.summary || ""}" placeholder="Short description shown in listings..." /></div>
          <div class="admin-form-row">
            <div class="admin-form-group"><label>Category</label><select name="category">
              <option value="general" ${post?.category === "general" ? "selected" : ""}>General</option>
              <option value="cultural" ${post?.category === "cultural" ? "selected" : ""}>Cultural</option>
              <option value="community" ${post?.category === "community" ? "selected" : ""}>Community</option>
              <option value="announcement" ${post?.category === "announcement" ? "selected" : ""}>Announcement</option>
            </select></div>
            <div class="admin-form-group"><label>Author</label><input name="author" value="${post?.author || ""}" /></div>
          </div>
          <div class="admin-form-group"><label>Content</label><textarea name="content" rows="8" required>${post?.content || ""}</textarea></div>
          <div class="admin-form-group"><label>Status</label><select name="status">
            <option value="published" ${post?.status === "published" ? "selected" : ""}>Published</option>
            <option value="draft" ${post?.status === "draft" ? "selected" : ""}>Draft</option>
          </select></div>
          <div class="admin-form-actions">
            <button type="button" class="admin-btn" onclick="closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary btn-sm" id="postSaveBtn">${isEdit ? "Update" : "Publish"}</button>
          </div>
        </form>
      </div>
    </div>`;
}

function previewPostImage(input) {
  if (!input.files || !input.files[0]) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const wrap = document.getElementById("postThumbPreviewWrap");
    const img = document.getElementById("postThumbPreview");
    img.src = e.target.result;
    wrap.style.display = "block";
  };
  reader.readAsDataURL(input.files[0]);
}

async function savePost(e, id) {
  e.preventDefault();
  const btn = document.getElementById("postSaveBtn");
  setBtnLoading(btn, true);

  try {
    // Upload image first if a file was chosen
    const fileInput = document.getElementById("postImageInput");
    let thumbnail = document.getElementById("postThumbInput")?.value || "";

    if (fileInput && fileInput.files && fileInput.files[0]) {
      const fd = new FormData();
      fd.append("image", fileInput.files[0]);
      const res = await fetch(`${API_BASE}/news/admin/thumbnail`, {
        method: "POST",
        headers: { Authorization: `Bearer ${currentToken}` },
        body: fd,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Image upload failed");
      }
      const uploadData = await res.json();
      thumbnail = uploadData.thumbnail;
    }

    const form = new FormData(e.target);
    const body = Object.fromEntries(form.entries());
    if (thumbnail) body.thumbnail = thumbnail;

    if (id) {
      await adminFetch(`/news/admin/${id}`, { token: currentToken, method: "PUT", body });
    } else {
      await adminFetch("/news/admin", { token: currentToken, method: "POST", body });
    }
    closeModal();
    loadPostsTable();
  } catch (err) {
    showToast(err.message, "error");
    setBtnLoading(btn, false, id ? "Update" : "Publish");
  }
}

async function editPost(id) {
  try {
    const data = await adminFetch("/news/admin/all", { token: currentToken });
    const post = data.news.find((p) => p.id === id);
    if (post) showPostModal(post);
  } catch (e) {
    showToast(e.message, "error");
  }
}

async function deletePost(id) {
  if (!confirm("Delete this post?")) return;
  try {
    await adminFetch(`/news/admin/${id}`, { token: currentToken, method: "DELETE" });
    loadPostsTable();
  } catch (e) {
    showToast(e.message, "error");
  }
}

// --- Gallery ---
async function loadGalleryTable() {
  const tbody = document.getElementById("galleryTableBody");
  tbody.innerHTML = skeletonRows(4);
  try {
    const data = await adminFetch("/gallery/admin/all", {
      token: currentToken,
    });
    tbody.innerHTML = (data.images || [])
      .map(
        (img) => `
      <tr>
        <td><div class="admin-table-title">${img.title || "Untitled"}</div></td>
        <td>${img.category}</td>
        <td>${img.photographer || ""}</td>
        <td class="admin-actions-cell"><div class="admin-actions">
          <button class="admin-btn admin-btn-danger" onclick="deleteGalleryImage('${img.id}')">Delete</button>
        </div></td>
      </tr>
    `
      )
      .join("");
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:2rem;">Failed to load. <a href="#" onclick="loadGalleryTable();return false;">Retry</a></td></tr>`;
  }
}

function showGalleryUpload() {
  document.getElementById("modalContainer").innerHTML = `
    <div class="admin-modal-overlay" onclick="closeModal(event)">
      <div class="admin-modal" onclick="event.stopPropagation()">
        <h2>Upload Gallery Images</h2>
        <form id="galleryUploadForm" onsubmit="uploadGalleryImages(event)">
          <div class="admin-form-group">
            <label>Image Files</label>
            <input name="image" type="file" accept="image/*" multiple required onchange="updateGalleryFileCount(this)" />
            <p id="galleryFileCount" style="font-size:0.75rem;color:var(--text-muted);margin-top:4px"></p>
          </div>
          <div class="admin-form-group"><label>Title</label><input name="title" placeholder="Applied to every photo in this batch" /></div>
          <div class="admin-form-group"><label>Description</label><textarea name="description" rows="3"></textarea></div>
          <div class="admin-form-row">
            <div class="admin-form-group"><label>Category</label><select name="category">
              <option value="general">General</option>
              <option value="performances">Performances</option>
              <option value="classes">Classes</option>
            </select></div>
            <div class="admin-form-group"><label>Photographer</label><input name="photographer" /></div>
          </div>
          <div class="admin-form-row">
            <div class="admin-form-group"><label>Link to Production</label><select name="production_id" id="galleryProductionSelect"><option value="">Loading...</option></select></div>
            <div class="admin-form-group"><label>Link to Event</label><select name="event_id" id="galleryEventSelect"><option value="">Loading...</option></select></div>
          </div>
          <div class="admin-form-actions">
            <button type="button" class="admin-btn" onclick="closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary btn-sm" id="galleryUploadBtn">Upload</button>
          </div>
          <p id="galleryUploadProgress" style="font-size:0.8rem;color:var(--text-muted);margin-top:0.75rem"></p>
        </form>
      </div>
    </div>`;
  productionOptionsHtml().then((html) => {
    const select = document.getElementById("galleryProductionSelect");
    if (select) select.innerHTML = html;
  });
  eventOptionsHtml().then((html) => {
    const select = document.getElementById("galleryEventSelect");
    if (select) select.innerHTML = html;
  });
}

function updateGalleryFileCount(input) {
  const el = document.getElementById("galleryFileCount");
  if (!el) return;
  const n = input.files?.length || 0;
  el.textContent = n > 0 ? `${n} photo${n === 1 ? "" : "s"} selected` : "";
}

async function uploadGalleryImages(e) {
  e.preventDefault();
  const fileInput = e.target.querySelector('input[name="image"]');
  const files = Array.from(fileInput.files || []);
  if (files.length === 0) return;

  const sharedFields = new FormData(e.target);
  sharedFields.delete("image");

  const btn = document.getElementById("galleryUploadBtn");
  const progressEl = document.getElementById("galleryUploadProgress");
  btn.disabled = true;

  let succeeded = 0;
  let failed = 0;
  for (let i = 0; i < files.length; i++) {
    progressEl.textContent = `Uploading ${i + 1} of ${files.length}...`;
    const fd = new FormData();
    for (const [key, value] of sharedFields.entries()) fd.append(key, value);
    fd.append("image", files[i]);
    try {
      const res = await fetch(`${API_BASE}/gallery/admin/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${currentToken}` },
        body: fd,
      });
      if (!res.ok) throw new Error();
      succeeded++;
    } catch (err) {
      failed++;
    }
  }

  loadGalleryTable();
  if (failed === 0) {
    closeModal();
  } else {
    btn.disabled = false;
    progressEl.textContent = `${succeeded} uploaded, ${failed} failed. You can try again for the rest.`;
  }
}

async function deleteGalleryImage(id) {
  if (!confirm("Delete this image?")) return;
  try {
    await adminFetch(`/gallery/admin/${id}`, {
      token: currentToken,
      method: "DELETE",
    });
    loadGalleryTable();
  } catch (e) {
    showToast(e.message, "error");
  }
}

// --- Stories ---
async function loadStoriesTable() {
  const tbody = document.getElementById("storiesTableBody");
  tbody.innerHTML = skeletonRows(5);
  try {
    const data = await adminFetch("/stories/admin/all", {
      token: currentToken,
    });
    tbody.innerHTML = (data.stories || [])
      .map(
        (s) => `
      <tr>
        <td><div class="admin-table-title">${s.title}</div></td>
        <td>${s.category}</td>
        <td>${s.author || ""}</td>
        <td><span class="status-badge ${s.status}">${s.status}</span></td>
        <td class="admin-actions-cell"><div class="admin-actions">
          <button class="admin-btn" onclick="editStory('${s.id}')">Edit</button>
          <button class="admin-btn admin-btn-danger" onclick="deleteStory('${s.id}')">Delete</button>
        </div></td>
      </tr>
    `
      )
      .join("");
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:2rem;">Failed to load. <a href="#" onclick="loadStoriesTable();return false;">Retry</a></td></tr>`;
  }
}

function showStoryModal(story = null) {
  const isEdit = !!story;
  document.getElementById("modalContainer").innerHTML = `
    <div class="admin-modal-overlay" onclick="closeModal(event)">
      <div class="admin-modal" onclick="event.stopPropagation()">
        <h2>${isEdit ? "Edit Story" : "New Story"}</h2>
        <form id="storyForm" onsubmit="saveStory(event, ${
          isEdit ? `'${story.id}'` : "null"
        })">
          <div class="admin-form-group"><label>Title</label><input name="title" value="${
            story?.title || ""
          }" required /></div>
          <div class="admin-form-group"><label>Subtitle</label><input name="subtitle" value="${
            story?.subtitle || ""
          }" /></div>
          <div class="admin-form-row">
            <div class="admin-form-group"><label>Category</label><select name="category">
              <option value="culture" ${
                story?.category === "culture" ? "selected" : ""
              }>Culture</option>
              <option value="heritage" ${
                story?.category === "heritage" ? "selected" : ""
              }>Heritage</option>
              <option value="community" ${
                story?.category === "community" ? "selected" : ""
              }>Community</option>
              <option value="arts" ${
                story?.category === "arts" ? "selected" : ""
              }>Arts</option>
            </select></div>
            <div class="admin-form-group"><label>Author</label><input name="author" value="${
              story?.author || ""
            }" /></div>
          </div>
          <div class="admin-form-group"><label>Content</label><textarea name="content" rows="8">${
            story?.content || ""
          }</textarea></div>
          <div class="admin-form-group"><label>Status</label><select name="status">
            <option value="published" ${
              story?.status === "published" ? "selected" : ""
            }>Published</option>
            <option value="draft" ${
              story?.status === "draft" ? "selected" : ""
            }>Draft</option>
          </select></div>
          <div class="admin-form-actions">
            <button type="button" class="admin-btn" onclick="closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary btn-sm">${
              isEdit ? "Update" : "Create"
            }</button>
          </div>
        </form>
      </div>
    </div>`;
}

async function saveStory(e, id) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  setBtnLoading(btn, true);
  const form = new FormData(e.target);
  const body = Object.fromEntries(form.entries());
  try {
    if (id) {
      await adminFetch(`/stories/admin/${id}`, {
        token: currentToken,
        method: "PUT",
        body,
      });
    } else {
      await adminFetch("/stories/admin", {
        token: currentToken,
        method: "POST",
        body,
      });
    }
    closeModal();
    loadStoriesTable();
  } catch (err) {
    showToast(err.message, "error");
    setBtnLoading(btn, false, id ? "Update" : "Create");
  }
}

async function editStory(id) {
  try {
    const data = await adminFetch("/stories/admin/all", {
      token: currentToken,
    });
    const story = data.stories.find((s) => s.id === id);
    if (story) showStoryModal(story);
  } catch (e) {
    showToast(e.message, "error");
  }
}

async function deleteStory(id) {
  if (!confirm("Delete this story?")) return;
  try {
    await adminFetch(`/stories/admin/${id}`, {
      token: currentToken,
      method: "DELETE",
    });
    loadStoriesTable();
  } catch (e) {
    showToast(e.message, "error");
  }
}

// --- Leadership ---
async function loadLeadershipTable() {
  const tbody = document.getElementById("leadershipTableBody");
  tbody.innerHTML = skeletonRows(6);
  try {
    const data = await adminFetch("/leadership/admin/all", {
      token: currentToken,
    });
    tbody.innerHTML = (data.leaders || [])
      .map(
        (l) => `
      <tr>
        <td><div class="admin-table-title">${l.name}</div></td>
        <td>${l.role}</td>
        <td><span class="status-badge ${l.category === "director" ? "published" : "pending"}">${l.category === "director" ? "Director" : "Team"}</span></td>
        <td><span class="status-badge ${l.status}">${l.status}</span></td>
        <td>${l.sort_order}</td>
        <td class="admin-actions-cell"><div class="admin-actions">
          <button class="admin-btn" onclick="editLeader('${l.id}')">Edit</button>
          <button class="admin-btn admin-btn-danger" onclick="deleteLeader('${l.id}')">Delete</button>
        </div></td>
      </tr>
    `
      )
      .join("");
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:2rem;">Failed to load. <a href="#" onclick="loadLeadershipTable();return false;">Retry</a></td></tr>`;
  }
}

function showLeaderModal(leader = null) {
  const isEdit = !!leader;
  const currentPhoto = leader?.photo_url || "";
  document.getElementById("modalContainer").innerHTML = `
    <div class="admin-modal-overlay" onclick="closeModal(event)">
      <div class="admin-modal" onclick="event.stopPropagation()">
        <h2>${isEdit ? "Edit Person" : "Add Person"}</h2>
        <form id="leaderForm" onsubmit="saveLeader(event, ${isEdit ? `'${leader.id}'` : "null"})">

          <div class="admin-form-group">
            <label>Photo</label>
            <div style="display:flex;align-items:center;gap:16px;margin-bottom:8px">
              <div id="photoPreviewWrap" style="
                width:80px;height:80px;border-radius:50%;overflow:hidden;
                background:var(--bg-elevated);border:2px solid var(--border);
                display:flex;align-items:center;justify-content:center;flex-shrink:0;
              ">
                ${currentPhoto
                  ? `<img id="photoPreview" src="${currentPhoto}" style="width:100%;height:100%;object-fit:cover" />`
                  : `<span id="photoPreview" style="font-size:1.8rem;color:var(--text-tertiary)">&#128100;</span>`}
              </div>
              <div style="flex:1">
                <input type="file" id="photoFileInput" accept="image/*" style="font-size:0.8rem;width:100%" onchange="previewLeaderPhoto(this)" />
                <p style="font-size:0.75rem;color:var(--text-muted);margin-top:4px">JPG, PNG, WebP — max 10MB</p>
              </div>
            </div>
            <input type="hidden" name="photo_url" id="photoUrlInput" value="${currentPhoto}" />
          </div>

          <div class="admin-form-group"><label>Full Name</label><input name="name" value="${leader?.name || ""}" required /></div>
          <div class="admin-form-group"><label>Role / Title</label><input name="role" value="${leader?.role || ""}" required placeholder="e.g. President, Cultural Director" /></div>
          <div class="admin-form-group"><label>About them</label><textarea name="bio" rows="4" placeholder="A short bio...">${leader?.bio || ""}</textarea></div>
          <div class="admin-form-group"><label>What they do</label><textarea name="contribution" rows="3" placeholder="Their key contribution or focus area...">${leader?.contribution || ""}</textarea></div>
          <div class="admin-form-row">
            <div class="admin-form-group"><label>Category</label><select name="category">
              <option value="director" ${leader?.category === "director" ? "selected" : ""}>Director</option>
              <option value="team" ${leader?.category !== "director" ? "selected" : ""}>Team</option>
            </select></div>
            <div class="admin-form-group"><label>Status</label><select name="status">
              <option value="active" ${leader?.status === "active" ? "selected" : ""}>Visible</option>
              <option value="inactive" ${leader?.status === "inactive" ? "selected" : ""}>Hidden</option>
            </select></div>
          </div>
          <div class="admin-form-row">
            <div class="admin-form-group"><label>Display Order</label><input name="sort_order" type="number" value="${leader?.sort_order || 0}" /></div>
          </div>
          <div class="admin-form-actions">
            <button type="button" class="admin-btn" onclick="closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary btn-sm" id="leaderSaveBtn">${isEdit ? "Update" : "Add Person"}</button>
          </div>
        </form>
      </div>
    </div>`;
}

function previewLeaderPhoto(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const wrap = document.getElementById("photoPreviewWrap");
  const reader = new FileReader();
  reader.onload = (e) => {
    wrap.innerHTML = `<img id="photoPreview" src="${e.target.result}" style="width:100%;height:100%;object-fit:cover" />`;
  };
  reader.readAsDataURL(file);
}

async function saveLeader(e, id) {
  e.preventDefault();
  const btn = document.getElementById("leaderSaveBtn");
  setBtnLoading(btn, true);

  try {
    // Upload photo first if a file was selected
    const fileInput = document.getElementById("photoFileInput");
    let photo_url = document.getElementById("photoUrlInput")?.value || "";

    if (fileInput && fileInput.files && fileInput.files[0]) {
      const fd = new FormData();
      fd.append("photo", fileInput.files[0]);
      const res = await fetch(`${API_BASE}/leadership/admin/photo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${currentToken}` },
        body: fd,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Photo upload failed");
      }
      const uploadData = await res.json();
      photo_url = uploadData.photo_url;
    }

    const form = new FormData(e.target);
    const body = Object.fromEntries(form.entries());
    body.sort_order = parseInt(body.sort_order) || 0;
    if (photo_url) body.photo_url = photo_url;

    if (id) {
      await adminFetch(`/leadership/admin/${id}`, { token: currentToken, method: "PUT", body });
    } else {
      await adminFetch("/leadership/admin", { token: currentToken, method: "POST", body });
    }
    closeModal();
    loadLeadershipTable();
  } catch (err) {
    showToast(err.message, "error");
    setBtnLoading(btn, false, "Save");
  }
}

async function editLeader(id) {
  try {
    const data = await adminFetch("/leadership/admin/all", {
      token: currentToken,
    });
    const leader = data.leaders.find((l) => l.id === id);
    if (leader) showLeaderModal(leader);
  } catch (e) {
    showToast(e.message, "error");
  }
}

async function deleteLeader(id) {
  if (!confirm("Delete this leader?")) return;
  try {
    await adminFetch(`/leadership/admin/${id}`, {
      token: currentToken,
      method: "DELETE",
    });
    loadLeadershipTable();
  } catch (e) {
    showToast(e.message, "error");
  }
}

// --- Partners & Sponsors ---
async function loadSponsorsTable() {
  const tbody = document.getElementById("sponsorsTableBody");
  tbody.innerHTML = skeletonRows(5);
  try {
    const data = await adminFetch("/sponsors/admin/all", { token: currentToken });
    tbody.innerHTML = (data.sponsors || [])
      .map(
        (s) => `
      <tr>
        <td>${s.logo_url ? `<img src="${s.logo_url}" style="width:64px;height:48px;object-fit:contain;border-radius:4px;border:1px solid var(--border);background:#fff" />` : "—"}</td>
        <td><div class="admin-table-title">${s.name}</div></td>
        <td><span class="status-badge ${s.status}">${s.status}</span></td>
        <td>${s.sort_order}</td>
        <td class="admin-actions-cell"><div class="admin-actions">
          <button class="admin-btn" onclick="editSponsor('${s.id}')">Edit</button>
          <button class="admin-btn admin-btn-danger" onclick="deleteSponsor('${s.id}')">Delete</button>
        </div></td>
      </tr>
    `
      )
      .join("");
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:2rem;">Failed to load. <a href="#" onclick="loadSponsorsTable();return false;">Retry</a></td></tr>`;
  }
}

function showSponsorModal(sponsor = null) {
  const isEdit = !!sponsor;
  const currentLogo = sponsor?.logo_url || "";
  document.getElementById("modalContainer").innerHTML = `
    <div class="admin-modal-overlay" onclick="closeModal(event)">
      <div class="admin-modal" onclick="event.stopPropagation()">
        <h2>${isEdit ? "Edit Sponsor" : "Add Sponsor"}</h2>
        <form id="sponsorForm" onsubmit="saveSponsor(event, ${isEdit ? `'${sponsor.id}'` : "null"})">

          <div class="admin-form-group">
            <label>Logo</label>
            <div style="display:flex;align-items:center;gap:16px;margin-bottom:8px">
              <div id="sponsorLogoPreviewWrap" style="
                width:96px;height:72px;border-radius:6px;overflow:hidden;
                background:#fff;border:2px solid var(--border);
                display:flex;align-items:center;justify-content:center;flex-shrink:0;
              ">
                ${currentLogo
                  ? `<img id="sponsorLogoPreview" src="${currentLogo}" style="width:100%;height:100%;object-fit:contain" />`
                  : `<span id="sponsorLogoPreview" style="font-size:1.4rem;color:var(--text-tertiary)">&#127970;</span>`}
              </div>
              <div style="flex:1">
                <input type="file" id="sponsorLogoFileInput" accept="image/*" style="font-size:0.8rem;width:100%" onchange="previewSponsorLogo(this)" />
                <p style="font-size:0.75rem;color:var(--text-muted);margin-top:4px">JPG, PNG, WebP — max 10MB</p>
              </div>
            </div>
            <input type="hidden" name="logo_url" id="sponsorLogoUrlInput" value="${currentLogo}" />
          </div>

          <div class="admin-form-group"><label>Name</label><input name="name" value="${sponsor?.name || ""}" required /></div>
          <div class="admin-form-group"><label>Website URL</label><input name="website_url" type="url" value="${sponsor?.website_url || ""}" placeholder="https://" /></div>
          <div class="admin-form-row">
            <div class="admin-form-group"><label>Display Order</label><input name="sort_order" type="number" value="${sponsor?.sort_order || 0}" /></div>
            <div class="admin-form-group"><label>Status</label><select name="status">
              <option value="active" ${sponsor?.status === "active" ? "selected" : ""}>Visible</option>
              <option value="inactive" ${sponsor?.status === "inactive" ? "selected" : ""}>Hidden</option>
            </select></div>
          </div>
          <div class="admin-form-actions">
            <button type="button" class="admin-btn" onclick="closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary btn-sm" id="sponsorSaveBtn">${isEdit ? "Update" : "Add Sponsor"}</button>
          </div>
        </form>
      </div>
    </div>`;
}

function previewSponsorLogo(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const wrap = document.getElementById("sponsorLogoPreviewWrap");
  const reader = new FileReader();
  reader.onload = (e) => {
    wrap.innerHTML = `<img id="sponsorLogoPreview" src="${e.target.result}" style="width:100%;height:100%;object-fit:contain" />`;
  };
  reader.readAsDataURL(file);
}

async function saveSponsor(e, id) {
  e.preventDefault();
  const btn = document.getElementById("sponsorSaveBtn");
  setBtnLoading(btn, true);

  try {
    let logo_url = document.getElementById("sponsorLogoUrlInput")?.value || "";
    const fileInput = document.getElementById("sponsorLogoFileInput");

    if (fileInput && fileInput.files && fileInput.files[0]) {
      const fd = new FormData();
      fd.append("logo", fileInput.files[0]);
      const res = await fetch(`${API_BASE}/sponsors/admin/logo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${currentToken}` },
        body: fd,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Logo upload failed");
      }
      const uploadData = await res.json();
      logo_url = uploadData.logo_url;
    }

    const form = new FormData(e.target);
    const body = Object.fromEntries(form.entries());
    body.sort_order = parseInt(body.sort_order) || 0;
    if (logo_url) body.logo_url = logo_url;

    if (id) {
      await adminFetch(`/sponsors/admin/${id}`, { token: currentToken, method: "PUT", body });
    } else {
      await adminFetch("/sponsors/admin", { token: currentToken, method: "POST", body });
    }
    closeModal();
    loadSponsorsTable();
  } catch (err) {
    showToast(err.message, "error");
    setBtnLoading(btn, false, id ? "Update" : "Add Sponsor");
  }
}

async function editSponsor(id) {
  try {
    const data = await adminFetch("/sponsors/admin/all", { token: currentToken });
    const sponsor = data.sponsors.find((s) => s.id === id);
    if (sponsor) showSponsorModal(sponsor);
  } catch (e) {
    showToast(e.message, "error");
  }
}

async function deleteSponsor(id) {
  if (!confirm("Delete this sponsor?")) return;
  try {
    await adminFetch(`/sponsors/admin/${id}`, { token: currentToken, method: "DELETE" });
    loadSponsorsTable();
  } catch (e) {
    showToast(e.message, "error");
  }
}

// --- Programmes ---
async function loadProgrammesTable() {
  const tbody = document.getElementById("programmesTableBody");
  tbody.innerHTML = skeletonRows(5);
  try {
    const data = await adminFetch("/programmes/admin/all", { token: currentToken });
    tbody.innerHTML = (data.programmes || [])
      .map(
        (p) => `
      <tr>
        <td>${p.cover_image ? `<img src="${p.cover_image}" style="width:64px;height:48px;object-fit:cover;border-radius:4px;border:1px solid var(--border)" />` : "—"}</td>
        <td><div class="admin-table-title">${p.name}</div><div class="admin-table-subtitle">/programmes/${p.slug}</div></td>
        <td><span class="status-badge ${p.status === "active" ? "published" : "pending"}">${p.status}</span></td>
        <td>${p.sort_order}</td>
        <td class="admin-actions-cell"><div class="admin-actions">
          <button class="admin-btn" onclick="editProgramme('${p.id}')">Edit</button>
          <button class="admin-btn admin-btn-danger" onclick="deleteProgramme('${p.id}')">Delete</button>
        </div></td>
      </tr>
    `
      )
      .join("");
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:2rem;">Failed to load. <a href="#" onclick="loadProgrammesTable();return false;">Retry</a></td></tr>`;
  }
}

function showProgrammeModal(programme = null) {
  const isEdit = !!programme;
  const currentCover = programme?.cover_image || "";
  document.getElementById("modalContainer").innerHTML = `
    <div class="admin-modal-overlay" onclick="closeModal(event)">
      <div class="admin-modal" onclick="event.stopPropagation()">
        <h2>${isEdit ? "Edit Programme" : "Add Programme"}</h2>
        <form id="programmeForm" onsubmit="saveProgramme(event, ${isEdit ? `'${programme.id}'` : "null"})">

          <div class="admin-form-group">
            <label>Cover Image</label>
            <div style="display:flex;align-items:center;gap:16px;margin-bottom:8px">
              <div id="programmeCoverPreviewWrap" style="
                width:96px;height:72px;border-radius:6px;overflow:hidden;
                background:var(--bg-elevated);border:2px solid var(--border);
                display:flex;align-items:center;justify-content:center;flex-shrink:0;
              ">
                ${currentCover
                  ? `<img id="programmeCoverPreview" src="${currentCover}" style="width:100%;height:100%;object-fit:cover" />`
                  : `<span id="programmeCoverPreview" style="font-size:1.4rem;color:var(--text-tertiary)">&#127925;</span>`}
              </div>
              <div style="flex:1">
                <input type="file" id="programmeCoverFileInput" accept="image/*" style="font-size:0.8rem;width:100%" onchange="previewProgrammeCover(this)" />
                <p style="font-size:0.75rem;color:var(--text-muted);margin-top:4px">JPG, PNG, WebP — max 10MB</p>
              </div>
            </div>
            <input type="hidden" name="cover_image" id="programmeCoverUrlInput" value="${currentCover}" />
          </div>

          <div class="admin-form-group"><label>Name</label><input name="name" value="${programme?.name || ""}" required oninput="if(!document.getElementById('programmeSlugInput').dataset.touched) document.getElementById('programmeSlugInput').value = slugifyClient(this.value)" /></div>
          <div class="admin-form-group"><label>Slug (URL)</label><input name="slug" id="programmeSlugInput" value="${programme?.slug || ""}" placeholder="auto-generated from name" oninput="this.dataset.touched = 'true'" /></div>
          <div class="admin-form-group"><label>Description</label><textarea name="description" rows="3">${programme?.description || ""}</textarea></div>
          <div class="admin-form-row">
            <div class="admin-form-group"><label>Display Order</label><input name="sort_order" type="number" value="${programme?.sort_order || 0}" /></div>
            <div class="admin-form-group"><label>Status</label><select name="status">
              <option value="active" ${programme?.status === "active" ? "selected" : ""}>Active</option>
              <option value="inactive" ${programme?.status === "inactive" ? "selected" : ""}>Inactive</option>
            </select></div>
          </div>
          <div class="admin-form-actions">
            <button type="button" class="admin-btn" onclick="closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary btn-sm" id="programmeSaveBtn">${isEdit ? "Update" : "Add Programme"}</button>
          </div>
        </form>
      </div>
    </div>`;
}

function previewProgrammeCover(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const wrap = document.getElementById("programmeCoverPreviewWrap");
  const reader = new FileReader();
  reader.onload = (e) => {
    wrap.innerHTML = `<img id="programmeCoverPreview" src="${e.target.result}" style="width:100%;height:100%;object-fit:cover" />`;
  };
  reader.readAsDataURL(file);
}

async function saveProgramme(e, id) {
  e.preventDefault();
  const btn = document.getElementById("programmeSaveBtn");
  setBtnLoading(btn, true);

  try {
    let cover_image = document.getElementById("programmeCoverUrlInput")?.value || "";
    const fileInput = document.getElementById("programmeCoverFileInput");

    if (fileInput && fileInput.files && fileInput.files[0]) {
      const fd = new FormData();
      fd.append("cover", fileInput.files[0]);
      const res = await fetch(`${API_BASE}/programmes/admin/cover`, {
        method: "POST",
        headers: { Authorization: `Bearer ${currentToken}` },
        body: fd,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Cover image upload failed");
      }
      const uploadData = await res.json();
      cover_image = uploadData.cover_image;
    }

    const form = new FormData(e.target);
    const body = Object.fromEntries(form.entries());
    body.sort_order = parseInt(body.sort_order) || 0;
    if (cover_image) body.cover_image = cover_image;

    if (id) {
      await adminFetch(`/programmes/admin/${id}`, { token: currentToken, method: "PUT", body });
    } else {
      await adminFetch("/programmes/admin", { token: currentToken, method: "POST", body });
    }
    closeModal();
    loadProgrammesTable();
  } catch (err) {
    showToast(err.message, "error");
    setBtnLoading(btn, false, id ? "Update" : "Add Programme");
  }
}

async function editProgramme(id) {
  try {
    const data = await adminFetch("/programmes/admin/all", { token: currentToken });
    const programme = data.programmes.find((p) => p.id === id);
    if (programme) showProgrammeModal(programme);
  } catch (e) {
    showToast(e.message, "error");
  }
}

async function deleteProgramme(id) {
  if (!confirm("Delete this programme? Its classes will be deleted too.")) return;
  try {
    await adminFetch(`/programmes/admin/${id}`, { token: currentToken, method: "DELETE" });
    loadProgrammesTable();
  } catch (e) {
    showToast(e.message, "error");
  }
}

async function programmeOptionsHtml(selectedId) {
  try {
    const data = await adminFetch("/programmes/admin/all", { token: currentToken });
    return (data.programmes || [])
      .map((p) => `<option value="${p.id}" ${selectedId === p.id ? "selected" : ""}>${p.name}</option>`)
      .join("");
  } catch (e) {
    return "";
  }
}

// --- Tutors ---
async function loadTutorsTable() {
  const tbody = document.getElementById("tutorsTableBody");
  tbody.innerHTML = skeletonRows(5);
  try {
    const data = await adminFetch("/tutors/admin/all", { token: currentToken });
    tbody.innerHTML = (data.tutors || [])
      .map(
        (t) => `
      <tr>
        <td>${t.photo_url ? `<img src="${t.photo_url}" style="width:48px;height:48px;object-fit:cover;border-radius:50%;border:1px solid var(--border)" />` : "—"}</td>
        <td><div class="admin-table-title">${t.name}</div></td>
        <td><span class="status-badge ${t.status}">${t.status}</span></td>
        <td>${t.sort_order}</td>
        <td class="admin-actions-cell"><div class="admin-actions">
          <button class="admin-btn" onclick="editTutor('${t.id}')">Edit</button>
          <button class="admin-btn admin-btn-danger" onclick="deleteTutor('${t.id}')">Delete</button>
        </div></td>
      </tr>
    `
      )
      .join("");
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:2rem;">Failed to load. <a href="#" onclick="loadTutorsTable();return false;">Retry</a></td></tr>`;
  }
}

function showTutorModal(tutor = null) {
  const isEdit = !!tutor;
  const currentPhoto = tutor?.photo_url || "";
  document.getElementById("modalContainer").innerHTML = `
    <div class="admin-modal-overlay" onclick="closeModal(event)">
      <div class="admin-modal" onclick="event.stopPropagation()">
        <h2>${isEdit ? "Edit Tutor" : "Add Tutor"}</h2>
        <form id="tutorForm" onsubmit="saveTutor(event, ${isEdit ? `'${tutor.id}'` : "null"})">

          <div class="admin-form-group">
            <label>Photo</label>
            <div style="display:flex;align-items:center;gap:16px;margin-bottom:8px">
              <div id="tutorPhotoPreviewWrap" style="
                width:80px;height:80px;border-radius:50%;overflow:hidden;
                background:var(--bg-elevated);border:2px solid var(--border);
                display:flex;align-items:center;justify-content:center;flex-shrink:0;
              ">
                ${currentPhoto
                  ? `<img id="tutorPhotoPreview" src="${currentPhoto}" style="width:100%;height:100%;object-fit:cover" />`
                  : `<span id="tutorPhotoPreview" style="font-size:1.8rem;color:var(--text-tertiary)">&#128100;</span>`}
              </div>
              <div style="flex:1">
                <input type="file" id="tutorPhotoFileInput" accept="image/*" style="font-size:0.8rem;width:100%" onchange="previewTutorPhoto(this)" />
                <p style="font-size:0.75rem;color:var(--text-muted);margin-top:4px">JPG, PNG, WebP — max 10MB</p>
              </div>
            </div>
            <input type="hidden" name="photo_url" id="tutorPhotoUrlInput" value="${currentPhoto}" />
          </div>

          <div class="admin-form-group"><label>Full Name</label><input name="name" value="${tutor?.name || ""}" required /></div>
          <div class="admin-form-group"><label>Bio</label><textarea name="bio" rows="3">${tutor?.bio || ""}</textarea></div>
          <div class="admin-form-row">
            <div class="admin-form-group"><label>Display Order</label><input name="sort_order" type="number" value="${tutor?.sort_order || 0}" /></div>
            <div class="admin-form-group"><label>Status</label><select name="status">
              <option value="active" ${tutor?.status === "active" ? "selected" : ""}>Visible</option>
              <option value="inactive" ${tutor?.status === "inactive" ? "selected" : ""}>Hidden</option>
            </select></div>
          </div>
          <div class="admin-form-actions">
            <button type="button" class="admin-btn" onclick="closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary btn-sm" id="tutorSaveBtn">${isEdit ? "Update" : "Add Tutor"}</button>
          </div>
        </form>
      </div>
    </div>`;
}

function previewTutorPhoto(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const wrap = document.getElementById("tutorPhotoPreviewWrap");
  const reader = new FileReader();
  reader.onload = (e) => {
    wrap.innerHTML = `<img id="tutorPhotoPreview" src="${e.target.result}" style="width:100%;height:100%;object-fit:cover" />`;
  };
  reader.readAsDataURL(file);
}

async function saveTutor(e, id) {
  e.preventDefault();
  const btn = document.getElementById("tutorSaveBtn");
  setBtnLoading(btn, true);

  try {
    let photo_url = document.getElementById("tutorPhotoUrlInput")?.value || "";
    const fileInput = document.getElementById("tutorPhotoFileInput");

    if (fileInput && fileInput.files && fileInput.files[0]) {
      const fd = new FormData();
      fd.append("photo", fileInput.files[0]);
      const res = await fetch(`${API_BASE}/tutors/admin/photo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${currentToken}` },
        body: fd,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Photo upload failed");
      }
      const uploadData = await res.json();
      photo_url = uploadData.photo_url;
    }

    const form = new FormData(e.target);
    const body = Object.fromEntries(form.entries());
    body.sort_order = parseInt(body.sort_order) || 0;
    if (photo_url) body.photo_url = photo_url;

    if (id) {
      await adminFetch(`/tutors/admin/${id}`, { token: currentToken, method: "PUT", body });
    } else {
      await adminFetch("/tutors/admin", { token: currentToken, method: "POST", body });
    }
    closeModal();
    loadTutorsTable();
  } catch (err) {
    showToast(err.message, "error");
    setBtnLoading(btn, false, id ? "Update" : "Add Tutor");
  }
}

async function editTutor(id) {
  try {
    const data = await adminFetch("/tutors/admin/all", { token: currentToken });
    const tutor = data.tutors.find((t) => t.id === id);
    if (tutor) showTutorModal(tutor);
  } catch (e) {
    showToast(e.message, "error");
  }
}

async function deleteTutor(id) {
  if (!confirm("Delete this tutor?")) return;
  try {
    await adminFetch(`/tutors/admin/${id}`, { token: currentToken, method: "DELETE" });
    loadTutorsTable();
  } catch (e) {
    showToast(e.message, "error");
  }
}

// --- Classes ---
async function loadClassesTable() {
  const tbody = document.getElementById("classesTableBody");
  tbody.innerHTML = skeletonRows(6);
  try {
    const data = await adminFetch("/programme-classes/admin/all", { token: currentToken });
    tbody.innerHTML = (data.classes || [])
      .map(
        (c) => `
      <tr>
        <td>${c.programme_name}</td>
        <td><div class="admin-table-title">${c.name}</div></td>
        <td>${c.age_group || "—"}</td>
        <td>${c.schedule || "—"}</td>
        <td>${c.fee_amount != null ? `$${c.fee_amount} / ${c.fee_period}` : "—"}</td>
        <td class="admin-actions-cell"><div class="admin-actions">
          <button class="admin-btn" onclick="editClass('${c.id}')">Edit</button>
          <button class="admin-btn admin-btn-danger" onclick="deleteClass('${c.id}')">Delete</button>
        </div></td>
      </tr>
    `
      )
      .join("");
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:2rem;">Failed to load. <a href="#" onclick="loadClassesTable();return false;">Retry</a></td></tr>`;
  }
}

async function showClassModal(cls = null) {
  const isEdit = !!cls;
  document.getElementById("modalContainer").innerHTML = `
    <div class="admin-modal-overlay" onclick="closeModal(event)">
      <div class="admin-modal" onclick="event.stopPropagation()">
        <h2>${isEdit ? "Edit Class" : "Add Class"}</h2>
        <form id="classForm" onsubmit="saveClass(event, ${isEdit ? `'${cls.id}'` : "null"})">
          <div class="admin-form-group"><label>Programme</label><select name="programme_id" id="classProgrammeSelect" required><option value="">Loading...</option></select></div>
          <div class="admin-form-group"><label>Level Name</label><input name="name" value="${cls?.name || ""}" required placeholder="e.g. Beginners" /></div>
          <div class="admin-form-row">
            <div class="admin-form-group"><label>Age Group</label><input name="age_group" value="${cls?.age_group || ""}" placeholder="e.g. 5-8 years" /></div>
            <div class="admin-form-group"><label>Location</label><input name="location" value="${cls?.location || ""}" /></div>
          </div>
          <div class="admin-form-group"><label>Schedule / Timetable</label><input name="schedule" value="${cls?.schedule || ""}" placeholder="e.g. Every Wed, 5:30-6:30 PM" /></div>
          <div class="admin-form-row">
            <div class="admin-form-group"><label>Fee Amount</label><input name="fee_amount" type="number" step="0.01" value="${cls?.fee_amount ?? ""}" /></div>
            <div class="admin-form-group"><label>Fee Period</label><select name="fee_period">
              <option value="term" ${!cls || cls?.fee_period === "term" ? "selected" : ""}>per term</option>
              <option value="month" ${cls?.fee_period === "month" ? "selected" : ""}>per month</option>
              <option value="year" ${cls?.fee_period === "year" ? "selected" : ""}>per year</option>
              <option value="once" ${cls?.fee_period === "once" ? "selected" : ""}>one-off</option>
            </select></div>
          </div>
          <div class="admin-form-group"><label>Tutors</label><div id="classTutorsChecklist">Loading...</div></div>
          <div class="admin-form-row">
            <div class="admin-form-group"><label>Display Order</label><input name="sort_order" type="number" value="${cls?.sort_order || 0}" /></div>
            <div class="admin-form-group"><label>Status</label><select name="status">
              <option value="active" ${!cls || cls?.status === "active" ? "selected" : ""}>Active</option>
              <option value="inactive" ${cls?.status === "inactive" ? "selected" : ""}>Inactive</option>
            </select></div>
          </div>
          <div class="admin-form-actions">
            <button type="button" class="admin-btn" onclick="closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary btn-sm" id="classSaveBtn">${isEdit ? "Update" : "Add Class"}</button>
          </div>
        </form>
      </div>
    </div>`;

  programmeOptionsHtml(cls?.programme_id).then((html) => {
    const select = document.getElementById("classProgrammeSelect");
    if (select) select.innerHTML = html;
  });

  try {
    const data = await adminFetch("/tutors/admin/all", { token: currentToken });
    const selectedIds = new Set(cls?.tutor_ids || []);
    const checklist = document.getElementById("classTutorsChecklist");
    if (checklist) {
      checklist.innerHTML = (data.tutors || [])
        .map(
          (t) => `
        <label style="display:flex;align-items:center;gap:8px;padding:4px 0">
          <input type="checkbox" name="tutor_ids" value="${t.id}" ${selectedIds.has(t.id) ? "checked" : ""} />
          ${t.name}
        </label>`
        )
        .join("") || '<span style="color:var(--text-muted);font-size:0.85rem">No tutors yet.</span>';
    }
  } catch (e) {
    const checklist = document.getElementById("classTutorsChecklist");
    if (checklist) checklist.innerHTML = "";
  }
}

async function saveClass(e, id) {
  e.preventDefault();
  const btn = document.getElementById("classSaveBtn");
  setBtnLoading(btn, true);

  try {
    const form = new FormData(e.target);
    const body = Object.fromEntries(form.entries());
    body.sort_order = parseInt(body.sort_order) || 0;
    body.fee_amount = body.fee_amount ? parseFloat(body.fee_amount) : null;
    body.tutor_ids = Array.from(e.target.querySelectorAll('input[name="tutor_ids"]:checked')).map((el) => el.value);

    if (id) {
      await adminFetch(`/programme-classes/admin/${id}`, { token: currentToken, method: "PUT", body });
    } else {
      await adminFetch("/programme-classes/admin", { token: currentToken, method: "POST", body });
    }
    closeModal();
    loadClassesTable();
  } catch (err) {
    showToast(err.message, "error");
    setBtnLoading(btn, false, id ? "Update" : "Add Class");
  }
}

async function editClass(id) {
  try {
    const data = await adminFetch("/programme-classes/admin/all", { token: currentToken });
    const cls = data.classes.find((c) => c.id === id);
    if (cls) showClassModal(cls);
  } catch (e) {
    showToast(e.message, "error");
  }
}

async function deleteClass(id) {
  if (!confirm("Delete this class?")) return;
  try {
    await adminFetch(`/programme-classes/admin/${id}`, { token: currentToken, method: "DELETE" });
    loadClassesTable();
  } catch (e) {
    showToast(e.message, "error");
  }
}

// --- Membership ---
function formatDueDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-NZ");
}

let allMemberships = [];
let currentMembershipFilter = "all";
const programLabels = { dancing: "Dancing", vocals: "Vocals", both: "Both" };
const ageLabels = { "16_and_under": "16 and below", "16_and_over": "16 and over" };

function renderMembershipTable() {
  const tbody = document.getElementById("membershipTableBody");
  const filtered = currentMembershipFilter === "all"
    ? allMemberships
    : allMemberships.filter((m) => m.display_status === currentMembershipFilter);
  tbody.innerHTML = filtered
    .map(
      (m) => `
    <tr>
      <td><div class="admin-table-title" style="cursor:pointer;color:var(--accent)" onclick="showMembershipProfile('${m.id}')">${m.full_name}</div><div class="admin-table-subtitle">${m.email} · ${m.phone}</div></td>
      <td>${programLabels[m.program] || m.program}</td>
      <td>${ageLabels[m.age_group] || m.age_group}</td>
      <td><span class="status-badge ${m.payment_status === "paid" ? "published" : "pending"}">${m.payment_status}</span></td>
      <td><span class="status-badge ${m.display_status}">${m.display_status}</span></td>
      <td>${formatDueDate(m.next_due_date)}</td>
      <td class="admin-actions-cell"><div class="admin-actions">
        <button class="admin-btn" onclick="markMembershipPaid('${m.id}')">${m.display_status === "expired" ? "Renew" : "Mark Paid"}</button>
        ${m.status !== "active" ? `<button class="admin-btn" onclick="activateMembership('${m.id}')">Activate</button>` : ""}
        ${m.status === "pending" ? `<button class="admin-btn" onclick="waitlistMembership('${m.id}')">Waitlist</button>` : ""}
        ${m.status !== "rejected" ? `<button class="admin-btn" onclick="rejectMembership('${m.id}')">Reject</button>` : ""}
        <button class="admin-btn admin-btn-danger" onclick="deleteMembership('${m.id}')">Delete</button>
      </div></td>
    </tr>
  `
    )
    .join("");
}

async function loadMembershipTable() {
  const tbody = document.getElementById("membershipTableBody");
  tbody.innerHTML = skeletonRows(7);
  try {
    const data = await adminFetch("/membership/admin/all", { token: currentToken });
    allMemberships = data.memberships || [];
    renderMembershipTable();
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:2rem;">Failed to load. <a href="#" onclick="loadMembershipTable();return false;">Retry</a></td></tr>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const filters = document.getElementById("membershipFilters");
  if (!filters) return;
  filters.querySelectorAll(".gallery-filter").forEach((btn) => {
    btn.addEventListener("click", () => {
      filters.querySelectorAll(".gallery-filter").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentMembershipFilter = btn.dataset.status;
      renderMembershipTable();
    });
  });
});

async function markMembershipPaid(id) {
  try {
    await adminFetch(`/membership/admin/${id}/payment`, {
      token: currentToken,
      method: "PUT",
    });
    loadMembershipTable();
  } catch (e) {
    showToast(e.message, "error");
  }
}

async function activateMembership(id) {
  if (!confirm("Activate this membership? The next payment will be due in one month.")) return;
  try {
    await adminFetch(`/membership/admin/${id}/activate`, {
      token: currentToken,
      method: "PUT",
    });
    loadMembershipTable();
  } catch (e) {
    showToast(e.message, "error");
  }
}

async function rejectMembership(id) {
  if (!confirm("Reject this application?")) return;
  try {
    await adminFetch(`/membership/admin/${id}/reject`, { token: currentToken, method: "PUT" });
    loadMembershipTable();
  } catch (e) {
    showToast(e.message, "error");
  }
}

async function waitlistMembership(id) {
  if (!confirm("Move this application to the waitlist?")) return;
  try {
    await adminFetch(`/membership/admin/${id}/waitlist`, { token: currentToken, method: "PUT" });
    loadMembershipTable();
  } catch (e) {
    showToast(e.message, "error");
  }
}

async function deleteMembership(id) {
  if (!confirm("Delete this membership registration?")) return;
  try {
    await adminFetch(`/membership/admin/${id}`, {
      token: currentToken,
      method: "DELETE",
    });
    loadMembershipTable();
  } catch (e) {
    showToast(e.message, "error");
  }
}

async function showMembershipProfile(id) {
  const m = allMemberships.find((x) => x.id === id);
  if (!m) return;
  document.getElementById("modalContainer").innerHTML = `
    <div class="admin-modal-overlay" onclick="closeModal(event)">
      <div class="admin-modal" onclick="event.stopPropagation()">
        <h2>${m.full_name}</h2>
        <div class="admin-form-group"><label>Contact</label><div>${m.email} · ${m.phone}</div></div>
        <div class="admin-form-row">
          <div class="admin-form-group"><label>Programme</label><div>${programLabels[m.program] || m.program}</div></div>
          <div class="admin-form-group"><label>Age Group</label><div>${ageLabels[m.age_group] || m.age_group}</div></div>
        </div>
        <div class="admin-form-row">
          <div class="admin-form-group"><label>Guardian Name</label><div>${m.guardian_name || "—"}</div></div>
          <div class="admin-form-group"><label>Guardian Phone</label><div>${m.guardian_phone || "—"}</div></div>
        </div>
        <div class="admin-form-group"><label>Medical Notes</label><div>${m.medical_notes || "—"}</div></div>
        <div class="admin-form-group"><label>Consent Given</label><div>${m.consent_given ? "Yes" : "No"}</div></div>
        <div class="admin-form-group"><label>Membership Status</label><div>${m.display_status}</div></div>

        <div class="admin-form-group">
          <label>Payment History</label>
          <div id="membershipPaymentsList">Loading...</div>
        </div>
        <form onsubmit="recordMembershipPayment(event, '${m.id}')" class="admin-form-row">
          <div class="admin-form-group"><label>Amount</label><input name="amount" type="number" step="0.01" placeholder="optional" /></div>
          <div class="admin-form-group"><label>Note</label><input name="note" placeholder="optional" /></div>
          <div class="admin-form-actions" style="align-self:flex-end">
            <button type="submit" class="btn btn-primary btn-sm">Record Payment</button>
          </div>
        </form>

        <div class="admin-form-actions">
          <button type="button" class="admin-btn" onclick="closeModal()">Close</button>
        </div>
      </div>
    </div>`;
  loadMembershipPayments(m.id);
}

async function loadMembershipPayments(id) {
  const list = document.getElementById("membershipPaymentsList");
  try {
    const data = await adminFetch(`/membership/admin/${id}/payments`, { token: currentToken });
    const payments = data.payments || [];
    list.innerHTML = payments.length === 0
      ? '<span style="color:var(--text-muted);font-size:0.85rem">No payments recorded yet.</span>'
      : payments
          .map((p) => `<div style="font-size:0.85rem;padding:4px 0;border-bottom:1px solid var(--border)">${formatDueDate(p.paid_at)} — ${p.amount ? "$" + p.amount : "no amount"}${p.note ? " · " + p.note : ""}</div>`)
          .join("");
  } catch (e) {
    list.innerHTML = '<span style="color:var(--text-muted);font-size:0.85rem">Could not load payments.</span>';
  }
}

async function recordMembershipPayment(e, id) {
  e.preventDefault();
  const form = new FormData(e.target);
  const body = Object.fromEntries(form.entries());
  try {
    await adminFetch(`/membership/admin/${id}/payment`, { token: currentToken, method: "PUT", body });
    e.target.reset();
    loadMembershipPayments(id);
    loadMembershipTable();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// --- Videos ---
async function loadVideosTable() {
  const tbody = document.getElementById("videosTableBody");
  tbody.innerHTML = skeletonRows(3);
  try {
    const data = await adminFetch("/videos/admin/all", { token: currentToken });
    tbody.innerHTML = (data.videos || [])
      .map(
        (v) => `
      <tr>
        <td><img src="https://img.youtube.com/vi/${v.video_id}/default.jpg" style="width:64px;height:48px;object-fit:cover;border-radius:4px;border:1px solid var(--border)" /></td>
        <td><div class="admin-table-title">${v.title}</div></td>
        <td class="admin-actions-cell"><div class="admin-actions">
          <button class="admin-btn" onclick="editVideo('${v.id}')">Edit</button>
          <button class="admin-btn admin-btn-danger" onclick="deleteVideo('${v.id}')">Delete</button>
        </div></td>
      </tr>
    `
      )
      .join("");
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:2rem;">Failed to load. <a href="#" onclick="loadVideosTable();return false;">Retry</a></td></tr>`;
  }
}

function showVideoModal(video = null) {
  const isEdit = !!video;
  document.getElementById("modalContainer").innerHTML = `
    <div class="admin-modal-overlay" onclick="closeModal(event)">
      <div class="admin-modal" onclick="event.stopPropagation()">
        <h2>${isEdit ? "Edit Video" : "Add Video"}</h2>
        <form id="videoForm" onsubmit="saveVideo(event, ${isEdit ? `'${video.id}'` : "null"})">
          <div class="admin-form-group"><label>Title</label><input name="title" value="${
            video?.title || ""
          }" required /></div>
          <div class="admin-form-group"><label>YouTube URL</label><input name="youtube_url" value="${
            video?.youtube_url || ""
          }" placeholder="https://www.youtube.com/watch?v=..." required /></div>
          <div class="admin-form-row">
            <div class="admin-form-group"><label>Category</label><select name="category">
              <option value="general" ${!video || video?.category === "general" ? "selected" : ""}>General</option>
              <option value="performances" ${video?.category === "performances" ? "selected" : ""}>Performances</option>
              <option value="classes" ${video?.category === "classes" ? "selected" : ""}>Classes</option>
            </select></div>
            <div class="admin-form-group"><label>Link to Production</label><select name="production_id" id="videoProductionSelect"><option value="">Loading...</option></select></div>
          </div>
          <div class="admin-form-actions">
            <button type="button" class="admin-btn" onclick="closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary btn-sm">${
              isEdit ? "Update" : "Add"
            }</button>
          </div>
        </form>
      </div>
    </div>`;
  productionOptionsHtml(video?.production_id).then((html) => {
    const select = document.getElementById("videoProductionSelect");
    if (select) select.innerHTML = html;
  });
}

async function saveVideo(e, id) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  setBtnLoading(btn, true);
  const form = new FormData(e.target);
  const body = Object.fromEntries(form.entries());
  try {
    if (id) {
      await adminFetch(`/videos/admin/${id}`, { token: currentToken, method: "PUT", body });
    } else {
      await adminFetch("/videos/admin", { token: currentToken, method: "POST", body });
    }
    closeModal();
    loadVideosTable();
  } catch (err) {
    showToast(err.message, "error");
    setBtnLoading(btn, false, id ? "Update" : "Add");
  }
}

async function editVideo(id) {
  try {
    const data = await adminFetch("/videos/admin/all", { token: currentToken });
    const video = data.videos.find((v) => v.id === id);
    if (video) showVideoModal(video);
  } catch (e) {
    showToast(e.message, "error");
  }
}

async function deleteVideo(id) {
  if (!confirm("Delete this video?")) return;
  try {
    await adminFetch(`/videos/admin/${id}`, { token: currentToken, method: "DELETE" });
    loadVideosTable();
  } catch (e) {
    showToast(e.message, "error");
  }
}

// --- Enquiries ---
async function loadEnquiriesTable() {
  const tbody = document.getElementById("enquiriesTableBody");
  tbody.innerHTML = skeletonRows(5);
  try {
    const data = await adminFetch("/contact/admin/all", { token: currentToken });
    tbody.innerHTML = (data.enquiries || [])
      .map(
        (q) => `
      <tr>
        <td><div class="admin-table-title">${q.name}</div><div class="admin-table-subtitle">${q.email}</div></td>
        <td>${q.subject || "—"}</td>
        <td><span class="status-badge ${q.status === "completed" ? "published" : "pending"}">${q.status}</span></td>
        <td>${new Date(q.created_at).toLocaleDateString("en-NZ")}</td>
        <td class="admin-actions-cell"><div class="admin-actions">
          <button class="admin-btn" onclick="viewEnquiry('${q.id}')">View</button>
          ${q.status !== "completed" ? `<button class="admin-btn" onclick="updateEnquiryStatus('${q.id}', 'completed')">Mark Completed</button>` : ""}
          <button class="admin-btn admin-btn-danger" onclick="deleteEnquiry('${q.id}')">Delete</button>
        </div></td>
      </tr>
    `
      )
      .join("");
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:2rem;">Failed to load. <a href="#" onclick="loadEnquiriesTable();return false;">Retry</a></td></tr>`;
  }
}

async function viewEnquiry(id) {
  try {
    const data = await adminFetch("/contact/admin/all", { token: currentToken });
    const enquiry = data.enquiries.find((q) => q.id === id);
    if (!enquiry) return;
    alert(`From: ${enquiry.name} <${enquiry.email}>\nSubject: ${enquiry.subject || "—"}\n\n${enquiry.message}`);
    if (enquiry.status === "new") updateEnquiryStatus(id, "read", true);
  } catch (e) {
    showToast(e.message, "error");
  }
}

async function updateEnquiryStatus(id, status, silent) {
  try {
    await adminFetch(`/contact/admin/${id}`, {
      token: currentToken,
      method: "PUT",
      body: { status },
    });
    loadEnquiriesTable();
  } catch (e) {
    if (!silent) showToast(e.message, "error");
  }
}

async function deleteEnquiry(id) {
  if (!confirm("Delete this enquiry?")) return;
  try {
    await adminFetch(`/contact/admin/${id}`, { token: currentToken, method: "DELETE" });
    loadEnquiriesTable();
  } catch (e) {
    showToast(e.message, "error");
  }
}

// --- Settings ---
async function loadSettings() {
  try {
    const data = await adminFetch("/settings/admin", { token: currentToken });
    const form = document.getElementById("settingsForm");
    const categories = {};
    (data.settings || []).forEach((s) => {
      if (s.category === "homepage") return; // rendered by the dedicated Hero Banner widget above
      if (!categories[s.category]) categories[s.category] = [];
      categories[s.category].push(s);
    });

    form.innerHTML = Object.entries(categories)
      .map(
        ([cat, settings]) => `
      <div class="admin-table-container" style="margin-bottom: 1.5rem">
        <div class="admin-table-header" style="padding: 1rem 1.5rem; border-bottom: 1px solid var(--border)">
          <h2 style="text-transform: capitalize; font-size: 1rem; margin: 0">${cat} Settings</h2>
        </div>
        <div style="padding: 1.5rem">
          ${settings
            .map(
              (s) => `
            <div class="admin-form-group">
              <label>${s.label || s.key.replace(/_/g, " ")}</label>
              <input
                data-key="${s.key}"
                data-category="${s.category}"
                class="setting-input"
                type="${s.category === "payment" ? "text" : "url"}"
                placeholder="${s.category === "payment" ? "" : "https://"}"
                value="${s.value || ""}"
              />
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `
      )
      .join("");
  } catch (e) {
    document.getElementById("settingsForm").innerHTML =
      '<p style="color:var(--text-muted);padding:1.5rem">No settings found. Run the database migration to add the site_settings table.</p>';
  }
}

async function saveSettings() {
  const btn = document.querySelector("#section-settings .admin-header-actions button");
  setBtnLoading(btn, true);
  const inputs = document.querySelectorAll(".setting-input");
  const settings = Array.from(inputs).map((inp) => ({
    key: inp.dataset.key,
    value: inp.value,
    category: inp.dataset.category,
  }));
  try {
    await adminFetch("/settings/admin", {
      token: currentToken,
      method: "PUT",
      body: { settings },
    });
    showToast("Settings saved successfully!", "success");
  } catch (e) {
    showToast(e.message, "error");
  } finally {
    setBtnLoading(btn, false, "Save Settings");
  }
}

// --- Hero Banner (homepage) ---
const HERO_BANNER_SLOTS = [1, 2, 3, 4, 5, 6, 7, 8];
const HERO_BANNER_SLOT_KEYS = Object.fromEntries(
  HERO_BANNER_SLOTS.map((slot) => [slot, slot === 1 ? "hero_banner_url" : `hero_banner_url_${slot}`])
);
const HERO_BANNER_POSITION_KEYS = Object.fromEntries(
  HERO_BANNER_SLOTS.map((slot) => [slot, slot === 1 ? "hero_banner_position" : `hero_banner_position_${slot}`])
);
const heroBannerPositions = Object.fromEntries(HERO_BANNER_SLOTS.map((slot) => [slot, 50]));

function generateHeroBannerExtraSlots() {
  const container = document.getElementById("heroBannerExtraSlots");
  if (!container || container.dataset.built) return;
  container.dataset.built = "1";
  container.innerHTML = HERO_BANNER_SLOTS.slice(1)
    .map(
      (slot) => `
    <div>
      <div id="heroBannerPreviewWrap${slot}" style="
        width: 100%; aspect-ratio: 4 / 3; border-radius: 8px; overflow: hidden;
        background: #1a1a1a center 50% / cover no-repeat; border: 1px solid var(--border); position: relative;
        cursor: grab; user-select: none;
      ">
        <div id="heroBannerEmptyState${slot}" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:0.7rem">Photo ${slot}</div>
        <button type="button" id="heroBannerRemoveBtn${slot}" onclick="clearHeroBannerSlot(${slot})" onmousedown="event.stopPropagation()" title="Remove photo" style="
          display:none; position:absolute; top:4px; right:4px; width:22px; height:22px; border-radius:50%;
          background:rgba(0,0,0,0.65); border:1px solid rgba(255,255,255,0.3); color:#fff; font-size:13px;
          line-height:1; cursor:pointer; align-items:center; justify-content:center;
        ">×</button>
      </div>
      <input type="file" id="heroBannerFileInput${slot}" accept="image/*" style="font-size:0.7rem;margin-top:6px;width:100%" onchange="previewHeroBannerSlot(this, ${slot})" />
    </div>
  `
    )
    .join("");
  HERO_BANNER_SLOTS.slice(1).forEach((slot) => initHeroBannerDragForSlot(slot));
}

async function loadHeroBannerSetting() {
  generateHeroBannerExtraSlots();
  try {
    const data = await adminFetch("/settings/admin", { token: currentToken });
    const settings = data.settings || [];
    for (const slot of HERO_BANNER_SLOTS) {
      const posSetting = settings.find((s) => s.key === HERO_BANNER_POSITION_KEYS[slot]);
      heroBannerPositions[slot] = posSetting?.value ? parseFloat(posSetting.value) : 50;
      const urlSetting = settings.find((s) => s.key === HERO_BANNER_SLOT_KEYS[slot]);
      renderHeroBannerPreview(urlSetting?.value || "", slot);
    }

    const transitionSetting = settings.find((s) => s.key === "hero_banner_transition");
    const durationSetting = settings.find((s) => s.key === "hero_banner_duration");
    document.getElementById("heroBannerTransition").value = transitionSetting?.value || "fade";
    document.getElementById("heroBannerDuration").value = durationSetting?.value || "6";

    refreshHeroLivePreview();
  } catch (e) {
    // settings table may not exist yet — the generic form already surfaces that error
  }
}

function renderHeroBannerPreview(url, slot = 1) {
  const suffix = slot === 1 ? "" : String(slot);
  const wrap = document.getElementById(`heroBannerPreviewWrap${suffix}`);
  const empty = document.getElementById(`heroBannerEmptyState${suffix}`);
  const removeBtn = document.getElementById(`heroBannerRemoveBtn${suffix}`);
  if (!wrap) return;
  wrap.dataset.url = url || "";
  if (url) {
    wrap.style.backgroundImage = `url('${url}')`;
    wrap.style.backgroundPosition = `center ${heroBannerPositions[slot]}%`;
    if (empty) empty.style.display = "none";
    if (removeBtn) removeBtn.style.display = "flex";
  } else {
    wrap.style.backgroundImage = "none";
    if (empty) empty.style.display = "flex";
    if (removeBtn) removeBtn.style.display = "none";
  }
}

function clearHeroBannerSlot(slot) {
  const suffix = slot === 1 ? "" : String(slot);
  const fileInput = document.getElementById(`heroBannerFileInput${suffix}`);
  if (fileInput) fileInput.value = "";
  renderHeroBannerPreview("", slot);
  refreshHeroLivePreview();
}

function previewHeroBanner(input) {
  if (!input.files || !input.files[0]) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    heroBannerPositions[1] = 50;
    renderHeroBannerPreview(e.target.result, 1);
  };
  reader.readAsDataURL(input.files[0]);
}

function previewHeroBannerSlot(input, slot) {
  if (!input.files || !input.files[0]) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    heroBannerPositions[slot] = 50;
    renderHeroBannerPreview(e.target.result, slot);
  };
  reader.readAsDataURL(input.files[0]);
}

function initHeroBannerDrag() {
  initHeroBannerDragForSlot(1);
}

function initHeroBannerDragForSlot(slot) {
  const suffix = slot === 1 ? "" : String(slot);
  const wrap = document.getElementById(`heroBannerPreviewWrap${suffix}`);
  if (!wrap || wrap.dataset.dragBound) return;
  wrap.dataset.dragBound = "1";

  let dragging = false;
  let startY = 0;
  let startPos = 50;

  const onDown = (clientY) => {
    if (!wrap.dataset.url) return;
    dragging = true;
    startY = clientY;
    startPos = heroBannerPositions[slot];
    wrap.style.cursor = "grabbing";
  };
  const onMove = (clientY) => {
    if (!dragging) return;
    const delta = clientY - startY;
    const height = wrap.getBoundingClientRect().height || 1;
    heroBannerPositions[slot] = Math.min(100, Math.max(0, startPos - (delta / height) * 100));
    wrap.style.backgroundPosition = `center ${heroBannerPositions[slot]}%`;
  };
  const onUp = () => {
    dragging = false;
    wrap.style.cursor = "grab";
  };

  wrap.addEventListener("mousedown", (e) => onDown(e.clientY));
  window.addEventListener("mousemove", (e) => onMove(e.clientY));
  window.addEventListener("mouseup", onUp);
  wrap.addEventListener("touchstart", (e) => onDown(e.touches[0].clientY), { passive: true });
  wrap.addEventListener("touchmove", (e) => onMove(e.touches[0].clientY), { passive: true });
  wrap.addEventListener("touchend", onUp);
}

async function uploadHeroBannerFile(file) {
  const fd = new FormData();
  fd.append("banner", file);
  const res = await fetch(`${API_BASE}/settings/admin/hero-banner`, {
    method: "POST",
    headers: { Authorization: `Bearer ${currentToken}` },
    body: fd,
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "Banner upload failed");
  }
  const uploadData = await res.json();
  return uploadData.url;
}

async function saveHeroBanner() {
  const btn = document.getElementById("heroBannerSaveBtn");
  setBtnLoading(btn, true);
  try {
    const transition = document.getElementById("heroBannerTransition").value;
    const duration = String(Math.max(2, Math.min(30, parseInt(document.getElementById("heroBannerDuration").value, 10) || 6)));
    const settings = [
      { key: "hero_banner_transition", value: transition },
      { key: "hero_banner_duration", value: duration },
    ];
    for (const slot of HERO_BANNER_SLOTS) {
      const suffix = slot === 1 ? "" : String(slot);
      const fileInput = document.getElementById(`heroBannerFileInput${suffix}`);
      const wrap = document.getElementById(`heroBannerPreviewWrap${suffix}`);
      let url = wrap.dataset.url || "";
      if (fileInput.files && fileInput.files[0]) {
        url = await uploadHeroBannerFile(fileInput.files[0]);
        wrap.dataset.url = url;
        fileInput.value = "";
      }
      settings.push({ key: HERO_BANNER_SLOT_KEYS[slot], value: url });
      settings.push({ key: HERO_BANNER_POSITION_KEYS[slot], value: String(Math.round(heroBannerPositions[slot])) });
    }
    await adminFetch("/settings/admin", {
      token: currentToken,
      method: "PUT",
      body: { settings },
    });
    refreshHeroLivePreview();
    showToast("Hero banner photos saved!", "success");
  } catch (e) {
    showToast(e.message, "error");
  } finally {
    setBtnLoading(btn, false, "Save Banner Photos");
  }
}

// --- Hero Banner live preview (mirrors the homepage carousel behavior) ---
let heroPreviewTimer = null;

function refreshHeroLivePreview() {
  const slides = HERO_BANNER_SLOTS.map((slot) => {
    const suffix = slot === 1 ? "" : String(slot);
    const url = document.getElementById(`heroBannerPreviewWrap${suffix}`)?.dataset.url || "";
    return { url, position: heroBannerPositions[slot] };
  }).filter((s) => s.url);
  const transition = document.getElementById("heroBannerTransition").value;
  const duration = parseInt(document.getElementById("heroBannerDuration").value, 10) || 6;
  startHeroLivePreview(slides, transition, duration);
}

function startHeroLivePreview(slides, transition, durationSec) {
  const stage = document.getElementById("heroBannerLivePreview");
  const empty = document.getElementById("heroBannerLivePreviewEmpty");
  if (!stage) return;

  if (heroPreviewTimer) {
    clearInterval(heroPreviewTimer);
    heroPreviewTimer = null;
  }
  stage.querySelectorAll(".hero-preview-slide, .hero-preview-track").forEach((el) => el.remove());

  if (slides.length === 0) {
    if (empty) empty.style.display = "flex";
    return;
  }
  if (empty) empty.style.display = "none";

  let active = 0;

  if (transition === "scroll") {
    const track = document.createElement("div");
    track.className = "hero-preview-track";
    track.style.cssText = `display:flex;height:100%;width:${slides.length * 100}%;transition:transform 1s ease-in-out;transform:translateX(0)`;
    slides.forEach(({ url, position }) => {
      const slide = document.createElement("div");
      slide.style.cssText = `width:${100 / slides.length}%;height:100%;background:#1a1a1a url('${url}') center ${position}% / cover no-repeat;flex-shrink:0`;
      track.appendChild(slide);
    });
    stage.appendChild(track);
    heroPreviewTimer = setInterval(() => {
      active = (active + 1) % slides.length;
      track.style.transform = `translateX(-${active * (100 / slides.length)}%)`;
    }, durationSec * 1000);
  } else {
    slides.forEach(({ url, position }, i) => {
      const slide = document.createElement("div");
      slide.className = "hero-preview-slide";
      slide.style.cssText = `position:absolute;inset:0;background:#1a1a1a url('${url}') center ${position}% / cover no-repeat;transition:opacity 1s ease-in-out;opacity:${i === 0 ? 1 : 0}`;
      stage.appendChild(slide);
    });
    if (slides.length > 1) {
      heroPreviewTimer = setInterval(() => {
        const slideEls = stage.querySelectorAll(".hero-preview-slide");
        slideEls[active].style.opacity = "0";
        active = (active + 1) % slides.length;
        slideEls[active].style.opacity = "1";
      }, durationSec * 1000);
    }
  }
}

// --- Admin Users ---
async function loadAdminUsersTable() {
  const tbody = document.getElementById("adminUsersTableBody");
  tbody.innerHTML = skeletonRows(4);
  try {
    const [data, profile] = await Promise.all([
      adminFetch("/admins/admin/all", { token: currentToken }),
      adminFetch("/auth/profile", { token: currentToken }),
    ]);
    const myId = profile.admin?.id;
    tbody.innerHTML = (data.admins || [])
      .map(
        (a) => `
      <tr>
        <td><div class="admin-table-title">${a.name}${a.id === myId ? " (you)" : ""}</div></td>
        <td>${a.email}</td>
        <td>${formatDueDate(a.created_at)}</td>
        <td class="admin-actions-cell"><div class="admin-actions">
          ${a.id === myId ? "" : `<button class="admin-btn admin-btn-danger" onclick="deleteAdminUser('${a.id}')">Delete</button>`}
        </div></td>
      </tr>
    `
      )
      .join("");
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:2rem;">Failed to load. <a href="#" onclick="loadAdminUsersTable();return false;">Retry</a></td></tr>`;
  }
}

function showAdminUserModal() {
  document.getElementById("modalContainer").innerHTML = `
    <div class="admin-modal-overlay" onclick="closeModal(event)">
      <div class="admin-modal" onclick="event.stopPropagation()">
        <h2>Add Admin</h2>
        <form id="adminUserForm" onsubmit="saveAdminUser(event)">
          <div class="admin-form-group"><label>Full Name</label><input name="name" required /></div>
          <div class="admin-form-group"><label>Email</label><input name="email" type="email" required /></div>
          <div class="admin-form-group"><label>Password</label><input name="password" type="password" minlength="8" required /></div>
          <div class="admin-form-actions">
            <button type="button" class="admin-btn" onclick="closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary btn-sm" id="adminUserSaveBtn">Add Admin</button>
          </div>
        </form>
      </div>
    </div>`;
}

async function saveAdminUser(e) {
  e.preventDefault();
  const btn = document.getElementById("adminUserSaveBtn");
  setBtnLoading(btn, true);
  try {
    const form = new FormData(e.target);
    const body = Object.fromEntries(form.entries());
    await adminFetch("/admins/admin", { token: currentToken, method: "POST", body });
    closeModal();
    loadAdminUsersTable();
  } catch (err) {
    showToast(err.message, "error");
    setBtnLoading(btn, false, "Add Admin");
  }
}

async function deleteAdminUser(id) {
  if (!confirm("Delete this admin account?")) return;
  try {
    await adminFetch(`/admins/admin/${id}`, { token: currentToken, method: "DELETE" });
    loadAdminUsersTable();
  } catch (e) {
    showToast(e.message, "error");
  }
}

// --- My Account ---
async function loadAccountSection() {
  try {
    const data = await adminFetch("/auth/profile", { token: currentToken });
    document.getElementById("accountNameInput").value = data.admin?.name || "";
    document.getElementById("accountEmailInput").value = data.admin?.email || "";
  } catch (e) {
    console.error(e);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const nameForm = document.getElementById("accountNameForm");
  if (nameForm) {
    nameForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const msg = document.getElementById("accountNameMsg");
      msg.textContent = "";
      try {
        const data = await adminFetch("/auth/update-profile", {
          token: currentToken,
          method: "PUT",
          body: { name: document.getElementById("accountNameInput").value.trim() },
        });
        document.getElementById("adminProfile").textContent = `Signed in as ${data.admin?.name || "Admin"}`;
        msg.textContent = "Saved!";
        msg.style.color = "var(--accent)";
      } catch (err) {
        msg.textContent = err.message;
        msg.style.color = "#ef4444";
      }
    });
  }

  const passwordForm = document.getElementById("accountPasswordForm");
  if (passwordForm) {
    passwordForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const msg = document.getElementById("accountPasswordMsg");
      msg.textContent = "";
      const form = new FormData(e.target);
      const currentPassword = form.get("currentPassword");
      const newPassword = form.get("newPassword");
      const confirmPassword = form.get("confirmPassword");

      if (newPassword !== confirmPassword) {
        msg.textContent = "New passwords don't match.";
        msg.style.color = "#ef4444";
        return;
      }

      try {
        await adminFetch("/auth/change-password", {
          token: currentToken,
          method: "PUT",
          body: { currentPassword, newPassword },
        });
        msg.textContent = "Password updated!";
        msg.style.color = "var(--accent)";
        e.target.reset();
      } catch (err) {
        msg.textContent = err.message;
        msg.style.color = "#ef4444";
      }
    });
  }
});

// --- Modal ---
function closeModal(e) {
  if (e && e.target && !e.target.classList.contains("admin-modal-overlay"))
    return;
  document.getElementById("modalContainer").innerHTML = "";
}

// --- Boot ---
document.addEventListener("DOMContentLoaded", async () => {
  currentToken = getToken();

  // Try to load dashboard if token exists
  if (currentToken) {
    try {
      await adminFetch("/auth/profile", { token: currentToken });
      document.getElementById("loginPage").style.display = "none";
      document.getElementById("dashboardPage").style.display = "flex";
      loadDashboardStats();
    } catch (e) {
      clearToken();
      currentToken = null;
    }
  }

  // Login form
  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const errorEl = document.getElementById("loginError");
    const btn = document.getElementById("loginBtn");

    btn.textContent = "Signing in...";
    errorEl.style.display = "none";

    try {
      const data = await adminFetch("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      currentToken = data.token;
      setToken(data.token);
      document.getElementById("loginPage").style.display = "none";
      document.getElementById("dashboardPage").style.display = "flex";
      loadDashboardStats();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = "block";
      btn.textContent = "Sign In";
    }
  });

  // Sidebar navigation
  document
    .querySelectorAll(".admin-sidebar-nav a[data-section]")
    .forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        switchSection(a.dataset.section);
      });
    });

  // Logout
  document.getElementById("btnLogout").addEventListener("click", () => {
    clearToken();
    location.reload();
  });
});
