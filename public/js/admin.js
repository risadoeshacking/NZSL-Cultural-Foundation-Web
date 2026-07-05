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
  if (section === "posts") loadPostsTable();
  if (section === "gallery") loadGalleryTable();
  if (section === "stories") loadStoriesTable();
  if (section === "leadership") loadLeadershipTable();
  if (section === "membership") loadMembershipTable();
  if (section === "videos") loadVideosTable();
  if (section === "settings") loadSettings();
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
  try {
    const data = await adminFetch("/events/admin/all", { token: currentToken });
    const tbody = document.getElementById("eventsTableBody");
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
    console.error(e);
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
              event?.date?.split("T")[0] || ""
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
              <option value="exhibition" ${
                event?.category === "exhibition" ? "selected" : ""
              }>Exhibition</option>
              <option value="community" ${
                event?.category === "community" ? "selected" : ""
              }>Community</option>
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
    alert(err.message);
  }
}

async function editEvent(id) {
  try {
    const data = await adminFetch(`/events/admin/all`, { token: currentToken });
    const event = data.events.find((e) => e.id === id);
    if (event) showEventModal(event);
  } catch (e) {
    alert(e.message);
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
    alert(e.message);
  }
}

// --- Posts (News) ---
async function loadPostsTable() {
  try {
    const data = await adminFetch("/news/admin/all", { token: currentToken });
    const tbody = document.getElementById("postsTableBody");
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
    console.error(e);
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
  btn.disabled = true;
  btn.textContent = "Saving...";

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
      if (!res.ok) throw new Error("Image upload failed");
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
    alert(err.message);
    btn.disabled = false;
    btn.textContent = id ? "Update" : "Publish";
  }
}

async function editPost(id) {
  try {
    const data = await adminFetch("/news/admin/all", { token: currentToken });
    const post = data.news.find((p) => p.id === id);
    if (post) showPostModal(post);
  } catch (e) {
    alert(e.message);
  }
}

async function deletePost(id) {
  if (!confirm("Delete this post?")) return;
  try {
    await adminFetch(`/news/admin/${id}`, { token: currentToken, method: "DELETE" });
    loadPostsTable();
  } catch (e) {
    alert(e.message);
  }
}

// --- Gallery ---
async function loadGalleryTable() {
  try {
    const data = await adminFetch("/gallery/admin/all", {
      token: currentToken,
    });
    const tbody = document.getElementById("galleryTableBody");
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
    console.error(e);
  }
}

function showGalleryUpload() {
  document.getElementById("modalContainer").innerHTML = `
    <div class="admin-modal-overlay" onclick="closeModal(event)">
      <div class="admin-modal" onclick="event.stopPropagation()">
        <h2>Upload Gallery Image</h2>
        <form id="galleryUploadForm" onsubmit="uploadGalleryImage(event)">
          <div class="admin-form-group"><label>Image File</label><input name="image" type="file" accept="image/*" required /></div>
          <div class="admin-form-group"><label>Title</label><input name="title" /></div>
          <div class="admin-form-group"><label>Description</label><textarea name="description" rows="3"></textarea></div>
          <div class="admin-form-row">
            <div class="admin-form-group"><label>Category</label><select name="category">
              <option value="heritage">Heritage</option>
              <option value="performance">Performance</option>
              <option value="culture">Culture</option>
              <option value="events">Events</option>
              <option value="arts">Arts</option>
            </select></div>
            <div class="admin-form-group"><label>Photographer</label><input name="photographer" /></div>
          </div>
          <div class="admin-form-actions">
            <button type="button" class="admin-btn" onclick="closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary btn-sm">Upload</button>
          </div>
        </form>
      </div>
    </div>`;
}

async function uploadGalleryImage(e) {
  e.preventDefault();
  const form = new FormData(e.target);
  try {
    const res = await fetch(`${API_BASE}/gallery/admin/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${currentToken}` },
      body: form,
    });
    if (!res.ok) throw new Error("Upload failed");
    closeModal();
    loadGalleryTable();
  } catch (err) {
    alert(err.message);
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
    alert(e.message);
  }
}

// --- Stories ---
async function loadStoriesTable() {
  try {
    const data = await adminFetch("/stories/admin/all", {
      token: currentToken,
    });
    const tbody = document.getElementById("storiesTableBody");
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
    console.error(e);
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
    alert(err.message);
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
    alert(e.message);
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
    alert(e.message);
  }
}

