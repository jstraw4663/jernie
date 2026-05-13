// buildHotelDetailConfig — normalizes an accommodation Booking into a DetailConfig.
//
// Embeds DateTimeRangeModule for check-in/out editing and DistanceModule for
// travel estimates. All user edits are written through the onBookingChange
// callback — the caller (parent component) owns the Firebase write queue mutation.
//
// TODO (Phase 2): hotel photo from Google Places API
// TODO (Phase 2): hotel amenities from Google Places Details API
// TODO (Phase 2): Wi-Fi info from booking provider API

import { useState } from 'react';
import type { Booking, PlaceEnrichment, Stop } from '../../../types';
import { Icons } from '../../../design/icons';
import { IconColors, Semantic } from '../../../design/tokens';
import { ReviewCarousel } from '../components/ReviewCarousel';
import type { DetailConfig, DetailRow, DetailSectionConfig } from '../detailTypes';
import { Colors, Spacing, Radius, Typography } from '../../../design/tokens';
import { domainFromUrl, brandLogoUrl, brandColor, labelToBrandDomain } from '../brandAssets';
import { appleMapsUrl } from '../../../domain/trip';
import { DateTimeRangeModule } from '../components/DateTimeRangeModule';
import { DistanceModule } from '../components/DistanceModule';
import { section } from './utils';
import { resolveStopColor } from '../../../design/tripPacks';

// ── StayTimeline ──────────────────────────────────────────────────────────
// Read-only horizontal stay timeline in the detail sheet.
// DateTimeRangeModule below handles editing.

interface StayTimelineProps {
  checkinDate: string | null;
  checkinTime: string | null;
  checkoutDate: string | null;
  checkoutTime: string | null;
  accent: string;
}

function fmtDetailDate(d: string | null): string {
  if (!d) return 'TBD';
  const dt = new Date(d + 'T12:00:00');
  return dt.toLocaleString('en-US', { month: 'short', day: 'numeric' });
}

function fmtDetailTime(t: string | null): string {
  if (!t) return '';
  const [hStr, mStr] = t.split(':');
  const h = parseInt(hStr, 10);
  const m = mStr ?? '00';
  return `${h % 12 || 12}:${m} ${h >= 12 ? 'PM' : 'AM'}`;
}

function nightsCount(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const n = Math.round((new Date(end + 'T12:00:00').getTime() - new Date(start + 'T12:00:00').getTime()) / 86_400_000);
  return n > 0 ? n : null;
}

function StayTimeline({ checkinDate, checkinTime, checkoutDate, checkoutTime, accent }: StayTimelineProps) {
  const nights = nightsCount(checkinDate, checkoutDate);
  const checkinTbd = !checkinDate;
  const checkoutTbd = !checkoutDate;

  return (
    <div style={{
      background: Colors.surface2,
      borderRadius: Radius.md,
      padding: `${Spacing.md}px`,
      marginBottom: `${Spacing.xs}px`,
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(72px, auto) 1fr minmax(72px, auto)',
        gridTemplateRows: '16px auto auto',
        alignItems: 'center',
        justifyItems: 'center',
        rowGap: 4,
      }}>
        {/* Row 1: nights label above track */}
        <div />
        <div style={{
          fontSize: `${Typography.size.xs}px`,
          color: Colors.textMuted,
          fontFamily: Typography.family.sans,
          whiteSpace: 'nowrap' as const,
        }}>
          {nights != null ? `${nights} night${nights !== 1 ? 's' : ''}` : ''}
        </div>
        <div />

        {/* Row 2: dot — bed-icon line — dot */}
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          border: `2px solid ${accent}`,
          background: Colors.surfaceRaised,
        }} />
        <div style={{ width: '100%', height: 1.5, background: Colors.border, position: 'relative' }}>
          <span style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'inline-flex',
            background: Colors.surface2,
            padding: '0 3px',
            lineHeight: 1,
          }}>
            <Icons.Hotel size={15} color={accent} weight="duotone" />
          </span>
        </div>
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          border: `2px solid ${Semantic.success}`,
          background: Colors.surfaceRaised,
        }} />

        {/* Row 3: check-in | — | check-out */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, textAlign: 'center' as const }}>
          <div style={{
            fontSize: `${Typography.size.base}px`,
            fontWeight: Typography.weight.bold,
            color: checkinTbd ? Colors.textMuted : Colors.textPrimary,
            fontFamily: Typography.family.sans,
            lineHeight: 1,
          }}>
            {fmtDetailDate(checkinDate)}
          </div>
          <div style={{
            fontSize: 10,
            fontWeight: Typography.weight.semibold,
            color: accent,
            fontFamily: Typography.family.sans,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.08em',
          }}>
            Check-in
          </div>
          {checkinTime && (
            <div style={{ fontSize: 10, color: Colors.textMuted, fontFamily: Typography.family.sans }}>
              {fmtDetailTime(checkinTime)}
            </div>
          )}
        </div>

        <div />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, textAlign: 'center' as const }}>
          <div style={{
            fontSize: `${Typography.size.base}px`,
            fontWeight: Typography.weight.bold,
            color: checkoutTbd ? Colors.textMuted : Colors.textPrimary,
            fontFamily: Typography.family.sans,
            lineHeight: 1,
          }}>
            {fmtDetailDate(checkoutDate)}
          </div>
          <div style={{
            fontSize: 10,
            fontWeight: Typography.weight.semibold,
            color: Semantic.success,
            fontFamily: Typography.family.sans,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.08em',
          }}>
            Check-out
          </div>
          {checkoutTime && (
            <div style={{ fontSize: 10, color: Colors.textMuted, fontFamily: Typography.family.sans }}>
              {fmtDetailTime(checkoutTime)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── AmenityPills ──────────────────────────────────────────────────────────

interface AmenityPillsProps {
  amenities: string[];
  accent: string;
}

function AmenityPills({ amenities, accent }: AmenityPillsProps) {
  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap' as const,
      gap: `${Spacing.xs}px`,
      padding: `${Spacing.sm}px 0`,
    }}>
      {amenities.map((label) => (
        <div key={label} style={{
          background: `${accent}18`,
          color: accent,
          borderRadius: Radius.full,
          padding: '4px 12px',
          fontSize: `${Typography.size.xs}px`,
          fontWeight: Typography.weight.bold,
          fontFamily: Typography.family.sans,
          whiteSpace: 'nowrap' as const,
        }}>
          {label}
        </div>
      ))}
    </div>
  );
}

