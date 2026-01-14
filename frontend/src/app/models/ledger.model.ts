export interface LedgerEntry {
  id: number;
  company: number;
  company_name?: string;
  transaction_type: 'debit' | 'credit';
  transaction_number: string;
  transaction_date: string;
  description?: string;
  amount: string;
  debit_amount?: string;
  credit_amount?: string;
  reference?: string;
  payment_mode?: string;
  running_balance?: string;
  created_at: string;
}

export interface CompanyLedgerResponse {
  company: {
    id: number;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    contact_person?: string;
    gstin?: string;
  };
  opening_balance: string;
  total_debit: string;
  total_credit: string;
  closing_balance: string;
  outstanding_balance: string;
  entries: LedgerEntry[];
}
