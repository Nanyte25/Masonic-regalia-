// Single source of truth for the catalogue. Imported by the storefront (display)
// and by the API (authoritative pricing at checkout). Prices are EUR cents,
// INCLUSIVE of Irish VAT at 23%. Sample data: replace with real stock and prices.

export type Constitution = "ireland" | "england" | "scotland" | "any";
export type Body =
  | "craft"
  | "royal-arch"
  | "knight-masons"
  | "prince-masons"
  | "preceptory"
  | "general";
export type Kind =
  | "apron"
  | "collar"
  | "jewel"
  | "gauntlets"
  | "set"
  | "case"
  | "gloves"
  | "ritual"
  | "book"
  | "ring"
  | "cufflinks"
  | "pin"
  | "tie"
  | "gift";
export type Rank =
  | "member"
  | "officer"
  | "master"
  | "past-master"
  | "provincial"
  | "grand"
  | "any";

export interface ProductOption {
  id: string;
  label: string;
  values: { id: string; label: string; priceDelta: number }[];
}

export interface Personalisation {
  id: "lodge" | "engraving" | "name";
  label: string;
  hint: string;
  maxLength: number;
  price: number; // cents, inc VAT
}

export interface Product {
  id: string;
  name: string;
  kind: Kind;
  body: Body;
  constitution: Constitution;
  rank: Rank;
  price: number; // EUR cents inc VAT
  summary: string;
  details: string[];
  options?: ProductOption[];
  personalise?: Personalisation[];
  leadTimeDays?: number; // made to order when set
  stock: number;
  featured?: boolean;
}

export const BODIES: Record<Body, { label: string; colour: string; trim: string; note: string }> = {
  craft: {
    label: "Craft lodge",
    colour: "#7FA7D6",
    trim: "#C9CFD6",
    note: "Entered Apprentice to Master, lodge officers and Past Masters.",
  },
  "royal-arch": {
    label: "Royal Arch chapter",
    colour: "#8E1B2A",
    trim: "#C9CFD6",
    note: "Royal Arch and Mark, worked in chapter under the Irish Constitution.",
  },
  "knight-masons": {
    label: "Knight Masons",
    colour: "#2F6B4F",
    trim: "#C9CFD6",
    note: "Council regalia in green.",
  },
  "prince-masons": {
    label: "Prince Masons",
    colour: "#6B1F3A",
    trim: "#B48A3C",
    note: "Rose Croix, known in Ireland as Prince Masons.",
  },
  preceptory: {
    label: "Preceptory",
    colour: "#26282B",
    trim: "#E9EAEA",
    note: "Knights Templar and Malta.",
  },
  general: {
    label: "General",
    colour: "#14284B",
    trim: "#B9C0C7",
    note: "Books, jewellery and accessories for every order.",
  },
};

export const RANKS: Record<Rank, string> = {
  member: "Member",
  officer: "Lodge officer",
  master: "Worshipful Master",
  "past-master": "Past Master",
  provincial: "Provincial rank",
  grand: "Grand rank",
  any: "Any rank",
};

export const KINDS: Record<Kind, string> = {
  apron: "Aprons",
  collar: "Collars",
  jewel: "Jewels",
  gauntlets: "Gauntlets",
  set: "Regalia sets",
  case: "Cases",
  gloves: "Gloves",
  ritual: "Ritual books",
  book: "Books",
  ring: "Rings",
  cufflinks: "Cufflinks",
  pin: "Lapel pins",
  tie: "Ties",
  gift: "Gifts",
};

export const CONSTITUTIONS: Record<Constitution, string> = {
  ireland: "Irish",
  england: "English",
  scotland: "Scottish",
  any: "All constitutions",
};

const lodgeBadge: Personalisation = {
  id: "lodge",
  label: "Lodge number embroidery",
  hint: "Lodge name and number, e.g. Lodge 42 Waterford",
  maxLength: 40,
  price: 2000,
};
const engraving: Personalisation = {
  id: "engraving",
  label: "Engraving",
  hint: "Up to 30 characters, e.g. initials and year of initiation",
  maxLength: 30,
  price: 1500,
};

