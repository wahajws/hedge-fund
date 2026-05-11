export function paginate(rows, { limit = 50, cursor } = {}) {
  const parsedLimit = Math.min(Math.max(Number(limit) || 50, 1), 250);
  const start = cursor ? Math.max(Number(cursor) || 0, 0) : 0;
  const page = rows.slice(start, start + parsedLimit);
  const nextCursor = start + parsedLimit < rows.length ? String(start + parsedLimit) : null;
  return {
    rows: page,
    pageInfo: {
      limit: parsedLimit,
      cursor: cursor ?? null,
      nextCursor,
      total: rows.length
    }
  };
}

