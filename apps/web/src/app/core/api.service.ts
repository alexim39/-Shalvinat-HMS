import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

const API_BASE_URL = 'http://localhost:4000/api';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  get<T>(path: string, params?: Record<string, string | number | boolean | undefined>) {
    let httpParams = new HttpParams();
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    });
    return this.http.get<T>(`${API_BASE_URL}${path}`, { params: httpParams });
  }

  post<T>(path: string, body: unknown) {
    return this.http.post<T>(`${API_BASE_URL}${path}`, body);
  }

  patch<T>(path: string, body: unknown) {
    return this.http.patch<T>(`${API_BASE_URL}${path}`, body);
  }

  put<T>(path: string, body: unknown) {
    return this.http.put<T>(`${API_BASE_URL}${path}`, body);
  }
}
