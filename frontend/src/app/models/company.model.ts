export interface Company {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  contact_person?: string;
  gstin?: string;
  created_at: string;
  updated_at: string;
  total_debit: string;
  total_credit: string;
  outstanding_balance: string;
}
