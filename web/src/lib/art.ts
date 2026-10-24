import { BODIES, type Body, type Kind, type Rank } from "../../../shared/catalog";

// Vector illustrations of each kind of item, coloured for its order.
// They stand in for product photography until real photos are added.

const LEATHER = "#FBFBF8";
const SHADE = "#E6E8EA";

function lace(rank: Rank, trim: string) {
  return rank === "provincial" || rank === "grand" ? "#B48A3C" : trim;
}

function apron(c: string, t: string, rank: Rank, degree = "mm") {
  const l = lace(rank, t);
  if (degree === "ea" || degree === "fc") {
    const ros = degree === "fc" ? [70, 130].map((x) => `<circle cx="${x}" cy="140" r="10" fill="${c}"/><circle cx="${x}" cy="140" r="3.5" fill="#fff"/>`).join("") : "";
    return `<path d="M8 50 q6 -4 12 0 h160 q6 -4 12 0" fill="none" stroke="#C9CFD6" stroke-width="3"/>
  <rect x="40" y="54" width="120" height="120" rx="3" fill="${LEATHER}" stroke="#C9CFD6" stroke-width="2"/>
  <path d="M40 55 L160 55 L100 92 Z" fill="${LEATHER}" stroke="#C9CFD6" stroke-width="2"/>${ros}`;
  }
  const senior = rank !== "member" && rank !== "officer";
  const rosettes = !senior
    ? [70, 130].map((x) => `<circle cx="${x}" cy="140" r="10" fill="${c}"/><circle cx="${x}" cy="140" r="10" fill="none" stroke="${l}" stroke-width="1.5" stroke-dasharray="2 2"/><circle cx="${x}" cy="140" r="3.5" fill="${l}"/>`).join("")
    : "";
  const levels =
    rank === "master" || rank === "past-master"
      ? `<g stroke="${l}" stroke-width="4" fill="none" stroke-linecap="round"><path d="M70 126v22h18M130 126v22h-18M93 132v16M107 132v16"/></g>`
      : "";
  const badge =
    rank === "provincial" || rank === "grand"
      ? `<circle cx="100" cy="136" r="19" fill="${c}"/><circle cx="100" cy="136" r="19" fill="none" stroke="${l}" stroke-width="3"/><path d="M100 124 l-8 18 M100 124 l8 18 M90 136 h20" stroke="${l}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`
      : "";
  const tassel = (x: number) =>
    `<rect x="${x - 1.5}" y="66" width="3" height="54" fill="${l}"/>
     <path d="M${x - 5} 120 h10 l2 18 h-14z" fill="${l}"/>
     <path d="M${x - 5} 138 v6 M${x - 2} 138 v7 M${x + 1} 138 v7 M${x + 4} 138 v6" stroke="${l}" stroke-width="1.2"/>`;
  return `
  <path d="M8 50 q6 -4 12 0 h160 q6 -4 12 0" fill="none" stroke="${c}" stroke-width="3"/>
  <rect x="38" y="48" width="124" height="8" rx="2" fill="${c}"/>
  <rect x="40" y="54" width="120" height="120" rx="3" fill="${LEATHER}" stroke="${SHADE}"/>
  <rect x="45" y="59" width="110" height="110" rx="1" fill="none" stroke="${c}" stroke-width="9"/>
  <rect x="51" y="65" width="98" height="98" fill="none" stroke="${l}" stroke-width="1.5"/>
  ${tassel(58)}${tassel(142)}
  <path d="M40 55 L160 55 L100 92 Z" fill="${LEATHER}" stroke="${SHADE}"/>
  <path d="M44 57 L100 89 L156 57" fill="none" stroke="${c}" stroke-width="7" stroke-linejoin="round"/>
  <path d="M56 59 L100 84 L144 59" fill="none" stroke="${l}" stroke-width="1.2"/>
  <path d="M40 56 L100 93 L160 56" fill="none" stroke="#000" stroke-opacity=".06" stroke-width="3" transform="translate(0 2)"/>
  ${rosettes}${levels}${badge}`;
}

