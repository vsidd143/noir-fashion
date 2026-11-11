import { Product, ProductHotspot } from "@/types/fashion";

export const HOODIE_HOTSPOTS: ProductHotspot[] = [
  {
    id: "fabric",
    position: [0, 0.4, 0.45],
    title: "480 GSM French Terry",
    description: "Custom spun double-faced organic loopback cotton, brushed for an ultra-soft drape.",
    detail: "Crafted from sustainably sourced 100% organic cotton with custom high-density weave.",
  },
  {
    id: "hardware",
    position: [0.35, -0.1, 0.35],
    title: "Titanium Eyelets & Aglets",
    description: "Durable matte-black metal hardware with scratch-resistant gunmetal finish.",
    detail: "Laser-etched with unique serialized edition number on each cord tip.",
  },
  {
    id: "hood",
    position: [0, 1.05, -0.1],
    title: "Architectural Double Hood",
    description: "Structured double-layer contour hood engineered to maintain shape even unfastened.",
    detail: "Thermal barrier interior lining tested at -10°C windchill.",
  },
  {
    id: "cuff",
    position: [-0.85, -0.7, 0.15],
    title: "Ribbed Drop Hem",
    description: "Double-reinforced 2x2 elastane-infused ribbing resisting stretching over 500+ washes.",
    detail: "Seamless construction eliminates friction at wrists and waistline.",
  },
];

export const SNEAKER_HOTSPOTS: ProductHotspot[] = [
  {
    id: "sole",
    position: [0, -0.45, 0.2],
    title: "Nitrogen Void Sole",
    description: "3D printed lattice midsole with supercritical nitrogen foam dampening.",
    detail: "Returns 84% kinetic energy return per stride with architectural stance.",
  },
  {
    id: "upper",
    position: [0.3, 0.2, -0.1],
    title: "Cordura® Ballistic Mesh",
    description: "Abrasion-resistant breathable technical mesh fused with premium nubuck overlays.",
    detail: "Hydrophobic nanocoating sheds water, slush, and urban grime instantly.",
  },
  {
    id: "heel",
    position: [-0.65, 0.3, 0],
    title: "Exoskeleton Heel Counter",
    description: "Carbon-fiber infused thermoplastic heel clip providing lateral lock-in.",
    detail: "Integrated reflective 3M obsidian pull tab for low-light visibility.",
  },
];

export const JACKET_HOTSPOTS: ProductHotspot[] = [
  {
    id: "shell",
    position: [0, 0.3, 0.5],
    title: "Tri-Layer GORE Membrane",
    description: "Waterproof and windproof breathable membrane with sealed seams.",
    detail: "Fully taped seams with ultrasonic welded stress joints.",
  },
  {
    id: "zipper",
    position: [0.05, -0.2, 0.52],
    title: "YKK Aquaguard® Two-Way",
    description: "Matte polyurethane coated water-sealed zipper with articulated storm flap.",
    detail: "Allows ergonomic ventilation and modular gear access on the move.",
  },
  {
    id: "modular",
    position: [-0.65, 0.1, 0.3],
    title: "Modular Utility Harness",
    description: "Removable magnetic Fidlock® chest sling system for hands-free carry.",
    detail: "German engineered magnetic latch disengages with a single flick.",
  },
];

// =====================================================================
// OPTION B: EMPTY ACTIVE CATALOG
// All products are dynamically created, edited, and managed via the Admin Panel & Supabase.
// Zero demo products are hardcoded.
// =====================================================================
export const PRODUCTS: Product[] = [];

export const LOOKBOOK_CHAPTERS = [
  {
    number: "01",
    title: "THE MONOCHROME MANIFESTO",
    subtitle: "Form Follows Pure Attitude",
    description: "We strip away clutter to reveal clean structure. Black is not the absence of color—it is timeless confidence, tailored for the modern urban landscape.",
    quote: "NOT JUST CLOTHING. IT'S AN ATTITUDE.",
    image: "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&w=1400&q=85",
    coords: "19.0760° N, 72.8777° E // MUMBAI ATELIER",
  },
  {
    number: "02",
    title: "ARCHITECTURAL PROPORTION",
    subtitle: "Sculpted Volume & Clean Fit",
    description: "Our product focus on modern relaxed fits, dropped shoulders, and extended sleeves to give every garment clean lines and complete ease of movement.",
    quote: "WE DON'T FOLLOW SEASONS. WE CREATE TIMELESS CLASSICS.",
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1400&q=85",
    coords: "28.6139° N, 77.2090° E // DELHI STUDIO",
  },
  {
    number: "03",
    title: "SYNTHESIS: CRAFT & DURABILITY",
    subtitle: "Weatherproof Finishes x Premium Weaves",
    description: "We source the finest organic cotton fibers and combine them with weather-resistant finishes. The result is clothing that breathes naturally and keeps you comfortable across changing climates.",
    quote: "BEYOND FASHION. BEYOND ORDINARY.",
    image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1400&q=85",
    coords: "12.9716° N, 77.5946° E // BENGALURU VAULT",
  },
];
