import { Component, Inject, PLATFORM_ID, OnInit } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-charts-dashboard',
  templateUrl: './charts-dashboard.component.html',
  styleUrls: ['./charts-dashboard.component.scss']
})
export class ChartsDashboardComponent implements OnInit {
  Highcharts: any;
  isBrowser: boolean = false;
  chartOptions: any[] = [];

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  async ngOnInit() {
    if (this.isBrowser) {
      // Dynamic import to avoid SSR errors
      const Highcharts = await import('highcharts');
      this.Highcharts = Highcharts.default || Highcharts;
      this.initCharts();
    }
  }

  private initCharts() {
    this.chartOptions = [
      this.createSemiCircleOptions('ביצועי מכירות', 'מכירות', 75, '#4caf50'),
      this.createSemiCircleOptions('תפוסת נכסים', 'תפוסה', 88, '#2196f3'),
      this.createSemiCircleOptions('שביעות רצון', 'דירוג', 92, '#ff9800'),
      this.createSemiCircleOptions('לידים חדשים', 'לידים', 45, '#f44336'),
      this.createSemiCircleOptions('משימות שהושלמו', 'משימות', 60, '#9c27b0')
    ];
  }

  private createSemiCircleOptions(title: string, name: string, value: number, color: string) {
    return {
      chart: {
        type: 'pie',
        backgroundColor: 'transparent',
        plotBorderWidth: 0,
        plotShadow: false,
        height: '300px'
      },
      title: {
        text: title,
        align: 'center',
        verticalAlign: 'middle',
        y: 60,
        style: {
          fontSize: '16px',
          fontWeight: 'bold',
          color: '#333'
        }
      },
      tooltip: {
        pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
      },
      plotOptions: {
        pie: {
          dataLabels: {
            enabled: true,
            distance: -40,
            style: {
              fontWeight: 'bold',
              color: 'white',
              textOutline: 'none'
            }
          },
          startAngle: -90,
          endAngle: 90,
          center: ['50%', '75%'],
          size: '110%'
        }
      },
      series: [{
        type: 'pie',
        name: name,
        innerSize: '60%',
        data: [
          { name: name, y: value, color: color },
          { name: 'השאר', y: 100 - value, color: '#f5f5f5', dataLabels: { enabled: false } }
        ]
      }],
      credits: {
        enabled: false
      }
    };
  }
}
