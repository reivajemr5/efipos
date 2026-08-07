import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AuthGuard from '../components/AuthGuard'
import { useAuthStore } from '../store/auth'

vi.mock('../services/api', () => ({
  api: { me: vi.fn() },
}))

function renderInside() {
  return render(
    <MemoryRouter>
      <AuthGuard>
        <div>Contenido protegido</div>
      </AuthGuard>
    </MemoryRouter>
  )
}

describe('AuthGuard', () => {
  it('no muestra el contenido protegido sin sesión', async () => {
    const { api } = await import('../services/api')
    ;(api.me as any).mockRejectedValue(new Error('no autenticado'))
    useAuthStore.setState({ user: null })

    renderInside()
    await waitFor(() => {
      expect(screen.queryByText('Contenido protegido')).toBeNull()
    })
  })

  it('muestra el contenido protegido cuando hay sesión', async () => {
    const { api } = await import('../services/api')
    ;(api.me as any).mockResolvedValue({ id: 1, name: 'Carlos', role: 'dueno' })
    useAuthStore.setState({ user: null })

    renderInside()
    expect(await screen.findByText('Contenido protegido')).toBeInTheDocument()
  })
})