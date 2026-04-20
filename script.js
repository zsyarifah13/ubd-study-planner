const SUPABASE_URL = "https://gbcsgazcuhqpjebbltvu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdiY3NnYXpjdWhxcGplYmJsdHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NzM3NDYsImV4cCI6MjA5MTA0OTc0Nn0.4uU4WQ-8CJ1ndm9TZaXetkPYBETycPF3d8K2jGLHKjI";

const { createClient } = supabase;
const client = createClient(SUPABASE_URL, SUPABASE_KEY);

// ================= AUTH =================
async function signUp() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) return alert("Enter email & password");

  const { error } = await client.auth.signUp({ email, password });

  if (error) alert(error.message);
  else alert("Account created! Login now.");
}

async function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  const { error } = await client.auth.signInWithPassword({ email, password });

  if (error) alert(error.message);
  else showApp();
}

async function logout() {
  await client.auth.signOut();
  toggleUI(false);
  document.getElementById("logoutBtn").style.display = "none";
}

// ================= UI CONTROL =================
function toggleUI(isLoggedIn) {
  document.getElementById("authSection").style.display = isLoggedIn ? "none" : "block";
  document.getElementById("appSection").style.display = isLoggedIn ? "block" : "none";
}

// ================= SESSION =================
client.auth.onAuthStateChange((event, session) => {
  if (session) {
    document.getElementById("logoutBtn").style.display = "block";
    showApp();
  } else {
    document.getElementById("logoutBtn").style.display = "none";
    toggleUI(false);
  }
});

async function getUserId() {
  const { data } = await client.auth.getUser();
  return data.user.id;
}

async function showApp() {
  const { data } = await client.auth.getUser();
  if (!data.user) return;

  toggleUI(true);
  document.getElementById("logoutBtn").style.display = "block";

  loadDashboard();
  loadTasks();
  loadNotes();
}

// ================= TABS =================
function showTab(tab) {
  ["dashboard", "planner", "notes"].forEach(t => {
    document.getElementById(t + "Section").style.display = "none";
  });
  document.getElementById(tab + "Section").style.display = "block";
}

// ================= DASHBOARD =================
async function loadDashboard() {
  const userId = await getUserId();

  const { data } = await client
    .from("tasks")
    .select("*")
    .eq("user_id", userId);

  const today = new Date();

  const upcoming = data.filter(task => {
    const due = new Date(task.due_date);
    const diff = (due - today) / (1000 * 60 * 60 * 24);
    return diff <= 2 && !task.completed;
  });

  document.getElementById("taskSummary").innerText =
    "You have " + upcoming.length + " upcoming deadlines.";
}

// ================= TASKS =================
async function addTask() {
  const userId = await getUserId();

  const title = document.getElementById("title").value;
  const subject = document.getElementById("subjectTask").value;
  const date = document.getElementById("date").value;

  await client.from("tasks").insert([
    { title, subject, due_date: date, completed: false, user_id: userId }
  ]);

  loadTasks();
  loadDashboard();
}

async function loadTasks() {
  const userId = await getUserId();

  const { data } = await client
    .from("tasks")
    .select("*")
    .eq("user_id", userId);

  const list = document.getElementById("taskList");
  list.innerHTML = "";

  const today = new Date();
  const filter = document.getElementById("filterSubject")
    ? document.getElementById("filterSubject").value.toLowerCase()
    : "";

  data.forEach(task => {

    // 🔍 FILTER BY SUBJECT
    if (filter && !task.subject.toLowerCase().includes(filter)) return;

    const due = new Date(task.due_date);
    const diff = (due - today) / (1000 * 60 * 60 * 24);
    const urgent = diff <= 2;

    const li = document.createElement("li");

    li.innerHTML = `
      <div class="task-card ${task.completed ? 'completed' : ''} ${urgent ? 'urgent' : ''}">
        📌 ${task.title} (${task.subject})<br>
        📅 ${task.due_date}
        <br>
        <button onclick="toggleTask(${task.id}, ${task.completed})">
          ${task.completed ? 'Undo' : 'Done'}
        </button>
        <button onclick="deleteTask(${task.id})">Delete</button>
      </div>
    `;

    list.appendChild(li);
  });
}

async function toggleTask(id, status) {
  await client.from("tasks").update({ completed: !status }).eq("id", id);
  loadTasks();
  loadDashboard();
}

async function deleteTask(id) {
  await client.from("tasks").delete().eq("id", id);
  loadTasks();
  loadDashboard();
}

// ================= NOTES =================
async function addNote() {
  const userId = await getUserId();

  const subject = document.getElementById("subject").value;
  const content = document.getElementById("noteContent").value;

  const xml = `<note><subject>${subject}</subject><content>${content}</content></note>`;

  await client.from("notes").insert([
    { subject, content: xml, user_id: userId }
  ]);

  loadNotes();
}

async function loadNotes() {
  const userId = await getUserId();

  const { data } = await client
    .from("notes")
    .select("*")
    .eq("user_id", userId);

  const list = document.getElementById("noteList");
  list.innerHTML = "";

  const search = document.getElementById("searchNote")
    ? document.getElementById("searchNote").value.toLowerCase()
    : "";

  data.forEach(note => {
    const xml = new DOMParser().parseFromString(note.content, "text/xml");
    const subject = xml.getElementsByTagName("subject")[0].textContent;
    const content = xml.getElementsByTagName("content")[0].textContent;

    // 🔍 SEARCH FILTER
    if (
      search &&
      !subject.toLowerCase().includes(search) &&
      !content.toLowerCase().includes(search)
    ) return;

    const li = document.createElement("li");

    li.innerHTML = `
      <div class="note-card">
        📘 ${subject}<br>
        📝 ${content}
        <br>
        <button onclick="deleteNote(${note.id})">Delete</button>
      </div>
    `;

    list.appendChild(li);
  });
}

async function deleteNote(id) {
  await client.from("notes").delete().eq("id", id);
  loadNotes();
}