function collar(c: string, t: string, rank: Rank) {
  const l = lace(rank, t);
  return `
  <path d="M40 30 L100 150 L160 30" fill="none" stroke="${c}" stroke-width="26" stroke-linejoin="round"/>
  <path d="M40 30 L100 150 L160 30" fill="none" stroke="${l}" stroke-width="2" stroke-dasharray="0" transform="translate(0 -11)" opacity=".9"/>
  <path d="M40 30 L100 150 L160 30" fill="none" stroke="${l}" stroke-width="2" transform="translate(0 11)" opacity=".9"/>
  <circle cx="100" cy="168" r="14" fill="none" stroke="${l}" stroke-width="5"/>`;
}

function jewel(c: string, t: string, rank: Rank) {
  const metal = rank === "provincial" || rank === "grand" ? "#B48A3C" : "#AEB5BD";
  return `
  <rect x="88" y="20" width="24" height="40" fill="${c}"/>
  <circle cx="100" cy="66" r="6" fill="none" stroke="${metal}" stroke-width="3"/>
  <polygon points="100,74 150,104 150,152 100,182 50,152 50,104" fill="${metal}"/>
  <polygon points="100,88 136,110 136,146 100,168 64,146 64,110" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2"/>
  <path d="M100 100 L80 150 M100 100 L120 150 M78 134 h44" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none"/>`;
}

function gauntlets(c: string, t: string, rank: Rank) {
  const l = lace(rank, t);
  const one = (x: number) => `
    <path d="M${x} 50 h50 l8 110 h-66 z" fill="${c}"/>
    <path d="M${x} 50 h50 l8 110 h-66 z" fill="none" stroke="${l}" stroke-width="3"/>
    <circle cx="${x + 25}" cy="108" r="12" fill="none" stroke="${l}" stroke-width="3"/>`;
  return one(28) + one(114);
}

function book(c: string, t: string) {
  return `
  <rect x="52" y="26" width="104" height="150" rx="3" fill="${c}"/>
  <rect x="44" y="30" width="12" height="146" rx="2" fill="${c}" opacity=".75"/>
  <rect x="62" y="40" width="84" height="122" fill="none" stroke="${t}" stroke-width="1.5"/>
  <path d="M104 72 L88 112 M104 72 L120 112 M86 100 h36" stroke="${t}" stroke-width="3" fill="none" stroke-linecap="round"/>
  <rect x="78" y="128" width="52" height="3" fill="${t}"/><rect x="86" y="136" width="36" height="3" fill="${t}"/>
  <path d="M140 176 v18 l6 -5 l6 5 v-18" fill="#8E1B2A"/>`;
}

function ring() {
  return `
  <ellipse cx="100" cy="122" rx="56" ry="54" fill="none" stroke="#AEB5BD" stroke-width="14"/>
  <rect x="70" y="40" width="60" height="44" rx="10" fill="#AEB5BD"/>
  <rect x="78" y="48" width="44" height="28" rx="6" fill="#14284B"/>
  <path d="M100 52 L90 72 M100 52 L110 72 M88 66 h24" stroke="#B48A3C" stroke-width="3" fill="none" stroke-linecap="round"/>`;
}

