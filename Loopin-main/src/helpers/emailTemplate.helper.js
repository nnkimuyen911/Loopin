const BRAND_COLOR = "#A8E6CF"; 
const TEXT_DARK = "#4A4A4A";
const TEXT_LIGHT = "#7A7A7A";

const LOGO_SVG = `
<svg viewBox="0 0 200 200" role="img" aria-label="Loopin logo" style="width:64px;height:64px;display:block;margin:0 auto 12px;">
  <defs>
    <linearGradient id="emailLoopGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFA85C"></stop>
      <stop offset="50%" stop-color="#CE65FF"></stop>
      <stop offset="100%" stop-color="#5ED4A2"></stop>
    </linearGradient>
    <radialGradient id="emailFlameOuterGrad" cx="50%" cy="65%" r="60%">
      <stop offset="0%" stop-color="#FFF3B0"></stop>
      <stop offset="40%" stop-color="#FFA85C"></stop>
      <stop offset="100%" stop-color="#FF3D00"></stop>
    </radialGradient>
    <radialGradient id="emailFlameInnerGrad" cx="50%" cy="70%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF"></stop>
      <stop offset="100%" stop-color="#FFB347"></stop>
    </radialGradient>
  </defs>
  <path d="M100 30 A70 70 0 1 1 99.9 30" fill="none" stroke="url(#emailLoopGradient)" stroke-width="12" stroke-linecap="round"></path>
  <circle r="4" fill="#FFD166"></circle>
  <path d="M100 120 C82 100, 85 78, 98 60 C106 72, 118 85, 112 102 C109 112, 103 118, 100 120 Z" fill="url(#emailFlameOuterGrad)"></path>
  <path d="M100 110 C90 95, 96 80, 100 70 C105 80, 108 92, 102 108 Z" fill="url(#emailFlameInnerGrad)"></path>
</svg>`;

function buildEmailHtml(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f8fffe;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;color:${TEXT_DARK};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fffe;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:600px;background-color:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.05);border:1px solid #e0f2f1;">
          
          <tr>
            <td style="background:linear-gradient(135deg, #A8E6CF 0%, #A8D8EA 100%);padding:30px;text-align:center;">
              ${LOGO_SVG}
              
              <h1 style="margin:0;color:#2D6A4F;font-size:28px;font-weight:800;letter-spacing:-0.5px;">Loopin</h1>
              <p style="margin:5px 0 0;color:#2D6A4F;font-size:14px;font-weight:600;opacity:0.8;">Stay in the Loop!</p>
            </td>
          </tr>

          <tr>
            <td style="padding:40px 30px;">
              <h2 style="margin:0 0 20px;color:${TEXT_DARK};font-size:22px;font-weight:700;">${title}</h2>
              <div style="color:${TEXT_DARK};font-size:16px;line-height:1.6;">
                ${bodyHtml}
              </div>
              <div style="margin-top:30px;text-align:center;">
                <a href="http://localhost:3001/home" style="display:inline-block;background:linear-gradient(135deg, #A8E6CF 0%, #7DC4A5 100%);color:#2D6A4F;text-decoration:none;padding:14px 30px;border-radius:15px;font-weight:700;font-size:16px;box-shadow:0 4px 15px rgba(168,230,207,0.4);">Open Loopin Now 🚀</a>
              </div>
            </td>
          </tr>

          <tr>
            <td style="background-color:#f9fafb;padding:20px 30px;text-align:center;border-top:1px solid #f0f0f0;">
              <p style="margin:0;color:${TEXT_LIGHT};font-size:12px;font-weight:600;">
                © ${new Date().getFullYear()} Loopin Team 🔥 We appreciate your consistency!
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

module.exports.emailTemplates = {
  habitReminder: (habitName) => ({
    subject: `⏰ Reminder: Time for ${habitName}!`,
    html: buildEmailHtml(
      "It's time to shine! ✨",
      `<p>Hi there,</p>
       <p>It's time for your habit: <strong style="color:#2D6A4F;font-size:18px;">${habitName}</strong>.</p>
       <p>Small daily habits lead to big changes. Don't forget to check in once you're done!</p>`
    )
  }),

  streakWarning: (habitName) => ({
    subject: `🔥 Heads up: You're about to lose your ${habitName} streak!`,
    html: buildEmailHtml(
      "Don't let that precious streak slip away! 😱",
      `<p>Hi there,</p>
       <p>You haven't completed your habit: <strong>${habitName}</strong> yet today.</p>
       <p>If you don't check in before 11:59 PM, your streak will reset to zero!</p>
       <p style="background:#fff9f0;padding:15px;border-radius:10px;border-left:4px solid #FFEAA7;">
         💪 Just one more push—you've got this!
       </p>`
    )
  }),

  newMessage: (senderName, messagePreview) => ({
    subject: `💬 New message from ${senderName}`,
    html: buildEmailHtml(
      "You have a new message! 💌",
      `<p>Hi there,</p>
       <p><strong>${senderName}</strong> just sent you a message on Loopin.</p>
       <p style="background:#f6fffb;padding:14px;border-radius:10px;border-left:4px solid #A8E6CF;">
         ${messagePreview}
       </p>
       <p>Open Loopin to reply now.</p>`
    )
  })
};