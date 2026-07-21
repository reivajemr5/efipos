import { useToastStore } from '../store/toast'

const typeStyles: Record<string, string> = {
  success: 'bg-emerald-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-blue-900 text-white',
}

const icons: Record<string, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id}
          className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-slide-in ${typeStyles[t.type]}`}>
          <span className="text-lg leading-none">{icons[t.type]}</span>
          <span>{t.message}</span>
          <button onClick={() => removeToast(t.id)} className="ml-2 opacity-60 hover:opacity-100">✕</button>
        </div>
      ))}
    </div>
  )
}
