const STORAGE_KEY = "professor-doubt-tracker-v1";
const subjects = ["Physics", "Chemistry", "Mathematics"];
let activeSubject = "Physics";
let doubts = loadDoubts();
let selectedPhoto = "";

const $ = (id) => document.getElementById(id);
const list = $("doubtList");
const form = $("doubtForm");
const text = $("doubtText");
const photoInput = $("photoInput");
const preview = $("photoPreview");

function loadDoubts() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(doubts));
}
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[c]));
}
function render() {
  document.querySelectorAll(".subject").forEach(b =>
    b.classList.toggle("active", b.dataset.subject === activeSubject));
  $("subjectTitle").textContent = activeSubject + " Doubts";

  const items = doubts.filter(d => d.subject === activeSubject);
  const pending = items.filter(d => d.status === "pending").length;
  const completed = items.filter(d => d.status === "completed").length;
  const cancelled = items.filter(d => d.status === "cancelled").length;
  $("counter").textContent = `${pending} pending · ${completed} completed · ${cancelled} cancelled`;
  $("emptyState").classList.toggle("hidden", items.length !== 0);

  list.innerHTML = items.map(d => {
    const icon = d.status === "completed" ? "✓" : d.status === "cancelled" ? "×" : "";
    const action = d.status === "pending"
      ? `<button class="small complete-btn" onclick="setStatus('${d.id}','completed')">✓ Completed</button>
         <button class="small cancel-btn" onclick="setStatus('${d.id}','cancelled')">× Cancel</button>`
      : `<button class="small restore-btn" onclick="setStatus('${d.id}','pending')">↩ Restore</button>`;
    return `<article class="doubt ${d.status}">
      <div class="doubt-top">
        <button class="status-box" aria-label="Change status" onclick="toggleStatus('${d.id}')">${icon}</button>
        <div class="doubt-text">${escapeHtml(d.text || "Photo doubt")}</div>
      </div>
      ${d.photo ? `<img class="photo" src="${d.photo}" alt="Attached doubt" onclick="window.open(this.src,'_blank')">` : ""}
      <div class="meta">${new Date(d.createdAt).toLocaleString()}</div>
      <div class="actions">${action}
        <button class="small delete-btn" onclick="deleteDoubt('${d.id}')">Delete</button>
      </div>
    </article>`;
  }).join("");
}
function setStatus(id, status) {
  const d = doubts.find(x => x.id === id);
  if (!d) return;
  d.status = status;
  save(); render();
}
function toggleStatus(id) {
  const d = doubts.find(x => x.id === id);
  if (!d) return;
  d.status = d.status === "completed" ? "pending" : "completed";
  save(); render();
}
function deleteDoubt(id) {
  if (!confirm("Delete this doubt?")) return;
  doubts = doubts.filter(x => x.id !== id);
  save(); render();
}
window.setStatus = setStatus;
window.toggleStatus = toggleStatus;
window.deleteDoubt = deleteDoubt;

document.querySelectorAll(".subject").forEach(btn => {
  btn.addEventListener("click", () => {
    activeSubject = btn.dataset.subject;
    form.classList.add("hidden");
    render();
  });
});

$("addBtn").addEventListener("click", () => {
  form.classList.toggle("hidden");
  if (!form.classList.contains("hidden")) text.focus();
});
$("cancelAdd").addEventListener("click", resetForm);

photoInput.addEventListener("change", () => {
  const file = photoInput.files[0];
  if (!file) { selectedPhoto = ""; preview.classList.add("hidden"); return; }
  const reader = new FileReader();
  reader.onload = e => {
    selectedPhoto = e.target.result;
    preview.innerHTML = `<img src="${selectedPhoto}" alt="Photo preview">`;
    preview.classList.remove("hidden");
  };
  reader.readAsDataURL(file);
});

form.addEventListener("submit", e => {
  e.preventDefault();
  const body = text.value.trim();
  if (!body && !selectedPhoto) {
    alert("Please write a doubt or attach a photo.");
    return;
  }
  doubts.unshift({
    id: uid(),
    subject: activeSubject,
    text: body,
    photo: selectedPhoto,
    status: "pending",
    createdAt: Date.now()
  });
  save();
  resetForm();
  render();
});

function resetForm() {
  form.reset();
  selectedPhoto = "";
  preview.innerHTML = "";
  preview.classList.add("hidden");
  form.classList.add("hidden");
}

$("clearAllBtn").addEventListener("click", () => {
  if (!doubts.length) return;
  if (confirm("This will delete every saved doubt on this device. Continue?")) {
    doubts = [];
    save();
    render();
  }
});

let deferredInstallPrompt = null;
const installBtn = $("installBtn");

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installBtn.classList.remove("hidden");
});

installBtn.addEventListener("click", async () => {
  if (!deferredInstallPrompt) {
    alert("If the install prompt does not appear, open your browser menu and choose 'Add to Home screen' or 'Install app'.");
    return;
  }
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installBtn.classList.add("hidden");
});

window.addEventListener("appinstalled", () => {
  installBtn.classList.add("hidden");
  deferredInstallPrompt = null;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("./sw.js");
      registration.update();
    } catch (error) {
      console.log("Service worker registration failed:", error);
    }
  });
}
render();