// --- Leadership ---
async function loadLeadershipTable() {
  try {
    const data = await adminFetch("/leadership/admin/all", {
      token: currentToken,
    });
    const tbody = document.getElementById("leadershipTableBody");
    tbody.innerHTML = (data.leaders || [])
      .map(
        (l) => `
      <tr>
        <td><div class="admin-table-title">${l.name}</div></td>
        <td>${l.role}</td>
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
    console.error(e);
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
            <div class="admin-form-group"><label>Display Order</label><input name="sort_order" type="number" value="${leader?.sort_order || 0}" /></div>
            <div class="admin-form-group"><label>Status</label><select name="status">
              <option value="active" ${leader?.status === "active" ? "selected" : ""}>Visible</option>
              <option value="inactive" ${leader?.status === "inactive" ? "selected" : ""}>Hidden</option>
            </select></div>
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
  btn.disabled = true;
  btn.textContent = "Saving...";

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
      if (!res.ok) throw new Error("Photo upload failed");
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
    alert(err.message);
    btn.disabled = false;
    btn.textContent = "Save";
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
    alert(e.message);
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
    alert(e.message);
  }
}

// --- Membership ---
function formatDueDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-NZ");
}

async function loadMembershipTable() {
  try {
    const data = await adminFetch("/membership/admin/all", { token: currentToken });
    const tbody = document.getElementById("membershipTableBody");
    const programLabels = { dancing: "Dancing", vocals: "Vocals", both: "Both" };
    const ageLabels = { "16_and_under": "16 and below", "16_and_over": "16 and over" };
    tbody.innerHTML = (data.memberships || [])
      .map(
        (m) => `
      <tr>
        <td><div class="admin-table-title">${m.full_name}</div><div class="admin-table-subtitle">${m.email} · ${m.phone}</div></td>
        <td>${programLabels[m.program] || m.program}</td>
        <td>${ageLabels[m.age_group] || m.age_group}</td>
        <td><span class="status-badge ${m.payment_status === "paid" ? "published" : "pending"}">${m.payment_status}</span></td>
        <td><span class="status-badge ${m.display_status}">${m.display_status}</span></td>
        <td>${formatDueDate(m.next_due_date)}</td>
        <td class="admin-actions-cell"><div class="admin-actions">
          <button class="admin-btn" onclick="markMembershipPaid('${m.id}')">Mark Paid</button>
          ${m.status !== "active" ? `<button class="admin-btn" onclick="activateMembership('${m.id}')">Activate</button>` : ""}
          <button class="admin-btn admin-btn-danger" onclick="deleteMembership('${m.id}')">Delete</button>
        </div></td>
      </tr>
    `
      )
      .join("");
  } catch (e) {
    console.error(e);
  }
}

async function markMembershipPaid(id) {
  try {
    await adminFetch(`/membership/admin/${id}/payment`, {
      token: currentToken,
      method: "PUT",
    });
    loadMembershipTable();
  } catch (e) {
    alert(e.message);
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
    alert(e.message);
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
    alert(e.message);
  }
}

// --- Videos ---
async function loadVideosTable() {
  try {
    const data = await adminFetch("/videos/admin/all", { token: currentToken });
    const tbody = document.getElementById("videosTableBody");
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
    console.error(e);
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
          <div class="admin-form-actions">
            <button type="button" class="admin-btn" onclick="closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary btn-sm">${
              isEdit ? "Update" : "Add"
            }</button>
          </div>
        </form>
      </div>
    </div>`;
}

async function saveVideo(e, id) {
  e.preventDefault();
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
    alert(err.message);
  }
}

async function editVideo(id) {
  try {
    const data = await adminFetch("/videos/admin/all", { token: currentToken });
    const video = data.videos.find((v) => v.id === id);
    if (video) showVideoModal(video);
  } catch (e) {
    alert(e.message);
  }
}

async function deleteVideo(id) {
  if (!confirm("Delete this video?")) return;
  try {
    await adminFetch(`/videos/admin/${id}`, { token: currentToken, method: "DELETE" });
    loadVideosTable();
  } catch (e) {
    alert(e.message);
  }
}

// --- Settings ---
async function loadSettings() {
  try {
    const data = await adminFetch("/settings/admin", { token: currentToken });
    const form = document.getElementById("settingsForm");
    const categories = {};
    (data.settings || []).forEach((s) => {
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
    alert("Settings saved successfully!");
  } catch (e) {
    alert(e.message);
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
