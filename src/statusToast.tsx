export const STATUS_TOAST_DURATION_MS = 2000;

type StatusToastProps = {
  message: string;
};

export function StatusToast({ message }: StatusToastProps) {
  if (!message) {
    return null;
  }

  return (
    <p className="status-toast app-content" role="status" aria-live="polite">
      {message}
    </p>
  );
}
