import { Component } from 'react'
import type { ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; message?: string }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(e: Error): State {
    return { hasError: true, message: e?.message || 'Error inesperado' }
  }

  componentDidCatch(e: Error) {
    console.error('[ErrorBoundary]', e)
  }

  handleReset = () => {
    this.setState({ hasError: false, message: undefined })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow p-8 max-w-md w-full text-center">
            <h1 className="text-xl font-bold text-gray-800 mb-2">Ups, algo salió mal</h1>
            <p className="text-sm text-red-600 mb-6">{this.state.message}</p>
            <button
              onClick={() => { this.handleReset(); window.location.href = '/' }}
              className="px-5 py-2 bg-blue-900 text-white rounded-lg font-medium"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}