import "server-only";
import { siteConfig } from "@/config/site";
import { formatPrice } from "@/lib/utils";
import { paymentStatusLabel, statusLabel } from "@/lib/order-status";
import { sendEmail } from "@/lib/email/provider";
import { getCachedStoreName } from "@/lib/settings";
import type { OrderStatus, PaymentStatus } from "@/generated/prisma/client";

function emailShell(bodyHtml: string, storeName: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#fbfaf7;font-family:Arial,Helvetica,sans-serif;color:#232323;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #eceae2;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px;background:#f6f1e7;border-bottom:1px solid #eceae2;">
                <span style="font-size:20px;font-weight:700;color:#1f5f4b;">${storeName}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;font-size:15px;line-height:1.7;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background:#f6f1e7;font-size:12px;color:#6b6b6b;">
                ${storeName} · ${siteConfig.email}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const storeName = await getCachedStoreName();
  const url = `${siteConfig.url}/verify-email?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to,
    fromName: storeName,
    subject: `Verify your email on ${storeName}`,
    html: emailShell(
      `
      <h2 style="margin-top:0;color:#1f5f4b;">Verify your email address</h2>
      <p>Welcome to ${storeName}! Please confirm your email address to activate your account.</p>
      <p><a href="${url}" style="background:#1f5f4b;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block;">Verify email</a></p>
      <p style="font-size:13px;color:#6b6b6b;">Or copy this link: ${url}</p>
      <p style="font-size:13px;color:#6b6b6b;">This link expires in 24 hours.</p>
    `,
      storeName
    ),
  });
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const storeName = await getCachedStoreName();
  const url = `${siteConfig.url}/reset-password?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to,
    fromName: storeName,
    subject: `Reset your password — ${storeName}`,
    html: emailShell(
      `
      <h2 style="margin-top:0;color:#1f5f4b;">Reset your password</h2>
      <p>We received a request to reset your ${storeName} password.</p>
      <p><a href="${url}" style="background:#1f5f4b;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block;">Choose a new password</a></p>
      <p style="font-size:13px;color:#6b6b6b;">Or copy this link: ${url}</p>
      <p style="font-size:13px;color:#6b6b6b;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
    `,
      storeName
    ),
  });
}

export type OrderEmailItem = {
  productName: string;
  quantity: number;
  total: number;
};

export type OrderEmailDetails = {
  orderNumber: string;
  customerName: string;
  items: OrderEmailItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  paymentMethod: string;
  shippingAddress: string;
  createdAt: Date;
};

