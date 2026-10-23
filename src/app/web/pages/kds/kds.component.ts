import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';

import {
  RestaurantOrderService,
  RestaurantOrderModel,
  RestaurantOrderItemModel,
  OrderItemStatus
} from '../../../shared/services/restaurant-order.service';

interface PrepSummaryItem {
  name: string;
  count: number;
  station?: string;
}

@Component({
  selector: 'app-kds',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastModule, TooltipModule, TagModule],
  providers: [MessageService],
  templateUrl: './kds.component.html',
  styleUrls: ['./kds.component.css']
})
export class KdsComponent implements OnInit, OnDestroy {

  activeStation: 'ALL' | 'KITCHEN' | 'BAR' | 'DESSERT' = 'ALL';
  tickets: RestaurantOrderModel[] = [];
  loading = false;
  soundEnabled = true;
  isFullscreen = false;

  // Stats
  totalActiveTickets = 0;
  totalActiveItems = 0;
  prepSummary: PrepSummaryItem[] = [];

  // Recalled tickets history
  lastBumpedOrder: RestaurantOrderModel | null = null;

  // Timers
  private refreshInterval: any;
  private clockInterval: any;
  currentTime = new Date();
  previousOrderIds = new Set<number>();

  constructor(
    private orderService: RestaurantOrderService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadTickets(true);

    // Auto-refresh tickets every 5 seconds
    this.refreshInterval = setInterval(() => {
      this.loadTickets(false);
    }, 5000);

    // Live clock & elapsed timer updater every second
    this.clockInterval = setInterval(() => {
      this.currentTime = new Date();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    if (this.clockInterval) clearInterval(this.clockInterval);
  }

  setStation(station: 'ALL' | 'KITCHEN' | 'BAR' | 'DESSERT'): void {
    this.activeStation = station;
    this.loadTickets(true);
  }

  loadTickets(showSpinner = false): void {
    if (showSpinner) this.loading = true;

    const stationParam = this.activeStation === 'ALL' ? undefined : this.activeStation;
    this.orderService.getActiveKdsTickets(stationParam).subscribe({
      next: (orders) => {
        // Detect newly arrived orders to trigger audio chime
        if (this.previousOrderIds.size > 0) {
          const hasNewOrder = orders.some(o => !this.previousOrderIds.has(o.id));
          if (hasNewOrder && this.soundEnabled) {
            this.playNewOrderChime();
          }
        }

        this.tickets = orders;
        this.previousOrderIds = new Set(orders.map(o => o.id));
        this.calculateSummaries();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  calculateSummaries(): void {
    this.totalActiveTickets = this.tickets.length;
    let itemCount = 0;
    const summaryMap = new Map<string, number>();

    for (const order of this.tickets) {
      for (const item of (order.items || [])) {
        if (item.status !== 'SERVED' && item.status !== 'CANCELLED') {
          itemCount += item.quantity;
          const current = summaryMap.get(item.itemName) || 0;
          summaryMap.set(item.itemName, current + item.quantity);
        }
      }
    }

    this.totalActiveItems = itemCount;
    this.prepSummary = Array.from(summaryMap.entries()).map(([name, count]) => ({
      name,
      count
    })).sort((a, b) => b.count - a.count);
  }

  // ─── Actions ──────────────────────────────────────────────────

  bumpItem(item: RestaurantOrderItemModel, event: MouseEvent): void {
    event.stopPropagation();
    this.orderService.bumpOrderItem(item.id).subscribe({
      next: () => {
        this.loadTickets(false);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not bump item' });
      }
    });
  }

  bumpTicket(order: RestaurantOrderModel): void {
    this.lastBumpedOrder = order;
    const stationParam = this.activeStation === 'ALL' ? undefined : this.activeStation;

    this.orderService.bumpEntireOrder(order.id, stationParam).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Ticket Bumped',
          detail: `Order ${order.orderNumber} advanced`
        });
        this.loadTickets(false);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not bump ticket' });
      }
    });
  }

  recallLastTicket(): void {
    if (!this.lastBumpedOrder) return;
    const recalled = this.lastBumpedOrder;

    this.orderService.recallOrder(recalled.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'info',
          summary: 'Ticket Recalled',
          detail: `Order ${recalled.orderNumber} restored to kitchen`
        });
        this.lastBumpedOrder = null;
        this.loadTickets(true);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not recall ticket' });
      }
    });
  }

  // ─── Time & Urgency Helpers ─────────────────────────────────

  getElapsedSeconds(createdAt: string): number {
    if (!createdAt) return 0;
    const created = new Date(createdAt).getTime();
    const now = this.currentTime.getTime();
    return Math.max(0, Math.floor((now - created) / 1000));
  }

  getElapsedFormatted(createdAt: string): string {
    const totalSecs = this.getElapsedSeconds(createdAt);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  getUrgencyClass(createdAt: string): 'urgency-fresh' | 'urgency-medium' | 'urgency-delayed' {
    const mins = this.getElapsedSeconds(createdAt) / 60;
    if (mins >= 15) return 'urgency-delayed';
    if (mins >= 8)  return 'urgency-medium';
    return 'urgency-fresh';
  }

  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        this.isFullscreen = true;
      });
    } else {
      document.exitFullscreen().then(() => {
        this.isFullscreen = false;
      });
    }
  }

  toggleSound(): void {
    this.soundEnabled = !this.soundEnabled;
    if (this.soundEnabled) {
      this.playNewOrderChime();
    }
  }

  // ─── Synthesizer Web Audio Chime ─────────────────────────────
  private playNewOrderChime(): void {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();

      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0.15, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };

      // Two-tone chime: 800Hz followed by 1040Hz
      playTone(800, 0, 0.2);
      playTone(1040, 0.22, 0.35);
    } catch {
      // Audio autoplay policy fallback
    }
  }
}
