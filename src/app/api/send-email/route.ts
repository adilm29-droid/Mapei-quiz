// @ts-nocheck
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: 'smtp.zoho.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.ZOHO_EMAIL,
    pass: process.env.ZOHO_PASSWORD,
  },
})

function wrap(title, body) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 0">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
  <tr><td style="background:linear-gradient(135deg,#0a1628,#1a2f4e);padding:28px 32px;border-radius:16px 16px 0 0;text-align:center">
    <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:2px">LAPIZBLUE</div>
    <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:4px;letter-spacing:1px">GENERAL TRADING LLC</div>
    <div style="width:40px;height:3px;background:#E30613;margin:12px auto 0;border-radius:2px"></div>
  </td></tr>
  <tr><td style="background:#ffffff;padding:32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb">
    <h2 style="margin:0 0 16px;font-size:20px;color:#0a1628;font-weight:700">${title}</h2>
    ${body}
  </td></tr>
  <tr><td style="background:#f9fafb;padding:20px 32px;border-radius:0 0 16px 16px;border:1px solid #e5e7eb;border-top:none;text-align:center">
    <div style="font-size:11px;color:#9ca3af">LapizBlue General Trading LLC | Sales Training Platform</div>
    <div style="font-size:10px;color:#d1d5db;margin-top:4px">&copy; 2026 LapizBlue. All rights reserved.</div>
  </td></tr>
</table>
</td></tr></table></body></html>`
}

export async function POST(request) {
  try {
    const { type, data } = await request.json()

    let to, subject, html

    if (type === 'new_registration') {
      to = process.env.ZOHO_EMAIL
      subject = `New Registration Request: ${data.first_name} ${data.last_name}`
      html = wrap('New Registration Request', `
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px">A new user has requested access to the training platform:</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:10px;padding:4px 0;margin-bottom:20px">
          <tr><td style="padding:10px 16px;color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb">Name</td><td style="padding:10px 16px;font-weight:600;color:#111827;font-size:14px;border-bottom:1px solid #e5e7eb">${data.first_name} ${data.last_name}</td></tr>
          <tr><td style="padding:10px 16px;color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb">Email</td><td style="padding:10px 16px;font-weight:600;color:#111827;font-size:14px;border-bottom:1px solid #e5e7eb">${data.email}</td></tr>
          <tr><td style="padding:10px 16px;color:#6b7280;font-size:13px">Username</td><td style="padding:10px 16px;font-weight:600;color:#111827;font-size:14px">${data.username}</td></tr>
        </table>
        <p style="color:#6b7280;font-size:13px;margin:0">Log in to the admin panel to approve or reject this request.</p>
      `)
    } else if (type === 'approved') {
      to = data.email
      subject = 'Welcome to LapizBlue Training Platform!'
      html = wrap('Welcome Aboard! 🎉', `
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px">Hi <strong>${data.first_name}</strong>,</p>
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px">Great news! Your account has been approved. You can now log in and start your sales training journey.</p>
        <div style="background:linear-gradient(135deg,#0a1628,#1a2f4e);border-radius:12px;padding:20px;text-align:center;margin-bottom:20px">
          <div style="color:rgba(255,255,255,0.6);font-size:12px;margin-bottom:4px">Your Username</div>
          <div style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:1px">${data.username}</div>
        </div>
        <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 8px">What you can do:</p>
        <ul style="color:#374151;font-size:14px;line-height:1.8;margin:0 0 20px;padding-left:20px">
          <li>Take product knowledge quizzes</li>
          <li>Earn XP and climb the leaderboard</li>
          <li>Earn badges and certificates</li>
          <li>Track your progress with detailed reports</li>
        </ul>
        <p style="color:#6b7280;font-size:13px;margin:0">Good luck with your training!</p>
      `)
    } else if (type === 'quiz_assigned') {
      to = data.email
      subject = `Quiz Assigned: ${data.level} Level`
      html = wrap('New Quiz Assignment', `
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px">Hi <strong>${data.first_name}</strong>,</p>
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px">You have been assigned a new mandatory quiz:</p>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-left:4px solid #E30613;border-radius:8px;padding:16px;margin-bottom:20px">
          <div style="font-weight:700;color:#111827;font-size:16px;margin-bottom:4px">${data.level} Level Quiz</div>
          ${data.due_date ? `<div style="color:#6b7280;font-size:13px">Due by: ${data.due_date}</div>` : ''}
        </div>
        <p style="color:#6b7280;font-size:13px;margin:0">Log in to the platform to complete your assignment.</p>
      `)
    } else if (type === 'certificate_earned') {
      to = data.email
      subject = `Congratulations! Certificate Earned: ${data.level}`
      html = wrap('Certificate Earned! 🏆', `
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px">Hi <strong>${data.first_name}</strong>,</p>
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px">Congratulations! You have earned a certificate for completing the <strong>${data.level}</strong> level with a score of <strong>${data.score}%</strong>.</p>
        <div style="background:linear-gradient(135deg,#0a1628,#1a2f4e);border-radius:12px;padding:24px;text-align:center;margin-bottom:20px;border:2px solid rgba(227,6,19,0.3)">
          <div style="font-size:36px;margin-bottom:8px">🏆</div>
          <div style="color:#ffffff;font-size:18px;font-weight:700">${data.level} Level Certificate</div>
          <div style="color:rgba(255,255,255,0.6);font-size:13px;margin-top:6px">Score: ${data.score}%</div>
        </div>
        <p style="color:#6b7280;font-size:13px;margin:0">Keep up the great work! Continue to the next level.</p>
      `)
    } else {
      return Response.json({ error: 'Unknown email type' }, { status: 400 })
    }

    await transporter.sendMail({
      from: `"LapizBlue Training" <${process.env.ZOHO_EMAIL}>`,
      to,
      subject,
      html,
    })

    return Response.json({ success: true })
  } catch (error) {
    console.error('Email error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}