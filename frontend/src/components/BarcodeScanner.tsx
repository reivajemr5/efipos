import { useEffect, useRef } from 'react'

interface Props {
  onScan: (barcode: string) => void
  onClose: () => void
}

export default function BarcodeScanner({ onScan, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const scannerRef = useRef<any>(null)

  useEffect(() => {
    let active = true
    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (!active) return
      const scanner = new Html5Qrcode('barcode-reader')
      scannerRef.current = scanner
      scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText: string) => {
          if (active) {
            onScan(decodedText)
            scanner.stop().catch(() => {})
            onClose()
          }
        },
        () => {},
      ).catch(console.error)
    })
    return () => { active = false; scannerRef.current?.stop().catch(() => {}) }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="relative bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 text-center">
          <p className="font-semibold text-gray-700 mb-2">Escanear Código de Barras</p>
          <div id="barcode-reader" ref={ref} className="w-full aspect-square bg-black rounded-xl overflow-hidden" />
          <p className="text-xs text-gray-400 mt-2">Apunta la cámara al código de barras</p>
        </div>
        <button onClick={onClose}
          className="w-full py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 border-t transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  )
}
