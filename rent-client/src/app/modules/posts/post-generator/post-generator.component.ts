import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApartmentService } from '../../../core/services/apartment.service';
import { PostService } from '../../../core/services/post.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-post-generator',
  templateUrl: './post-generator.component.html',
  styleUrls: ['./post-generator.component.scss']
})
export class PostGeneratorComponent implements OnInit {
  postForm: FormGroup;
  apartments: any[] = [];
  generatedPost: any;
  loading = false;
  generating = false;

  platforms = [
    { value: 'TELEGRAM', label: 'טלגרם' },
    { value: 'WHATSAPP', label: 'וואטסאפ' },
    { value: 'FACEBOOK', label: 'פייסבוק' },
    { value: 'INSTAGRAM', label: 'אינסטגרם' }
  ];

  constructor(
    private fb: FormBuilder,
    private apartmentService: ApartmentService,
    private postService: PostService,
    private snackBar: MatSnackBar
  ) {
    this.postForm = this.fb.group({
      apartmentId: ['', Validators.required],
      platform: ['TELEGRAM', Validators.required],
      tone: ['professional'],
      includeEmojis: [true]
    });
  }

  ngOnInit() {
    this.apartmentService.getAll().subscribe(res => {
      this.apartments = res.apartments;
    });
  }

  generate() {
    if (this.postForm.invalid) return;
    this.generating = true;
    this.postService.generatePost(this.postForm.value).subscribe({
      next: (res) => {
        this.generatedPost = res.post;
        this.generating = false;
      },
      error: () => this.generating = false
    });
  }

  copyToClipboard() {
    navigator.clipboard.writeText(this.generatedPost.content);
    this.snackBar.open('התוכן הועתק ללוח', 'סגור', { duration: 2000 });
  }
}
