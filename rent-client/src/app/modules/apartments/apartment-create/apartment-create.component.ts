import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApartmentService } from '../../../core/services/apartment.service';
import { ActivatedRoute, Router } from '@angular/router';

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

  constructor(
    private fb: FormBuilder,
    private apartmentService: ApartmentService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.apartmentForm = this.fb.group({
      city: ['', Validators.required],
      price: ['', [Validators.required, Validators.min(0)]],
      rooms: ['', [Validators.required, Validators.min(1)]],
      description: [''],
      address: ['']
    });

    this.id = this.route.snapshot.params['id'];
    if (this.id) {
      this.isEdit = true;
      this.loadApartment();
    }
  }

  loadApartment() {
    this.apartmentService.getById(this.id!).subscribe(res => {
      this.apartmentForm.patchValue(res.apartment);
    });
  }

  onSubmit() {
    if (this.apartmentForm.invalid) return;
    this.loading = true;

    const action = this.isEdit 
      ? this.apartmentService.update(this.id!, this.apartmentForm.value)
      : this.apartmentService.create(this.apartmentForm.value);

    action.subscribe({
      next: () => this.router.navigate(['/apartments']),
      error: () => this.loading = false
    });
  }
}
