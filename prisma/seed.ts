import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const img = (seed: string) => `https://picsum.photos/seed/${seed}/900/1100`;

/**
 * The single source of truth for the demo store name. Seeded into
 * `store.name` at the bottom of this file, and used here to derive product
 * sub-brands and SEO titles so no brand string is hardcoded per product.
 * Rename the store in Admin > Settings at runtime; these are just demo data.
 */
const STORE_NAME = process.env.SEED_STORE_NAME ?? "Snigdha";

/** `"Silk"` -> a product sub-brand of the demo store, e.g. "Acme Silk". */
const brandLine = (line: string) => `${STORE_NAME} ${line}`;

/** "Buy X Online" -> "Buy X Online | <store name>". */
const withStore = (title: string) => `${title} | ${STORE_NAME}`;

const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

interface SeedProduct {
  name: string;
  slug: string;
  category: string;
  brand: string;
  shortDescription: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  costPrice: number;
  sku: string;
  stock: number;
  featured?: boolean;
  soldCount: number;
  seoTitle?: string;
  seoDescription?: string;
  images: { seed: string; alt: string }[];
  variants?: {
    name: string;
    sku: string;
    price?: number;
    stock?: number;
    attributes: Record<string, string>;
  }[];
  reviews?: { rating: number; title: string; comment: string; daysAgo: number }[];
}

