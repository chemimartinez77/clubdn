// client/src/types/marketplace.ts

export type MarketplaceListingStatus = 'PUBLICADO' | 'RESERVADO' | 'VENDIDO';
export type MarketplaceOfferStatus = 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA' | 'CANCELADA' | 'CONTRAOFERTA';
export type MarketplaceCancellationRole = 'BUYER' | 'SELLER';
export type MarketplaceCategory =
  | 'JUEGOS_MESA'
  | 'ROL'
  | 'WARGAMES'
  | 'MINIATURAS'
  | 'ACCESORIOS'
  | 'MATERIAL_RELACIONADO';

export const CATEGORY_LABELS: Record<MarketplaceCategory, string> = {
  JUEGOS_MESA: 'Juegos de mesa',
  ROL: 'Rol',
  WARGAMES: 'Wargames',
  MINIATURAS: 'Miniaturas',
  ACCESORIOS: 'Accesorios',
  MATERIAL_RELACIONADO: 'Material relacionado',
};

export const CANCELLATION_REASONS = [
  'Me he arrepentido',
  'No me llega el presupuesto',
  'Ya lo conseguí por otro lado',
  'No localizo el artículo',
  'He decidido no venderlo',
  'El comprador no responde',
] as const;

export type CancellationReason = (typeof CANCELLATION_REASONS)[number];

export const STATUS_LABELS: Record<MarketplaceListingStatus, string> = {
  PUBLICADO: 'Publicado',
  RESERVADO: 'Reservado',
  VENDIDO: 'Vendido',
};

export const STATUS_COLORS: Record<MarketplaceListingStatus, string> = {
  PUBLICADO: 'text-green-600 bg-green-100',
  RESERVADO: 'text-yellow-600 bg-yellow-100',
  VENDIDO: 'text-gray-500 bg-gray-100',
};

export interface MarketplaceAuthor {
  id: string;
  name: string;
  profile?: { nick?: string | null; avatar?: string | null } | null;
}

export interface MarketplaceListing {
  id: string;
  title: string;
  description: string;
  category: MarketplaceCategory;
  price: number;
  status: MarketplaceListingStatus;
  images: string[];
  contactExtra: string | null;
  isArchived: boolean;
  isHidden: boolean;
  viewsCount: number;
  createdAt: string;
  updatedAt: string;
  author: MarketplaceAuthor;
}

export interface MarketplaceMessage {
  id: string;
  conversationId: string;
  body: string;
  createdAt: string;
  sender: { id: string; name: string };
}

export interface MarketplaceOffer {
  id: string;
  conversationId: string;
  amount: number;
  status: MarketplaceOfferStatus;
  createdAt: string;
  updatedAt: string;
  proposedBy: { id: string; name: string };
}

export interface MarketplaceConversationSummary {
  id: string;
  listingId: string;
  buyerId: string;
  createdAt: string;
  updatedAt: string;
  listing: {
    id: string;
    title: string;
    price: number;
    status: MarketplaceListingStatus;
    images: string[];
    isArchived: boolean;
    author: MarketplaceAuthor;
  };
  buyer: { id: string; name: string; profile?: { nick?: string | null; avatar?: string | null } | null };
  messages: MarketplaceMessage[];
  offers: MarketplaceOffer[];
  unreadCount: number;
}

export interface MarketplaceConversationDetail extends MarketplaceConversationSummary {
  messages: MarketplaceMessage[];
  offers: MarketplaceOffer[];
}

export interface MarketplaceListingsResponse {
  listings: MarketplaceListing[];
  pagination: {
    currentPage: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface MarketplaceFilters {
  q: string;
  category: string;
  minPrice: string;
  maxPrice: string;
  sortBy: 'createdAt' | 'price' | 'title';
  sortDir: 'asc' | 'desc';
}
