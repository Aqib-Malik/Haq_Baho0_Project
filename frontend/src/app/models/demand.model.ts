export interface DemandMachineOrder {
    id: number;
    demand: number;
    machine: number;
    machine_name: string;
    quantity: string;
}

export interface DemandMaterial {
    id: number;
    demand: number;
    inventory_item: number;
    inventory_item_name: string;
    inventory_item_unit: string;
    quantity: string;
}

export interface Demand {
    id: number;
    company: number;
    company_name?: string;
    date: string;
    reference_number?: string;
    status: 'draft' | 'finalized';
    machine_orders?: DemandMachineOrder[];
    materials?: DemandMaterial[];
    created_at?: string;
    updated_at?: string;
}

export interface CreateDemandPayload {
    company: number;
    date: string;
    reference_number?: string;
    status: 'draft' | 'finalized';
    machine_orders: { machine_id: number; quantity: number | string }[];
}
