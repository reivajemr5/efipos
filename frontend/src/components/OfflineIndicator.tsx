import { useOnlineStatus } from '../hooks/useOnlineStatus'

export default function OfflineIndicator() {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div className="bg-amber-500 text-white text-center text-sm py-1 px-4 font-medium">
      ⚠️ Sin conexión — los datos se guardan localmente y se sincronizarán automáticamente
    </div>
  )
}