function cufflinks(c: string) {
  const one = (x: number, y: number) => `
    <circle cx="${x}" cy="${y}" r="32" fill="#AEB5BD"/><circle cx="${x}" cy="${y}" r="25" fill="${c}"/>
    <path d="M${x} ${y - 14} L${x - 10} ${y + 8} M${x} ${y - 14} L${x + 10} ${y + 8} M${x - 12} ${y + 2} h24" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  return one(66, 86) + one(134, 118);
}

function pin(c: string) {
  return `<circle cx="100" cy="100" r="44" fill="${c}"/><circle cx="100" cy="100" r="44" fill="none" stroke="#B48A3C" stroke-width="5"/>
  <path d="M100 78 L86 118 M100 78 L114 118 M84 104 h32" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/>
  <rect x="96" y="144" width="8" height="26" fill="#AEB5BD"/>`;
}

function caseArt(c: string) {
  return `
  <rect x="26" y="58" width="148" height="104" rx="8" fill="${c}"/>
  <rect x="26" y="58" width="148" height="18" rx="6" fill="#000" opacity=".15"/>
  <path d="M80 58 v-14 h40 v14" fill="none" stroke="${c}" stroke-width="8"/>
  <rect x="88" y="100" width="24" height="16" rx="2" fill="#B9C0C7"/>`;
}

function gloves() {
  const g = (x: number) => `<path d="M${x} 170 v-70 l-6 -50 a6 6 0 0 1 12 -1 l6 40 v-50 a6 6 0 0 1 12 0 v46 v-52 a6 6 0 0 1 12 0 v52 v-44 a6 6 0 0 1 12 0 v60 l10 -18 a6 6 0 0 1 10 6 l-18 46 v35 z" fill="#fff" stroke="#C9CFD6" stroke-width="2"/>`;
  return g(36) + g(104);
}

function tie(c: string) {
  return `<path d="M86 22 h28 l-4 18 l22 120 l-32 26 l-32 -26 l22 -120 z" fill="${c}"/>
  <path d="M86 22 h28 l-4 18 h-20z" fill="#000" opacity=".15"/>
  <path d="M100 96 l-6 14 M100 96 l6 14 M93 106 h14" stroke="#B48A3C" stroke-width="2" fill="none"/>`;
}

function tankard() {
  return `<rect x="50" y="40" width="88" height="126" rx="6" fill="#AEB5BD"/>
  <path d="M138 70 h16 a14 14 0 0 1 14 14 v38 a14 14 0 0 1 -14 14 h-16" fill="none" stroke="#AEB5BD" stroke-width="12"/>
  <rect x="50" y="40" width="88" height="10" fill="#8C949C"/><rect x="50" y="156" width="88" height="10" fill="#8C949C"/>
  <path d="M94 84 L80 120 M94 84 L108 120 M78 108 h32" stroke="#14284B" stroke-width="3" fill="none" stroke-linecap="round"/>`;
}

export function artSvg(kind: Kind, body: Body, rank: Rank = "member", label = "", id = ""): string {
  const degree = /-ea-/.test(id) ? "ea" : /-fc-/.test(id) ? "fc" : "mm";
  const { colour: c, trim: t } = BODIES[body];
  let inner: string;
  switch (kind) {
    case "apron":
      inner = apron(c, t, rank, degree);
      break;
    case "set":
      inner = `<g transform="translate(-14 10) scale(.82)">${apron(c, t, rank)}</g><g transform="translate(80 8) scale(.55)">${collar(c, t, rank)}</g>`;
      break;
    case "collar":
      inner = collar(c, t, rank);
      break;
    case "jewel":
      inner = jewel(c, t, rank);
      break;
    case "gauntlets":
      inner = gauntlets(c, t, rank);
      break;
    case "ritual":
    case "book":
      inner = book(body === "general" ? "#14284B" : c, kind === "ritual" ? "#C9CFD6" : "#B48A3C");
      break;
    case "ring":
      inner = ring();
      break;
    case "cufflinks":
      inner = cufflinks(body === "general" ? "#7FA7D6" : c);
      break;
    case "pin":
      inner = pin(body === "general" ? "#14284B" : c);
      break;
    case "case":
      inner = caseArt("#26282B");
      break;
    case "gloves":
      inner = gloves();
      break;
    case "tie":
      inner = tie("#14284B");
      break;
    default:
      inner = tankard();
  }
  return `<svg viewBox="0 0 200 200" role="img" aria-label="${label.replace(/"/g, "")}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}
