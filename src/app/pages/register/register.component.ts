import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AdditionalCustomerData, RegisterPayload } from '../../models/customer.model';
import { PromptModalComponent } from '../../components/prompt-modal/prompt-modal.component';
import { AuthService } from '../../services/auth.service';
import { BottomSheetComponent } from '../../components/bottom-sheet/bottom-sheet.component';
import { getMediaUrl } from '../../utils/media.util';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PromptModalComponent, BottomSheetComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent implements OnInit {
  readonly getImageUrl = getMediaUrl;
  private router = inject(Router);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);

  showPassword = signal(false);
  isSubmitting = signal(false);
  clinicId = signal('default');
  clinics = signal<any[]>([]);
  isLoadingClinics = signal(false);

  // Modal / Bottom Sheet Signals
  showPromptModal = signal(false);
  showBottomSheet = signal(false);
  registeredName = signal('Customer');

  // Register Form Model strictly holding Name, Phone Number, Password
  registerData: RegisterPayload = {
    name: '',
    phone: '',
    password: '',
    clinicId: ''
  };

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('clinicId') || 'default';
      this.clinicId.set(id);
      this.registerData.clinicId = id;

      if (id === 'default') {
        this.fetchClinics();
      }
    });
  }

  fetchClinics() {
    this.isLoadingClinics.set(true);
    this.authService.getClinics().subscribe({
      next: (res) => {
        this.clinics.set(res.data || []);
        this.isLoadingClinics.set(false);
      },
      error: (err) => {
        console.error('Failed to fetch clinics:', err);
        this.isLoadingClinics.set(false);
      }
    });
  }

  selectClinic(clinicId: string) {
    this.router.navigate(['/register', clinicId]);
  }

  toast = signal<{ show: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    show: false,
    message: '',
    type: 'success'
  });

  togglePassword() {
    this.showPassword.update(v => !v);
  }

  onRegister() {
    const { name, phone, password } = this.registerData;

    if (!name.trim() || !phone.trim() || !password.trim()) {
      this.triggerToast('Please fill in Name, Phone, and Password.', 'error');
      return;
    }

    if (password.length < 6) {
      this.triggerToast('Password must be at least 6 characters long.', 'error');
      return;
    }

    this.isSubmitting.set(true);

    this.authService.register(this.registerData).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.registeredName.set(name.trim());
        
        // Trigger confirmation prompt modal
        this.showPromptModal.set(true);
        console.log('Customer Registered:', res.data);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.triggerToast(err.error?.error || err.error?.message || err.error || 'Registration failed', 'error');
        console.error('Register Error:', err);
      }
    });
  }

  onPromptConfirm() {
    this.showPromptModal.set(false);
    this.showBottomSheet.set(true);
  }

  onPromptSkip() {
    this.showPromptModal.set(false);
      this.triggerToast(`Welcome aboard, ${this.registeredName()}! You can now sign in.`, 'info');
      setTimeout(() => {
        this.router.navigate(['/login', this.clinicId()]);
      }, 900);
  }

  onSaveAdditionalData(data: AdditionalCustomerData) {
    this.authService.updateProfile(data).subscribe({
      next: (res) => {
        this.showBottomSheet.set(false);
        this.triggerToast('Profile completed successfully!', 'success');
        console.log('Customer Additional Details Saved:', res.data);
        setTimeout(() => {
          this.router.navigate(['/login', this.clinicId()]);
        }, 900);
      },
      error: (err) => {
        this.triggerToast(err.error?.error || err.error?.message || err.error || 'Failed to update profile', 'error');
        console.error('Update Profile Error:', err);
      }
    });
  }

  onCloseBottomSheet() {
    this.showBottomSheet.set(false);
  }

  triggerToast(message: string, type: 'success' | 'error' | 'info' = 'success') {
    this.toast.set({ show: true, message, type });
    setTimeout(() => {
      this.toast.set({ show: false, message: '', type: 'success' });
    }, 3500);
  }
}
