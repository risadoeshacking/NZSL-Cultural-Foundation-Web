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
  if (section === "gallery") loadGalleryTable();
  if (section === "stories") loadStoriesTable();
  if (section === "leadership") loadLeadershipTable();
  if (section === "settings") loadSettings();
}

// --- Dashboard ---
async function loadDashboardStats() {
  try {
    const [events, gallery, stories, leadership] = await Promise.all([
      adminFetch("/events/admin/all", { token: currentToken }),
      adminFetch("/gallery/admin/all", { token: currentToken }),
      adminFetch("/stories/admin/all", { token: currentToken }),
      adminFetch("/leadership/admin/all", { token: currentToken }),
    ]);
    document.getElementById("statEvents").textContent =
      events.events?.length || 0;
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
        <td><div class="admin-table-title">${
          e.title
        }</div><div class="admin-table-subtitle">${e.location || ""}</div></td>
        <td>${new Date(e.date).toLocaleDateString("en-NZ")}</td>
        <td>${e.category}</td>
        <td><span class="status-badge ${e.status}">${e.status}</span></td>
        <td class="admin-actions">
          <button class="admin-btn" onclick="editEvent('${e.id}')">Edit</button>
          <button class="admin-btn admin-btn-danger" onclick="deleteEvent('${
            e.id
          }')">Delete</button>
        </td>
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
        <td class="admin-actions">
          <button class="admin-btn admin-btn-danger" onclick="deleteGalleryImage('${
            img.id
          }')">Delete</button>
        </td>
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
        <td class="admin-actions">
          <button class="admin-btn" onclick="editStory('${s.id}')">Edit</button>
          <button class="admin-btn admin-btn-danger" onclick="deleteStory('${
            s.id
          }')">Delete</button>
        </td>
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
        <td class="admin-actions">
          <button class="admin-btn" onclick="editLeader('${l.id}')">Edit</button>
          <button class="admin-btn admin-btn-danger" onclick="deleteLeader('${l.id}')">Delete</button>
        </td>
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
  document.getElementById("modalContainer").innerHTML = `
    <div class="admin-modal-overlay" onclick="closeModal(event)">
      <div class="admin-modal" onclick="event.stopPropagation()">
        <h2>${isEdit ? "Edit Leader" : "Add Leader"}</h2>
        <form id="leaderForm" onsubmit="saveLeader(event, ${
          isEdit ? `'${leader.id}'` : "null"
        })">
          <div class="admin-form-group"><label>Name</label><input name="name" value="${
            leader?.name || ""
          }" required /></div>
          <div class="admin-form-group"><label>Role</label><input name="role" value="${
            leader?.role || ""
          }" required /></div>
          <div class="admin-form-group"><label>Bio</label><textarea name="bio" rows="4">${
            leader?.bio || ""
          }</textarea></div>
          <div class="admin-form-group"><label>Contribution</label><textarea name="contribution" rows="3">${
            leader?.contribution || ""
          }</textarea></div>
          <div class="admin-form-row">
            <div class="admin-form-group"><label>Sort Order</label><input name="sort_order" type="number" value="${
              leader?.sort_order || 0
            }" /></div>
            <div class="admin-form-group"><label>Status</label><select name="status">
              <option value="active" ${
                leader?.status === "active" ? "selected" : ""
              }>Active</option>
              <option value="inactive" ${
                leader?.status === "inactive" ? "selected" : ""
              }>Inactive</option>
            </select></div>
          </div>
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

async function saveLeader(e, id) {
  e.preventDefault();
  const form = new FormData(e.target);
  const body = Object.fromEntries(form.entries());
  body.sort_order = parseInt(body.sort_order) || 0;
  try {
    if (id) {
      await adminFetch(`/leadership/admin/${id}`, {
        token: currentToken,
        method: "PUT",
        body,
      });
    } else {
      await adminFetch("/leadership/admin", {
        token: currentToken,
        method: "POST",
        body,
      });
    }
    closeModal();
    loadLeadershipTable();
  } catch (err) {
    alert(err.message);
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
        <div class="admin-table-header"><h2 style="text-transform: capitalize">${cat} Settings</h2></div>
        <div style="padding: 1.5rem">
          ${settings
            .map(
              (s) => `
            <div class="admin-form-group">
              <label>${s.key.replace(/_/g, " ")}</label>
              <input data-key="${s.key}" data-category="${
                s.category
              }" class="setting-input" value="${s.value || ""}" />
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
    console.error(e);
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
