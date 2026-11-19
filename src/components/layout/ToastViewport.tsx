import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { useMerchant } from '../../store/MerchantContext';

export function ToastViewport() {
  const { toasts, dismissToast } = useMerchant();
  const { t } = useI18n();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-full max-w-sm flex-col gap-2"
    >
      {toasts.map((toast) => {
        const Icon =
          toast.tone === 'error' || toast.tone === 'warning'
            ? AlertCircle
            : toast.tone === 'info'
              ? Info
              : CheckCircle2;
        const iconColor =
          toast.tone === 'error'
            ? 'text-rose-600'
            : toast.tone === 'warning'
              ? 'text-amber-600'
              : toast.tone === 'info'
                ? 'text-blue-600'
                : 'text-emerald-600';

        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg"
          >
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`} />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-slate-900">{toast.title}</div>
              {toast.description && (
                <div className="mt-0.5 text-xs text-slate-500">{toast.description}</div>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label={t('app.dismissNotification')}
              className="rounded p-0.5 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
