import toast from 'react-hot-toast';

// File size validation (25MB limit)
export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB in bytes

export function validateFileSize(file: File): boolean {
  if (file.size > MAX_FILE_SIZE) {
    toast.error(`File "${file.name}" is too large. Maximum size is 25MB.`);
    return false;
  }
  return true;
}

export function validateFilesSize(files: File[]): boolean {
  for (const file of files) {
    if (!validateFileSize(file)) {
      return false;
    }
  }
  return true;
}

// Format file size for display
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Show success notification
export function showSuccess(message: string) {
  toast.success(message, {
    duration: 3000,
  });
}

// Show error notification
export function showError(message: string) {
  toast.error(message, {
    duration: 4000,
  });
}

// Show loading notification
export function showLoading(message: string) {
  return toast.loading(message);
}

// Update loading notification to success
export function updateToSuccess(toastId: string, message: string) {
  toast.success(message, { id: toastId });
}

// Update loading notification to error
export function updateToError(toastId: string, message: string) {
  toast.error(message, { id: toastId });
}

