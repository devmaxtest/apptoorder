import nodemailer from "nodemailer";

interface OrderEmailData {
  orderId: string;
  restaurantName: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string | null;
  orderType: string;
  total: number;
  items: Array<{ name: string; quantity: number; price: number }>;
}

interface StatusEmailData {
  orderId: string;
  restaurantName: string;
  customerName: string;
  status: string;
  customerEmail: string;
}

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

function getSenderEmail(): string {
  return process.env.SMTP_USER || "noreply@macommande.shop";
}

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  preparing: "En préparation",
  ready: "Prête",
  delivered: "Livrée",
  picked_up: "Récupérée",
  cancelled: "Annulée",
};

function formatCurrency(amount: number): string {
  return amount.toFixed(2).replace(".", ",") + " €";
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function itemsTable(items: Array<{ name: string; quantity: number; price: number }>): string {
  return items
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">${escapeHtml(item.name)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">${formatCurrency(item.price * item.quantity)}</td>
        </tr>`
    )
    .join("");
}

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:24px">
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
      <div style="background:#ea580c;padding:20px 24px">
        <h1 style="margin:0;color:#fff;font-size:20px">macommande.shop</h1>
      </div>
      <div style="padding:24px">${content}</div>
    </div>
    <p style="text-align:center;color:#999;font-size:12px;margin-top:16px">
      macommande.shop — La plateforme de commande en ligne pour les restaurants indépendants
    </p>
  </div>
</body>
</html>`;
}

export async function sendNewOrderEmailToRestaurant(
  restaurantEmail: string,
  data: OrderEmailData
): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) return false;

  const typeLabel = data.orderType === "delivery" ? "Livraison" : "À emporter";

  const html = emailWrapper(`
    <h2 style="color:#ea580c;margin:0 0 16px">🔔 Nouvelle commande !</h2>
    <p style="color:#333;margin:0 0 12px">Une nouvelle commande a été passée sur <strong>${escapeHtml(data.restaurantName)}</strong>.</p>
    
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px;margin:0 0 16px">
      <p style="margin:0 0 4px"><strong>Commande :</strong> #${data.orderId.slice(0, 8)}</p>
      <p style="margin:0 0 4px"><strong>Client :</strong> ${escapeHtml(data.customerName)}</p>
      <p style="margin:0 0 4px"><strong>Téléphone :</strong> ${escapeHtml(data.customerPhone)}</p>
      ${data.customerAddress ? `<p style="margin:0 0 4px"><strong>Adresse :</strong> ${escapeHtml(data.customerAddress)}</p>` : ""}
      <p style="margin:0"><strong>Type :</strong> ${typeLabel}</p>
    </div>

    <table style="width:100%;border-collapse:collapse;margin:0 0 16px">
      <thead>
        <tr style="background:#f9fafb">
          <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb">Article</th>
          <th style="padding:8px 12px;text-align:center;border-bottom:2px solid #e5e7eb">Qté</th>
          <th style="padding:8px 12px;text-align:right;border-bottom:2px solid #e5e7eb">Prix</th>
        </tr>
      </thead>
      <tbody>${itemsTable(data.items)}</tbody>
    </table>

    <div style="text-align:right;font-size:18px;font-weight:bold;color:#ea580c;margin:0 0 16px">
      Total : ${formatCurrency(data.total)}
    </div>

    <p style="color:#666;font-size:14px;margin:0">Connectez-vous à votre espace Pro pour gérer cette commande.</p>
  `);

  try {
    await transporter.sendMail({
      from: `"macommande.shop" <${getSenderEmail()}>`,
      to: restaurantEmail,
      subject: `🔔 Nouvelle commande #${data.orderId.slice(0, 8)} — ${formatCurrency(data.total)}`,
      html,
    });
    return true;
  } catch (err) {
    console.error("[Email] Failed to send new order email to restaurant:", err);
    return false;
  }
}

