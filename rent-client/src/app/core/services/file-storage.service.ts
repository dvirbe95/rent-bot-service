import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FileStorageService {
  private apiUrl = 'https://rent-bot-service-cncl.onrender.com/api/upload';

  constructor(private http: HttpClient) {}

  async uploadFile(file: File, folder: 'images' | 'documents' | 'videos'): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', folder);

    try {
      const response: any = await firstValueFrom(
        this.http.post(this.apiUrl, formData)
      );
      
      if (response && response.url) {
        return response.url;
      }
      throw new Error('Upload failed: No URL returned');
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    }
  }
}
