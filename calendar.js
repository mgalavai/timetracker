
const supabase = window.supabase.createClient(
  "https://jejjtimupqbebejmhjjj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Implamp0aW11cHFiZWJlam1oampqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjAwMDYxNzQsImV4cCI6MjAzNTU4MjE3NH0.GXfRYuMlXrhka71F1zme8ZScTKpBJVpGBCv1HMCtPc0"
);

let calendar;
let currentUser;
let selectedDate;
let availability = {};

document.addEventListener("DOMContentLoaded", function () {
  initializeEventListeners();
  checkUser();
});

function initializeEventListeners() {
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  const editAvailabilityButton = document.getElementById("edit-availability");
  if (editAvailabilityButton) {
    editAvailabilityButton.addEventListener("click", toggleAvailabilityEditor);
  }

  const saveAvailabilityButton = document.getElementById("save-availability");
  if (saveAvailabilityButton) {
    saveAvailabilityButton.addEventListener("click", saveAvailability);
  }

  const copyPreviousWeekButton = document.getElementById("copy-previous-week");
  if (copyPreviousWeekButton) {
    copyPreviousWeekButton.addEventListener("click", copyPreviousWeek);
  }

  const offWholeWeekButton = document.getElementById("off-whole-week");
  if (offWholeWeekButton) {
    offWholeWeekButton.addEventListener("click", () => setWholeWeek("unavailable"));
  }

  const availableWholeWeekButton = document.getElementById("available-whole-week");
  if (availableWholeWeekButton) {
    availableWholeWeekButton.addEventListener("click", () => setWholeWeek("available"));
  }

  const saveHoursButton = document.getElementById("save-hours");
  if (saveHoursButton) {
    saveHoursButton.addEventListener("click", saveHours);
  }
}

async function checkUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    currentUser = user;
    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', currentUser.id)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
    } else if (profile) {
      currentUser.firstName = profile.first_name;
      currentUser.lastName = profile.last_name;
    }
    showCalendar();
  } else {
    showLoginForm();
  }
}

function showLoginForm() {
  document.getElementById("login-container").classList.remove("hidden");
  document.getElementById("calendar-container").classList.add("hidden");
}

function showCalendar() {
  document.getElementById("login-container").classList.add("hidden");
  document.getElementById("calendar-container").classList.remove("hidden");
  
  // Set welcome message and add logout button
  const headerElement = document.getElementById("header");
  headerElement.innerHTML = `
    <div class="flex justify-between items-center mb-2">
      <h1 id="welcome-message" class="text-2xl font-bold">Welcome, ${currentUser.firstName}</h1>
      <button id="logout-button" class="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
        Logout
      </button>
    </div>
    <p id="month-summary" class="text-lg font-semibold text-gray-600"></p>
  `;
  
  // Add event listener for logout button
  document.getElementById("logout-button").addEventListener("click", handleLogout);
  
  initializeCalendar();
  updateMonthSummary();
}
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });

  if (error) {
    alert("Error logging in: " + error.message);
  } else {
    currentUser = data.user;
    console.log("Logged in user ID:", currentUser.id);
    
    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', currentUser.id)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
    } else if (profile) {
      currentUser.firstName = profile.first_name;
      currentUser.lastName = profile.last_name;
      console.log(`Logged in: ${currentUser.firstName} ${currentUser.lastName}`);
    }

    showCalendar();
  }
}

async function handleLogout() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Error logging out:", error);
    alert("Error logging out. Please try again.");
  } else {
    currentUser = null;
    showLoginForm();
  }
}

function initializeCalendar() {
  var calendarEl = document.getElementById("calendar");
  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridWeek",
    headerToolbar: false,
    height: "auto",
    selectable: true,
    firstDay: 1, // Start week on Monday
    select: function (info) {
      selectedDate = info.start;
      updateSelectedDate();
    },
    dayCellDidMount: function (info) {
      updateDayCellStyle(info.el, info.date);
    },
  });
  calendar.render();
  fetchEvents();
  fetchAvailability();
  selectedDate = new Date();
  updateSelectedDate();
  
  // Update current week display
  updateCurrentWeekDisplay();
  
  // Add event listeners for week navigation
  document.getElementById("prev-week").addEventListener("click", () => navigateWeek('prev'));
  document.getElementById("next-week").addEventListener("click", () => navigateWeek('next'));
  document.getElementById("today").addEventListener("click", () => navigateWeek('today'));
}

