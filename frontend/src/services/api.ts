const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'

import { tenantParams } from './tenant'

async function request(path: string, options?: RequestInit) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...options?.headers as Record<string, string> | undefined,
  }

  let url = `${API_URL}${path}`
  // Append tenant context so superadmin/owner requests are scoped to the selected entity.
  // Skip any param already present in the URL (avoids duplicate branchId/businessId).
  const t = tenantParams()
  if (t) {
    const lower = path.toLowerCase()
    const add = t.slice(1).split('&').filter((seg) => {
      const key = seg.split('=')[0].toLowerCase()
      return !lower.includes(`${key}=`)
    })
    if (add.length) url += lower.includes('?') ? `&${add.join('&')}` : `?${add.join('&')}`
  }

  const res = await fetch(url, { ...options, headers })

  if (res.status === 401) {
    localStorage.removeItem('token')
    if (!window.location.pathname.startsWith('/login')) {
      window.history.pushState(null, '', '/login')
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  }

  if (res.status === 429) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error || 'Demasiadas peticiones. Intente más tarde.')
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
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),
  clients: {
    list: (q?: string) => request(`/clients${q ? `?q=${q}` : ''}`),
    getById: (id: number) => request(`/clients/${id}`),
    statement: (id: number) => request(`/clients/${id}/statement`),
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
    getStocks: (id: number) => request(`/products/${id}/stocks`),
    setStocks: (id: number, updates: any[]) => request(`/products/${id}/stocks`, { method: 'PUT', body: JSON.stringify({ updates }) }),
    create: (data: any) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request(`/products/${id}`, { method: 'DELETE' }),
    import: (data: { products: any[] }) => request('/products/import', { method: 'POST', body: JSON.stringify(data) }),

    importCsv: (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const token = localStorage.getItem('token')
      return fetch(`${API_URL}/products/import-csv${tenantParams()}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      }).then(async (res) => {
        if (res.status === 401) { localStorage.removeItem('token'); window.location.href = '/login' }
        if (!res.ok) { const err = await res.json().catch(() => ({ error: 'Error de conexión' })); throw new Error(err.error || 'Error desconocido') }
        return res.json()
      })
    },
  },
  quotes: {
    list: (params?: string) => request(`/quotes${params ? `?${params}` : ''}`),
    getById: (id: number) => request(`/quotes/${id}`),
    create: (data: any) => request('/quotes', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => request(`/quotes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    convert: (id: number) => request(`/quotes/${id}/convert`, { method: 'POST' }),
    delete: (id: number) => request(`/quotes/${id}`, { method: 'DELETE' }),
    print: (id: number) => request(`/quotes/print/${id}`),
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
    drafts: (q?: string) => request(`/invoices/drafts${q ? `?q=${encodeURIComponent(q)}` : ''}`),
    complete: (id: number, data?: any) =>
      request(`/invoices/${id}/complete`, { method: 'PATCH', body: data ? JSON.stringify(data) : undefined }),
    update: (id: number, data: any) =>
      request(`/invoices/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    abonar: (id: number, data: { amountBs: number; exchangeRate: number; requestKey?: string }) =>
      request(`/invoices/${id}/abonar`, { method: 'POST', body: JSON.stringify(data) }),
  },
  categories: {
    list: () => request('/categories'),
    create: (data: any) => request('/categories', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request(`/categories/${id}`, { method: 'DELETE' }),
  },
  inventory: {
    movements: (params?: string) => request(`/inventory/movements${params ? `?${params}` : ''}`),
    adjust: (data: any) => request('/inventory/adjust', { method: 'POST', body: JSON.stringify(data) }),
    history: (productId: number) => request(`/inventory/history/${productId}`),
  },
  payments: {
    list: (params?: string) => request(`/payments${params ? `?${params}` : ''}`),
    create: (data: any) => request('/payments', { method: 'POST', body: JSON.stringify(data) }),
    totals: (params: string) => request(`/payments/totals?${params}`),
  },
  accounts: {
    receivable: (params?: string) => request(`/accounts/receivable${params ? `?${params}` : ''}`),
    payable: (params?: string) => request(`/accounts/payable${params ? `?${params}` : ''}`),
  },
  search: {
    global: (q: string) => request(`/search?q=${encodeURIComponent(q)}`),
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
    dashboard: () => request('/reports/dashboard'),
  },
  brands: {
    list: () => request('/brands'),
    create: (data: any) => request('/brands', { method: 'POST', body: JSON.stringify(data) }),
  },
  attributeTemplates: {
    list: () => request('/attribute-templates'),
    create: (data: any) => request('/attribute-templates', { method: 'POST', body: JSON.stringify(data) }),
  },
  exchangeRate: {
    get: () => request('/exchange-rate'),
    update: (rate: number) => request('/exchange-rate', { method: 'PUT', body: JSON.stringify({ rate }) }),
    autoUpdate: () => request('/exchange-rate/auto-update', { method: 'POST' }),
    restoreAuto: () => request('/exchange-rate/restore-auto', { method: 'POST' }),
  },
  businesses: {
    list: () => request('/businesses'),
    getById: (id: number) => request(`/businesses/${id}`),
    create: (data: any) => request('/businesses', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => request(`/businesses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request(`/businesses/${id}`, { method: 'DELETE' }),
  },
  branches: {
    list: () => request('/branches/context'),
    byBusiness: (id: number) => request(`/branches/by-business/${id}`),
    getById: (id: number) => request(`/branches/${id}`),
    create: (data: any) => request('/branches', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => request(`/branches/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request(`/branches/${id}`, { method: 'DELETE' }),
  },
  users: {
    list: () => request('/users'),
    getById: (id: number) => request(`/users/${id}`),
    create: (data: any) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request(`/users/${id}`, { method: 'DELETE' }),
  },
}
