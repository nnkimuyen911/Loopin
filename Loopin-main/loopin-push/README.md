# Loopin Push Notification Demo

A complete end-to-end Web Push Notification system for Loopin (Vanilla JS + Express + web-push).

## Project Structure

```text
loopin-push/
  public/
    index.html
    app.js
    sw.js
  server/
    index.js
  package.json
```

## Run

```powershell
cd c:\Users\ASUS\Desktop\Loopin-main\loopin-push
npm install
node server/index.js
```

Then open `http://localhost:3000` and do:
1. Click **Enable Notification**
2. Click **Subscribe**
3. Click a send button, or wait 30 seconds for auto reminders

## Endpoints

- `POST /save-subscription`
- `GET /send-notification?type=reminder|warning&habitName=Gym&motivation=Become%20stronger`
- `GET /vapid-public-key`

## Notification Examples

- 🔥 Loopin Reminder — Time to complete your habit!
- ⚠️ Streak Warning — You're about to lose your streak!

Bonus detail in body:
- `Do Gym - Reason: Become stronger`
