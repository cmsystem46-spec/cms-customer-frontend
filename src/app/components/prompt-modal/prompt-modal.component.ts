import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-prompt-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './prompt-modal.component.html'
})
export class PromptModalComponent {
  userName = input<string>('Customer');
  
  // Emits when user clicks "Yes, Add More Data"
  confirm = output<void>();
  
  // Emits when user clicks "Skip for now"
  skip = output<void>();

  onConfirm() {
    this.confirm.emit();
  }

  onSkip() {
    this.skip.emit();
  }
}