// ── Inline editable field ─────────────────────────────────────────────────
// Rendered as a module row — styled <input> matching card surface aesthetics.

interface EditableFieldProps {
  label: string;
  value: string | null;
  placeholder: string;
  onChange: (val: string) => void;
}

function EditableField({ label, value, placeholder, onChange }: EditableFieldProps) {
  // Local state for optimistic UI — Firebase write fires on change but trip.json
  // doesn't reflect it until Phase 2 adds a booking-field listener.
  const [localValue, setLocalValue] = useState(value ?? '');

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: `${Spacing.sm}px`,
        padding: `${Spacing.sm}px 0`,
        borderBottom: `1px solid ${Colors.border}`,
      }}
    >
      <span
        style={{
          fontFamily: Typography.family.sans,
          fontSize: `${Typography.size.sm}px`,
          color: Colors.textMuted,
          flexShrink: 0,
          minWidth: 80,
        }}
      >
        {label}
      </span>
      <input
        type="text"
        value={localValue}
        placeholder={placeholder}
        aria-label={label}
        onChange={e => {
          setLocalValue(e.target.value);
          onChange(e.target.value);
        }}
        onFocus={e => {
          // Scroll into view within the sheet's scroll container, not the page.
          const target = e.currentTarget;
          setTimeout(() => target.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 320);
        }}
        onBlur={() => {
          // iOS may scroll the document when an input inside a fixed container is focused.
          // Reset on dismiss so the sheet snaps back cleanly.
          requestAnimationFrame(() => {
            window.scrollTo(0, 0);
            document.documentElement.scrollTop = 0;
          });
        }}
        style={{
          flex: 1,
          fontFamily: Typography.family.sans,
          fontSize: `${Typography.size.sm}px`,
          color: Colors.textPrimary,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          padding: `${Spacing.xs}px 0`,
          minHeight: 44,
          borderRadius: `${Radius.sm}px`,
        }}
      />
    </div>
  );
}

// ── Builder ───────────────────────────────────────────────────────────────

