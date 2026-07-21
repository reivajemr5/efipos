const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'

async function request(path: string, options?: RequestInit) {
  const token = localStorage.getItem('token')
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...options?.headers as Record<string, string> | undefined }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })

  if (res.status === 401) {
    localStorage.removeItem('token')
    window.location.href = '/login'
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error de conexión' }))
    throw new Error(err.error || 'Error desconocido')
  }

  return res.json()
}

export const api = {
  login: (email: string, password: string) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request('/auth/me'),
  clients: {
    list: (q?: string) => request(`/clients${q ? `?q=${q}` : ''}`),
    getById: (id: number) => request(`/clients/${id}`),
    create: (data: any) => request('/clients', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => request(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request(`/clients/${id}`, { method: 'DELETE' }),
  },
  suppliers: {
    list: (q?: string) => request(`/suppliers${q ? `?q=${q}` : ''}`),
    getById: (id: number) => request(`/suppliers/${id}`),
    create: (data: any) => request('/suppliers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => request(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request(`/suppliers/${id}`, { method: 'DELETE' }),
  },
  products: {
    list: (params?: string) => request(`/products${params ? `?${params}` : ''}`),
    getById: (id: number) => request(`/products/${id}`),
    create: (data: any) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request(`/products/${id}`, { method: 'DELETE' }),
  },
  quotes: {
    list: () => request('/quotes'),
    getById: (id: number) => request(`/quotes/${id}`),
    create: (data: any) => request('/quotes', { method: 'POST', body: JSON.stringify(data) }),
    convert: (id: number) => request(`/quotes/${id}/convert`, { method: 'POST' }),
    delete: (id: number) => request(`/quotes/${id}`, { method: 'DELETE' }),
  },
  purchases: {
    list: (params?: string) => request(`/purchases${params ? `?${params}` : ''}`),
    getById: (id: number) => request(`/purchases/${id}`),
    create: (data: any) => request('/purchases', { method: 'POST', body: JSON.stringify(data) }),
    receive: (id: number, data?: any) => request(`/purchases/${id}/receive`, { method: 'POST', body: data ? JSON.stringify(data) : undefined }),
    pay: (id: number) => request(`/purchases/${id}/pay`, { method: 'POST' }),
    cancel: (id: number) => request(`/purchases/${id}/cancel`, { method: 'POST' }),
  },
  invoices: {
    list: (params?: string) => request(`/invoices${params ? `?${params}` : ''}`),
    getById: (id: number) => request(`/invoices/${id}`),
    create: (data: any) => request('/invoices', { method: 'POST', body: JSON.stringify(data) }),
    cancel: (id: number) => request(`/invoices/${id}/cancel`, { method: 'POST' }),
    print: (id: number) => request(`/invoices/print/${id}`),
  },
  reports: {
    sales: (dateFrom?: string, dateTo?: string) => {
      const params = new URLSearchParams()
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      return request(`/reports/sales?${params}`)
    },
    topProducts: (dateFrom?: string, dateTo?: string) => {
      const params = new URLSearchParams()
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      params.set('limit', '10')
      return request(`/reports/top-products?${params}`)
    },
    cashClose: (date?: string) => request(`/reports/cash-close${date ? `?date=${date}` : ''}`),
    saveCashClose: (declaredTotal: number, closeDate?: string) =>
      request('/reports/cash-close', { method: 'POST', body: JSON.stringify({ declaredTotal, closeDate }) }),
  },
  purchases: {
    list: (params?: string) => request(`/purchases${params ? `?${params}` : ''}`),
    getById: (id: number) => request(`/purchases/${id}`),
    create: (data: any) => request('/purchases', { method: 'POST', body: JSON.stringify(data) }),
    receive: (id: number, data: any) => request(`/purchases/${id}/receive`, { method: 'POST', body: JSON.stringify(data) }),
    pay: (id: number) => request(`/purchases/${id}/pay`, { method: 'POST' }),
    cancel: (id: number) => request(`/purchases/${id}/cancel`, { method: 'POST' }),
  },
  exchangeRate: {
    get: () => request('/exchange-rate'),
    update: (rate: number) => request('/exchange-rate', { method: 'PUT', body: JSON.stringify({ rate }) }),
    autoUpdate: () => request('/exchange-rate/auto-update', { method: 'POST' }),
  },
}
