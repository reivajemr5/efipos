export function parsePagination(query: any) {
  const hasPagination = query?.limit !== undefined || query?.offset !== undefined
  const limit = Math.min(Math.max(Number(query?.limit) || 25, 1), 100)
  const offset = Math.max(Number(query?.offset) || 0, 0)
  return { limit, offset, hasPagination }
}

export async function paginate(model: any, findArgs: any, limit: number, offset: number) {
  const [items, total] = await Promise.all([
    model.findMany({ ...findArgs, skip: offset, take: limit }),
    model.count({ where: findArgs.where }),
  ])
  return { items, total, hasMore: offset + items.length < total }
}
