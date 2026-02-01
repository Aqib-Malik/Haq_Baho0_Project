export interface MachineRequirement {
    id: number;
    machine: number;
    inventory_item: number;
    inventory_item_name: string;
    inventory_item_unit: string;
    quantity: string;
}

export interface Machine {
    id: number;
    name: string;
    code?: string;
    description?: string;
    requirements?: MachineRequirement[];
    created_at?: string;
    updated_at?: string;
}