export async function sendOrderConfirmationToCustomer(
  customerEmail: string,
  data: OrderEmailData
): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) return false;

  const typeLabel = data.orderType === "delivery" ? "Livraison" : "À emporter";

  const html = emailWrapper(`
    <h2 style="color:#ea580c;margin:0 0 16px">✅ Commande confirmée</h2>
    <p style="color:#333;margin:0 0 12px">Merci <strong>${escapeHtml(data.customerName)}</strong> ! Votre commande chez <strong>${escapeHtml(data.restaurantName)}</strong> a bien été enregistrée.</p>
    
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:0 0 16px">
      <p style="margin:0 0 4px"><strong>N° de commande :</strong> #${data.orderId.slice(0, 8)}</p>
      <p style="margin:0"><strong>Type :</strong> ${typeLabel}</p>
    </div>

    <table style="width:100%;border-collapse:collapse;margin:0 0 16px">
      <thead>
        <tr style="background:#f9fafb">
          <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb">Article</th>
          <th style="padding:8px 12px;text-align:center;border-bottom:2px solid #e5e7eb">Qté</th>
          <th style="padding:8px 12px;text-align:right;border-bottom:2px solid #e5e7eb">Prix</th>
        </tr>
      </thead>
      <tbody>${itemsTable(data.items)}</tbody>
    </table>

    <div style="text-align:right;font-size:18px;font-weight:bold;color:#ea580c;margin:0 0 16px">
      Total : ${formatCurrency(data.total)}
    </div>

    <p style="color:#666;font-size:14px;margin:0">Vous recevrez des notifications lorsque le statut de votre commande changera.</p>
  `);

  try {
    await transporter.sendMail({
      from: `"macommande.shop" <${getSenderEmail()}>`,
      to: customerEmail,
      subject: `✅ Commande #${data.orderId.slice(0, 8)} confirmée — ${data.restaurantName}`,
      html,
    });
    return true;
  } catch (err) {
    console.error("[Email] Failed to send order confirmation to customer:", err);
    return false;
  }
}

export async function sendOrderStatusUpdateToCustomer(
  data: StatusEmailData
): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) return false;

  const statusLabel = STATUS_LABELS[data.status] || data.status;

  const statusColors: Record<string, { bg: string; border: string; text: string }> = {
    confirmed: { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
    preparing: { bg: "#fefce8", border: "#fde68a", text: "#a16207" },
    ready: { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d" },
    delivered: { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d" },
    picked_up: { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d" },
    cancelled: { bg: "#fef2f2", border: "#fecaca", text: "#dc2626" },
  };

  const colors = statusColors[data.status] || { bg: "#f9fafb", border: "#e5e7eb", text: "#374151" };

  const html = emailWrapper(`
    <h2 style="color:#ea580c;margin:0 0 16px">📦 Mise à jour de votre commande</h2>
    <p style="color:#333;margin:0 0 12px">Bonjour <strong>${escapeHtml(data.customerName)}</strong>,</p>
    <p style="color:#333;margin:0 0 16px">Le statut de votre commande chez <strong>${escapeHtml(data.restaurantName)}</strong> a été mis à jour :</p>
    
    <div style="background:${colors.bg};border:1px solid ${colors.border};border-radius:8px;padding:16px;margin:0 0 16px;text-align:center">
      <p style="margin:0 0 4px;color:#666;font-size:14px">Commande #${data.orderId.slice(0, 8)}</p>
      <p style="margin:0;font-size:20px;font-weight:bold;color:${colors.text}">${escapeHtml(statusLabel)}</p>
    </div>

    <p style="color:#666;font-size:14px;margin:0">Merci pour votre confiance !</p>
  `);

  const statusEmojis: Record<string, string> = {
    confirmed: "✅",
    preparing: "👨‍🍳",
    ready: "🔔",
    delivered: "🎉",
    picked_up: "🎉",
    cancelled: "❌",
  };

  try {
    await transporter.sendMail({
      from: `"macommande.shop" <${getSenderEmail()}>`,
      to: data.customerEmail,
      subject: `${statusEmojis[data.status] || "📦"} Commande #${data.orderId.slice(0, 8)} — ${statusLabel}`,
      html,
    });
    return true;
  } catch (err) {
    console.error("[Email] Failed to send status update email:", err);
    return false;
  }
}

export function isEmailConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}
