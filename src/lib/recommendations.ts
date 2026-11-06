import { Product } from "@/types/fashion";

// Matching rules for "Complete The Look" outfit styling
const COMPLEMENTARY_CATEGORIES: Record<string, string[]> = {
  hoodies: ["pants", "footwear", "accessories", "t-shirts"],
  jackets: ["pants", "footwear", "hoodies", "accessories"],
  pants: ["hoodies", "t-shirts", "footwear", "jackets"],
  "t-shirts": ["pants", "jackets", "accessories", "footwear"],
  footwear: ["pants", "hoodies", "jackets", "accessories"],
  accessories: ["hoodies", "jackets", "t-shirts", "pants"],
};

/**
 * Calculates a match score between the active product and candidate products
 * based on category, color palette, style tags, and price tier.
 */
function calculateMatchScore(base: Product, candidate: Product): number {
  if (base.id === candidate.id) return -1;
  let score = 0;

  // 1. Same category bonus
  if (base.category === candidate.category) {
    score += 40;
  }

  // 2. Shared tags bonus
  const baseTags = new Set(
    (base.description + " " + base.subtitle + " " + base.material)
      .toLowerCase()
      .split(/\s+/)
  );
  const candidateTags = (candidate.description + " " + candidate.subtitle + " " + candidate.material)
    .toLowerCase()
    .split(/\s+/);

  for (const tag of candidateTags) {
    if (tag.length > 3 && baseTags.has(tag)) {
      score += 5;
    }
  }

  // 3. Harmonious color palette bonus
  const baseHexes = new Set(base.colors.map((c) => c.hex.toLowerCase()));
  for (const color of candidate.colors) {
    if (baseHexes.has(color.hex.toLowerCase())) {
      score += 15;
    }
  }

  // 4. Price bracket proximity (within 35%)
  const priceDiffRatio = Math.abs(base.price - candidate.price) / base.price;
  if (priceDiffRatio < 0.35) {
    score += 15;
  }

  // 5. High rating / popular bonus
  score += candidate.rating * 3;

  return score;
}

/**
 * 1. Related Products: Same or directly adjacent category with similar style
 */
export function getRelatedProducts(baseProduct: Product, allProducts: Product[], limit = 4): Product[] {
  return allProducts
    .filter((p) => p.id !== baseProduct.id && p.category === baseProduct.category)
    .sort((a, b) => calculateMatchScore(baseProduct, b) - calculateMatchScore(baseProduct, a))
    .slice(0, limit);
}

/**
 * 2. You May Also Like: Similar price bracket and aesthetic tags
 */
export function getYouMayAlsoLike(baseProduct: Product, allProducts: Product[], limit = 4): Product[] {
  return allProducts
    .filter((p) => p.id !== baseProduct.id)
    .sort((a, b) => calculateMatchScore(baseProduct, b) - calculateMatchScore(baseProduct, a))
    .slice(0, limit);
}

/**
 * 3. Frequently Bought Together: Complementary high-frequency pairings
 */
export function getFrequentlyBoughtTogether(baseProduct: Product, allProducts: Product[], limit = 3): Product[] {
  const complementCategories = COMPLEMENTARY_CATEGORIES[baseProduct.category] || [];
  return allProducts
    .filter((p) => p.id !== baseProduct.id && complementCategories.includes(p.category))
    .sort((a, b) => (b.reviewsCount || 0) - (a.reviewsCount || 0))
    .slice(0, limit);
}

/**
 * 4. Complete The Look: Curated full outfit pairing (Top + Bottom + Shoe + Accessory)
 */
export function getCompleteTheLook(baseProduct: Product, allProducts: Product[]): Product[] {
  const targetCategories = COMPLEMENTARY_CATEGORIES[baseProduct.category] || [];
  const outfit: Product[] = [];

  for (const cat of targetCategories) {
    const matchingItem = allProducts.find(
      (p) =>
        p.id !== baseProduct.id &&
        p.category === cat &&
        !outfit.some((o) => o.id === p.id)
    );
    if (matchingItem && outfit.length < 3) {
      outfit.push(matchingItem);
    }
  }

  return outfit;
}

/**
 * 5. Trending Products: Top rated and recently dropped products
 */
export function getTrendingProducts(allProducts: Product[], limit = 4): Product[] {
  return [...allProducts]
    .sort((a, b) => (b.rating * b.reviewsCount) - (a.rating * a.reviewsCount))
    .slice(0, limit);
}

/**
 * 6. Customers Also Viewed: Collaborative filtering approximation based on popularity
 */
export function getCustomersAlsoViewed(baseProduct: Product, allProducts: Product[], limit = 4): Product[] {
  return allProducts
    .filter((p) => p.id !== baseProduct.id)
    .sort((a, b) => b.reviewsCount - a.reviewsCount)
    .slice(0, limit);
}
