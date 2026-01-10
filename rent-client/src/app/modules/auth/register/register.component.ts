import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

// Material
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PaymentService } from '../../../core/services/payment.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatDividerModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  paymentForm!: FormGroup;
  errorMessage: string = '';
  loading: boolean = false;
  step: 'details' | 'payment' = 'details';

  roles = [
    { value: 'AGENT', label: 'מתווך נדל"ן (מקצועי)' },
    { value: 'LANDLORD', label: 'משכיר נכס (פרטי)' },
    { value: 'SELLER', label: 'מוכר נכס (פרטי)' }
  ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private paymentService: PaymentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9]{9,10}$/)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['AGENT', [Validators.required]]
    });

    this.paymentForm = this.fb.group({
      cardNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{16}$/)]],
      expiry: ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\/[0-9]{2}$/)]],
      cvv: ['', [Validators.required, Validators.pattern(/^[0-9]{3}$/)]]
    });
  }

  goToPayment() {
    if (this.registerForm.valid) {
      this.step = 'payment';
    }
  }

  onSubmit() {
    if (this.registerForm.valid && this.paymentForm.valid) {
      this.loading = true;
      this.errorMessage = '';
      
      // 1. קודם יוצרים PaymentIntent בשרת (Stripe)
      this.paymentService.createPaymentIntent(20).subscribe({
        next: (res) => {
          // 2. לאחר הצלחת ה-Intent (בסימולציה שלנו), נשלים את ההרשמה
          this.authService.register(this.registerForm.value).subscribe({
            next: (res) => {
              this.router.navigate(['/dashboard']);
            },
            error: (err) => {
              this.loading = false;
              this.errorMessage = err.error?.error || 'חלה שגיאה בתהליך ההרשמה.';
            }
          });
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = 'שגיאה בחיבור לספק התשלומים. נא נסה שוב.';
        }
      });
    }
  }
}
