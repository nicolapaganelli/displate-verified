import Papa from 'papaparse'

export type VerificationDecision = 'verified' | 'rejected'

export interface ArtistRecord {
  id: string
  url: string
  urlByNew?: string
  nick: string
  name: string
}

export interface ArtistWithImages extends ArtistRecord {
  images: string[]
}

// Public asset served from the Vite `public` folder, respecting Vite `base`
const TSV_PATH = `${import.meta.env.BASE_URL}art-origins-verified-creators.tsv`

const LOCAL_STORAGE_KEY = 'displate-verified-decisions'

export type StoredDecisions = Record<string, VerificationDecision>

export function loadDecisions(): StoredDecisions {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as StoredDecisions
  } catch {
    return {}
  }
}

export function saveDecisions(decisions: StoredDecisions) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(decisions))
  } catch {
    // ignore write errors
  }
}

function rowToArtist(row: Record<string, string>): ArtistRecord | null {
  const id = row['ID'] ?? row['Id'] ?? row['id']
  const url = row['URL'] ?? row['Url'] ?? row['url']
  const urlByNew = row['URL by NEW'] ?? row['Url by NEW'] ?? row['urlByNew']
  const nick = row['Nick'] ?? row['nick'] ?? ''
  const name = row['Name'] ?? row['name'] ?? ''

  if (!id || !url) return null

  return {
    id: String(id),
    url: String(url),
    urlByNew: urlByNew ? String(urlByNew) : undefined,
    nick: String(nick),
    name: String(name),
  }
}

function createArtworkImages(artist: ArtistRecord): string[] {
  const baseUrl = artist.urlByNew || artist.url

  // Prefer direct image URLs when the TSV URL already points to an image.
  const looksLikeImage = (u: string | undefined) =>
    !!u && /\.(png|jpe?g|webp|gif)$/i.test(u.split('?')[0] ?? '')

  if (looksLikeImage(baseUrl)) {
    return [baseUrl, baseUrl, baseUrl, baseUrl]
  }

  // Fallback: derive 4 deterministic placeholder images from the artist info
  // using a more reliable placeholder service.
  const seed = encodeURIComponent(artist.nick || artist.name || artist.id)

  const placeholders = [
    `https://picsum.photos/seed/${seed}-1/600/600`,
    `https://picsum.photos/seed/${seed}-2/600/600`,
    `https://picsum.photos/seed/${seed}-3/600/600`,
    `https://picsum.photos/seed/${seed}-4/600/600`,
  ]

  return placeholders
}

export async function fetchArtists(): Promise<ArtistWithImages[]> {
  const response = await fetch(TSV_PATH)
  if (!response.ok) {
    throw new Error(`Failed to fetch TSV: ${response.status}`)
  }

  const text = await response.text()

  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    delimiter: '\t',
    skipEmptyLines: true,
  })

  const artists: ArtistWithImages[] = []

  for (const row of parsed.data) {
    const artist = rowToArtist(row)
    if (!artist) continue
    artists.push({
      ...artist,
      images: createArtworkImages(artist),
    })
  }

  // Shuffle so each session feels different
  for (let i = artists.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[artists[i], artists[j]] = [artists[j], artists[i]]
  }

  return artists
}

