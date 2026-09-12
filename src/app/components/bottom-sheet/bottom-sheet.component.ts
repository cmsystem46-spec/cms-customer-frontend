import { Component, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdditionalCustomerData } from '../../models/customer.model';

@Component({
  selector: 'app-bottom-sheet',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bottom-sheet.component.html',
  styleUrl: './bottom-sheet.component.css'
})
export class BottomSheetComponent {
  // Emits the filled additional customer data
  save = output<AdditionalCustomerData>();

  // Emits when user closes or cancels the bottom sheet
  close = output<void>();

  isSaving = signal(false);

  // Customizable Additional Customer Data Model
  // 👉 You can easily add, rename, or change fields here!
  additionalData: AdditionalCustomerData = {
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    alternatePhone: '',
    notes: ''
  };

  onCloseSheet() {
    this.close.emit();
  }

  onSubmit() {
    this.isSaving.set(true);
    setTimeout(() => {
      this.isSaving.set(false);
      this.save.emit(this.additionalData);
    }, 600);
  }
}
