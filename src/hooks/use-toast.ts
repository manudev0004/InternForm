import { toast } from "sonner";

export function useToast() {
  const toast = {
    success: (message: string) => toast.success(message),
    error: (message: string) => toast.error(message),
    info: (message: string) => toast.info(message),
    warn: (message: string) => toast.warn(message),
    dismiss: () => toast.dismiss(),
  };

  return { toast };
}
