export type ProductCategory = 
  | "all" 
  | "hoodies" 
  | "jackets" 
  | "pants" 
  | "t-shirts" 
  | "footwear" 
  | "accessories";

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
  name: string;
  subtitle: string;
  category: ProductCategory;
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
  weightGsm?: number;
  isNew?: boolean;
  isLimited?: boolean;
  editionCount?: number;
  stock_quantity?: number;
  cost_price?: number;
  threeDType?: "hoodie" | "sneaker" | "jacket" | "mannequin";
  hotspots?: ProductHotspot[];
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
