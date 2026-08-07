import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { api } from '../services/api'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { token, user, setAuth } = useAuthStore()
  const navigate = useNavigate()
  const savedToken = localStorage.getItem('token')

  useEffect(() => {
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
  }, [token, user, savedToken])

  if (!savedToken) return null

  return <>{children}</>
}