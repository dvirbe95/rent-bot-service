import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ClientLeadService } from '../../../core/services/client-lead.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-lead-detail',
  templateUrl: './lead-detail.component.html',
  styleUrls: ['./lead-detail.component.scss']
})
export class LeadDetailComponent implements OnInit {
  lead: any;
  messages: any[] = [];
  messageForm: FormGroup;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private leadService: ClientLeadService,
    private fb: FormBuilder
  ) {
    this.messageForm = this.fb.group({
      content: ['', Validators.required]
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.params['id'];
    this.leadService.getConversation(id).subscribe(res => {
      this.lead = res.lead;
      this.messages = res.messages;
      this.loading = false;
    });
  }

  sendMessage() {
    if (this.messageForm.invalid) return;
    
    this.leadService.sendMessage(this.lead.id, this.messageForm.value).subscribe(res => {
      this.messages.push(res.message);
      this.messageForm.reset();
    });
  }
}
