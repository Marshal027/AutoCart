export interface Item {
  id: string;
  name: string;
  price: number;
  image: string;
  desc: string;
  details: string;
  merchant?: string;
  rating?: number;
  deliveryEstimate?: string;
  url?: string;
  is_development_data?: boolean;
}

export interface CategoryTrack {
  id: string;
  title: string;
  icon: string;
  desc: string;
  search_queries?: string[];
  merchant_domain?: string;
  mcp_endpoint?: string;
  items: Item[];
}

export interface CartItem extends Item {
  quantity: number;
  categoryId?: string;
  categoryTitle?: string;
}

export function formatINR(amount: number): string {
  return "Γé╣" + amount.toLocaleString("en-IN");
}
