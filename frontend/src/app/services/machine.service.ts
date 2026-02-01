import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Machine, MachineRequirement } from '../models/machine.model';

@Injectable({
    providedIn: 'root'
})
export class MachineService {
    private apiUrl = `${environment.apiUrl}/machines/`;
    private reqUrl = `${environment.apiUrl}/machine-requirements/`;

    constructor(private http: HttpClient) { }

    getMachines(): Observable<Machine[]> {
        return this.http.get<Machine[] | any>(this.apiUrl).pipe(
            map(response => {
                if (Array.isArray(response)) return response;
                if (response && response.results) return response.results;
                return [];
            })
        );
    }

    getMachine(id: number): Observable<Machine> {
        return this.http.get<Machine>(`${this.apiUrl}${id}/`);
    }

    createMachine(machine: Partial<Machine>): Observable<Machine> {
        return this.http.post<Machine>(this.apiUrl, machine);
    }

    updateMachine(id: number, machine: Partial<Machine>): Observable<Machine> {
        return this.http.patch<Machine>(`${this.apiUrl}${id}/`, machine);
    }

    deleteMachine(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}${id}/`);
    }

    // Requirements
    addRequirement(req: Partial<MachineRequirement>): Observable<MachineRequirement> {
        return this.http.post<MachineRequirement>(this.reqUrl, req);
    }

    deleteRequirement(id: number): Observable<void> {
        return this.http.delete<void>(`${this.reqUrl}${id}/`);
    }
}