const products: SeedProduct[] = [
  // ------------------------------------------------ Women's Fashion
  {
    name: "Emerald Silk Saree",
    slug: "emerald-silk-saree",
    category: "Women's Fashion",
    brand: brandLine("Silk"),
    shortDescription:
      "Handloom Banarasi-style silk saree in deep emerald with a delicate gold zari border.",
    description:
      "A luxurious pure-silk saree woven on traditional handlooms. The deep emerald weave is finished with a fine gold zari border and an included contrast blouse piece. Lightweight, breathable, and elegantly draped — made for weddings, ceremonies, and evenings that call for something unforgettable.",
    price: 8500,
    compareAtPrice: 10500,
    costPrice: 5800,
    sku: "SNG-WF-1001",
    stock: 12,
    featured: true,
    soldCount: 320,
    seoTitle: withStore("Buy Emerald Silk Saree Online"),
    seoDescription:
      "Premium handloom emerald silk saree with gold zari border. Order online with cash on delivery across Bangladesh.",
    images: [
      { seed: "saree-emerald-1", alt: "Emerald silk saree draped elegantly on a model" },
      {
        seed: "saree-emerald-2",
        alt: "Close-up of gold zari border on emerald silk saree",
      },
      { seed: "saree-emerald-3", alt: "Emerald saree fabric detail" },
    ],
    variants: [
      {
        name: "Length 5.5m",
        sku: "SNG-WF-1001-A",
        attributes: { length: "5.5m", border: "Gold zari" },
      },
      {
        name: "Length 6.0m",
        sku: "SNG-WF-1001-B",
        price: 8800,
        attributes: { length: "6.0m", border: "Gold zari" },
      },
    ],
    reviews: [
      {
        rating: 5,
        title: "Absolutely stunning",
        comment:
          "The saree arrived neatly folded with a matching blouse piece. The colour is even richer in person.",
        daysAgo: 6,
      },
      {
        rating: 4,
        title: "Beautiful drape",
        comment:
          "Soft and shiny, exactly as pictured. Delivery to Chattogram took three days.",
        daysAgo: 18,
      },
    ],
  },
  {
    name: "Cotton Jamdani Saree",
    slug: "cotton-jamdani-saree",
    category: "Women's Fashion",
    brand: brandLine("Heritage"),
    shortDescription:
      "Authentic Dhakai Jamdani on soft cotton — blood-red motifs on a cream ground.",
    description:
      "Woven in Dhaka's historic Jamdani belt, this cotton saree carries the fine geometric motifs Jamdani is famous for. The breathable fabric keeps you comfortable all day, from office to adda, while the handwoven finish keeps every piece one of a kind.",
    price: 5200,
    compareAtPrice: 6200,
    costPrice: 3900,
    sku: "SNG-WF-1002",
    stock: 20,
    soldCount: 210,
    seoTitle: withStore("Authentic Dhakai Jamdani Saree"),
    seoDescription:
      "Handwoven Dhakai cotton Jamdani saree, cream with blood-red motifs. Nationwide delivery in Bangladesh.",
    images: [
      { seed: "saree-jamdani-1", alt: "Cotton Jamdani saree draped on a model" },
      { seed: "saree-jamdani-2", alt: "Jamdani motif close-up" },
    ],
    variants: [
      { name: "Length 5.5m", sku: "SNG-WF-1002-A", attributes: { length: "5.5m" } },
    ],
  },
  {
    name: "Floral Anarkali Kurta",
    slug: "floral-anarkali-kurta",
    category: "Women's Fashion",
    brand: brandLine("Couture"),
    shortDescription:
      "Floor-length Anarkali in soft blush cotton with a muted floral print and gathered skirt.",
    description:
      "A flowing floor-length Anarkali that moves beautifully. Crafted from breathable cotton in a muted blush floral, it features a flared skirt, three-quarter sleeves, and a gentle sweetheart neckline. Pair it with churidar or cigarette pants for Eid, mehendi, or everyday elegance.",
    price: 3400,
    costPrice: 2300,
    sku: "SNG-WF-1003",
    stock: 30,
    featured: true,
    soldCount: 175,
    seoTitle: withStore("Floral Anarkali Kurta for Women"),
    images: [
      { seed: "anarkali-1", alt: "Blush floral Anarkali kurta" },
      { seed: "anarkali-2", alt: "Anarkali kurta back detailing" },
    ],
    variants: [
      { name: "Size S", sku: "SNG-WF-1003-S", attributes: { size: "S" } },
      { name: "Size M", sku: "SNG-WF-1003-M", attributes: { size: "M" } },
      { name: "Size L", sku: "SNG-WF-1003-L", attributes: { size: "L" } },
      { name: "Size XL", sku: "SNG-WF-1003-XL", stock: 8, attributes: { size: "XL" } },
    ],
  },
  {
    name: "Linen Palazzo Set",
    slug: "linen-palazzo-set",
    category: "Women's Fashion",
    brand: brandLine("Basics"),
    shortDescription:
      "Two-piece airy linen set — relaxed kurta top with wide-leg palazzo trousers.",
    description:
      "An effortless two-piece set in natural linen. The relaxed kurta top is balanced by wide-leg palazzos, creating a clean, breezy silhouette perfect for Dhaka summers and long afternoons. Machine-washable and easy to style.",
    price: 2900,
    compareAtPrice: 3600,
    costPrice: 2000,
    sku: "SNG-WF-1004",
    stock: 25,
    soldCount: 140,
    seoTitle: withStore("Linen Palazzo Set for Women"),
    images: [
      { seed: "palazzo-1", alt: "Linen palazzo set in natural tone" },
      { seed: "palazzo-2", alt: "Palazzo trousers detail" },
    ],
    variants: [
      { name: "Size M", sku: "SNG-WF-1004-M", attributes: { size: "M" } },
      { name: "Size L", sku: "SNG-WF-1004-L", attributes: { size: "L" } },
    ],
  },
  {
    name: "Casual Kaftan Dress",
    slug: "casual-kaftan-dress",
    category: "Women's Fashion",
    brand: brandLine("Basics"),
    shortDescription: "Easy-fit kaftan in oat beige — the low-effort everyday dress.",
    description:
      "A relaxed kaftan in soft oat-beige viscose. Side slits, dolman sleeves, and a midi hem make it the perfect throw-on dress for brunch, the market, or working from home. Pairs with everything from flat sandals to statement earrings.",
    price: 2100,
    costPrice: 1450,
    sku: "SNG-WF-1005",
    stock: 35,
    soldCount: 98,
    seoTitle: withStore("Casual Kaftan Dress Oat Beige"),
    images: [
      { seed: "kaftan-1", alt: "Oat beige kaftan dress" },
      { seed: "kaftan-2", alt: "Kaftan side slit detail" },
    ],
    variants: [
      { name: "Size S", sku: "SNG-WF-1005-S", attributes: { size: "S" } },
      { name: "Size M", sku: "SNG-WF-1005-M", attributes: { size: "M" } },
      { name: "Size L", sku: "SNG-WF-1005-L", attributes: { size: "L" } },
    ],
  },
  {
    name: "Knit Cardigan — Soft Beige",
    slug: "knit-cardigan-soft-beige",
    category: "Women's Fashion",
    brand: brandLine("Knit"),
    shortDescription: "Chunky knit cardigan in warm beige with tortoiseshell buttons.",
    description:
      "A wardrobe staple knit in premium acrylic-wool blend. The warm beige tone, dropped shoulders, and tortoiseshell buttons make it cozy yet considered. Great over kurtas, dresses, or with jeans on cool Dhaka evenings.",
    price: 2600,
    costPrice: 1800,
    sku: "SNG-WF-1006",
    stock: 18,
    soldCount: 86,
    seoTitle: withStore("Soft Beige Knit Cardigan"),
    images: [
      { seed: "cardigan-1", alt: "Soft beige knit cardigan" },
      { seed: "cardigan-2", alt: "Cardigan button detail" },
    ],
    variants: [
      { name: "Size M", sku: "SNG-WF-1006-M", attributes: { size: "M" } },
      { name: "Size L", sku: "SNG-WF-1006-L", attributes: { size: "L" } },
    ],
  },
  {
    name: "Midi Denim Skirt",
    slug: "midi-denim-skirt",
    category: "Women's Fashion",
    brand: brandLine("Denim"),
    shortDescription: "Washed midi denim skirt with a high waist and front slit.",
    description:
      "Upgrade your denim rotation with this A-line midi skirt. High waist, classic five-pocket styling, and a subtle front slit for movement. A relaxed staple that works from campus to evening tea.",
    price: 2400,
    compareAtPrice: 3000,
    costPrice: 1650,
    sku: "SNG-WF-1007",
    stock: 22,
    soldCount: 74,
    seoTitle: withStore("Midi Denim Skirt High Waist"),
    images: [{ seed: "denimskirt-1", alt: "Washed midi denim skirt" }],
    variants: [
      { name: "Size S", sku: "SNG-WF-1007-S", attributes: { size: "S" } },
      { name: "Size M", sku: "SNG-WF-1007-M", attributes: { size: "M" } },
      { name: "Size L", sku: "SNG-WF-1007-L", attributes: { size: "L" } },
    ],
  },
  {
    name: "Bengali Print Maxi Dress",
    slug: "bengali-print-maxi-dress",
    category: "Women's Fashion",
    brand: brandLine("Studio"),
    shortDescription:
      "Billowy maxi dress printed with hand-drawn Bengali motifs in terracotta.",
    description:
      "A celebration of Bengali craft in wearable form. This billowy maxi dress features hand-drawn alpana-inspired motifs in warm terracotta on ivory cotton. Elasticated waist and soft gather for an easy, elegant fit.",
    price: 3100,
    costPrice: 2150,
    sku: "SNG-WF-1008",
    stock: 14,
    soldCount: 61,
    seoTitle: withStore("Bengali Print Maxi Dress"),
    images: [
      { seed: "maxidress-1", alt: "Terracotta Bengali print maxi dress" },
      { seed: "maxidress-2", alt: "Maxi dress fabric print" },
    ],
    variants: [
      { name: "Size M", sku: "SNG-WF-1008-M", attributes: { size: "M" } },
      { name: "Size L", sku: "SNG-WF-1008-L", attributes: { size: "L" } },
    ],
  },

  // ------------------------------------------------ Men's Fashion
  {
    name: "Premium Cotton Panjabi",
    slug: "premium-cotton-panjabi",
    category: "Men's Fashion",
    brand: brandLine("Classics"),
    shortDescription: "Eid-ready panjabi in soft premium cotton with a hidden placket.",
    description:
      "The definitive Eid panjabi, cut from soft combed cotton with a clean hidden placket and short side pockets. Available in classic tones that photograph beautifully for family gatherings. Runs true to size with a tailored yet comfortable fit.",
    price: 3200,
    compareAtPrice: 4000,
    costPrice: 2200,
    sku: "SNG-MF-2001",
    stock: 40,
    featured: true,
    soldCount: 285,
    seoTitle: withStore("Premium Cotton Panjabi for Men"),
    seoDescription:
      "Eid-ready premium cotton panjabi with hidden placket. Cash on delivery available across Bangladesh.",
    images: [
      { seed: "panjabi-1", alt: "Premium cotton panjabi on model" },
      { seed: "panjabi-2", alt: "Panjabi fabric close-up" },
    ],
    variants: [
      { name: "Size M", sku: "SNG-MF-2001-M", attributes: { size: "M" } },
      { name: "Size L", sku: "SNG-MF-2001-L", attributes: { size: "L" } },
      { name: "Size XL", sku: "SNG-MF-2001-XL", attributes: { size: "XL" } },
      { name: "Size XXL", sku: "SNG-MF-2001-XXL", stock: 9, attributes: { size: "XXL" } },
    ],
    reviews: [
      {
        rating: 5,
        title: "Perfect fit, premium feel",
        comment:
          "Ordered for my father and younger brother, both loved the fabric quality. Delivery in Dhaka was next day.",
        daysAgo: 4,
      },
      {
        rating: 5,
        title: "Better than expected",
        comment:
          "The cotton is genuinely soft and the stitching is neat. Will order again for Eid.",
        daysAgo: 11,
      },
    ],
  },
  {
    name: "Slim Fit Formal Shirt",
    slug: "slim-fit-formal-shirt",
    category: "Men's Fashion",
    brand: brandLine("Office"),
    shortDescription: "Crisp non-iron formal shirt in classic white with a slim fit.",
    description:
      "A sharp white formal shirt with wrinkle-resistant finish, Italian collar, and mother-of-pearl buttons. Cut slim without hugging, it bridges boardroom and weekend lunches with ease. Easy-care and built to last wash after wash.",
    price: 1800,
    costPrice: 1250,
    sku: "SNG-MF-2002",
    stock: 55,
    soldCount: 240,
    seoTitle: withStore("Slim Fit Non-Iron Formal Shirt"),
    images: [
      { seed: "shirt-white-1", alt: "White slim-fit formal shirt" },
      { seed: "shirt-white-2", alt: "Shirt collar detail" },
    ],
    variants: [
      { name: "Size S", sku: "SNG-MF-2002-S", attributes: { size: "S" } },
      { name: "Size M", sku: "SNG-MF-2002-M", attributes: { size: "M" } },
      { name: "Size L", sku: "SNG-MF-2002-L", attributes: { size: "L" } },
      { name: "Size XL", sku: "SNG-MF-2002-XL", attributes: { size: "XL" } },
    ],
  },
  {
    name: "Casual Polo T-Shirt",
    slug: "casual-polo-t-shirt",
    category: "Men's Fashion",
    brand: brandLine("Sport"),
    shortDescription: "Pique cotton polo in deep green with a tonal collar.",
    description:
      "A classic pique polo in deep forest green, our signature shade. Breathable cotton, ribbed collar and cuffs, and a fit that is relaxed but never sloppy. The workhorse of your teeka-casual wardrobe.",
    price: 1200,
    costPrice: 800,
    sku: "SNG-MF-2003",
    stock: 60,
    soldCount: 410,
    seoTitle: withStore("Deep Green Pique Polo"),
    images: [{ seed: "polo-1", alt: "Deep green pique polo shirt" }],
    variants: [
      { name: "Size M", sku: "SNG-MF-2003-M", attributes: { size: "M" } },
      { name: "Size L", sku: "SNG-MF-2003-L", attributes: { size: "L" } },
      { name: "Size XL", sku: "SNG-MF-2003-XL", attributes: { size: "XL" } },
    ],
  },
  {
    name: "Classic Denim Jeans",
    slug: "classic-denim-jeans",
    category: "Men's Fashion",
    brand: brandLine("Denim"),
    shortDescription: "Straight-leg jeans in vintage indigo with a comfortable stretch.",
    description:
      "The pair you reach for every single day. Straight-leg cut, vintage indigo wash, and a touch of stretch for all-day comfort. Five-pocket styling with clean hardware — the definition of a classic.",
    price: 2600,
    compareAtPrice: 3200,
    costPrice: 1800,
    sku: "SNG-MF-2004",
    stock: 45,
    soldCount: 195,
    seoTitle: withStore("Classic Straight-Leg Denim Jeans"),
    images: [
      { seed: "jeans-1", alt: "Vintage indigo straight-leg jeans" },
      { seed: "jeans-2", alt: "Jeans denim texture" },
    ],
    variants: [
      { name: "W30", sku: "SNG-MF-2004-W30", attributes: { waist: "W30" } },
      { name: "W32", sku: "SNG-MF-2004-W32", attributes: { waist: "W32" } },
      { name: "W34", sku: "SNG-MF-2004-W34", attributes: { waist: "W34" } },
      { name: "W36", sku: "SNG-MF-2004-W36", stock: 6, attributes: { waist: "W36" } },
    ],
    reviews: [
      {
        rating: 4,
        title: "Great everyday jeans",
        comment:
          "Comfortable stretch and true to size. Colour has faded nicely after a few washes.",
        daysAgo: 21,
      },
    ],
  },
  {
    name: "Linen Summer Shirt",
    slug: "linen-summer-shirt",
    category: "Men's Fashion",
    brand: brandLine("Linen"),
    shortDescription: "Lightweight linen blend shirt in sky blue for humid days.",
    description:
      "Made for Bangladeshi summers, this linen-blend shirt breathes where you need it most. In a soft sky blue with a relaxed camp collar, it keeps you cool through board meetings, market runs, and everything in between.",
    price: 2100,
    costPrice: 1450,
    sku: "SNG-MF-2005",
    stock: 38,
    soldCount: 158,
    seoTitle: withStore("Sky Blue Linen Blend Shirt"),
    images: [{ seed: "linenshirt-1", alt: "Sky blue linen summer shirt" }],
    variants: [
      { name: "Size M", sku: "SNG-MF-2005-M", attributes: { size: "M" } },
      { name: "Size L", sku: "SNG-MF-2005-L", attributes: { size: "L" } },
      { name: "Size XL", sku: "SNG-MF-2005-XL", attributes: { size: "XL" } },
    ],
  },
  {
    name: "Leather Oxford Shoes",
    slug: "leather-oxford-shoes",
    category: "Men's Fashion",
    brand: brandLine("Leather"),
    shortDescription: "Hand-finished black Oxford shoes with a cushioned insole.",
    description:
      "Classic black Oxfords finished by hand with a polished cap-toe. A cushioned insole and flexible sole make them comfortable from the first wear, and they only get better with age. Dress them up or down — they always look right.",
    price: 5400,
    costPrice: 3800,
    sku: "SNG-MF-2006",
    stock: 15,
    soldCount: 82,
    seoTitle: withStore("Hand-Finished Leather Oxford Shoes"),
    images: [
      { seed: "oxford-1", alt: "Black leather Oxford shoes" },
      { seed: "oxford-2", alt: "Oxford shoe side profile" },
    ],
    variants: [
      { name: "Size 42", sku: "SNG-MF-2006-42", attributes: { size: "42 (EU)" } },
      { name: "Size 43", sku: "SNG-MF-2006-43", attributes: { size: "43 (EU)" } },
      {
        name: "Size 44",
        sku: "SNG-MF-2006-44",
        stock: 5,
        attributes: { size: "44 (EU)" },
      },
    ],
  },
  {
    name: "Hooded Sweatshirt",
    slug: "hooded-sweatshirt",
    category: "Men's Fashion",
    brand: brandLine("Street"),
    shortDescription: "Brushed-fleece hoodie in charcoal with kangaroo pocket.",
    description:
      "A heavyweight hoodie in brushed fleece. Charcoal shade, adjustable drawstring hood, and a roomy kangaroo pocket. The cozy layer for Dhaka winters and air-conditioned cinemas.",
    price: 2300,
    compareAtPrice: 2900,
    costPrice: 1600,
    sku: "SNG-MF-2007",
    stock: 28,
    soldCount: 120,
    seoTitle: withStore("Charcoal Brushed-Fleece Hoodie"),
    images: [{ seed: "hoodie-1", alt: "Charcoal hooded sweatshirt" }],
    variants: [
      { name: "Size M", sku: "SNG-MF-2007-M", attributes: { size: "M" } },
      { name: "Size L", sku: "SNG-MF-2007-L", attributes: { size: "L" } },
      { name: "Size XL", sku: "SNG-MF-2007-XL", attributes: { size: "XL" } },
    ],
  },

  // ------------------------------------------------ Home & Living
  {
    name: "Ceramic Dinner Set — 16 pc",
    slug: "ceramic-dinner-set",
    category: "Home & Living",
    brand: brandLine("Home"),
    shortDescription: "Stoneware dinner set for six with a warm cream glaze.",
    description:
      "Sixteen pieces of durable stoneware in a warm cream glaze: dinner plates, side plates, and bowls for six, plus a large serving platter. Oven, microwave, and dishwasher safe. An heirloom-worthy everyday set that dresses up any table.",
    price: 6800,
    compareAtPrice: 8200,
    costPrice: 4800,
    sku: "SNG-HL-3001",
    stock: 10,
    featured: true,
    soldCount: 133,
    seoTitle: withStore("16-Piece Ceramic Dinner Set"),
    seoDescription:
      "Warm cream stoneware dinner set for six, oven and dishwasher safe. Order with cash on delivery in Bangladesh.",
    images: [
      { seed: "dinnerset-1", alt: "16-piece cream ceramic dinner set" },
      { seed: "dinnerset-2", alt: "Dinner plates stacked" },
    ],
    reviews: [
      {
        rating: 5,
        title: "Elevates every meal",
        comment:
          "Thick, elegant stoneware. Nothing chipped despite heavy daily use for two months.",
        daysAgo: 27,
      },
    ],
  },
  {
    name: "Bamboo Storage Basket",
    slug: "bamboo-storage-basket",
    category: "Home & Living",
    brand: brandLine("Craft"),
    shortDescription:
      "Handwoven bamboo basket with cotton-lined handle for tidy corners.",
    description:
      "A sturdy handwoven bamboo basket that brings warmth to any shelf or corner. Use it for throws, toys, magazines, or groceries. Fitted with a cotton-lined handle for easy carrying. Naturally anti-bacterial and built to last years.",
    price: 1500,
    costPrice: 950,
    sku: "SNG-HL-3002",
    stock: 32,
    soldCount: 110,
    seoTitle: withStore("Handwoven Bamboo Storage Basket"),
    images: [
      { seed: "basket-1", alt: "Handwoven bamboo storage basket" },
      { seed: "basket-2", alt: "Basket woven texture" },
    ],
  },
  {
    name: "Cotton Throw Blanket",
    slug: "cotton-throw-blanket",
    category: "Home & Living",
    brand: brandLine("Home"),
    shortDescription:
      "Oversized knit throw in oatmeal — soft, warm, and machine washable.",
    description:
      "An oversized chunky-knit throw in seasonal oatmeal. Pure cotton yarn with a wide-weave stitch that looks beautiful thrown over a sofa or bed, and washes easily when the kids come visiting.",
    price: 2800,
    costPrice: 1950,
    sku: "SNG-HL-3003",
    stock: 20,
    soldCount: 88,
    seoTitle: withStore("Oatmeal Cotton Throw Blanket"),
    images: [{ seed: "throw-1", alt: "Oatmeal chunky-knit throw blanket" }],
    variants: [
      {
        name: "Oatmeal",
        sku: "SNG-HL-3003-AT",
        attributes: { color: "Oatmeal", size: "180 x 140 cm" },
      },
      {
        name: "Sage",
        sku: "SNG-HL-3003-SG",
        attributes: { color: "Sage", size: "180 x 140 cm" },
      },
      {
        name: "Blush",
        sku: "SNG-HL-3003-BL",
        attributes: { color: "Blush", size: "180 x 140 cm" },
      },
    ],
  },
  {
    name: "Aromatherapy Candle Trio",
    slug: "aromatherapy-candle-trio",
    category: "Home & Living",
    brand: brandLine("Aroma"),
    shortDescription:
      "Three soy candles — sandalwood, jasmine, and vetiver — in kraft tins.",
    description:
      "Hand-poured soy candles in three grounding scents: warm sandalwood, fresh jasmine, and earthy vetiver. Clean-burning soy wax with cotton wicks, housed in recyclable kraft tins. Each burns for roughly 35 hours of quiet calm.",
    price: 1900,
    compareAtPrice: 2400,
    costPrice: 1200,
    sku: "SNG-HL-3004",
    stock: 26,
    soldCount: 145,
    seoTitle: withStore("Soy Aromatherapy Candle Trio"),
    images: [
      { seed: "candles-1", alt: "Three soy candles in kraft tins" },
      { seed: "candles-2", alt: "Sandalwood candle close-up" },
    ],
    reviews: [
      {
        rating: 5,
        title: "My evening ritual",
        comment:
          "Sandalwood scent fills the room without being overpowering. Lovely packaging too.",
        daysAgo: 9,
      },
    ],
  },
  {
    name: "Hand-Glazed Ceramic Vase",
    slug: "hand-glazed-ceramic-vase",
    category: "Home & Living",
    brand: brandLine("Studio"),
    shortDescription:
      "Organic-form stoneware vase in moss green with hand-applied glaze.",
    description:
      "Each vase is wheel-thrown and hand-glazed, so no two are exactly alike. The soft moss-green glaze pools beautifully at the rim. Fill it with your weekly flowers or let it stand alone as a sculptural centerpiece.",
    price: 2300,
    costPrice: 1600,
    sku: "SNG-HL-3005",
    stock: 12,
    soldCount: 54,
    seoTitle: withStore("Hand-Glazed Stoneware Vase — Moss Green"),
    images: [{ seed: "vase-1", alt: "Moss green hand-glazed ceramic vase" }],
    variants: [
      { name: "Tall — 28cm", sku: "SNG-HL-3005-T", attributes: { height: "28cm" } },
      { name: "Short — 18cm", sku: "SNG-HL-3005-S", attributes: { height: "18cm" } },
    ],
  },
  {
    name: "Brass Table Lamp",
    slug: "brass-table-lamp",
    category: "Home & Living",
    brand: brandLine("Light"),
    shortDescription: "Warm glow brass-bezel lamp with an ivory linen shade.",
    description:
      "A study in warm minimalism: turned brass base, soft ivory linen shade, and warm 2700K light. Dimmable with an inline switch, it casts the kind of golden light that makes rooms feel softly finished.",
    price: 3900,
    costPrice: 2750,
    sku: "SNG-HL-3006",
    stock: 14,
    soldCount: 67,
    seoTitle: withStore("Brass Table Lamp with Linen Shade"),
    images: [{ seed: "lamp-1", alt: "Brass table lamp with linen shade" }],
  },

  // ------------------------------------------------ Beauty & Care
  {
    name: "Vitamin C Night Serum",
    slug: "vitamin-c-night-serum",
    category: "Beauty & Care",
    brand: brandLine("Glow"),
    shortDescription: "10% vitamin C + hyaluronic acid serum for bright, hydrated skin.",
    description:
      "A potent overnight serum combining 10% stabilized vitamin C with hyaluronic acid and niacinamide to fade dullness and lock in moisture while you sleep. Lightweight, non-greasy, and kind to sensitive skin. 30ml, cruelty-free, made in small batches.",
    price: 1450,
    compareAtPrice: 1800,
    costPrice: 900,
    sku: "SNG-BC-4001",
    stock: 80,
    featured: true,
    soldCount: 520,
    seoTitle: withStore("Vitamin C Night Serum 10%"),
    seoDescription:
      "Brightening vitamin C + hyaluronic acid night serum. Dermatologist-tested, made in small batches.",
    images: [
      { seed: "serum-1", alt: "Vitamin C serum dropper bottle" },
      { seed: "serum-2", alt: "Serum texture" },
    ],
    reviews: [
      {
        rating: 5,
        title: "Dullness gone in weeks",
        comment:
          "My skin looks noticeably brighter after three weeks. No irritation, absorbs fast.",
        daysAgo: 3,
      },
      {
        rating: 4,
        title: "Really good, slight scent",
        comment:
          "Works well and doesn't feel sticky. The scent takes getting used to but fades quickly.",
        daysAgo: 15,
      },
      {
        rating: 5,
        title: "Works for oily skin",
        comment: "Hydrating without the shine. Third bottle already.",
        daysAgo: 30,
      },
    ],
  },
  {
    name: "Herbal Shampoo Bar",
    slug: "herbal-shampoo-bar",
    category: "Beauty & Care",
    brand: brandLine("Botanics"),
    shortDescription: "Zero-waste shampoo bar with neem, shikakai, and coconut oil.",
    description:
      "A plastic-free shampoo bar powered by traditional herbs: neem for scalp health, shikakai for volume, and coconut oil for shine. Lathers richly, lasts roughly 60 washes, and leaves hair soft without sulfates or silicones.",
    price: 900,
    costPrice: 550,
    sku: "SNG-BC-4002",
    stock: 70,
    soldCount: 230,
    seoTitle: withStore("Zero-Waste Herbal Shampoo Bar"),
    images: [{ seed: "shampoobar-1", alt: "Herbal shampoo bar in kraft wrapping" }],
  },
  {
    name: "Jasmine Body Mist",
    slug: "jasmine-body-mist",
    category: "Beauty & Care",
    brand: brandLine("Aroma"),
    shortDescription: "Light jasmine mist inspired by Bangladeshi night gardens.",
    description:
      "A light, alcohol-free body mist that smells like a Dhaka garden at midnight — pure jasmine with a whisper of neroli. Perfect alone or layered over your fragrance. 100ml with a fine-veil sprayer.",
    price: 1100,
    costPrice: 700,
    sku: "SNG-BC-4003",
    stock: 60,
    soldCount: 300,
    seoTitle: withStore("Jasmine Body Mist 100ml"),
    images: [{ seed: "bodymist-1", alt: "Jasmine body mist bottle" }],
    reviews: [
      {
        rating: 5,
        title: "Smells like memories",
        comment:
          "Authentic jasmine, not synthetic. Lasts a few hours, perfect for office days.",
        daysAgo: 7,
      },
    ],
  },
  {
    name: "Ceramide Moisturizer",
    slug: "ceramide-moisturizer",
    category: "Beauty & Care",
    brand: brandLine("Glow"),
    shortDescription:
      "Daily barrier-repair cream with ceramides, squalane, and panthenol.",
    description:
      "A daily moisturizer built to repair and protect your skin barrier. Ceramides, squalane, and panthenol combine into a rich-but-not-heavy cream that suits combination and dry skin alike. Fragrance-free, dermatologist-tested, 75ml.",
    price: 1350,
    costPrice: 860,
    sku: "SNG-BC-4004",
    stock: 65,
    soldCount: 260,
    seoTitle: withStore("Ceramide Daily Moisturizer"),
    images: [{ seed: "moisturizer-1", alt: "Ceramide moisturizer jar" }],
  },
  {
    name: "Rose Clay Face Mask",
    slug: "rose-clay-face-mask",
    category: "Beauty & Care",
    brand: brandLine("Botanics"),
    shortDescription: "Gently exfoliating pink clay mask with rose water and kaolin.",
    description:
      "A soft-focus weekly mask blending pink kaolin clay with real rose water. Draws out impurities and refines pores without stripping. Rinses clean, leaving skin calm and glowy. 100g tub, enough for about 20 masks.",
    price: 980,
    compareAtPrice: 1200,
    costPrice: 620,
    sku: "SNG-BC-4005",
    stock: 55,
    soldCount: 150,
    seoTitle: withStore("Rose Clay Face Mask"),
    images: [{ seed: "claymask-1", alt: "Pink rose clay face mask" }],
  },
  {
    name: "Cold-Pressed Coconut Oil",
    slug: "cold-pressed-coconut-oil",
    category: "Beauty & Care",
    brand: brandLine("Botanics"),
    shortDescription: "Single-origin virgin coconut oil for hair, skin, and cooking.",
    description:
      "Single-origin coconuts pressed within hours of harvest. Use it as a hair treatment, body moisturizer, oil pulling, or everyday cooking fat. Unrefined, chemical-free, and bottled in tinted glass to preserve freshness. 500ml.",
    price: 850,
    costPrice: 540,
    sku: "SNG-BC-4006",
    stock: 90,
    soldCount: 340,
    seoTitle: withStore("Cold-Pressed Virgin Coconut Oil 500ml"),
    images: [{ seed: "coconutoil-1", alt: "Cold-pressed coconut oil in glass bottle" }],
  },

  // ------------------------------------------------ Electronics & Gadgets
  {
    name: "Wireless Earbuds Pro",
    slug: "wireless-earbuds-pro",
    category: "Electronics & Gadgets",
    brand: brandLine("Audio"),
    shortDescription: "Active noise-cancelling earbuds with 30-hour battery life.",
    description:
      "Immersive ANC earbuds with 11mm drivers, multipoint pairing, and IPX5 sweat resistance. Up to 30 hours of total playback with the charging case, plus fast USB-C and wireless charging. Touch controls and a comfortable low-profile fit.",
    price: 5200,
    compareAtPrice: 6500,
    costPrice: 3700,
    sku: "SNG-EG-5001",
    stock: 50,
    featured: true,
    soldCount: 610,
    seoTitle: withStore("Wireless Earbuds Pro with ANC"),
    seoDescription:
      "Active noise-cancelling earbuds, 30-hour battery, USB-C fast charging. 7-day return in Bangladesh.",
    images: [
      { seed: "earbuds-1", alt: "Wireless earbuds with charging case" },
      { seed: "earbuds-2", alt: "Earbud close-up" },
    ],
    reviews: [
      {
        rating: 5,
        title: "Best purchase this year",
        comment:
          "ANC works great on the bus. Pairing is instant and the battery honestly lasts days.",
        daysAgo: 2,
      },
      {
        rating: 4,
        title: "Great value",
        comment:
          "Sound is balanced and the case is compact. Bass could be punchier but for the price it's excellent.",
        daysAgo: 19,
      },
    ],
  },
  {
    name: "Smart Band Fitness Tracker",
    slug: "smart-band-fitness-tracker",
    category: "Electronics & Gadgets",
    brand: brandLine("Fit"),
    shortDescription: "1.47-inch AMOLED fitness band with heart-rate and sleep tracking.",
    description:
      "Track steps, heart rate, sleep, and 100+ workout modes on a bright AMOLED display. Notifications, weather, and a 10-day battery make it the everyday companion you forget you're wearing. 5ATM water resistance, magnetic charging.",
    price: 3400,
    costPrice: 2450,
    sku: "SNG-EG-5002",
    stock: 40,
    soldCount: 280,
    seoTitle: withStore("AMOLED Smart Band Fitness Tracker"),
    images: [{ seed: "band-1", alt: "AMOLED smart band on wrist" }],
  },
  {
    name: "Bamboo Wireless Charger",
    slug: "bamboo-wireless-charger",
    category: "Electronics & Gadgets",
    brand: brandLine("Tech"),
    shortDescription: "15W fast wireless charging pad with a real bamboo surface.",
    description:
      "A fast 15W Qi wireless pad topped with genuine bamboo — charging that doesn't look like tech clutter. LED indicator shows charging status without glaring at night. Works with iPhones, Androids, and open-ear buds.",
    price: 2100,
    costPrice: 1400,
    sku: "SNG-EG-5003",
    stock: 35,
    soldCount: 95,
    seoTitle: withStore("15W Bamboo Wireless Charging Pad"),
    images: [
      { seed: "charger-1", alt: "Bamboo wireless charging pad" },
      { seed: "charger-2", alt: "Wireless charger with phone" },
    ],
  },
  {
    name: "Portable Bluetooth Speaker",
    slug: "portable-bluetooth-speaker",
    category: "Electronics & Gadgets",
    brand: brandLine("Audio"),
    shortDescription: "Compact rugged speaker with 20-hour playtime and deep bass.",
    description:
      "Big sound from a palm-sized speaker. Dual passive radiators deliver surprising bass, the IP67 build shrugs off beach sand and rain, and 20 hours of playtime outlasts any adda. Connect two for true stereo.",
    price: 4300,
    compareAtPrice: 5200,
    costPrice: 3000,
    sku: "SNG-EG-5004",
    stock: 30,
    soldCount: 170,
    seoTitle: withStore("Portable Rugged Bluetooth Speaker"),
    images: [{ seed: "speaker-1", alt: "Portable rugged bluetooth speaker" }],
  },
];

