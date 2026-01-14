export interface Payment {
  id: number;
  company: number;
  company_name?: string;
  payment_number: string;
  payment_date: string;
  description?: string;
  amount: string;
  payment_mode: string;
  reference?: string;
  created_at: string;
  updated_at: string;
}
