export interface Division {
  name: string;
  nameBn: string;
  districts: string[];
}

export const BANGLADESH_DIVISIONS: Division[] = [
  {
    name: "Dhaka",
    nameBn: "ঢাকা",
    districts: [
      "Dhaka",
      "Gazipur",
      "Narayanganj",
      "Tangail",
      "Manikganj",
      "Munshiganj",
      "Narsingdi",
      "Kishoreganj",
      "Faridpur",
      "Gopalganj",
      "Madaripur",
      "Rajbari",
      "Shariatpur",
    ],
  },
  {
    name: "Chattogram",
    nameBn: "চট্টগ্রাম",
    districts: [
      "Chattogram",
      "Cox's Bazar",
      "Comilla",
      "Noakhali",
      "Feni",
      "Brahmanbaria",
      "Chandpur",
      "Lakshmipur",
      "Khagrachhari",
      "Rangamati",
      "Bandarban",
    ],
  },
  {
    name: "Rajshahi",
    nameBn: "রাজশাহী",
    districts: [
      "Rajshahi",
      "Bogra",
      "Pabna",
      "Sirajganj",
      "Natore",
      "Joypurhat",
      "Naogaon",
      "Chapainawabganj",
    ],
  },
  {
    name: "Khulna",
    nameBn: "খুলনা",
    districts: [
      "Khulna",
      "Bagerhat",
      "Satkhira",
      "Jashore",
      "Kushtia",
      "Meherpur",
      "Chuadanga",
      "Jhenaidah",
      "Magura",
      "Narail",
    ],
  },
  {
    name: "Barishal",
    nameBn: "বরিশাল",
    districts: ["Barishal", "Bhola", "Patuakhali", "Pirojpur", "Barguna", "Jhalokati"],
  },
  {
    name: "Sylhet",
    nameBn: "সিলেট",
    districts: ["Sylhet", "Moulvibazar", "Habiganj", "Sunamganj"],
  },
  {
    name: "Rangpur",
    nameBn: "রংপুর",
    districts: [
      "Rangpur",
      "Dinajpur",
      "Kurigram",
      "Gaibandha",
      "Nilphamari",
      "Lalmonirhat",
      "Panchagarh",
      "Thakurgaon",
    ],
  },
  {
    name: "Mymensingh",
    nameBn: "ময়মনসিংহ",
    districts: ["Mymensingh", "Jamalpur", "Sherpur", "Netrokona"],
  },
];

export function getDistricts(division: string): string[] {
  return (
    BANGLADESH_DIVISIONS.find((d) => d.name.toLowerCase() === division.toLowerCase())
      ?.districts ?? []
  );
}

export const AREA_SUGGESTIONS: Record<string, string[]> = {
  Dhaka: [
    "Mirpur",
    "Dhanmondi",
    "Banani",
    "Gulshan",
    "Uttara",
    "Motijheel",
    "Mohammadpur",
    "Bashundhara",
    "Khilgaon",
    "Badda",
    "Tejgaon",
    "Shyamoli",
  ],
  Chattogram: ["GEC Circle", "Agrabad", "Nasirabad", "Pahartali", "Halishahar"],
  Sylhet: ["Zindabazar", "Ambarkhana", "Uposhohor", "Khadimnagar"],
  Rajshahi: ["Shaheb Bazar", "Uposhohor", "Binodpur"],
  Khulna: ["Sonadanga", "Khalishpur", "Boyra"],
  Gazipur: ["Tongi", "Sreepur", "Kaliganj"],
  Narayanganj: ["Chashara", "Bandar", "Siddhirganj"],
  Cumilla: ["Kandirpar", "Shashon Gachha", "Tomsom Bridge"],
  Bogra: ["Jaleshwaritola", "Gokul", "Shibganj"],
  Mymensingh: ["Town Hall", "Charpara", "Kachijhuli"],
  Rangpur: ["Jahaj Company", "Shapla Chattar", "Dhap"],
};

export function getAreaSuggestions(district: string): string[] {
  return AREA_SUGGESTIONS[district] ?? [];
}

export const DELIVERY_METHODS = [
  {
    id: "standard",
    label: "Standard Delivery",
    labelBn: "স্ট্যান্ডার্ড ডেলিভারি",
    description: "3–5 working days across Bangladesh",
    fee: 60,
  },
  {
    id: "express",
    label: "Express Delivery",
    labelBn: "এক্সপ্রেস ডেলিভারি",
    description: "1–2 working days (Dhaka: same/next day)",
    fee: 120,
  },
] as const;