async function main() {
  console.log(`🌱 Seeding ${STORE_NAME}...`);

  // Clean slate (order matters for FK constraints)
  await prisma.review.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.orderTimelineEvent.deleteMany();
  await prisma.order.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.inventoryTransaction.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.newsletterSubscriber.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.address.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  console.log("Cleared existing data");

  // Users
  const adminPassword = await bcrypt.hash(
    process.env.ADMIN_PASSWORD ?? "change-this-password",
    12
  );
  const demoPassword = await bcrypt.hash("customer-123456", 12);

  const admin = await prisma.user.create({
    data: {
      name: `${STORE_NAME} Admin`,
      email: process.env.ADMIN_EMAIL ?? "admin@example.com",
      phone: "+8801711000000",
      passwordHash: adminPassword,
      role: "ADMIN",
      emailVerified: now,
    },
  });

  const customer = await prisma.user.create({
    data: {
      name: "Rahim Uddin",
      email: "customer@example.com",
      phone: "+8801812345678",
      passwordHash: demoPassword,
      role: "CUSTOMER",
      emailVerified: daysAgo(40),
    },
  });

  const reviewer = await prisma.user.create({
    data: {
      name: "Preeti Rahman",
      email: "preeti@example.com",
      phone: "+8801611122334",
      passwordHash: demoPassword,
      role: "CUSTOMER",
      emailVerified: daysAgo(75),
    },
  });

  await prisma.address.create({
    data: {
      userId: customer.id,
      name: "Rahim Uddin",
      phone: "+8801812345678",
      division: "Dhaka",
      district: "Dhaka",
      area: "Dhanmondi",
      addressLine: "House 12, Road 5, Dhanmondi",
      postalCode: "1205",
      isDefault: true,
    },
  });

  await prisma.address.create({
    data: {
      userId: customer.id,
      name: "Rahim Uddin",
      phone: "+8801812345678",
      division: "Chattogram",
      district: "Cox's Bazar",
      area: "Kolatali",
      addressLine: "Beach Road, Kolatali",
      isDefault: false,
    },
  });

  console.log("Seeded users + addresses");

  // Categories
  const categoryNames = [
    "Women's Fashion",
    "Men's Fashion",
    "Home & Living",
    "Beauty & Care",
    "Electronics & Gadgets",
  ];
  const categoryMap = new Map<string, string>();
  for (const name of categoryNames) {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description:
          name === "Women's Fashion"
            ? "Sarees, kurtas, and everyday essentials crafted for the modern Bangladeshi woman."
            : name === "Men's Fashion"
              ? "Panjabis, shirts, and staples made for comfort and confidence."
              : name === "Home & Living"
                ? "Warm, considered pieces to make every corner of your home feel like home."
                : name === "Beauty & Care"
                  ? "Clean, kind-to-skin beauty made in small batches."
                  : "Everyday tech that earns its place — quiet, useful, and well-designed.",
        image: img(slug),
        sortOrder: categoryNames.indexOf(name),
      },
    });
    categoryMap.set(name, category.id);
  }
  console.log("Seeded categories");

  // Coupons
  const coupons = [
    {
      code: "WELCOME10",
      type: "PERCENTAGE" as const,
      value: 10,
      minimumOrder: 2000,
      maximumDiscount: 500,
      isActive: true,
      expiresAt: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
    },
    {
      code: "SNG50",
      type: "FIXED" as const,
      value: 50,
      minimumOrder: 0,
      isActive: true,
      expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    },
    {
      code: "EID30",
      type: "PERCENTAGE" as const,
      value: 30,
      minimumOrder: 5000,
      maximumDiscount: 1200,
      usageLimit: 200,
      isActive: true,
      startsAt: daysAgo(1),
      expiresAt: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
    },
  ];
  for (const coupon of coupons) {
    await prisma.coupon.create({ data: coupon });
  }
  console.log("Seeded coupons");

  // Products (with images, variants, reviews)
  // Track product ids to build a demo order afterwards.
  const productIdsByName = new Map<string, string>();
  const soldItems: { productId: string; variantId?: string; qty: number }[] = [];

  for (const p of products) {
    const categoryId = categoryMap.get(p.category);
    const created = await prisma.product.create({
      data: {
        name: p.name,
        slug: p.slug,
        shortDescription: p.shortDescription,
        description: p.description,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        costPrice: p.costPrice,
        sku: p.sku,
        stock: p.stock,
        categoryId,
        brand: p.brand,
        featured: p.featured ?? false,
        published: true,
        status: "ACTIVE",
        seoTitle: p.seoTitle,
        seoDescription: p.seoDescription,
        soldCount: p.soldCount,
        createdAt: daysAgo(60 - (p.soldCount % 50)),
        images: {
          create: p.images.map((im, idx) => ({
            url: img(im.seed),
            alt: im.alt,
            sortOrder: idx,
          })),
        },
        variants: p.variants
          ? {
              create: p.variants.map((v) => ({
                name: v.name,
                sku: v.sku,
                price: v.price,
                stock: v.stock,
                attributes: v.attributes,
              })),
            }
          : undefined,
      },
      include: { variants: true },
    });
    productIdsByName.set(p.name, created.id);

    // Inventory history for a few products
    if (p.soldCount > 200) {
      await prisma.inventoryTransaction.create({
        data: {
          productId: created.id,
          quantityChange: p.stock,
          reason: "RESTOCK",
          note: "Initial seed stock",
        },
      });
    }

    // Reviews (a user may review a product only once — alternate reviewers)
    const usedReviewers = new Set<string>();
    if (p.reviews) {
      for (const r of p.reviews) {
        const reviewerId = usedReviewers.has(customer.id) ? reviewer.id : customer.id;
        if (usedReviewers.has(reviewerId)) continue;
        usedReviewers.add(reviewerId);
        await prisma.review.create({
          data: {
            userId: reviewerId,
            productId: created.id,
            rating: r.rating,
            title: r.title,
            comment: r.comment,
            isApproved: true,
            createdAt: daysAgo(r.daysAgo),
          },
        });
      }
    }

    // A couple of sold items for the demo order
    soldItems.push({
      productId: created.id,
      qty: 1 + (p.soldCount % 3),
    });
  }
  console.log(`Seeded ${products.length} products`);

  // Demo orders for the customer (delivered) → makes reviews "verified purchase"
  const deliveredItems = soldItems.slice(0, 6);
  const subtotal = deliveredItems.reduce(
    (sum, item) =>
      sum +
      (products.find((p) => productIdsByName.get(p.name) === item.productId)?.price ??
        0) *
        item.qty,
    0
  );

  const order1 = await prisma.order.create({
    data: {
      orderNumber: "SNG-20260915-0001",
      userId: customer.id,
      status: "DELIVERED",
      paymentStatus: "PAID",
      paymentMethod: "CASH_ON_DELIVERY",
      subtotal,
      discount: 0,
      deliveryFee: 60,
      total: subtotal + 60,
      couponCode: null,
      customerName: "Rahim Uddin",
      customerPhone: "+8801812345678",
      customerEmail: "customer@example.com",
      shippingAddress: {
        name: "Rahim Uddin",
        phone: "+8801812345678",
        division: "Dhaka",
        district: "Dhaka",
        area: "Dhanmondi",
        addressLine: "House 12, Road 5, Dhanmondi",
      },
      notes: "Please call before delivery.",
      createdAt: daysAgo(25),
      items: {
        create: deliveredItems.map((item) => {
          const product = products.find(
            (p) => productIdsByName.get(p.name) === item.productId
          )!;
          return {
            productId: item.productId,
            variantId: null,
            productName: product.name,
            sku: product.sku,
            quantity: item.qty,
            price: product.price,
            total: product.price * item.qty,
          };
        }),
      },
      timeline: {
        create: [
          { status: "PENDING", note: "Order placed", createdAt: daysAgo(25) },
          { status: "CONFIRMED", note: "Payment verified", createdAt: daysAgo(24) },
          { status: "PROCESSING", note: "Packed at warehouse", createdAt: daysAgo(23) },
          { status: "SHIPPED", note: "Handed to courier", createdAt: daysAgo(22) },
          {
            status: "DELIVERED",
            note: "Delivered, payment collected",
            createdAt: daysAgo(20),
          },
        ],
      },
    },
  });
  void order1;

  const order2 = await prisma.order.create({
    data: {
      orderNumber: "SNG-20260918-0002",
      userId: customer.id,
      status: "SHIPPED",
      paymentStatus: "PAID",
      paymentMethod: "CASH_ON_DELIVERY",
      subtotal: 3400,
      discount: 0,
      deliveryFee: 60,
      total: 3460,
      customerName: "Rahim Uddin",
      customerPhone: "+8801812345678",
      customerEmail: "customer@example.com",
      shippingAddress: {
        name: "Rahim Uddin",
        phone: "+8801812345678",
        division: "Dhaka",
        district: "Dhaka",
        area: "Dhanmondi",
        addressLine: "House 12, Road 5, Dhanmondi",
      },
      createdAt: daysAgo(4),
      items: {
        create: [
          {
            productName: "Floral Anarkali Kurta",
            sku: "SNG-WF-1003",
            quantity: 1,
            price: 3400,
            total: 3400,
          },
        ],
      },
      timeline: {
        create: [
          { status: "PENDING", note: "Order placed", createdAt: daysAgo(4) },
          { status: "CONFIRMED", note: "Order confirmed", createdAt: daysAgo(3) },
          { status: "SHIPPED", note: "Handed to courier", createdAt: daysAgo(1) },
        ],
      },
    },
  });
  void order2;

  // A cart for the demo customer + wishlist items
  const cart = await prisma.cart.create({
    data: { userId: customer.id },
  });
  const wishlistProducts = [
    "Emerald Silk Saree",
    "Wireless Earbuds Pro",
    "Ceramic Dinner Set — 16 pc",
  ];
  for (const name of wishlistProducts) {
    const id = productIdsByName.get(name);
    if (id) {
      await prisma.wishlistItem.create({
        data: { userId: customer.id, productId: id },
      });
    }
  }
  await prisma.cartItem.create({
    data: {
      cartId: cart.id,
      productId: productIdsByName.get("Vitamin C Night Serum")!,
      quantity: 2,
      price: 1450,
    },
  });
  const emerald = productIdsByName.get("Emerald Silk Saree")!;
  const emeraldVariant = await prisma.productVariant.findFirst({
    where: { productId: emerald, sku: "SNG-WF-1001-B" },
  });
  await prisma.cartItem.create({
    data: {
      cartId: cart.id,
      productId: emerald,
      variantId: emeraldVariant?.id,
      quantity: 1,
      price: emeraldVariant?.price ?? 8500,
    },
  });
  console.log("Seeded cart + wishlist");

  // Settings
  const settings = [
    { key: "store.name", value: STORE_NAME },
    { key: "store.currency", value: "BDT" },
    { key: "shipping.standardFee", value: "60" },
    { key: "shipping.expressFee", value: "120" },
    { key: "shipping.freeShippingThreshold", value: "3000" },
    { key: "shipping.zones", value: JSON.stringify(["Dhaka", "Outside Dhaka"]) },
  ];
  for (const s of settings) {
    await prisma.setting.create({ data: s });
  }

  // Newsletter
  await prisma.newsletterSubscriber.createMany({
    data: [
      { email: "reader1@example.com", createdAt: daysAgo(12) },
      { email: "reader2@example.com", createdAt: daysAgo(8) },
      { email: "reader3@example.com", createdAt: daysAgo(2) },
    ],
  });

  console.log("✅ Seed complete");
  console.log(
    `  Admin:    ${admin.email} / ${process.env.ADMIN_PASSWORD ?? "change-this-password"}`
  );
  console.log(`  Customer: ${customer.email} / customer-123456`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
