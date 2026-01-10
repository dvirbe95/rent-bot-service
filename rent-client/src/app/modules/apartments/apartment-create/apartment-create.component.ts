import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApartmentService } from '../../../core/services/apartment.service';
import { FileStorageService } from '../../../core/services/file-storage.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-apartment-create',
  templateUrl: './apartment-create.component.html',
  styleUrls: ['./apartment-create.component.scss']
})
export class ApartmentCreateComponent implements OnInit {
  apartmentForm!: FormGroup;
  isEdit = false;
  id?: string;
  loading = false;
  uploading = false;
  
  // Media and documents
  images: string[] = [];
  documents: string[] = [];
  availabilitySlots: any[] = [];

  constructor(
    private fb: FormBuilder,
    private apartmentService: ApartmentService,
    private storageService: FileStorageService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.apartmentForm = this.fb.group({
      // Basic info
      city: ['', Validators.required],
      address: [''],
      price: ['', [Validators.required, Validators.min(0)]],
      rooms: ['', [Validators.required, Validators.min(1)]],
      floor: [null],
      sqm: [null],
      
      // Financial info
      arnona: [null],
      vaadBayit: [null],
      collateral: [''],
      priceFlexibility: [false],
      
      // Property features
      description: [''],
      entryDate: [null],
      balcony: [false],
      shelter: [false],
      mamad: [false],
      furnished: [false],
      petsAllowed: [true],
      parking: [false],
      elevator: [false],
      
      // Environment
      nearbyConstruction: [false],
      neighbors: [''],
      commercialCenter: [''],
      schools: [''],
      entertainmentAreas: [''],
      
      // Contact
      contactPhone: [''],

      // שדות זמניים להוספת סלוט
      newSlotDate: [null],
      newSlotStart: [''],
      newSlotEnd: ['']
    });

    this.id = this.route.snapshot.params['id'];
    if (this.id) {
      this.isEdit = true;
      this.loadApartment();
    }
  }

  loadApartment() {
    this.apartmentService.getById(this.id!).subscribe(res => {
      const apt = res.apartment;
      this.apartmentForm.patchValue(apt);
      this.images = apt.images || [];
      this.documents = apt.documents || [];
      this.availabilitySlots = apt.availability || [];
    });
  }

  async onFileChange(event: any, type: 'image' | 'document') {
    const file = event.target.files[0];
    if (!file) return;

    this.uploading = true;
    try {
      const folder = type === 'image' ? 'images' : 'documents';
      const url = await this.storageService.uploadFile(file, folder);
      
      if (type === 'image') this.images.push(url);
      else this.documents.push(url);
      
      this.snackBar.open('הקובץ הועלה בהצלחה', 'סגור', { duration: 2000 });
    } catch (error) {
      console.error('Upload error:', error);
      this.snackBar.open('שגיאה בהעלאת הקובץ', 'סגור', { duration: 3000 });
    } finally {
      this.uploading = false;
    }
  }

  removeFile(index: number, type: 'image' | 'document') {
    if (type === 'image') this.images.splice(index, 1);
    else this.documents.splice(index, 1);
  }

  addAvailabilitySlot() {
    const { newSlotDate, newSlotStart, newSlotEnd } = this.apartmentForm.value;
    if (!newSlotDate || !newSlotStart || !newSlotEnd) {
      this.snackBar.open('נא למלא תאריך ושעות', 'סגור', { duration: 3000 });
      return;
    }

    const date = new Date(newSlotDate);
    const start = new Date(date);
    const [startH, startM] = newSlotStart.split(':');
    start.setHours(startH, startM);

    const end = new Date(date);
    const [endH, endM] = newSlotEnd.split(':');
    end.setHours(endH, endM);

    this.availabilitySlots.push({
      start: start.toISOString(),
      end: end.toISOString()
    });

    this.apartmentForm.patchValue({
      newSlotDate: null,
      newSlotStart: '',
      newSlotEnd: ''
    });
  }

  removeSlot(index: number) {
    this.availabilitySlots.splice(index, 1);
  }

  onSubmit() {
    if (this.apartmentForm.invalid) return;
    this.loading = true;

    const formData = {
      ...this.apartmentForm.value,
      images: this.images,
      documents: this.documents,
      availability: this.availabilitySlots
    };

    const action = this.isEdit 
      ? this.apartmentService.update(this.id!, formData)
      : this.apartmentService.create(formData);

    action.subscribe({
      next: () => {
        this.snackBar.open(this.isEdit ? 'הנכס עודכן' : 'הנכס נוצר בהצלחה', 'סגור', { duration: 3000 });
        this.router.navigate(['/apartments']);
      },
      error: (err) => {
        this.loading = false;
        this.snackBar.open('שגיאה בשמירת הנכס: ' + (err.error?.error || 'שגיאה לא ידועה'), 'סגור', { duration: 5000 });
      }
    });
  }
}