export function buildHotelDetailConfig(
  booking: Booking,
  stop: Stop,
  _stops: Stop[],
  onBookingChange: (field: keyof Booking, value: string | null) => void,
  enrichment?: PlaceEnrichment,
): DetailConfig {
  const stopColor = resolveStopColor(stop);
  // Brand logo + gradient (same pattern as buildBookingDetailConfig)
  const domain = (booking.url ? domainFromUrl(booking.url) : null)
    ?? labelToBrandDomain(booking.label);
  const logoUrl = domain ? brandLogoUrl(domain) : null;
  const accent = (domain ? brandColor(domain) : null) ?? '#2D6A8F';
  const heroGradient = `linear-gradient(145deg, ${accent} 0%, ${Colors.navy} 100%)`;

  // ── Your Stay section ─────────────────────────────────────────
  const stayRows: DetailRow[] = [
    {
      label: '', value: '',
      component: (
        <StayTimeline
          checkinDate={booking.checkin_date ?? null}
          checkinTime={booking.checkin_time ?? null}
          checkoutDate={booking.checkout_date ?? null}
          checkoutTime={booking.checkout_time ?? null}
          accent={stopColor}
        />
      ),
    },
    {
      label: '', value: '',
      component: (
        <DateTimeRangeModule
          startLabel="Check-in"
          endLabel="Check-out"
          startIcon={<Icons.Key size={16} weight="duotone" color={IconColors.accommodation} />}
          endIcon={<Icons.DoorOpen size={16} weight="duotone" color={IconColors.accommodation} />}
          durationUnit="nights"
          startDate={booking.checkin_date ?? null}
          startTime={booking.checkin_time ?? null}
          endDate={booking.checkout_date ?? null}
          endTime={booking.checkout_time ?? null}
          onStartDateChange={v => onBookingChange('checkin_date', v)}
          onStartTimeChange={v => onBookingChange('checkin_time', v)}
          onEndDateChange={v => onBookingChange('checkout_date', v)}
          onEndTimeChange={v => onBookingChange('checkout_time', v)}
        />
      ),
    },
    {
      label: '', value: '',
      component: (
        <EditableField
          label="Room type"
          value={booking.room_type ?? null}
          placeholder="e.g. King, Double Queen"
          onChange={v => onBookingChange('room_type', v || null)}
        />
      ),
    },
    {
      label: '', value: '',
      component: (
        <EditableField
          label="Room #"
          value={booking.room_number ?? null}
          placeholder="e.g. 412"
          onChange={v => onBookingChange('room_number', v || null)}
        />
      ),
    },
  ];

  // ── Location section ──────────────────────────────────────────
  const locationRows: DetailRow[] = [];
  const displayAddr = enrichment?.addr ?? booking.addr ?? null;
  if (displayAddr) {
    locationRows.push({
      label: 'Address',
      value: displayAddr,
      link: appleMapsUrl(displayAddr),
    });
  }
  if (enrichment?.phone) {
    locationRows.push({ label: 'Phone', value: enrichment.phone, link: `tel:${enrichment.phone}` });
  }
  const websiteUrl = enrichment?.website ?? booking.url ?? null;
  if (websiteUrl) {
    locationRows.push({ label: 'Website', value: 'Open hotel site', link: websiteUrl });
  }
  locationRows.push({
    label: '', value: '',
    component: (
      <DistanceModule
        originAddr={booking.addr ?? null}
        originLat={null}
        originLon={null}
        stopId={stop.id}
      />
    ),
  });

  // ── Booking section ───────────────────────────────────────────
  const bookingRows: DetailRow[] = [];
  if (booking.confirmation) {
    bookingRows.push({ label: 'Confirmation #', value: booking.confirmation });
  }
  if (booking.confirmation_link) {
    bookingRows.push({
      label: 'Manage booking',
      value: booking.confirmation_link.label,
      link: booking.confirmation_link.url,
    });
  }
  if (booking.note) {
    bookingRows.push({ label: 'Notes', value: booking.note });
  }

  // ── More Details — editorial summary + reviews ────────────────
  const moreRows: DetailRow[] = [];
  if (enrichment?.editorial_summary) {
    moreRows.push({ label: 'About', value: enrichment.editorial_summary });
  }
  if (enrichment?.open_now != null) {
    moreRows.push({ label: 'Status', value: enrichment.open_now ? 'Open now' : 'Closed' });
  }
  if (enrichment?.hours) {
    enrichment.hours.forEach(line => moreRows.push({ label: '', value: line }));
  }

  // ── Reviews section ───────────────────────────────────────────
  const reviewRows: DetailRow[] = [];
  if (enrichment?.reviews?.length) {
    reviewRows.push({
      label: '', value: '',
      component: (
        <ReviewCarousel
          reviews={enrichment.reviews}
          googlePlaceId={enrichment.google_place_id}
          placeName={booking.label}
        />
      ),
    });
  }

  const sections: DetailSectionConfig[] = [
    section('Your Stay', stayRows),
    ...(enrichment?.amenities?.length
      ? [section('Amenities', [{
          label: '', value: '',
          component: <AmenityPills amenities={enrichment.amenities} accent={stopColor} />,
        }])]
      : []),
    section('Location', locationRows),
    section('Booking', bookingRows),
    ...(moreRows.length > 0 ? [section('About', moreRows)] : []),
    ...(reviewRows.length > 0 ? [section('Reviews', reviewRows)] : []),
  ].filter((s): s is DetailSectionConfig => s !== null);

  // Safety net
  if (sections.length === 0) {
    sections.push({ title: 'Info', rows: [{ label: 'Type', value: 'Accommodation' }, { label: 'Stop', value: stop.city }] });
  }

  const photos = enrichment?.photos ?? undefined;

  return {
    kind: 'booking',
    title: booking.label,
    subtitle: `Accommodation · ${stop.city}`,
    heroEmoji: <Icons.Hotel size={36} weight="duotone" color={IconColors.accommodation} />,
    heroGradient,
    heroLogoUrl: logoUrl ?? undefined,
    heroPhotoUrl: photos?.[0] ?? undefined,
    categoryChip: 'Accommodation',
    mapLat: stop.lat,
    mapLon: stop.lon,
    mapAddr: displayAddr ?? undefined,
    photos: photos && photos.length > 1 ? photos.slice(1) : undefined,
    sections,
    externalUrl: websiteUrl ?? undefined,
    phone: enrichment?.phone ?? undefined,
    stopAccent: stopColor,
    stopLabel: stop.city,
    placeId: booking.id,
    googlePlaceId: enrichment?.google_place_id,
  };
}