function orderItemsTable(items: OrderEmailItem[]): string {
  const rows = items
    .map(
      (item) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #eceae2;">${escapeHtml(item.productName)}</td>
      <td style="padding:8px 0;border-bottom:1px solid #eceae2;text-align:center;">${item.quantity}</td>
      <td style="padding:8px 0;border-bottom:1px solid #eceae2;text-align:right;">${formatPrice(item.total)}</td>
    </tr>`
    )
    .join("");

  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    <thead>
      <tr>
        <th style="text-align:left;border-bottom:2px solid #eceae2;padding:8px 0;font-size:12px;text-transform:uppercase;color:#6b6b6b;">Item</th>
        <th style="text-align:center;border-bottom:2px solid #eceae2;padding:8px 0;font-size:12px;text-transform:uppercase;color:#6b6b6b;">Qty</th>
        <th style="text-align:right;border-bottom:2px solid #eceae2;padding:8px 0;font-size:12px;text-transform:uppercase;color:#6b6b6b;">Total</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function orderTotals(details: OrderEmailDetails): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
      <tr><td style="padding:4px 0;color:#6b6b6b;">Subtotal</td><td style="padding:4px 0;text-align:right;">${formatPrice(details.subtotal)}</td></tr>
      <tr><td style="padding:4px 0;color:#6b6b6b;">Discount</td><td style="padding:4px 0;text-align:right;">${details.discount > 0 ? "-" + formatPrice(details.discount) : formatPrice(0)}</td></tr>
      <tr><td style="padding:4px 0;color:#6b6b6b;">Delivery</td><td style="padding:4px 0;text-align:right;">${formatPrice(details.deliveryFee)}</td></tr>
      <tr><td style="padding:8px 0;font-weight:700;">Total</td><td style="padding:8px 0;text-align:right;font-weight:700;">${formatPrice(details.total)}</td></tr>
    </table>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendOrderConfirmationEmail(
  to: string,
  details: OrderEmailDetails
): Promise<void> {
  const storeName = await getCachedStoreName();
  await sendEmail({
    to,
    fromName: storeName,
    subject: `Order ${details.orderNumber} confirmed — ${storeName}`,
    html: emailShell(
      `
      <h2 style="margin-top:0;color:#1f5f4b;">Thank you, ${escapeHtml(details.customerName)}!</h2>
      <p>Your order <strong>${details.orderNumber}</strong> has been placed. We'll keep you posted on its progress.</p>
      <p style="font-size:13px;color:#6b6b6b;">Placed ${details.createdAt.toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric" })} · Payment: ${escapeHtml(details.paymentMethod)}</p>
      ${orderItemsTable(details.items)}
      ${orderTotals(details)}
      <div style="margin-top:16px;padding:12px 16px;background:#f6f1e7;border-radius:8px;font-size:13px;color:#4a4a4a;">
        <strong>Deliver to:</strong><br />${escapeHtml(details.shippingAddress).replace(/\n/g, "<br />")}
      </div>
      <p style="margin-top:20px;"><a href="${siteConfig.url}/login" style="background:#1f5f4b;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block;">Track your order</a></p>
    `,
      storeName
    ),
  });
}

export async function sendOrderStatusEmail(
  to: string,
  details: { orderNumber: string; status: OrderStatus; note?: string | null }
): Promise<void> {
  const storeName = await getCachedStoreName();
  await sendEmail({
    to,
    fromName: storeName,
    subject: `Order ${details.orderNumber} is now ${statusLabel(details.status)} — ${storeName}`,
    html: emailShell(
      `
      <h2 style="margin-top:0;color:#1f5f4b;">Order ${statusLabel(details.status)}</h2>
      <p>Your order <strong>${details.orderNumber}</strong> has been updated to <strong>${statusLabel(details.status)}</strong>.</p>
      ${details.note ? `<p style="background:#f6f1e7;padding:12px 16px;border-radius:8px;">${escapeHtml(details.note)}</p>` : ""}
      <p><a href="${siteConfig.url}/login" style="background:#1f5f4b;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block;">View your order</a></p>
    `,
      storeName
    ),
  });
}

export async function sendOrderPaymentEmail(
  to: string,
  details: { orderNumber: string; paymentStatus: PaymentStatus }
): Promise<void> {
  const storeName = await getCachedStoreName();
  await sendEmail({
    to,
    fromName: storeName,
    subject: `Payment ${paymentStatusLabel(details.paymentStatus).toLowerCase()} on order ${details.orderNumber} — ${storeName}`,
    html: emailShell(
      `
      <h2 style="margin-top:0;color:#1f5f4b;">Payment update</h2>
      <p>Payment for order <strong>${details.orderNumber}</strong> is now <strong>${escapeHtml(paymentStatusLabel(details.paymentStatus))}</strong>.</p>
      <p><a href="${siteConfig.url}/login" style="background:#1f5f4b;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block;">View your order</a></p>
    `,
      storeName
    ),
  });
}

export async function sendNewsletterWelcomeEmail(to: string): Promise<void> {
  const storeName = await getCachedStoreName();
  const unsubscribeUrl = `${siteConfig.url}/newsletter/unsubscribe?email=${encodeURIComponent(to)}`;
  await sendEmail({
    to,
    fromName: storeName,
    subject: `Welcome to the ${storeName} newsletter!`,
    html: emailShell(
      `
      <h2 style="margin-top:0;color:#1f5f4b;">You're subscribed!</h2>
      <p>Thanks for joining the ${storeName} newsletter. You'll get early access to new arrivals and members-only offers.</p>
      <p style="font-size:13px;color:#6b6b6b;"><a href="${unsubscribeUrl}" style="color:#6b6b6b;">Unsubscribe</a> — no hard feelings, we promise.</p>
    `,
      storeName
    ),
  });
}

export type AbandonedCartEmailItem = {
  productName: string;
  variantName: string | null;
  quantity: number;
  total: number;
};

export async function sendAbandonedCartEmail(
  to: string,
  details: { items: AbandonedCartEmailItem[]; subtotal: number }
): Promise<void> {
  const rows = details.items
    .map(
      (item) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #eceae2;">${escapeHtml(item.productName)}${item.variantName ? ` · ${escapeHtml(item.variantName)}` : ""}</td>
      <td style="padding:8px 0;border-bottom:1px solid #eceae2;text-align:center;">${item.quantity}</td>
      <td style="padding:8px 0;border-bottom:1px solid #eceae2;text-align:right;">${formatPrice(item.total)}</td>
    </tr>`
    )
    .join("");

  const storeName = await getCachedStoreName();
  await sendEmail({
    to,
    fromName: storeName,
    subject: `Your ${storeName} cart is waiting for you`,
    html: emailShell(
      `
      <h2 style="margin-top:0;color:#1f5f4b;">You left something behind!</h2>
      <p>We noticed you still have items in your cart. There's no rush, but they're waiting when you're ready.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:12px;">
        <thead>
          <tr>
            <th style="text-align:left;border-bottom:2px solid #eceae2;padding:8px 0;font-size:12px;text-transform:uppercase;color:#6b6b6b;">Item</th>
            <th style="text-align:center;border-bottom:2px solid #eceae2;padding:8px 0;font-size:12px;text-transform:uppercase;color:#6b6b6b;">Qty</th>
            <th style="text-align:right;border-bottom:2px solid #eceae2;padding:8px 0;font-size:12px;text-transform:uppercase;color:#6b6b6b;">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="text-align:right;font-size:15px;font-weight:700;margin-top:8px;">Subtotal: ${formatPrice(details.subtotal)}</p>
      <p><a href="${siteConfig.url}/cart" style="background:#1f5f4b;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block;">Complete your order</a></p>
      <p style="font-size:12px;color:#9aa0a6;">Items aren't reserved — they can sell out if you wait too long.</p>
    `,
      storeName
    ),
  });
}
