import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth-modal.component.html',
})
export class AuthModalComponent {
  private readonly authService = inject(AuthService);

  @Output() close = new EventEmitter<void>();
  @Output() authenticated = new EventEmitter<void>();

  // State
  readonly step = signal<'email' | 'otp'>('email');
  readonly email = signal<string>('');
  readonly otp = signal<string>('');
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  sendCode(): void {
    const emailVal = this.email().trim();
    if (!emailVal || !emailVal.includes('@')) {
      this.errorMessage.set('Please enter a valid email address.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.authService.sendOtp(emailVal).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.step.set('otp');
        this.successMessage.set(res.message || 'Verification code sent to your email.');
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err.error?.message || 'Failed to send verification code. Please check email address.'
        );
      },
    });
  }

  verifyCode(): void {
    const emailVal = this.email().trim();
    const otpVal = this.otp().trim();

    if (!otpVal || otpVal.length < 4) {
      this.errorMessage.set('Please enter the verification code received.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.verifyOtp(emailVal, otpVal).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.authenticated.emit();
        this.close.emit();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err.error?.message || 'Invalid or expired code. Please try again.'
        );
      },
    });
  }

  resendCode(): void {
    this.sendCode();
  }

  onBack(): void {
    this.step.set('email');
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  onDismiss(): void {
    this.close.emit();
  }
}
