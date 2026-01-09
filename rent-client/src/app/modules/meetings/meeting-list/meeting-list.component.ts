import { Component, OnInit } from '@angular/core';
import { MeetingService, Meeting } from '../../../core/services/meeting.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-meeting-list',
  templateUrl: './meeting-list.component.html',
  styleUrls: ['./meeting-list.component.scss']
})
export class MeetingListComponent implements OnInit {
  meetings: Meeting[] = [];
  displayedColumns: string[] = ['time', 'tenant', 'apartment', 'location', 'status', 'actions'];
  loading = true;

  constructor(
    private meetingService: MeetingService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit() {
    this.loadMeetings();
  }

  loadMeetings() {
    this.loading = true;
    this.meetingService.getAll().subscribe({
      next: (res) => {
        this.meetings = res;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('שגיאה בטעינת פגישות', 'סגור', { duration: 3000 });
      }
    });
  }

  updateStatus(id: string, status: string) {
    this.meetingService.updateStatus(id, status).subscribe(() => {
      this.snackBar.open('סטטוס פגישה עודכן', 'סגור', { duration: 2000 });
      this.loadMeetings();
    });
  }

  deleteMeeting(id: string) {
    if (confirm('האם אתה בטוח שברצונך למחוק את הפגישה?')) {
      this.meetingService.delete(id).subscribe(() => {
        this.snackBar.open('פגישה נמחקה', 'סגור', { duration: 2000 });
        this.loadMeetings();
      });
    }
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'SCHEDULED': 'נקבעה',
      'COMPLETED': 'בוצעה',
      'CANCELLED': 'בוטלה'
    };
    return labels[status] || status;
  }

  openWaze(address: string) {
    const url = `https://waze.com/ul?q=${encodeURIComponent(address)}`;
    window.open(url, '_blank');
  }
}
