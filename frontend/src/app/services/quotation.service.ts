import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Tax, InventoryItem, Quotation, QuotationItem } from '../models/quotation.model';

interface PaginatedResponse<T> {
    count?: number;
    next?: string | null;
    previous?: string | null;
    results?: T[];
}

import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class QuotationService {
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    // Tax endpoints
    getTaxes(activeOnly: boolean = true): Observable<Tax[]> {
        const params = new HttpParams().set('active_only', activeOnly.toString());
        return this.http.get<Tax[]>(`${this.apiUrl}/taxes/`, { params });
    }

    getDefaultTax(): Observable<Tax> {
        return this.http.get<Tax>(`${this.apiUrl}/taxes/default/`);
    }

    createTax(tax: Partial<Tax>): Observable<Tax> {
        return this.http.post<Tax>(`${this.apiUrl}/taxes/`, tax);
    }

    updateTax(id: number, tax: Partial<Tax>): Observable<Tax> {
        return this.http.put<Tax>(`${this.apiUrl}/taxes/${id}/`, tax);
    }

    deleteTax(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/taxes/${id}/`);
    }

    // Inventory Item endpoints
    getInventoryItems(search?: string, category?: string): Observable<InventoryItem[]> {
        let params = new HttpParams();
        if (search) {
            params = params.set('search', search);
        }
        if (category) {
            params = params.set('category', category);
        }

        return this.http.get<InventoryItem[] | PaginatedResponse<InventoryItem>>(`${this.apiUrl}/inventory-items/`, { params }).pipe(
            map((response) => {
                if (response && typeof response === 'object' && 'results' in response) {
                    return (response as PaginatedResponse<InventoryItem>).results || [];
                }
                if (Array.isArray(response)) {
                    return response as InventoryItem[];
                }
                return [];
            })
        );
    }

    getInventoryItem(id: number): Observable<InventoryItem> {
        return this.http.get<InventoryItem>(`${this.apiUrl}/inventory-items/${id}/`);
    }

    createInventoryItem(item: Partial<InventoryItem>): Observable<InventoryItem> {
        return this.http.post<InventoryItem>(`${this.apiUrl}/inventory-items/`, item);
    }

    updateInventoryItem(id: number, item: Partial<InventoryItem>): Observable<InventoryItem> {
        return this.http.put<InventoryItem>(`${this.apiUrl}/inventory-items/${id}/`, item);
    }

    deleteInventoryItem(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/inventory-items/${id}/`);
    }

    getCategories(): Observable<string[]> {
        return this.http.get<string[]>(`${this.apiUrl}/inventory-items/categories/`);
    }

    // Quotation endpoints
    getQuotations(
        companyId?: number,
        status?: string,
        startDate?: string,
        endDate?: string,
        page: number = 1,
        pageSize: number = 10
    ): Observable<{ results: Quotation[], count: number }> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('page_size', pageSize.toString());

        if (companyId) {
            params = params.set('company', companyId.toString());
        }
        if (status) {
            params = params.set('status', status);
        }
        if (startDate) {
            params = params.set('start_date', startDate);
        }
        if (endDate) {
            params = params.set('end_date', endDate);
        }

        return this.http.get<Quotation[] | PaginatedResponse<Quotation>>(`${this.apiUrl}/quotations/`, { params }).pipe(
            map((response) => {
                if (response && typeof response === 'object' && 'results' in response) {
                    const paginated = response as PaginatedResponse<Quotation>;
                    return {
                        results: paginated.results || [],
                        count: paginated.count || 0
                    };
                }
                if (Array.isArray(response)) {
                    return {
                        results: response as Quotation[],
                        count: response.length
                    };
                }
                return { results: [], count: 0 };
            })
        );
    }

    getQuotation(id: number): Observable<Quotation> {
        return this.http.get<Quotation>(`${this.apiUrl}/quotations/${id}/`);
    }

    createQuotation(quotation: Partial<Quotation>): Observable<Quotation> {
        return this.http.post<Quotation>(`${this.apiUrl}/quotations/`, quotation);
    }

    updateQuotation(id: number, quotation: Partial<Quotation>): Observable<Quotation> {
        return this.http.put<Quotation>(`${this.apiUrl}/quotations/${id}/`, quotation);
    }

    deleteQuotation(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/quotations/${id}/`);
    }

    changeQuotationStatus(id: number, status: string): Observable<Quotation> {
        return this.http.post<Quotation>(`${this.apiUrl}/quotations/${id}/change_status/`, { status });
    }

    generatePdf(id: number): Observable<Blob> {
        return this.http.get(`${this.apiUrl}/quotations/${id}/generate_pdf/`, {
            responseType: 'blob'
        });
    }

    // QuotationItem endpoints
    getQuotationItems(quotationId: number): Observable<QuotationItem[]> {
        const params = new HttpParams().set('quotation', quotationId.toString());
        return this.http.get<QuotationItem[]>(`${this.apiUrl}/quotation-items/`, { params });
    }

    createQuotationItem(item: Partial<QuotationItem>): Observable<QuotationItem> {
        return this.http.post<QuotationItem>(`${this.apiUrl}/quotation-items/`, item);
    }

    updateQuotationItem(id: number, item: Partial<QuotationItem>): Observable<QuotationItem> {
        return this.http.put<QuotationItem>(`${this.apiUrl}/quotation-items/${id}/`, item);
    }

    deleteQuotationItem(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/quotation-items/${id}/`);
    }

    // Helper methods
    downloadPdf(id: number, quotationNumber: string): void {
        this.generatePdf(id).subscribe({
            next: (blob) => {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `quotation_${quotationNumber}.pdf`;
                link.click();
                window.URL.revokeObjectURL(url);
            },
            error: (error) => {
                console.error('Error downloading PDF:', error);
            }
        });
    }
}
