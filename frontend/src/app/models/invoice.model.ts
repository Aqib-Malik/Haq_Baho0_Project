export interface Invoice {
  id: number;
  company: number;
  company_name?: string;
  invoice_number: string;
  invoice_date: string;
  description?: string;
  amount: string;
  reference?: string;
  created_at: string;
  updated_at: string;
}
