/*
  Loopin Web Push Frontend
  - Requests notification permission
  - Registers service worker
  - Creates PushManager subscription with VAPID public key
  - Sends subscription to backend
  - Allows manual notification trigger
*/

const VAPID_PUBLIC_KEY = "BNsM6s0v9kEaVMM_Jh5bWvJj8QHxhpc0SNmWlA1hM0vTjSq-B8fDLJHYE9v-Iyz0ePv9L6Y71j-QeFb8AcxK6FE";

const enableBtn = document.getElementById("enableBtn");
const subscribeBtn = document.getElementById("subscribeBtn");
const sendReminderBtn = document.getElementById("sendReminderBtn");
const sendWarningBtn = document.getElementById("sendWarningBtn");
const statusEl = document.getElementById("status");
const controlsEl = document.querySelector(".controls");

let registration = null;
let activeSubscription = null;
let effectiveVapidPublicKey = VAPID_PUBLIC_KEY;

let habitsContainer = null;
let habitNameInput = null;
let habitTimeInput = null;
let habitMotivationInput = null;
let createHabitBtn = null;
let habitsListEl = null;
let localTestBtn = null;

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js")
    .then((reg) => {
      registration = reg;
      console.log("SW registered", reg);
    })
    .catch((err) => console.error("SW error", err));
}

function logInfo(...args) {
  console.log("[Loopin Push][app]", ...args);
}

function logError(...args) {
  console.error("[Loopin Push][app]", ...args);
}

function setStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`.trim();
}

function ensureLocalTestButton() {
  if (!controlsEl || document.getElementById("localTestBtn")) {
    return;
  }

  localTestBtn = document.createElement("button");
  localTestBtn.id = "localTestBtn";
  localTestBtn.type = "button";
  localTestBtn.className = "ghost";
  localTestBtn.textContent = "Test Local Notification";

  localTestBtn.addEventListener("click", async () => {
    try {
      const permission = Notification.permission;
      logInfo("Local test clicked. Current permission:", permission);

      if (permission !== "granted") {
        throw new Error("Notification permission is not granted.");
      }

      // Required fallback debug test without web-push.
      new Notification("Test", {
        body: "Hello from local Notification API fallback test"
      });

      setStatus("Local notification triggered successfully.", "success");
    } catch (error) {
      logError("Local notification test failed:", error);
      setStatus(error.message, "error");
    }
  });

  controlsEl.appendChild(localTestBtn);
}

async function fetchVapidPublicKey() {
  try {
    const response = await fetch("/vapid-public-key");

    if (!response.ok) {
      throw new Error(`VAPID endpoint failed with status ${response.status}`);
    }

    const result = await response.json();
    if (!result.publicKey || typeof result.publicKey !== "string") {
      throw new Error("Backend did not return a valid VAPID public key.");
    }

    effectiveVapidPublicKey = result.publicKey;
    logInfo("Fetched VAPID key from backend:", effectiveVapidPublicKey);
  } catch (error) {
    // Fallback to local constant so app still works if endpoint fails.
    effectiveVapidPublicKey = VAPID_PUBLIC_KEY;
    logError("Failed to fetch VAPID key from backend, using fallback constant.", error);
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

function createHabitFormUI() {
  const appRoot = document.querySelector(".app");
  if (!appRoot || document.getElementById("habitFormSection")) {
    return;
  }

  const section = document.createElement("section");
  section.id = "habitFormSection";
  section.style.marginTop = "16px";
  section.style.padding = "14px";
  section.style.borderRadius = "12px";
  section.style.background = "#f9fafb";
  section.style.border = "1px solid rgba(0,0,0,0.08)";

  section.innerHTML = `
    <h3 style="font-size:1rem;margin-bottom:10px;color:#374151;">Create Habit Reminder</h3>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;">
      <input id="habitNameInput" type="text" placeholder="Habit name (e.g. Gym)" style="padding:10px;border:1px solid rgba(0,0,0,.15);border-radius:10px;font:inherit;" />
      <input id="habitTimeInput" type="time" style="padding:10px;border:1px solid rgba(0,0,0,.15);border-radius:10px;font:inherit;" />
      <input id="habitMotivationInput" type="text" placeholder="Motivation (e.g. Become stronger)" style="padding:10px;border:1px solid rgba(0,0,0,.15);border-radius:10px;font:inherit;" />
    </div>
    <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
      <button id="createHabitBtn" class="secondary" type="button">Create Habit</button>
      <button id="refreshHabitsBtn" class="ghost" type="button">Refresh Habits</button>
    </div>
    <div id="habitsList" style="margin-top:10px;font-size:.92rem;color:#6b7280;">No habits yet.</div>
  `;

  // insert before tips to keep flow clean
  const tips = appRoot.querySelector(".tips");
  if (tips) {
    appRoot.insertBefore(section, tips);
  } else {
    appRoot.appendChild(section);
  }

  habitsContainer = section;
  habitNameInput = document.getElementById("habitNameInput");
  habitTimeInput = document.getElementById("habitTimeInput");
  habitMotivationInput = document.getElementById("habitMotivationInput");
  createHabitBtn = document.getElementById("createHabitBtn");
  habitsListEl = document.getElementById("habitsList");

  const refreshBtn = document.getElementById("refreshHabitsBtn");
  refreshBtn.addEventListener("click", async () => {
    try {
      await refreshHabits();
      setStatus("Habit list refreshed.", "success");
    } catch (error) {
      setStatus(error.message, "error");
    }
  });

  createHabitBtn.addEventListener("click", async () => {
    try {
      const name = habitNameInput.value.trim();
      const time = habitTimeInput.value;
      const motivation = habitMotivationInput.value.trim();

      if (!name) {
        throw new Error("Habit name is required.");
      }

      if (!time) {
        throw new Error("Habit time is required.");
      }

      createHabitBtn.disabled = true;
      createHabitBtn.textContent = "Creating...";

      const result = await createHabit({ name, time, motivation });
      await refreshHabits();

      habitNameInput.value = "";
      habitTimeInput.value = "";
      habitMotivationInput.value = "";

      setStatus(
        `Habit created: ${result.habit.name} at ${result.habit.time}. Scheduler will notify at exact time.`,
        "success"
      );
    } catch (error) {
      setStatus(error.message, "error");
    } finally {
      createHabitBtn.disabled = false;
      createHabitBtn.textContent = "Create Habit";
    }
  });
}

function renderHabits(habits) {
  if (!habitsListEl) {
    return;
  }

  if (!Array.isArray(habits) || habits.length === 0) {
    habitsListEl.textContent = "No habits yet.";
    return;
  }

  const lines = habits.map((habit) => `• ${habit.name} @ ${habit.time} — ${habit.motivation}`);
  habitsListEl.textContent = lines.join("\n");
  habitsListEl.style.whiteSpace = "pre-wrap";
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service Worker is not supported in this browser.");
  }

  logInfo("Registering service worker at /sw.js ...");
  registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  logInfo("Service Worker registered:", {
    scope: registration.scope,
    active: Boolean(registration.active),
    waiting: Boolean(registration.waiting),
    installing: Boolean(registration.installing)
  });

  if (registration.installing) {
    registration.installing.addEventListener("statechange", () => {
      logInfo("SW installing state changed to:", registration.installing && registration.installing.state);
    });
  }

  navigator.serviceWorker.addEventListener("message", (event) => {
    logInfo("Message from SW:", event.data);
  });

  return registration;
}

async function requestPermission() {
  if (!("Notification" in window)) {
    throw new Error("Notifications are not supported in this browser.");
  }

  logInfo("Requesting notification permission...");
  const permission = await Notification.requestPermission();
  logInfo("Permission result:", permission);
  return permission;
}

async function subscribeUser() {
  if (!registration) {
    throw new Error("Service Worker is not registered yet.");
  }

  const existingSub = await registration.pushManager.getSubscription();
  if (existingSub) {
    activeSubscription = existingSub;
    logInfo("Using existing push subscription:", JSON.stringify(existingSub));
    return existingSub;
  }

  if (!effectiveVapidPublicKey) {
    throw new Error("Missing VAPID public key.");
  }

  logInfo("Creating new subscription with VAPID key:", effectiveVapidPublicKey);

  const newSubscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(effectiveVapidPublicKey)
  });

  activeSubscription = newSubscription;
  logInfo("New subscription created:", JSON.stringify(newSubscription));
  return newSubscription;
}

async function saveSubscription(subscription) {
  logInfo("Sending subscription to backend /save-subscription ...", subscription);

  const response = await fetch("/save-subscription", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(subscription)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Save subscription failed: ${message}`);
  }

  const result = await response.json();
  logInfo("Subscription saved on backend:", result);
  return result;
}

