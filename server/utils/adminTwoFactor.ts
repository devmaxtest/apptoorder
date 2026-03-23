import crypto from "crypto";
import nodemailer from "nodemailer";

const ADMIN_2FA_EMAIL = "djedoumaurice@gmail.com";
const CODE_EXPIRY_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

interface PendingCode {
  code: string;
  email: string;
  expiresAt: number;
  attempts: number;
  sessionData: {
    userId: string;
    rememberMe: boolean;
  };
}

const pendingCodes = new Map<string, PendingCode>();

setInterval(() => {
  const now = Date.now();
  for (const [token, entry] of pendingCodes) {
    if (now > entry.expiresAt) pendingCodes.delete(token);
  }
}, 60_000);

function generateCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

async function sendCodeViaDiscord(code: string): Promise<boolean> {
  const webhookUrl = process.env.DISCORD_2FA_WEBHOOK_URL;
  if (!webhookUrl) return false;

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "macommande.shop 2FA",
      embeds: [{
        title: "🔐 Code de vérification admin",
        description: `Votre code pour accéder à l'administration :`,
        color: 0xea580c,
        fields: [{
          name: "Code",
          value: `\`\`\`${code}\`\`\``,
          inline: false,
        }, {
          name: "Expiration",
          value: "5 minutes",
          inline: true,
        }],
        footer: { text: "macommande.shop — Si vous n'avez pas demandé ce code, ignorez ce message." },
        timestamp: new Date().toISOString(),
      }],
    }),
  });

  return res.ok;
}

async function sendCodeByEmail(code: string): Promise<boolean> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);

  if (!host || !user || !pass) return false;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `"macommande.shop" <${user}>`,
    to: ADMIN_2FA_EMAIL,
    subject: `Code de vérification admin — ${code}`,
    text: `Votre code de vérification pour l'accès administrateur macommande.shop est :\n\n${code}\n\nCe code expire dans 5 minutes.\n\nSi vous n'avez pas demandé ce code, ignorez cet email.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#fafafa;border-radius:12px">
        <h2 style="color:#ea580c;margin:0 0 16px">🔐 Code de vérification</h2>
        <p style="color:#333;margin:0 0 16px">Votre code pour accéder à l'administration de <strong>macommande.shop</strong> :</p>
        <div style="background:#fff;border:2px solid #ea580c;border-radius:8px;padding:20px;text-align:center;margin:0 0 16px">
          <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#ea580c">${code}</span>
        </div>
        <p style="color:#666;font-size:14px;margin:0 0 8px">Ce code expire dans <strong>5 minutes</strong>.</p>
        <p style="color:#999;font-size:12px;margin:0">Si vous n'avez pas demandé ce code, ignorez cet email.</p>
      </div>
    `,
  });

  return true;
}

async function sendCode(code: string): Promise<{ sent: boolean; channel: string }> {
  try {
    if (await sendCodeViaDiscord(code)) {
      return { sent: true, channel: "discord" };
    }
  } catch (err) {
    console.error("[2FA] Discord webhook failed:", err);
  }

  try {
    if (await sendCodeByEmail(code)) {
      return { sent: true, channel: "email" };
    }
  } catch (err) {
    console.error("[2FA] Email send failed:", err);
  }

  console.log("[2FA] No delivery channel configured");
  if (process.env.NODE_ENV === "development") {
    console.log(`[2FA-DEV] Code: ${code}`);
  }
  return { sent: false, channel: "none" };
}

export async function createTwoFactorChallenge(
  loginEmail: string,
  userId: string,
  rememberMe: boolean
): Promise<{ token: string; sent: boolean; channel: string }> {
  const code = generateCode();
  const token = generateToken();

  pendingCodes.set(token, {
    code,
    email: loginEmail,
    expiresAt: Date.now() + CODE_EXPIRY_MS,
    attempts: 0,
    sessionData: { userId, rememberMe },
  });

  const { sent, channel } = await sendCode(code);
  return { token, sent, channel };
}

export function verifyTwoFactorCode(
  token: string,
  code: string
): { valid: boolean; sessionData?: { userId: string; rememberMe: boolean }; error?: string } {
  const entry = pendingCodes.get(token);

  if (!entry) {
    return { valid: false, error: "Code expiré ou invalide. Veuillez vous reconnecter." };
  }

  if (Date.now() > entry.expiresAt) {
    pendingCodes.delete(token);
    return { valid: false, error: "Code expiré. Veuillez vous reconnecter." };
  }

  entry.attempts++;
  if (entry.attempts > MAX_ATTEMPTS) {
    pendingCodes.delete(token);
    return { valid: false, error: "Trop de tentatives. Veuillez vous reconnecter." };
  }

  if (entry.code !== code.trim()) {
    return { valid: false, error: `Code incorrect. ${MAX_ATTEMPTS - entry.attempts} tentative(s) restante(s).` };
  }

  const sessionData = entry.sessionData;
  pendingCodes.delete(token);
  return { valid: true, sessionData };
}
