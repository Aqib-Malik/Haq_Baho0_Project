import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Company } from '../models/company.model';
import { Invoice } from '../models/invoice.model';
import { Payment } from '../models/payment.model';
import { CompanyLedgerResponse } from '../models/ledger.model';

interface PaginatedResponse<T> {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: T[];
}

@Injectable({
  providedIn: 'root'
})
export class LedgerService {
  private apiUrl = 'http://localhost:8000/api'; // Django backend URL

  constructor(private http: HttpClient) { }

  // Company endpoints
  getCompanies(): Observable<Company[]> {
    return this.http.get<Company[] | PaginatedResponse<Company>>(`${this.apiUrl}/companies/`).pipe(
      map((response) => {
        // Handle paginated response (Django REST Framework format)
        if (response && typeof response === 'object' && 'results' in response) {
          return (response as PaginatedResponse<Company>).results || [];
        }
        // Handle direct array response
        if (Array.isArray(response)) {
          return response as Company[];
        }
        // Fallback to empty array
        return [];
      })
    );
  }

  searchCompanies(query: string): Observable<Company[]> {
    const params = new HttpParams().set('q', query);
    return this.http.get<Company[]>(`${this.apiUrl}/companies/search/`, { params });
  }

  getCompany(id: number): Observable<Company> {
    return this.http.get<Company>(`${this.apiUrl}/companies/${id}/`);
  }

  createCompany(company: Partial<Company>): Observable<Company> {
    return this.http.post<Company>(`${this.apiUrl}/companies/`, company);
  }

  updateCompany(id: number, company: Partial<Company>): Observable<Company> {
    return this.http.put<Company>(`${this.apiUrl}/companies/${id}/`, company);
  }

  deleteCompany(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/companies/${id}/`);
  }

  // Invoice endpoints
  getInvoices(companyId?: number, page: number = 1, pageSize: number = 10): Observable<{ results: Invoice[], count: number }> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('page_size', pageSize.toString());

    if (companyId) {
      params = params.set('company', companyId.toString());
    }
    return this.http.get<Invoice[] | PaginatedResponse<Invoice>>(`${this.apiUrl}/invoices/`, { params }).pipe(
      map((response) => {
        if (response && typeof response === 'object' && 'results' in response) {
          const paginated = response as PaginatedResponse<Invoice>;
          return {
            results: paginated.results || [],
            count: paginated.count || 0
          };
        }
        if (Array.isArray(response)) {
          return {
            results: response as Invoice[],
            count: response.length
          };
        }
        return { results: [], count: 0 };
      })
    );
  }

  getInvoice(id: number): Observable<Invoice> {
    return this.http.get<Invoice>(`${this.apiUrl}/invoices/${id}/`);
  }

  createInvoice(invoice: Partial<Invoice>): Observable<Invoice> {
    return this.http.post<Invoice>(`${this.apiUrl}/invoices/`, invoice);
  }

  updateInvoice(id: number, invoice: Partial<Invoice>): Observable<Invoice> {
    return this.http.put<Invoice>(`${this.apiUrl}/invoices/${id}/`, invoice);
  }

  deleteInvoice(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/invoices/${id}/`);
  }

  // Payment endpoints
  getPayments(companyId?: number, page: number = 1, pageSize: number = 10): Observable<{ results: Payment[], count: number }> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('page_size', pageSize.toString());

    if (companyId) {
      params = params.set('company', companyId.toString());
    }
    return this.http.get<Payment[] | PaginatedResponse<Payment>>(`${this.apiUrl}/payments/`, { params }).pipe(
      map((response) => {
        if (response && typeof response === 'object' && 'results' in response) {
          const paginated = response as PaginatedResponse<Payment>;
          return {
            results: paginated.results || [],
            count: paginated.count || 0
          };
        }
        if (Array.isArray(response)) {
          return {
            results: response as Payment[],
            count: response.length
          };
        }
        return { results: [], count: 0 };
      })
    );
  }

  getPayment(id: number): Observable<Payment> {
    return this.http.get<Payment>(`${this.apiUrl}/payments/${id}/`);
  }

  createPayment(payment: Partial<Payment>): Observable<Payment> {
    return this.http.post<Payment>(`${this.apiUrl}/payments/`, payment);
  }

  updatePayment(id: number, payment: Partial<Payment>): Observable<Payment> {
    return this.http.put<Payment>(`${this.apiUrl}/payments/${id}/`, payment);
  }

  deletePayment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/payments/${id}/`);
  }

  // Ledger endpoints
  getCompanyLedger(
    companyId: number,
    startDate?: string,
    endDate?: string
  ): Observable<CompanyLedgerResponse> {
    let params = new HttpParams().set('company', companyId.toString());
    if (startDate) {
      params = params.set('start_date', startDate);
    }
    if (endDate) {
      params = params.set('end_date', endDate);
    }
    return this.http.get<CompanyLedgerResponse>(`${this.apiUrl}/ledger/company_ledger/`, { params });
  }

  exportLedgerPdf(companyId: number, startDate?: string, endDate?: string): Observable<Blob> {
    let params = new HttpParams().set('company', companyId.toString());
    if (startDate) {
      params = params.set('start_date', startDate);
    }
    if (endDate) {
      params = params.set('end_date', endDate);
    }
    return this.http.get(`${this.apiUrl}/ledger/export_pdf/`, {
      params,
      responseType: 'blob'
    });
  }

  exportLedgerExcel(companyId: number, startDate?: string, endDate?: string): Observable<Blob> {
    let params = new HttpParams().set('company', companyId.toString());
    if (startDate) {
      params = params.set('start_date', startDate);
    }
    if (endDate) {
      params = params.set('end_date', endDate);
    }
    return this.http.get(`${this.apiUrl}/ledger/export_excel/`, {
      params,
      responseType: 'blob'
    });
  }

  getOutstandingBalance(companyId?: number): Observable<any> {
    let params = new HttpParams();
    if (companyId) {
      params = params.set('company', companyId.toString());
    }
    return this.http.get(`${this.apiUrl}/ledger/outstanding_balance/`, { params });
  }
}