const metal: ProductOption = {
  id: "metal",
  label: "Metal",
  values: [
    { id: "silver", label: "Silver plated (lodge officers)", priceDelta: 0 },
    { id: "gilt", label: "Gilt (Provincial and Grand officers)", priceDelta: 1200 },
  ],
};
const gloveSize: ProductOption = {
  id: "size",
  label: "Size",
  values: ["S", "M", "L", "XL", "XXL"].map((s) => ({ id: s.toLowerCase(), label: s, priceDelta: 0 })),
};
const ringSize: ProductOption = {
  id: "size",
  label: "Ring size",
  values: ["P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"].map((s) => ({
    id: s.toLowerCase(),
    label: s,
    priceDelta: 0,
  })),
};
const silverGold: ProductOption = {
  id: "metal",
  label: "Metal",
  values: [
    { id: "sterling", label: "Sterling silver", priceDelta: 0 },
    { id: "9ct", label: "9ct gold", priceDelta: 32000 },
  ],
};

export const PRODUCTS: Product[] = [
  // Irish Craft
  { id: "ie-craft-ea-apron", name: "Entered Apprentice apron", kind: "apron", body: "craft", constitution: "ireland", rank: "member", price: 2200, summary: "Plain white lambskin to Irish pattern.", details: ["White lambskin", "Cotton waistband with hook fastening", "Supplied in a protective sleeve"], stock: 40 },
  { id: "ie-craft-fc-apron", name: "Fellow Craft apron", kind: "apron", body: "craft", constitution: "ireland", rank: "member", price: 2600, summary: "White lambskin with light blue rosettes.", details: ["White lambskin", "Two light blue rosettes", "Hook fastening"], stock: 35 },
  { id: "ie-craft-mm-apron", name: "Master Mason apron", kind: "apron", body: "craft", constitution: "ireland", rank: "member", price: 4500, summary: "Light blue edging, silver lace and tassels.", details: ["White lambskin with light blue silk edging", "Silver lace and tassels", "Optional lodge number embroidery"], personalise: [lodgeBadge], stock: 30, featured: true },
  { id: "ie-craft-officer-collar", name: "Lodge officer collar", kind: "collar", body: "craft", constitution: "ireland", rank: "officer", price: 3800, summary: "Light blue ribbon collar with silver jewel loop.", details: ["Light blue ribbed silk", "Silver lace edging", "Jewel sold separately"], stock: 25 },
  { id: "ie-craft-wm-apron", name: "Worshipful Master apron", kind: "apron", body: "craft", constitution: "ireland", rank: "master", price: 7200, summary: "Master's levels in silver, light blue edging.", details: ["White lambskin", "Embroidered silver levels", "Silver lace and tassels"], personalise: [lodgeBadge], leadTimeDays: 21, stock: 10 },
  { id: "ie-craft-pm-apron", name: "Past Master apron", kind: "apron", body: "craft", constitution: "ireland", rank: "past-master", price: 6500, summary: "Past Master pattern with silver tassels.", details: ["White lambskin", "Light blue edging", "Silver tassels"], personalise: [lodgeBadge], leadTimeDays: 21, stock: 12, featured: true },
  { id: "ie-craft-officer-jewel", name: "Lodge officer collar jewel", kind: "jewel", body: "craft", constitution: "ireland", rank: "officer", price: 3200, summary: "Choose the office: Wardens, Deacons, Secretary, Treasurer and more.", details: ["Cast and polished", "Fits standard collar loop", "Silver for lodge officers under Irish law"], options: [{ id: "office", label: "Office", values: ["Senior Warden", "Junior Warden", "Senior Deacon", "Junior Deacon", "Secretary", "Treasurer", "Inner Guard", "Tyler", "Chaplain", "Director of Ceremonies"].map((o) => ({ id: o.toLowerCase().replace(/ /g, "-"), label: o, priceDelta: 0 })) }, metal], stock: 50 },
  { id: "ie-prov-apron", name: "Provincial Grand Officer apron", kind: "apron", body: "craft", constitution: "ireland", rank: "provincial", price: 8500, summary: "Provincial pattern, gold-coloured lace and tassels.", details: ["Made to your Province", "Gold-coloured lace and tassels", "Province name embroidered"], personalise: [{ id: "name", label: "Province", hint: "e.g. Province of South Munster", maxLength: 40, price: 0 }], leadTimeDays: 28, stock: 6 },
  { id: "ie-prov-collar", name: "Provincial collar", kind: "collar", body: "craft", constitution: "ireland", rank: "provincial", price: 5500, summary: "Provincial collar with gold-coloured lace.", details: ["Ribbed silk", "Gold-coloured lace edging"], leadTimeDays: 28, stock: 6 },
  { id: "ie-prov-gauntlets", name: "Provincial gauntlets", kind: "gauntlets", body: "craft", constitution: "ireland", rank: "provincial", price: 8200, summary: "Pair of embroidered gauntlet cuffs.", details: ["Embroidered emblem", "Gold-coloured lace"], leadTimeDays: 28, stock: 4 },
  { id: "ie-prov-set", name: "Provincial regalia set with case", kind: "set", body: "craft", constitution: "ireland", rank: "provincial", price: 27500, summary: "Apron, collar and gauntlets in a fitted case.", details: ["Provincial apron, collar and gauntlets", "Fitted hard case with lock", "Save on buying separately"], personalise: [{ id: "name", label: "Province", hint: "e.g. Province of Dublin", maxLength: 40, price: 0 }, { id: "engraving", label: "Case name plate", hint: "Your name for the case plate", maxLength: 30, price: 1500 }], leadTimeDays: 35, stock: 3, featured: true },
  { id: "ie-grand-apron", name: "Grand Officer apron", kind: "apron", body: "craft", constitution: "ireland", rank: "grand", price: 11500, summary: "Grand rank pattern, made to order.", details: ["Made to order", "Gold-coloured lace and tassels"], leadTimeDays: 42, stock: 2 },
  { id: "ie-grand-jewel", name: "Grand Officer jewel", kind: "jewel", body: "craft", constitution: "ireland", rank: "grand", price: 9500, summary: "Gilt jewel for Grand Officers, current and past.", details: ["Gilt finish", "Gold for Grand and Provincial officers under Irish law"], stock: 5 },

  // Irish Royal Arch (incl. Mark)
  { id: "ie-ra-companion-apron", name: "Royal Arch companion apron", kind: "apron", body: "royal-arch", constitution: "ireland", rank: "member", price: 5200, summary: "Crimson and blue edging to Irish chapter pattern.", details: ["White lambskin", "Crimson and blue edging", "Triple tau badge"], personalise: [lodgeBadge], stock: 18, featured: true },
  { id: "ie-ra-mark-apron", name: "Mark apron (Irish chapter)", kind: "apron", body: "royal-arch", constitution: "ireland", rank: "member", price: 4800, summary: "Mark degree as worked in Irish chapters.", details: ["White lambskin", "Crimson and blue edging"], stock: 14 },
  { id: "ie-ra-ek-apron", name: "Excellent King apron", kind: "apron", body: "royal-arch", constitution: "ireland", rank: "master", price: 7000, summary: "For Excellent Kings and Past Kings.", details: ["White lambskin", "Embroidered badge"], leadTimeDays: 21, stock: 6 },
  { id: "ie-ra-collar", name: "Chapter officer collar", kind: "collar", body: "royal-arch", constitution: "ireland", rank: "officer", price: 4200, summary: "Crimson ribbon collar.", details: ["Crimson ribbed silk"], stock: 12 },

  // Other Irish orders
  { id: "ie-km-apron", name: "Knight Mason apron", kind: "apron", body: "knight-masons", constitution: "ireland", rank: "member", price: 5500, summary: "Green edged, to council pattern.", details: ["Green silk edging", "Embroidered emblem"], leadTimeDays: 21, stock: 8 },
  { id: "ie-km-sash", name: "Knight Mason sash", kind: "collar", body: "knight-masons", constitution: "ireland", rank: "member", price: 4900, summary: "Green council sash.", details: ["Green ribbed silk"], stock: 8 },
  { id: "ie-pm-collar", name: "Prince Mason collar", kind: "collar", body: "prince-masons", constitution: "ireland", rank: "member", price: 6200, summary: "Crimson collar for Prince Masons (Rose Croix).", details: ["Crimson silk", "Embroidered emblems"], leadTimeDays: 28, stock: 5 },
  { id: "ie-kt-mantle-badge", name: "Preceptory tunic badge", kind: "jewel", body: "preceptory", constitution: "ireland", rank: "member", price: 3500, summary: "Embroidered cross badge.", details: ["Hand embroidered"], stock: 10 },
  { id: "ie-kt-gauntlets", name: "Preceptory gauntlets", kind: "gauntlets", body: "preceptory", constitution: "ireland", rank: "member", price: 6800, summary: "Black gauntlets with embroidered cross.", details: ["Pair", "Embroidered cross"], options: [gloveSize], stock: 6 },

  // English / Scottish
  { id: "en-craft-mm-apron", name: "Master Mason apron (English)", kind: "apron", body: "craft", constitution: "england", rank: "member", price: 4900, summary: "Sky blue edging, nickel tassels.", details: ["Leather", "Sky blue edging", "Three rosettes"], personalise: [lodgeBadge], stock: 20 },
  { id: "en-prov-undress-apron", name: "Provincial undress apron (English)", kind: "apron", body: "craft", constitution: "england", rank: "provincial", price: 9500, summary: "Garter blue, gold-coloured embroidery.", details: ["Made to your Province"], leadTimeDays: 28, stock: 4 },
  { id: "sc-craft-mm-apron", name: "Master Mason apron (Scottish)", kind: "apron", body: "craft", constitution: "scotland", rank: "member", price: 6200, summary: "Edged in your lodge colours.", details: ["Lodge colours to order", "Embroidered lodge name"], personalise: [lodgeBadge], leadTimeDays: 28, stock: 6 },

  // Accessories
  { id: "gloves-cotton", name: "White cotton gloves", kind: "gloves", body: "general", constitution: "any", rank: "any", price: 1100, summary: "Plain white cotton, wrist button.", details: ["100% cotton", "Wrist button"], options: [gloveSize], stock: 100 },
  { id: "case-apron", name: "Apron and collar case", kind: "case", body: "general", constitution: "any", rank: "any", price: 4900, summary: "Hard case for apron, collar and gloves.", details: ["Fits Irish and English aprons", "Lockable", "Fitted inner pockets"], personalise: [{ ...engraving, label: "Name plate" }], stock: 25, featured: true },
  { id: "case-wallet", name: "Collar and jewel wallet", kind: "case", body: "general", constitution: "any", rank: "any", price: 2900, summary: "Soft wallet for collars and jewels.", details: ["Zipped", "Jewel pocket"], stock: 30 },

  // Jewellery
  { id: "ring-sq-compass", name: "Square and compasses signet ring", kind: "ring", body: "general", constitution: "any", rank: "any", price: 18500, summary: "Hallmarked, engraved face.", details: ["Hallmarked", "Engraved face"], options: [ringSize, silverGold], personalise: [{ ...engraving, label: "Inside engraving" }], leadTimeDays: 14, stock: 8, featured: true },
  { id: "ring-ra", name: "Royal Arch triple tau ring", kind: "ring", body: "royal-arch", constitution: "any", rank: "any", price: 19500, summary: "Triple tau on enamel face.", details: ["Hallmarked", "Enamel face"], options: [ringSize, silverGold], personalise: [{ ...engraving, label: "Inside engraving" }], leadTimeDays: 14, stock: 5 },
  { id: "cufflinks-enamel", name: "Enamel cufflinks", kind: "cufflinks", body: "general", constitution: "any", rank: "any", price: 3500, summary: "Square and compasses, light blue enamel.", details: ["Rhodium plated", "Gift box"], stock: 40, featured: true },
  { id: "cufflinks-silver", name: "Sterling silver cufflinks", kind: "cufflinks", body: "general", constitution: "any", rank: "any", price: 8900, summary: "Engravable oval face.", details: ["Sterling silver", "Gift box"], personalise: [engraving], stock: 15 },
  { id: "pin-forget-me-not", name: "Forget-me-not lapel pin", kind: "pin", body: "general", constitution: "any", rank: "any", price: 900, summary: "Small enamel pin.", details: ["Butterfly clutch"], stock: 120 },
  { id: "pin-sq-compass", name: "Square and compasses lapel pin", kind: "pin", body: "general", constitution: "any", rank: "any", price: 800, summary: "Gilt and blue enamel.", details: ["Butterfly clutch"], stock: 150 },
  { id: "tie-craft", name: "Craft tie", kind: "tie", body: "general", constitution: "any", rank: "any", price: 2400, summary: "Navy silk with small emblem.", details: ["100% silk"], stock: 40 },

  // Books
  { id: "ritual-emulation", name: "Emulation ritual", kind: "ritual", body: "craft", constitution: "england", rank: "any", price: 1700, summary: "Standard English Craft working.", details: ["Pocket size", "Cloth bound", "Ribbon marker"], stock: 40, featured: true },
  { id: "ritual-taylors", name: "Taylor's Craft ritual", kind: "ritual", body: "craft", constitution: "england", rank: "any", price: 1600, summary: "Popular English Craft working.", details: ["Pocket size"], stock: 30 },
  { id: "ritual-ra-en", name: "Royal Arch ritual (English)", kind: "ritual", body: "royal-arch", constitution: "england", rank: "any", price: 1600, summary: "Pocket edition for chapter.", details: ["Pocket size", "Cloth bound"], stock: 30 },
  { id: "ritual-mark-en", name: "Mark ritual (English)", kind: "ritual", body: "royal-arch", constitution: "england", rank: "any", price: 900, summary: "Mark Master Masons working.", details: ["Pocket size"], stock: 30 },
  { id: "ritual-scottish", name: "Scottish Craft ritual", kind: "ritual", body: "craft", constitution: "scotland", rank: "any", price: 1700, summary: "Standard Scottish working.", details: ["Pocket size"], stock: 25 },
  { id: "book-laws", name: "Laws and Constitutions (Ireland)", kind: "book", body: "general", constitution: "ireland", rank: "any", price: 1500, summary: "Current edition.", details: ["Paperback"], stock: 30 },
  { id: "book-history-ie", name: "A history of Irish Freemasonry", kind: "book", body: "general", constitution: "ireland", rank: "any", price: 2900, summary: "From 1725 to the present day.", details: ["Hardback", "Illustrated"], stock: 20 },
  { id: "book-symbolism", name: "Symbolism of the Craft", kind: "book", body: "general", constitution: "any", rank: "any", price: 2200, summary: "A guide for new Master Masons.", details: ["Paperback"], stock: 25 },
  { id: "gift-tankard", name: "Engraved pewter tankard", kind: "gift", body: "general", constitution: "any", rank: "any", price: 4500, summary: "A gift for initiations and installations.", details: ["Pewter", "Glass base"], personalise: [engraving], stock: 20 },
];

export const productById = new Map(PRODUCTS.map((p) => [p.id, p]));
