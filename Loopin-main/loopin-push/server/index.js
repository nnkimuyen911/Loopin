/*
  Loopin Push Backend
  - Serves static frontend files
  - Saves subscriptions in memory
  - Sends push notifications via web-push
  - Sends scheduled reminders based on habit HH:MM
*/

const express = require("express");
const path = require("path");
const webPush = require("web-push");

const app = express();
const PORT = 3000;

function serverLog(...args) {
  console.log("[Loopin Push][server]", ...args);
}

function serverError(...args) {
  console.error("[Loopin Push][server]", ...args);
}

// VAPID keys generated with web-push.generateVAPIDKeys()
const VAPID_PUBLIC_KEY = "BNsM6s0v9kEaVMM_Jh5bWvJj8QHxhpc0SNmWlA1hM0vTjSq-B8fDLJHYE9v-Iyz0ePv9L6Y71j-QeFb8AcxK6FE";
const VAPID_PRIVATE_KEY = "9F7S2n97dzLiJb1kP8WjPh3SOP0PtIhGQx4D8rJx3TI";

webPush.setVapidDetails(
  "mailto:loopin@example.com",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

serverLog("VAPID configured.", {
  hasPublicKey: Boolean(VAPID_PUBLIC_KEY),
  hasPrivateKey: Boolean(VAPID_PRIVATE_KEY)
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

// In-memory storage for demo purposes.
const subscriptions = [];
const habits = [];
let nextHabitId = 1;

// Duplicate prevention: habitId + YYYY-MM-DD (and warning variant).
const sentToday = {};

// Completion map for bonus warning behavior.
// Key: `${habitId}_${YYYY-MM-DD}` => true/false
const completedToday = {};

const DEFAULT_USER_ID = 1;

function getTodayDateKey(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCurrentTimeHHMM(now = new Date()) {
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function isValidHHMM(value) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(value || ""));
}

function isHabitCompletedToday(habitId, dateKey) {
  return Boolean(completedToday[`${habitId}_${dateKey}`]);
}

function markHabitCompleted(habitId, dateKey) {
  completedToday[`${habitId}_${dateKey}`] = true;
}

function pruneOldDailyMaps(dateKey) {
  const keepSuffix = `_${dateKey}`;

  for (const key of Object.keys(completedToday)) {
    if (!key.endsWith(keepSuffix)) {
      delete completedToday[key];
    }
  }

  for (const key of Object.keys(sentToday)) {
    if (!key.includes(dateKey)) {
      delete sentToday[key];
    }
  }
}

function buildNotificationPayload({ type = "reminder", habitName = "Gym", motivation = "Become stronger" } = {}) {
  const iconDataUri = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%23FFB6C1'/%3E%3Cstop offset='1' stop-color='%23E6A8FF'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect rx='26' width='128' height='128' fill='url(%23g)'/%3E%3Ctext x='64' y='80' text-anchor='middle' font-size='56'%3E%F0%9F%94%A5%3C/text%3E%3C/svg%3E";

  const isWarning = type === "warning";

  return {
    title: isWarning ? "⚠️ Streak Warning" : "🔥 Loopin Reminder",
    body: isWarning
      ? "⚠️ You're about to lose your streak!"
      : `${habitName} - Reason: ${motivation}`,
    icon: iconDataUri,
    url: "/",
    habitName,
    motivation,
    detail: `${habitName} - Reason: ${motivation}`
  };
}

async function sendToAllSubscribers(payloadObject) {
  if (!payloadObject || typeof payloadObject !== "object") {
    throw new Error("Payload object is required for push send.");
  }

  if (!payloadObject.title || !payloadObject.body) {
    throw new Error("Payload must include title and body.");
  }

  if (subscriptions.length === 0) {
    serverLog("sendToAllSubscribers: no subscriptions available.");
    return { sentCount: 0, failedCount: 0 };
  }

  // Payload must be a JSON string for web-push.
  const payload = JSON.stringify(payloadObject);

  serverLog("Sending push notification to subscribers:", {
    subscriptionCount: subscriptions.length,
    title: payloadObject.title,
    body: payloadObject.body
  });

  let sentCount = 0;
  let failedCount = 0;
  const invalidEndpoints = new Set();

  const sendPromises = subscriptions.map(async (subscription) => {
    try {
      await webPush.sendNotification(subscription, payload);
      sentCount += 1;
      serverLog("Push sent successfully to endpoint:", subscription.endpoint);
    } catch (error) {
      failedCount += 1;
      serverError("Push send failed:", {
        endpoint: subscription.endpoint,
        statusCode: error.statusCode,
        body: error.body,
        message: error.message,
        headers: error.headers
      });

      if (error.statusCode === 401 || error.statusCode === 403) {
        serverError("Potential VAPID authorization issue. Verify public/private key pair and endpoint origin.");
      }

      if (error.statusCode === 400) {
        serverError("Bad push request. Verify payload JSON and subscription object shape.");
      }

      // Remove invalid subscription from memory (410 Gone / 404 Not Found).
      if (error.statusCode === 404 || error.statusCode === 410) {
        serverLog("Removing invalid subscription endpoint due to 404/410:", subscription.endpoint);
        invalidEndpoints.add(subscription.endpoint);
      }
    }
  });

  await Promise.all(sendPromises);

  if (invalidEndpoints.size > 0) {
    const filtered = subscriptions.filter((item) => !invalidEndpoints.has(item.endpoint));
    subscriptions.length = 0;
    subscriptions.push(...filtered);
    serverLog("Subscription cleanup complete.", { remaining: subscriptions.length });
  }

  return { sentCount, failedCount };
}

app.get("/vapid-public-key", async (_req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

app.post("/save-subscription", async (req, res) => {
  try {
    const subscription = req.body;

    serverLog("/save-subscription called.");
    serverLog("Incoming subscription payload:", subscription);

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscription payload."
      });
    }

    const exists = subscriptions.some((item) => item.endpoint === subscription.endpoint);
    if (!exists) {
      subscriptions.push(subscription);
      serverLog("Subscription added.", { total: subscriptions.length });
    } else {
      serverLog("Subscription already exists. Skipping duplicate save.");
    }

    return res.status(201).json({
      success: true,
      message: "Subscription saved successfully.",
      totalSubscriptions: subscriptions.length
    });
  } catch (error) {
    serverError("/save-subscription failed:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

app.post("/create-habit", async (req, res) => {
  try {
    const { name, time, motivation, userId } = req.body || {};

    serverLog("/create-habit called with payload:", req.body);

    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: "Habit name is required." });
    }

    if (!isValidHHMM(time)) {
      return res.status(400).json({ success: false, message: "Time must be in HH:MM format." });
    }

    const habit = {
      id: nextHabitId,
      name: String(name).trim(),
      time,
      motivation: String(motivation || "Stay consistent").trim() || "Stay consistent",
      userId: Number(userId) || DEFAULT_USER_ID
    };

    nextHabitId += 1;
    habits.push(habit);

    serverLog("Habit created.", habit);

    return res.status(201).json({ success: true, message: "Habit created.", habit });
  } catch (error) {
    serverError("/create-habit failed:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/complete-habit", async (req, res) => {
  try {
    const { habitId } = req.body || {};
    const id = Number(habitId);
    const habit = habits.find((item) => item.id === id);

    if (!habit) {
      return res.status(404).json({ success: false, message: "Habit not found." });
    }

    const dateKey = getTodayDateKey();
    markHabitCompleted(id, dateKey);

    return res.json({ success: true, message: "Habit marked completed for today.", habitId: id, date: dateKey });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/habits", async (_req, res) => {
  serverLog("/habits requested.", { count: habits.length });
  res.json({ success: true, habits });
});

app.get("/debug/subscriptions", async (_req, res) => {
  return res.json({
    success: true,
    count: subscriptions.length,
    endpoints: subscriptions.map((item) => item.endpoint)
  });
});

app.get("/send-notification", async (req, res) => {
  try {
    serverLog("/send-notification called with query:", req.query);

    const payloadObject = buildNotificationPayload({
      type: req.query.type || "reminder",
      habitName: req.query.habitName || "Gym",
      motivation: req.query.motivation || "Become stronger"
    });

    serverLog("Payload built for send:", payloadObject);

    const result = await sendToAllSubscribers(payloadObject);

    serverLog("Send result:", result);

    return res.json({
      success: true,
      ...result,
      payload: payloadObject
    });
  } catch (error) {
    serverError("/send-notification failed:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Scheduler: check every 60 seconds and send due reminders.
setInterval(async () => {
  try {
    const now = new Date();
    const currentTimeHHMM = getCurrentTimeHHMM(now);
    const dateKey = getTodayDateKey(now);

    serverLog("Scheduler tick", { now: now.toISOString(), currentTimeHHMM, habitCount: habits.length });

    pruneOldDailyMaps(dateKey);

    // Scheduled reminder at habit's HH:MM
    for (const habit of habits) {
      if (habit.time !== currentTimeHHMM) {
        continue;
      }

      const sentKey = `${habit.id}_${dateKey}`;
      if (sentToday[sentKey]) {
        continue;
      }

      const payloadObject = buildNotificationPayload({
        type: "reminder",
        habitName: habit.name,
        motivation: habit.motivation
      });

      const result = await sendToAllSubscribers(payloadObject);
      sentToday[sentKey] = true;

      serverLog(
        `[Scheduled Reminder] habit=${habit.name} time=${habit.time} sent=${result.sentCount} failed=${result.failedCount}`
      );
    }

    // Bonus: streak warning at 23:00 for habits not completed.
    if (currentTimeHHMM === "23:00") {
      for (const habit of habits) {
        const warningKey = `${habit.id}_${dateKey}_warning`;

        if (sentToday[warningKey] || isHabitCompletedToday(habit.id, dateKey)) {
          continue;
        }

        const payloadObject = buildNotificationPayload({
          type: "warning",
          habitName: habit.name,
          motivation: habit.motivation
        });

        const result = await sendToAllSubscribers(payloadObject);
        sentToday[warningKey] = true;

        serverLog(
          `[Streak Warning] habit=${habit.name} sent=${result.sentCount} failed=${result.failedCount}`
        );
      }
    }
  } catch (error) {
    serverError("Scheduler error:", error.message);
  }
}, 60000);

app.listen(PORT, () => {
  serverLog(`Loopin Push server is running at http://localhost:${PORT}`);
  serverLog(`VAPID Public Key: ${VAPID_PUBLIC_KEY}`);
  serverLog("Scheduler active: checking reminders every 60 seconds.");
});