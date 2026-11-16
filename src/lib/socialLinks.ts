const INSTAGRAM_RESERVED = new Set([
  'about',
  'accounts',
  'developer',
  'direct',
  'explore',
  'legal',
  'p',
  'reel',
  'reels',
  'stories',
  'tv',
])

export interface ParsedSocialLink {
  value: string | null
  error: string | null
}

export function parseInstagram(input: string): ParsedSocialLink {
  const raw = input.trim()
  if (!raw) return { value: null, error: null }

  let handle = raw
  const looksLikeUrl = /instagram\.com/i.test(raw) || /^https?:\/\//i.test(raw)
  if (looksLikeUrl) {
    let url: URL
    try {
      url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
    } catch {
      return { value: null, error: 'Enter a valid Instagram username or profile URL.' }
    }
    const host = url.hostname.replace(/^www\./i, '')
    if (host !== 'instagram.com') {
      return { value: null, error: 'Enter a valid Instagram username or profile URL.' }
    }
    const parts = url.pathname.split('/').filter(Boolean)
    if (parts.length === 0 || INSTAGRAM_RESERVED.has(parts[0].toLowerCase())) {
      return { value: null, error: 'Enter an Instagram profile, not a post or page link.' }
    }
    handle = decodePathPart(parts[0])
  }

  handle = handle.replace(/^@+/, '')
  if (
    !/^[A-Za-z0-9._]{1,30}$/.test(handle) ||
    handle.startsWith('.') ||
    handle.endsWith('.') ||
    handle.includes('..')
  ) {
    return {
      value: null,
      error: 'Enter a valid Instagram username (letters, numbers, periods, and underscores).',
    }
  }

  return { value: handle, error: null }
}

export function parseLinkedIn(input: string): ParsedSocialLink {
  const raw = input.trim()
  if (!raw) return { value: null, error: null }

  const invalid = 'Enter a LinkedIn profile URL, like linkedin.com/in/your-name.'

  if (/linkedin\.com/i.test(raw) || /^https?:\/\//i.test(raw)) {
    let url: URL
    try {
      url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
    } catch {
      return { value: null, error: invalid }
    }
    const host = url.hostname.replace(/^www\./i, '')
    if (host !== 'linkedin.com' && !host.endsWith('.linkedin.com')) {
      return { value: null, error: invalid }
    }
    const match = url.pathname.match(/^\/(in|company|school)\/([^/]+)/i)
    if (!match) return { value: null, error: invalid }
    return linkedInUrl(match[1], decodePathPart(match[2]), invalid)
  }

  const prefixed = raw.replace(/^@+/, '').replace(/^\/+/, '')
  const prefixedMatch = prefixed.match(/^(in|company|school)\/([^/?#]+)\/?$/i)
  if (prefixedMatch) {
    return linkedInUrl(prefixedMatch[1], prefixedMatch[2], invalid)
  }

  return linkedInUrl('in', prefixed, invalid)
}

export function instagramProfileUrl(username: string): string {
  return `https://www.instagram.com/${encodeURIComponent(username)}/`
}

export function linkedInLabel(url: string): string {
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean)
    const slug = decodePathPart(parts[1] || '')
    if (!slug) return 'LinkedIn'
    return slug.replace(/-/g, ' ')
  } catch {
    return 'LinkedIn'
  }
}

function linkedInUrl(kind: string, slug: string, invalid: string): ParsedSocialLink {
  if (!isLinkedInSlug(slug)) return { value: null, error: invalid }
  return {
    value: `https://www.linkedin.com/${kind.toLowerCase()}/${encodeURIComponent(slug)}`,
    error: null,
  }
}

function isLinkedInSlug(slug: string): boolean {
  return /^[\p{L}\p{N}\-_]{3,100}$/u.test(slug) && !slug.startsWith('-') && !slug.endsWith('-')
}

function decodePathPart(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}
