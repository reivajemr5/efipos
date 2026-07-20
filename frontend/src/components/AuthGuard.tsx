import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { api } from '../services/api'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { token, user, setAuth } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    const savedToken = localStorage.getItem('token')
    if (!savedToken) {
      navigate('/login')
      return
    }

    if (!token || !user) {
      api.me()
        .then((data) => setAuth(savedToken, data))
        .catch(() => {
          localStorage.removeItem('token')
          navigate('/login')
        })
    }
  }, [])

  if (!localStorage.getItem('token')) return null

  return <>{children}</>
}
