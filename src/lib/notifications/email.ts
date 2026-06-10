import nodemailer from "nodemailer";
import type { NotificationChannel, Monitor } from "@/types";

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendDownAlert(
  channel: NotificationChannel,
  monitor: Monitor,
  errorMsg?: string
): Promise<void> {
  const transport = createTransport();
  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to: channel.config.to,
    subject: `🔴 [DOWN] ${monitor.name}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px;">
        <div style="background: #FCEBEB; border-left: 4px solid #E24B4A; padding: 16px 20px; border-radius: 4px;">
          <h2 style="margin: 0 0 8px; color: #A32D2D;">Monitor Down: ${monitor.name}</h2>
          <p style="margin: 0; color: #791F1F; font-size: 14px;">
            Detected at ${new Date().toUTCString()}
          </p>
        </div>

        <table style="width: 100%; margin-top: 24px; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #666; width: 140px;">Monitor</td>
            <td style="padding: 8px 0; font-weight: 500;">${monitor.name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Type</td>
            <td style="padding: 8px 0;">${monitor.type}</td>
          </tr>
          ${monitor.url ? `<tr><td style="padding: 8px 0; color: #666;">URL</td><td style="padding: 8px 0;">${monitor.url}</td></tr>` : ""}
          ${errorMsg ? `<tr><td style="padding: 8px 0; color: #666;">Error</td><td style="padding: 8px 0; color: #E24B4A;">${errorMsg}</td></tr>` : ""}
        </table>

        <div style="margin-top: 24px;">
          <a href="${appUrl}/dashboard/incidents"
             style="display: inline-block; background: #534AB7; color: white;
                    padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px;">
            View Incident
          </a>
        </div>

        <p style="margin-top: 24px; font-size: 12px; color: #999;">
          This alert was sent by Monitoring Dashboard.
        </p>
      </div>
    `,
    text: `Monitor DOWN: ${monitor.name}\nDetected at: ${new Date().toUTCString()}\n${errorMsg ? `Error: ${errorMsg}` : ""}\n\nView: ${appUrl}/dashboard/incidents`,
  });
}

export async function sendRecoveryAlert(
  channel: NotificationChannel,
  monitor: Monitor,
  downSince: string
): Promise<void> {
  const transport = createTransport();
  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const downtimeMs = Date.now() - new Date(downSince).getTime();
  const downtimeMin = Math.round(downtimeMs / 60000);

  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to: channel.config.to,
    subject: `✅ [RECOVERED] ${monitor.name}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px;">
        <div style="background: #EAF3DE; border-left: 4px solid #1D9E75; padding: 16px 20px; border-radius: 4px;">
          <h2 style="margin: 0 0 8px; color: #085041;">Monitor Recovered: ${monitor.name}</h2>
          <p style="margin: 0; color: #0F6E56; font-size: 14px;">
            Recovered at ${new Date().toUTCString()}
          </p>
        </div>

        <table style="width: 100%; margin-top: 24px; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #666; width: 140px;">Monitor</td>
            <td style="padding: 8px 0; font-weight: 500;">${monitor.name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Down since</td>
            <td style="padding: 8px 0;">${new Date(downSince).toUTCString()}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Total downtime</td>
            <td style="padding: 8px 0;">${downtimeMin} minute${downtimeMin !== 1 ? "s" : ""}</td>
          </tr>
        </table>

        <div style="margin-top: 24px;">
          <a href="${appUrl}/dashboard"
             style="display: inline-block; background: #534AB7; color: white;
                    padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px;">
            Go to Dashboard
          </a>
        </div>
      </div>
    `,
    text: `Monitor RECOVERED: ${monitor.name}\nRecovered at: ${new Date().toUTCString()}\nDowntime: ${downtimeMin} minutes\n\nDashboard: ${appUrl}/dashboard`,
  });
}
