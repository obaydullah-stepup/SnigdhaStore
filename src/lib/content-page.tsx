import type { ReactNode } from "react";

export const PAGE_SLUGS = {
  about: "about",
  contact: "contact",
  faq: "faq",
  deliveryReturns: "delivery-returns",
  shipping: "shipping",
  terms: "terms",
  privacy: "privacy",
} as const;

export const DEFAULT_PAGES: { slug: string; title: string; content: string }[] = [
  {
    slug: PAGE_SLUGS.about,
    title: "About {brand}",
    content: `## Who we are

{brand} is a thoughtful online store bringing you carefully curated products at fair prices.

## Our promise

Quality first. Every item is checked before it ships, and we stand behind everything we sell.`,
  },
  {
    slug: PAGE_SLUGS.contact,
    title: "Contact us",
    content: `## Get in touch

We'd love to hear from you. Reach us any day of the week and we'll get back to you within 24 hours.

- Email: support@example.com
- Phone: +880 1700-000000
- Hours: Sat–Thu, 9 AM – 9 PM`,
  },
  {
    slug: PAGE_SLUGS.faq,
    title: "Frequently asked questions",
    content: `## How long does delivery take?

Most orders arrive within 2–4 working days inside Dhaka and 4–6 working days outside Dhaka.

## What payment methods do you accept?

We accept cash on delivery, bKash, Nagad and major cards.

## Can I return an item?

Yes — you have 7 days from delivery to request a return. See our Delivery & Returns page for details.`,
  },
  {
    slug: PAGE_SLUGS.deliveryReturns,
    title: "Delivery & Returns",
    content: `## Delivery

We deliver all over Bangladesh. Standard delivery takes 2–4 working days inside Dhaka and 4–6 working days outside Dhaka. You'll receive a delivery fee quote at checkout.

## Returns

You can return most items within 7 days of delivery, provided they are unused and in original packaging. Gift cards and intimate products are not returnable.

## Refunds

Refunds are issued to the original payment method within 5–7 working days of the returned item reaching our warehouse.`,
  },
  {
    slug: PAGE_SLUGS.shipping,
    title: "Shipping",
    content: `## Order processing

Orders placed before 5 PM ship the same day; orders after that ship the next working day.

## Tracking

You can track your order any time from your account, or with the order number on the tracking page.`,
  },
  {
    slug: PAGE_SLUGS.terms,
    title: "Terms of Service",
    content: `## Agreement

By placing an order you agree to these terms. We reserve the right to refuse or cancel any order, and to update these terms at any time.

## Prices

Prices are shown in the store currency and may change without notice. The price on your checkout page is final for that order.`,
  },
  {
    slug: PAGE_SLUGS.privacy,
    title: "Privacy Policy",
    content: `## What we collect

We collect the information you give us — name, email, phone and delivery address — to process and deliver your orders.

## How we use it

Your data is used only to fulfil orders, provide support and, with your consent, send our newsletter. We never sell your personal information.

## Contact

For any privacy request, email support@example.com.`,
  },
];

export function renderContent(content: string): ReactNode[] {
  const blocks: ReactNode[] = [];
  let listBuffer: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listBuffer.length > 0) {
      blocks.push(
        <ul key={`list-${key++}`} className="my-3 list-disc space-y-1.5 pl-5">
          {listBuffer.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
      listBuffer = [];
    }
  };

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      continue;
    }
    if (line.startsWith("## ")) {
      flushList();
      blocks.push(
        <p key={`h-${key++}`} className="font-heading mt-6 mb-2 font-semibold">
          {line.slice(3)}
        </p>
      );
      continue;
    }
    if (line.startsWith("- ")) {
      listBuffer.push(line.slice(2));
      continue;
    }
    flushList();
    blocks.push(
      <p key={`p-${key++}`} className="my-3">
        {line}
      </p>
    );
  }
  flushList();
  return blocks.length > 0 ? blocks : [<p key="empty">No content yet.</p>];
}
