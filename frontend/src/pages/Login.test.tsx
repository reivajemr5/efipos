import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Login from '../pages/Login'

vi.mock('../services/api', () => ({
  api: {
    login: vi.fn(),
  },
}))

describe('Login', () => {
  it('renderiza el título y el botón de inicio', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
    expect(screen.getByRole('heading', { name: /efi- pos/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument()
  })

  it('muestra error cuando las credenciales son inválidas', async () => {
    const { api } = await import('../services/api')
    ;(api.login as any).mockRejectedValue(new Error('Credenciales inválidas'))
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )

    await user.type(screen.getByPlaceholderText(/correo@ejemplo/i), 'a@b.co')
    await user.type(screen.getByPlaceholderText('••••••'), 'incorrecta')
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))

    expect(await screen.findByText(/credenciales inválidas/i)).toBeInTheDocument()
  })
})