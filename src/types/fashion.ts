export type ProductCategory = 
  | "all" 
  | "hoodies" 
  | "jackets" 
  | "pants" 
  | "t-shirts" 
  | "shirts"
  | "dresses"
  | "kurtis"
  | "footwear" 
  | "accessories"
  | "apparel"
  | (string & {});

export type ProductColor = {
  name: string;
  hex: string;
  bgClass: string;
};

export type ProductHotspot = {
  id: string;
  position: [number, number, number];
  title: string;
  description: string;
  detail: string;
};

export type Product = {
  id: string;
  dbId?: string;
  name: string;
  subtitle: string;
  category: ProductCategory;
  categoryId?: string;
  productType?: string;
  productTypeId?: string;
  price: number;
  originalPrice?: number;
  images: string[];
  thumbnail: string;
  colors: ProductColor[];
  sizes: string[];
  description: string;
  details: string[];
  material: string;
  fit: string;
  care?: string;
  weightGsm?: number;
  isNew?: boolean;
  isLimited?: boolean;
  editionCount?: number;
  stock_quantity?: number;
  cost_price?: number;
  threeDType?: "hoodie" | "sneaker" | "jacket" | "mannequin";
  hotspots?: ProductHotspot[];
  tags?: string[];
  department?: "men" | "women" | "kids" | "new-arrivals" | "unisex";
  gender?: "men" | "women" | "kids" | "unisex";
  sku?: string;
  brand?: string;
  is_published?: boolean;
  is_archived?: boolean;
  rating: number;
  reviewsCount: number;
};

export type CartItem = {
  product: Product;
  selectedColor: ProductColor;
  selectedSize: string;
  quantity: number;
};

export type StudioModelType = "hoodie" | "sneaker" | "jacket" | "mannequin";

export type StudioState = {
  modelType: StudioModelType;
  color: string;
  wireframe: boolean;
  activeHotspot: ProductHotspot | null;
  autoRotate: boolean;
};
