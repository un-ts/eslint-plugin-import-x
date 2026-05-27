export interface ParsedPath {
  pathname: string
  query: string
  hash: string
}

export const parsePath = (path: string): ParsedPath => {
  const hashIndex = path.indexOf('#')
  const queryIndex = path.indexOf('?')
  // A `#` at index 0 is the sigil for a Node.js subpath import (e.g.
  // `#utils/helper`), not a URL hash fragment, so it must stay in `pathname`.
  const hasHash = hashIndex > 0
  const hash = hasHash ? path.slice(hashIndex) : ''
  const hasQuery = queryIndex !== -1 && (!hasHash || queryIndex < hashIndex)
  const query = hasQuery
    ? path.slice(queryIndex, hasHash ? hashIndex : undefined)
    : ''
  const pathname = hasQuery
    ? path.slice(0, queryIndex)
    : hasHash
      ? path.slice(0, hashIndex)
      : path
  return { pathname, query, hash }
}

export const stringifyPath = ({ pathname, query, hash }: ParsedPath) =>
  pathname + query + hash
