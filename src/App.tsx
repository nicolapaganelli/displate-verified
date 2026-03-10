import { useEffect, useMemo, useRef, useState } from 'react'
import TinderCard from 'react-tinder-card'
import { X, Check, Sparkles } from 'lucide-react'
import type { ArtistWithImages, StoredDecisions, VerificationDecision } from './lib/artistData'
import { fetchArtists, loadDecisions, saveDecisions } from './lib/artistData'

type SwipeDirection = 'left' | 'right'

function App() {
  const [artists, setArtists] = useState<ArtistWithImages[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [decisions, setDecisions] = useState<StoredDecisions>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDecisions(loadDecisions())
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true)
        const allArtists = await fetchArtists()
        setArtists(allArtists)
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }
    void load()
  }, [])

  const filteredArtists = useMemo(
    () => artists.filter((artist) => !decisions[artist.id]),
    [artists, decisions],
  )

  const activeIndex = Math.min(currentIndex, Math.max(filteredArtists.length - 1, 0))

  useEffect(() => {
    // Persist decisions whenever they change
    saveDecisions(decisions)
  }, [decisions])

  const topArtist = filteredArtists[activeIndex]

  const cardRefs = useRef<Array<React.RefObject<any>>>([])

  cardRefs.current = filteredArtists.map(
    (_, i) => cardRefs.current[i] ?? (cardRefs.current[i] = { current: null }),
  )

  const handleDecision = (artist: ArtistWithImages, decision: VerificationDecision) => {
    setDecisions((prev) => ({
      ...prev,
      [artist.id]: decision,
    }))
    setCurrentIndex((prev) => prev + 1)
  }

  const handleSwipe = (direction: SwipeDirection, artist: ArtistWithImages) => {
    if (direction === 'right') {
      handleDecision(artist, 'verified')
    } else if (direction === 'left') {
      handleDecision(artist, 'rejected')
    }
  }

  const triggerSwipe = (direction: SwipeDirection) => {
    const ref = cardRefs.current[activeIndex]
    if (ref?.current && topArtist) {
      ref.current.swipe(direction)
    }
  }

  const verifiedCount = useMemo(
    () => Object.values(decisions).filter((d) => d === 'verified').length,
    [decisions],
  )
  const rejectedCount = useMemo(
    () => Object.values(decisions).filter((d) => d === 'rejected').length,
    [decisions],
  )

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-start bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-6 text-slate-50">
      <header className="mb-6 flex w-full max-w-xl items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Sparkles className="h-6 w-6 text-emerald-400" />
            Displate Verified
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Swipe through artists and decide who deserves the Verified badge.
          </p>
        </div>
        <div className="rounded-xl bg-slate-900/70 px-3 py-2 text-xs text-slate-300 shadow-inner shadow-emerald-500/10">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Verified: {verifiedCount}</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-rose-400" />
            <span>Not verified: {rejectedCount}</span>
          </div>
        </div>
      </header>

      <main className="flex w-full max-w-xl flex-1 flex-col items-center justify-start gap-4">
        {isLoading && (
          <div className="flex h-80 w-full items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/60 shadow-xl shadow-black/40">
            <p className="text-sm text-slate-400">Loading artists…</p>
          </div>
        )}

        {!isLoading && error && (
          <div className="flex h-80 w-full items-center justify-center rounded-3xl border border-rose-500/40 bg-rose-950/40 px-6 text-center text-sm text-rose-100 shadow-xl shadow-black/40">
            <p>Could not load artists: {error}</p>
          </div>
        )}

        {!isLoading && !error && !topArtist && (
          <div className="flex h-80 w-full flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/60 px-6 text-center shadow-xl shadow-black/40">
            <p className="text-sm text-slate-300">
              You have evaluated all available artists in this dataset.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Clear your browser&apos;s local storage if you want to start over.
            </p>
          </div>
        )}

        {!isLoading && !error && topArtist && (
          <>
            <div className="relative flex h-[360px] max-h-[60vh] w-full items-center justify-center md:h-[420px] md:max-h-[65vh]">
              {filteredArtists
                .slice(activeIndex)
                .slice(0, 3)
                .map((artist, idx) => {
                  const absoluteIndex = activeIndex + idx
                  const scale = 1 - idx * 0.04
                  const translateY = idx * 12

                  return (
                    <TinderCard
                      ref={cardRefs.current[absoluteIndex]}
                      key={artist.id}
                      className="absolute flex h-full w-full select-none items-center justify-center"
                      onSwipe={(dir) => handleSwipe(dir as SwipeDirection, artist)}
                      preventSwipe={['up', 'down']}
                    >
                      <article
                        className="flex h-full w-full flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80 shadow-2xl shadow-black/50 backdrop-blur"
                        style={{
                          transform: `scale(${scale}) translateY(${translateY}px)`,
                          zIndex: filteredArtists.length - absoluteIndex,
                        }}
                      >
                        <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-0.5 bg-slate-950/60">
                          {artist.images.map((src, imageIndex) => (
                            <div
                              key={`${artist.id}-${imageIndex}`}
                              className="relative overflow-hidden bg-slate-900/80"
                            >
                              <img
                                src={src}
                                alt={`${artist.nick || artist.name} artwork ${imageIndex + 1}`}
                                className="h-full w-full object-cover transition-transform duration-500 ease-out hover:scale-105"
                                loading={imageIndex > 1 ? 'lazy' : 'eager'}
                              />
                            </div>
                          ))}
                        </div>
                      </article>
                    </TinderCard>
                  )
                })}
            </div>

            <div className="mt-4 flex w-full max-w-md items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Artist</span>
                <span className="text-sm font-medium text-slate-50">
                  {topArtist.nick || topArtist.name}
                </span>
                <a
                  href={topArtist.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-0.5 text-xs text-emerald-400 hover:text-emerald-300"
                >
                  View on Displate
                </a>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => triggerSwipe('left')}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-rose-500/50 bg-rose-500/10 text-rose-300 shadow-lg shadow-rose-900/40 transition hover:bg-rose-500/20 hover:text-rose-100"
                >
                  <X className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => triggerSwipe('right')}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/50 bg-emerald-500/10 text-emerald-300 shadow-lg shadow-emerald-900/40 transition hover:bg-emerald-500/20 hover:text-emerald-50"
                >
                  <Check className="h-5 w-5" />
                </button>
              </div>
            </div>

            <p className="mt-3 text-center text-xs text-slate-500">
              Swipe right to mark an artist as Verified, or left to skip them. Your decisions are
              stored locally so you won&apos;t see the same artist twice.
            </p>
          </>
        )}
      </main>
    </div>
  )
}

export default App