async function sendNotification(type) {
  const payload = {
    type,
    habitName: type === "warning" ? "Reading" : "Gym",
    motivation: type === "warning" ? "Protect your streak" : "Become stronger"
  };

  const query = new URLSearchParams(payload).toString();
  const url = `/send-notification?${query}`;
  logInfo("Calling send notification endpoint:", url);

  const response = await fetch(url);

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Send notification failed: ${message}`);
  }

  const result = await response.json();
  logInfo("Send notification response:", result);
  return result;
}

async function createHabit({ name, time, motivation }) {
  logInfo("Creating habit:", { name, time, motivation });

  const response = await fetch("/create-habit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ name, time, motivation, userId: 1 })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || "Failed to create habit.");
  }

  const result = await response.json();
  logInfo("Habit created response:", result);
  return result;
}

async function refreshHabits() {
  logInfo("Refreshing habits list...");
  const response = await fetch("/habits");
  if (!response.ok) {
    throw new Error("Failed to load habits.");
  }

  const result = await response.json();
  logInfo("Habits payload:", result);
  renderHabits(result.habits || []);
}

enableBtn.addEventListener("click", async () => {
  try {
    setStatus("Requesting permission and registering service worker...");

    await fetchVapidPublicKey();

    const permission = await requestPermission();
    if (permission !== "granted") {
      setStatus("Permission denied. Please allow notifications in browser settings.", "error");
      return;
    }

    await registerServiceWorker();

    subscribeBtn.disabled = false;
    setStatus("Permission granted and service worker registered. Now click Subscribe.", "success");
  } catch (error) {
    logError("Enable flow failed:", error);
    setStatus(error.message, "error");
  }
});

subscribeBtn.addEventListener("click", async () => {
  try {
    setStatus("Creating push subscription...");

    const subscription = await subscribeUser();
    const result = await saveSubscription(subscription);

    sendReminderBtn.disabled = false;
    sendWarningBtn.disabled = false;

    setStatus(
      `Subscribed successfully.\nSaved subscriptions on server: ${result.totalSubscriptions}`,
      "success"
    );
  } catch (error) {
    logError("Subscribe flow failed:", error);
    setStatus(error.message, "error");
  }
});

sendReminderBtn.addEventListener("click", async () => {
  try {
    const result = await sendNotification("reminder");
    setStatus(`Reminder queued for ${result.sentCount} subscription(s).`, "success");
  } catch (error) {
    logError("Send reminder failed:", error);
    setStatus(error.message, "error");
  }
});

sendWarningBtn.addEventListener("click", async () => {
  try {
    const result = await sendNotification("warning");
    setStatus(`Warning queued for ${result.sentCount} subscription(s).`, "success");
  } catch (error) {
    logError("Send warning failed:", error);
    setStatus(error.message, "error");
  }
});

// Initialize habit creator UI on load.
ensureLocalTestButton();
createHabitFormUI();
fetchVapidPublicKey().catch(() => {});
refreshHabits().catch(() => {
  // Silent on initial load; server may not be running yet.
});