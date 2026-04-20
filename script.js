const SUPABASE_URL = "https://gbcsgazcuhqpjebbltvu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdiY3NnYXpjdWhxcGplYmJsdHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NzM3NDYsImV4cCI6MjA5MTA0OTc0Nn0.4uU4WQ-8CJ1ndm9TZaXetkPYBETycPF3d8K2jGLHKjI";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ================= AUTH =================
  async function signUp() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { data, error } = await client.auth.signUp({
    email: email,
    password: password
  });

  if (error) {
    console.log(error);
    alert(error.message);
  } else {
    alert("Sign up successful! Now login.");
  }
}

async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    alert(error.message);
  } else {
    showApp();
  }
}
async function logout() {
  const { error } = await client.auth.signOut();

  if (error) {
    console.log(error);
    alert("Logout failed");
  } else {
    // Show login again
    document.getElementById("authSection").style.display = "block";
    document.getElementById("appSection").style.display = "none";
  }
}

async function showApp() {
  const { data } = await client.auth.getUser();

  document.getElementById("userEmail").innerText =
    "Logged in as: " + data.user.email;
  document.getElementById("authSection").style.display = "none";
  document.getElementById("appSection").style.display = "flex";

  loadTasks();
  loadNotes();
}
// Auto login check
client.auth.getSession().then(({ data }) => {
  if (data.session) {
    showApp();
  }
});
// ================= TASK =================
async function addTask() {
  const title = document.getElementById("title").value;
  const date = document.getElementById("date").value;

  const { error } = await client.from("tasks").insert([
    { title: title, due_date: date, completed: false }
  ]);

  if (error) {
    console.log(error);
  } else {
    loadTasks();
  }
}

async function loadTasks() {
  const { data, error } = await client.from("tasks").select("*");

  if (error) {
    console.log(error);
    return;
  }

  const list = document.getElementById("taskList");
  list.innerHTML = "";

  const today = new Date();

  data.forEach(task => {
    const li = document.createElement("li");

    const dueDate = new Date(task.due_date);
    const diffDays = (dueDate - today) / (1000 * 60 * 60 * 24);
    const isUrgent = diffDays <= 2;

    li.innerHTML = `
      <div class="task-card ${task.completed ? 'completed' : ''} ${isUrgent ? 'urgent' : ''}">
        📌 ${task.title}<br>
        📅 ${task.due_date}
        <br>
        <button onclick="toggleComplete(${task.id}, ${task.completed})">
          ${task.completed ? 'Undo' : 'Complete'}
        </button>
        <button onclick="deleteTask(${task.id})">Delete</button>
      </div>
    `;

    list.appendChild(li);
  });
}

async function deleteTask(id) {
  await client.from("tasks").delete().eq("id", id);
  loadTasks();
}

async function toggleComplete(id, currentStatus) {
  await client.from("tasks")
    .update({ completed: !currentStatus })
    .eq("id", id);

  loadTasks();
}

// ================= NOTES =================
async function addNote() {
  const subject = document.getElementById("subject").value;
  const content = document.getElementById("noteContent").value;

  const xmlContent = `<note><subject>${subject}</subject><content>${content}</content></note>`;

  const { error } = await client.from("notes").insert([
    { subject: subject, content: xmlContent }
  ]);

  if (error) {
    console.log(error);
  } else {
    loadNotes();
  }
}

async function loadNotes() {
  const { data, error } = await client.from("notes").select("*");

  if (error) {
    console.log(error);
    return;
  }

  const list = document.getElementById("noteList");
  list.innerHTML = "";

  const searchInput = document.getElementById("searchNote");
  const search = searchInput ? searchInput.value.toLowerCase() : "";

  data.forEach(note => {
    const parser = new DOMParser();
    const xml = parser.parseFromString(note.content, "text/xml");

    const subject = xml.getElementsByTagName("subject")[0].textContent;
    const content = xml.getElementsByTagName("content")[0].textContent;

    // 🔍 Search filter
    if (
      search &&
      !subject.toLowerCase().includes(search) &&
      !content.toLowerCase().includes(search)
    ) {
      return;
    }

    const li = document.createElement("li");

    li.innerHTML = `
      <div class="note-card">
        📘 ${subject}<br>
        📝 ${content}
      </div>
    `;

    list.appendChild(li);
  });
}
// Check login session on load
client.auth.getSession().then(({ data }) => {
  if (data.session) {
    showApp();
  } else {
    document.getElementById("authSection").style.display = "block";
    document.getElementById("appSection").style.display = "none";
  }
});
// ================= INIT =================
loadTasks();
loadNotes();