function updateCurrentWeekDisplay() {
  const start = calendar.view.currentStart;
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  const dateRange = `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
  
  document.getElementById("current-week").textContent = dateRange;
}

function navigateWeek(direction) {
  if (direction === 'prev') {
    calendar.prev();
  } else if (direction === 'next') {
    calendar.next();
  } else if (direction === 'today') {
    calendar.today();
  }
  updateCurrentWeekDisplay();
  fetchEvents();
  fetchAvailability();
}

function updateSelectedDate() {
  document.getElementById(
    "selected-date"
  ).textContent = `Selected Date: ${selectedDate.toDateString()}`;
  document.getElementById("hours-input").value = "";
  document.getElementById("save-hours").disabled =
    selectedDate.toDateString() !== new Date().toDateString();
}

async function fetchEvents() {
  const { data, error } = await supabase
    .from("time_entries_with_names")
    .select("*")
    .eq("employee_id", currentUser.id);

  if (error) {
    console.error("Error fetching events:", error);
  } else {
    calendar.removeAllEvents();
    data.forEach((entry) => {
      calendar.addEvent({
        title: `${entry.hours_worked} hours`,
        start: entry.date,
        allDay: true,
      });
    });
  }
  updateMonthSummary();
}

async function saveHours() {
  const hours = document.getElementById("hours-input").value;
  if (!hours) {
    showMessage("Please enter the number of hours worked.", "error");
    return;
  }

  if (parseFloat(hours) > 8) {
    showMessage("You cannot enter more than 8 hours per day.", "error");
    return;
  }

  // First, check if an entry already exists for this date
  const { data: existingEntry, error: fetchError } = await supabase
    .from("time_entries")
    .select("id")
    .eq("employee_id", currentUser.id)
    .eq("date", selectedDate.toISOString().split("T")[0])
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    showMessage("Error checking existing entry: " + fetchError.message, "error");
    return;
  }

  let result;
  if (existingEntry) {
    // Update existing entry
    result = await supabase
      .from("time_entries")
      .update({ hours_worked: parseFloat(hours) })
      .eq("id", existingEntry.id);
  } else {
    // Insert new entry
    result = await supabase
      .from("time_entries")
      .insert([
        {
          employee_id: currentUser.id,
          date: selectedDate.toISOString().split("T")[0],
          hours_worked: parseFloat(hours),
        },
      ]);
  }

  const { error } = result;

  if (error) {
    showMessage("Error saving hours: " + error.message, "error");
  } else {
    showMessage("Hours saved successfully!", "success");
    fetchEvents();
    updateMonthSummary();
  }
}

function showMessage(message, type) {
  const messageElement = document.getElementById("message");
  messageElement.textContent = message;
  messageElement.className = `mt-2 p-2 rounded ${type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`;
  messageElement.classList.remove("hidden");
  setTimeout(() => {
    messageElement.classList.add("hidden");
  }, 3000);
}

async function updateMonthSummary() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from("time_entries")
    .select("hours_worked")
    .eq("employee_id", currentUser.id)
    .gte("date", startOfMonth)
    .lte("date", endOfMonth);

  if (error) {
    console.error("Error fetching month summary:", error);
    return;
  }

  const totalHours = data.reduce((sum, entry) => sum + entry.hours_worked, 0);
  document.getElementById("month-summary").textContent = `Total hours this month: ${totalHours.toFixed(1)}`;
}

async function fetchAvailability() {
  const startOfWeek = new Date(calendar.view.currentStart);
  const endOfWeek = new Date(calendar.view.currentEnd);

  const { data, error } = await supabase
    .from("availability")
    .select("*")
    .eq("user_id", currentUser.id)
    .gte("date", startOfWeek.toISOString().split("T")[0])
    .lt("date", endOfWeek.toISOString().split("T")[0]);

  if (error) {
    console.error("Error fetching availability:", error);
  } else {
    availability = {};
    data.forEach((entry) => {
      availability[entry.date] = entry.is_available
        ? "available"
        : "unavailable";
    });
    updateCalendarAvailability();
  }
}

function updateCalendarAvailability() {
  const dayElements = calendar.el.querySelectorAll(".fc-daygrid-day");
  dayElements.forEach((el) => {
    const date = el.getAttribute("data-date");
    updateDayCellStyle(el, new Date(date));
  });
}

function updateDayCellStyle(element, date) {
  const dateString = date.toISOString().split("T")[0];
  element.classList.remove("available", "unavailable", "not-set");
  element.classList.add(availability[dateString] || "not-set");
}

function toggleAvailabilityEditor() {
  const editor = document.getElementById("availability-editor");
  editor.classList.toggle("hidden");
  if (!editor.classList.contains("hidden")) {
    populateAvailabilityToggles();
  }
}

function populateAvailabilityToggles() {
  const togglesContainer = document.getElementById("availability-toggles");
  togglesContainer.innerHTML = "";
  const startOfWeek = new Date(calendar.view.currentStart);

  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    const dateString = date.toISOString().split("T")[0];

    const toggle = document.createElement("div");
    toggle.innerHTML = `
            <label class="inline-flex items-center mt-3">
                <input type="checkbox" class="form-checkbox h-5 w-5 text-gray-600" ${
                  availability[dateString] === "available" ? "checked" : ""
                }>
                <span class="ml-2 text-gray-700">${date.toDateString()}</span>
            </label>
        `;

    toggle.querySelector("input").addEventListener("change", (e) => {
      availability[dateString] = e.target.checked ? "available" : "unavailable";
    });

    togglesContainer.appendChild(toggle);
  }
}

async function checkAuthentication() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    alert("You are not authenticated. Please log in.");
    showLoginForm();
    return false;
  }
  return true;
}

async function saveAvailability() {
  if (!(await checkAuthentication())) return;

  console.log("Current availability object:", availability);
  const availabilityEntries = Object.entries(availability).map(
    ([date, status]) => ({
      user_id: currentUser.id,
      date: date,
      is_available: status === "available",
    })
  );
  console.log("Availability entries to be saved:", availabilityEntries);

  let hasError = false;
  for (let entry of availabilityEntries) {
    // First, check if the entry exists
    const { data: existingData, error: checkError } = await supabase
      .from("availability")
      .select("*")
      .eq("user_id", entry.user_id)
      .eq("date", entry.date)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking existing availability:", checkError);
      hasError = true;
      continue;
    }

    let saveError;
    if (existingData) {
      // Update existing entry
      const { data, error } = await supabase
        .from("availability")
        .update({ is_available: entry.is_available })
        .eq("user_id", entry.user_id)
        .eq("date", entry.date);
      saveError = error;
    } else {
      // Insert new entry
      const { data, error } = await supabase
        .from("availability")
        .insert([entry]);
      saveError = error;
    }

    if (saveError) {
      console.error(
        "Error saving availability for date " + entry.date + ":",
        saveError
      );
      hasError = true;
    }
  }

  if (hasError) {
    alert(
      "There was an error saving some availability entries. Please check the console for details."
    );
  } else {
    alert("Availability saved successfully!");
  }
  fetchAvailability();
  toggleAvailabilityEditor();
}

async function copyPreviousWeek() {
  const currentStart = new Date(calendar.view.currentStart);
  const previousWeekStart = new Date(
    currentStart.getTime() - 7 * 24 * 60 * 60 * 1000
  );
  const previousWeekEnd = new Date(currentStart.getTime());

  const { data, error } = await supabase
    .from("availability")
    .select("*")
    .eq("user_id", currentUser.id)
    .gte("date", previousWeekStart.toISOString().split("T")[0])
    .lt("date", previousWeekEnd.toISOString().split("T")[0]);

  if (error) {
    alert("Error copying previous week: " + error.message);
  } else {
    data.forEach((entry) => {
      const newDate = new Date(entry.date);
      newDate.setDate(newDate.getDate() + 7);
      availability[newDate.toISOString().split("T")[0]] = entry.is_available
        ? "available"
        : "unavailable";
    });
    populateAvailabilityToggles();
    updateCalendarAvailability();
  }
}

function setWholeWeek(status) {
  const startOfWeek = new Date(calendar.view.currentStart);
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    const dateString = date.toISOString().split("T")[0];
    availability[dateString] = status;
  }
  populateAvailabilityToggles();
  updateCalendarAvailability();
}