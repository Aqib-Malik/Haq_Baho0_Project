export interface Tax {
    id: number;
    name: string;
    rate: string;
    description?: string;
    is_active: boolean;
    is_default: boolean;
    created_at: string;
    updated_at: string;
}

export interface InventoryItem {
    id: number;
    name: string;
    description?: string;
    unit_price: string;
    unit: string;
    category?: string;
    stock_quantity?: string;
    sku?: string;
    created_at: string;
    updated_at: string;
}

export interface QuotationItem {
    id?: number;
    quotation?: number;
    inventory_item?: number;
    inventory_item_name?: string;
    item_name: string;
    description?: string;
    quantity: number;
    unit_price: string;
    unit: string;
    subtotal: string;
    machine_cost?: string;
    created_at?: string;
    updated_at?: string;
}

export interface Quotation {
    id: number;
    quotation_number: string;
    company: number;
    company_name?: string;
    quotation_date: string;
    valid_until?: string;
    tax: number | null;
    tax_name?: string;
    tax_rate?: string;
    subtotal: string;
    tax_amount: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: string;
    discount_amount: string;
    total_amount: string;
    notes?: string;
    status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
    items?: QuotationItem[];
    item_count?: number;
    created_at: string;
    updated_at: string;
}
