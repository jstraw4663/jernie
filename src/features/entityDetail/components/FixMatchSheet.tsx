// FixMatchSheet — lets the user search and manually link a place to a Google Place.
// Opens as a vaul half-sheet on top of the entity detail sheet (z: 350).
// Saves the override to RTDB via onSelectGooglePlace, then closes automatically.

import { useState, useCallback } from 'react';
import { Drawer } from 'vaul';
import { Core, Semantic, Spacing, Radius, Typography, Colors } from '../../../design/tokens';
import { DragPill } from '../../../components/DragPill';

interface SearchResult {
  id: string;
  name: string;
  formattedAddress: string;
  rating: number | null;
}

interface FixMatchSheetProps {
  isOpen: boolean;
  onClose: () => void;
  placeName: string;
  currentGooglePlaceId?: string;
  onSelectGooglePlace: (googlePlaceId: string) => Promise<void>;
  biasLat?: number;
  biasLon?: number;
}

export function FixMatchSheet({
  isOpen,
  onClose,
  placeName,
  currentGooglePlaceId,
  onSelectGooglePlace,
  biasLat,
  biasLon,
}: FixMatchSheetProps) {
  const [query, setQuery] = useState(placeName);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const search = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setSearchError(null);
    setResults([]);
    try {
      const res = await fetch('/.netlify/functions/place-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Token': import.meta.env.VITE_APP_SECRET ?? '',
        },
        body: JSON.stringify({ query: q, lat: biasLat, lon: biasLon }),
      });
      if (!res.ok) throw new Error(`Search failed (${res.status})`);
      const data = await res.json();
      setResults(data.places ?? []);
      if ((data.places ?? []).length === 0) setSearchError('No results. Try a different search.');
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  }, [query]);

  const handleSelect = async (result: SearchResult) => {
    setSavingId(result.id);
    try {
      await onSelectGooglePlace(result.id);
      setSavedId(result.id);
      setTimeout(() => onClose(), 1200);
    } catch {
      setSavingId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') search();
  };

  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={open => { if (!open) onClose(); }}
    >
      <Drawer.Portal>
        <Drawer.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.3)',
            zIndex: 349,
          }}
        />
        <Drawer.Content
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: '65%',
            background: Colors.background,
            borderTopLeftRadius: Radius.xl,
            borderTopRightRadius: Radius.xl,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 350,
            outline: 'none',
          }}
          aria-label="Fix Google Match"
        >
          <DragPill height={20} />

          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: `0 ${Spacing.base}px ${Spacing.xl}px`,
            gap: Spacing.sm,
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              fontFamily: Typography.family.sans,
              fontSize: `${Typography.size.xs}px`,
              fontWeight: Typography.weight.bold,
              color: Core.textMuted,
              letterSpacing: '0.1em',
              textTransform: 'uppercase' as const,
            }}>
              Fix Google Match
            </div>

            {currentGooglePlaceId && (
              <div style={{
                fontFamily: Typography.family.sans,
                fontSize: `${Typography.size.xs}px`,
                color: Core.textFaint,
              }}>
                Current ID: {currentGooglePlaceId}
              </div>
            )}

            {/* Search row */}
            <div style={{ display: 'flex', gap: Spacing.sm }}>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search Google Places…"
                autoComplete="off"
                style={{
                  flex: 1,
                  border: `1px solid ${Core.border}`,
                  borderRadius: Radius.md,
                  padding: `${Spacing.sm}px ${Spacing.base}px`,
                  fontFamily: Typography.family.sans,
                  fontSize: `${Typography.size.sm}px`,
                  background: Core.surfaceMuted,
                  color: Core.text,
                  outline: 'none',
                }}
              />
              <button
                onClick={search}
                disabled={searching}
                style={{
                  border: 'none',
                  borderRadius: Radius.md,
                  padding: `${Spacing.sm}px ${Spacing.base}px`,
                  background: Core.text,
                  color: Core.white,
                  fontFamily: Typography.family.sans,
                  fontSize: `${Typography.size.sm}px`,
                  fontWeight: Typography.weight.semibold,
                  cursor: searching ? 'default' : 'pointer',
                  opacity: searching ? 0.5 : 1,
                  flexShrink: 0,
                }}
              >
                {searching ? '…' : 'Search'}
              </button>
            </div>

            {/* Error */}
            {searchError && (
              <div style={{
                fontFamily: Typography.family.sans,
                fontSize: `${Typography.size.xs}px`,
                color: Semantic.error,
              }}>
                {searchError}
              </div>
            )}

            {/* Results list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {results.map(result => {
                const isSaving = savingId === result.id;
                const isSaved  = savedId  === result.id;
                return (
                  <button
                    key={result.id}
                    onClick={() => handleSelect(result)}
                    disabled={savingId !== null}
                    style={{
                      width: '100%',
                      border: 'none',
                      borderBottom: `1px solid ${Core.border}`,
                      padding: `${Spacing.sm}px 0`,
                      background: 'none',
                      textAlign: 'left',
                      cursor: savingId ? 'default' : 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{
                        fontFamily: Typography.family.sans,
                        fontSize: `${Typography.size.sm}px`,
                        fontWeight: Typography.weight.semibold,
                        color: isSaved ? Semantic.success : Core.text,
                      }}>
                        {isSaved ? '✓ Saved' : isSaving ? 'Saving…' : result.name}
                      </span>
                      {result.rating && !isSaved && (
                        <span style={{
                          fontFamily: Typography.family.sans,
                          fontSize: `${Typography.size.xs}px`,
                          color: Core.textMuted,
                        }}>
                          ★ {result.rating}
                        </span>
                      )}
                    </div>
                    {!isSaved && (
                      <span style={{
                        fontFamily: Typography.family.sans,
                        fontSize: `${Typography.size.xs}px`,
                        color: Core.textMuted,
                      }}>
                        {result.formattedAddress}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
