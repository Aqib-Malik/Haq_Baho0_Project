import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Demand, CreateDemandPayload } from '../models/demand.model';

@Injectable({
    providedIn: 'root'
})
export class DemandService {
    private apiUrl = `${environment.apiUrl}/demands/`;

    constructor(private http: HttpClient) { }

    getDemands(): Observable<Demand[]> {
        return this.http.get<Demand[]>(this.apiUrl);
    }

    getDemand(id: number): Observable<Demand> {
        return this.http.get<Demand>(`${this.apiUrl}${id}/`);
    }

    createDemand(demand: CreateDemandPayload): Observable<Demand> {
        return this.http.post<Demand>(this.apiUrl, demand);
    }

    deleteDemand(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}${id}/`);
    }

    aggregateDemands(demandIds: number[]): Observable<any[]> {
        return this.http.post<any[]>(`${this.apiUrl}aggregate/`, { demand_ids: demandIds });
    }
}
