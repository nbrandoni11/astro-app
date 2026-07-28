'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import styles from './onboarding.module.css';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos (sin cambios)
// ─────────────────────────────────────────────────────────────────────────────
interface CityResult {
  name: string;
  country: string;
  admin1: string;
  lat: number;
  lon: number;
  timezone: string;
  tzone: number | null;
  label: string;
  displayLabel?: string;
  resolvedLabel?: string;
  isFallback?: boolean;
  matchReason?: string;
}

interface FormData {
  full_name: string;
  email: string;
  birth_day: string;
  birth_month: string;
  birth_year: string;
  birth_hour: string;
  birth_min: string;
  phone_whatsapp: string;
}

interface BirthPlace {
  displayLabel: string;
  resolvedLabel: string;
  lat: number | null;
  lon: number | null;
  tzone: number | null;
  isFallback: boolean;
  matchReason?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Match reason labels (sin cambios)
// ─────────────────────────────────────────────────────────────────────────────
const matchReasonLabels: Record<string, string> = {
  exact_match: 'Coincidencia exacta',
  priority_barrio: 'Barrio reconocido',
  priority_barrio_reference: 'Barrio reconocido',
  fallback_city_or_province: 'Ubicación aproximada',
  priority_caba: 'Nombre alternativo reconocido',
  priority_province: 'Nombre alternativo reconocido',
  priority_alternative: 'Nombre alternativo reconocido',
};

function MatchReasonBadge({ reason }: { reason?: string }) {
  if (!reason) return null;
  const text = matchReasonLabels[reason] || 'Coincidencia';

  let cls = styles.badgeNeutral;
  if (reason === 'exact_match') cls = styles.badgeExact;
  else if (reason.startsWith('priority_barrio')) cls = styles.badgeBarrio;
  else if (reason === 'fallback_city_or_province') cls = styles.badgeFallback;
  else if (reason.startsWith('priority_')) cls = styles.badgePriority;

  return <span className={`${styles.matchBadge} ${cls}`}>{text}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// BirthPlaceSearch (lógica intacta, UI rediseñada)
// ─────────────────────────────────────────────────────────────────────────────
function BirthPlaceSearch({
  onSelect,
  error,
}: {
  onSelect: (city: CityResult, inputText: string) => void;
  error?: string;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      setNotFound(false);
      return;
    }
    setLoading(true);
    setNotFound(false);
    try {
      const res = await fetch(`/api/search-birth-place?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.ok) {
        setResults(data.results);
        setOpen(true);
        setNotFound(data.results.length === 0);
      }
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  };

  const handleSelect = (city: CityResult) => {
    const inputText = query;
    setResults([]);
    setOpen(false);
    setNotFound(false);
    if (!city.isFallback) {
      setQuery(city.label);
    }
    onSelect(city, inputText);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className={styles.searchContainer}>
      <div className={styles.searchInputWrapper}>
        <span className={styles.searchIcon} aria-hidden="true">◎</span>
        <input
          id="birth-place-input"
          type="text"
          autoComplete="off"
          placeholder="Buenos Aires, Mar del Plata, Rosario..."
          value={query}
          onChange={handleInputChange}
          className={`${styles.searchInput} ${error ? styles.searchInputError : ''}`}
          aria-label="Lugar de nacimiento"
          aria-autocomplete="list"
          aria-expanded={open}
        />
        {loading && <span className={styles.searchSpinner} aria-hidden="true" />}
      </div>
      <label htmlFor="birth-place-input" className={styles.searchLabel}>
        Lugar de nacimiento
      </label>

      {notFound && !loading && (
        <p className={styles.searchNotFound}>
          No se encontraron resultados. Intentá con otro nombre o ciudad cercana.
        </p>
      )}
      {error && <p className={styles.searchError}>{error}</p>}

      {open && results.length > 0 && (
        <ul className={styles.dropdown} role="listbox">
          {results.map((city, i) => (
            <li
              key={`${city.lat}-${city.lon}-${i}`}
              role="option"
              aria-selected="false"
              onClick={() => handleSelect(city)}
              className={styles.dropdownItem}
            >
              <div className={styles.dropdownItemContent}>
                {city.isFallback ? (
                  <>
                    <span className={styles.dropdownLabel}>{city.displayLabel}</span>
                    <span className={styles.dropdownSub}>→ Referencia: {city.resolvedLabel}</span>
                  </>
                ) : (
                  <span className={styles.dropdownLabel}>{city.label}</span>
                )}
              </div>
              <MatchReasonBadge reason={city.matchReason} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BirthPlaceConfirmation (lógica intacta, UI rediseñada)
// ─────────────────────────────────────────────────────────────────────────────
function BirthPlaceConfirmation({ place }: { place: BirthPlace }) {
  if (!place.displayLabel) return null;
  const friendlyReason = place.matchReason ? matchReasonLabels[place.matchReason] : null;

  if (place.isFallback) {
    return (
      <div className={`${styles.confirmBox} ${styles.confirmBoxFallback}`}>
        <span className={styles.confirmIcon}>📍</span>
        <div className={styles.confirmText}>
          <p className={styles.confirmMain}>
            {place.displayLabel}
            {friendlyReason && (
              <span className={styles.confirmReason}>{friendlyReason}</span>
            )}
          </p>
          <p className={styles.confirmSub}>
            Referencia: <strong>{place.resolvedLabel}</strong>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.confirmBox} ${styles.confirmBoxSuccess}`}>
      <span className={styles.confirmIcon}>✓</span>
      <div className={styles.confirmText}>
        <p className={styles.confirmMain}>
          {place.resolvedLabel}
          {friendlyReason && (
            <span className={styles.confirmReason}>{friendlyReason}</span>
          )}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Página principal (lógica intacta, UI completamente rediseñada)
// ─────────────────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [placeError, setPlaceError] = useState('');

  const [formData, setFormData] = useState<FormData>({
    full_name: '',
    email: '',
    birth_day: '',
    birth_month: '',
    birth_year: '',
    birth_hour: '',
    birth_min: '',
    phone_whatsapp: '',
  });

  const [birthPlace, setBirthPlace] = useState<BirthPlace>({
    displayLabel: '',
    resolvedLabel: '',
    lat: null,
    lon: null,
    tzone: null,
    isFallback: false,
    matchReason: '',
  });

  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [year, month, day] = e.target.value.split('-');
    setFormData((prev) => ({
      ...prev,
      birth_year: year || '',
      birth_month: month || '',
      birth_day: day || '',
    }));
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [hour, min] = e.target.value.split(':');
    setFormData((prev) => ({
      ...prev,
      birth_hour: hour || '',
      birth_min: min || '',
    }));
  };

  const handleCitySelect = (city: CityResult, inputText: string) => {
    setPlaceError('');
    const isFallback = city.isFallback === true;
    const displayLabel = isFallback ? (city.displayLabel ?? inputText) : city.label;
    const resolvedLabel = isFallback ? (city.resolvedLabel ?? city.label) : city.label;
    setBirthPlace({
      displayLabel,
      resolvedLabel,
      lat: city.lat,
      lon: city.lon,
      tzone: city.tzone,
      isFallback,
      matchReason: city.matchReason,
    });
    if (city.tzone === null) {
      setPlaceError(
        `El lugar seleccionado (${resolvedLabel}) no tiene zona horaria disponible. Por favor, seleccioná otra ciudad cercana.`
      );
    }
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPlaceError('');
    if (!birthPlace.displayLabel) {
      setPlaceError('Debés seleccionar un lugar de nacimiento de la lista.');
      return;
    }
    if (birthPlace.lat === null || birthPlace.lon === null || birthPlace.tzone === null) {
      setPlaceError('El lugar seleccionado no tiene datos completos. Elegí otra ciudad.');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (birthPlace.lat === null || birthPlace.lon === null || birthPlace.tzone === null) {
      setError('Faltan datos del lugar de nacimiento. Volvé al paso anterior y seleccioná una ciudad.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.full_name,
          email: formData.email,
          phone_whatsapp: formData.phone_whatsapp,
          birth_day: formData.birth_day ? parseInt(formData.birth_day, 10) : null,
          birth_month: formData.birth_month ? parseInt(formData.birth_month, 10) : null,
          birth_year: formData.birth_year ? parseInt(formData.birth_year, 10) : null,
          birth_hour: formData.birth_hour ? parseInt(formData.birth_hour, 10) : null,
          birth_min: formData.birth_min ? parseInt(formData.birth_min, 10) : null,
          birth_lat: birthPlace.lat,
          birth_lon: birthPlace.lon,
          birth_tzone: birthPlace.tzone,
          timezone: userTimezone,
          birth_place_input: birthPlace.displayLabel,
          birth_place_resolved: birthPlace.resolvedLabel,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || 'Error creando el usuario');
        setIsSubmitting(false);
        return;
      }
      router.push(`/suscripcion?userId=${data.userId}&email=${encodeURIComponent(data.email)}`);
    } catch (err: any) {
      setError(err?.message || 'Error inesperado');
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.root}>
      {/* Stars background */}
      <div className="stars-bg" aria-hidden="true" />

      {/* Glow top */}
      <div className={styles.glowTop} aria-hidden="true" />

      <div className={`${styles.pageWrap} page-content`}>

        {/* ── Logo ─────────────────────────────────────────────────────── */}
        <div className={styles.logoRow}>
          <span className={styles.logo}>✦ Astrologiqa</span>
        </div>

        {/* ── Progress bar ─────────────────────────────────────────────── */}
        <div className={styles.progress} role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={2}>
          <div className={`${styles.progressStep} ${step >= 1 ? styles.progressStepActive : ''}`}>
            <span className={styles.progressDot} />
            <span className={styles.progressLabel}>Datos natales</span>
          </div>
          <div className={styles.progressLine}>
            <div className={styles.progressLineFill} style={{ width: step >= 2 ? '100%' : '0%' }} />
          </div>
          <div className={`${styles.progressStep} ${step >= 2 ? styles.progressStepActive : ''}`}>
            <span className={styles.progressDot} />
            <span className={styles.progressLabel}>WhatsApp</span>
          </div>
        </div>

        {/* ── PASO 1: Datos de nacimiento ───────────────────────────────── */}
        {step === 1 && (
          <div className={`${styles.card} animate-fade-up`}>
            <div className={styles.cardHeader}>
              <h1 className={styles.cardTitle}>Tus datos de nacimiento</h1>
              <p className={styles.cardDesc}>
                Necesitamos esta información para calcular tu carta natal con precisión.
              </p>
            </div>

            <form onSubmit={handleNextStep} className={styles.form}>
              <Input
                label="Nombre completo"
                name="full_name"
                placeholder="Ej. María Pérez"
                required
                value={formData.full_name}
                onChange={handleChange}
              />

              <Input
                label="Email"
                name="email"
                type="email"
                placeholder="Ej. maria@email.com"
                required
                value={formData.email}
                onChange={handleChange}
              />

              <div className={styles.dateTimeRow}>
                <div className={styles.dateField}>
                  <Input
                    label="Fecha de nacimiento"
                    name="birth_date"
                    type="date"
                    required
                    onChange={handleDateChange}
                  />
                </div>
                <div className={styles.timeField}>
                  <Input
                    label="Hora de nacimiento"
                    name="birth_time"
                    type="time"
                    placeholder="--:--"
                    required
                    onChange={handleTimeChange}
                  />
                </div>
              </div>

              {/* Buscador de ciudad — lógica intacta */}
              <BirthPlaceSearch
                onSelect={handleCitySelect}
                error={placeError}
              />

              {birthPlace.displayLabel && !placeError && (
                <BirthPlaceConfirmation place={birthPlace} />
              )}

              <div className={styles.formFooter}>
                <Button variant="primary" fullWidth type="submit">
                  Continuar →
                </Button>
                <p className={styles.formNote}>
                  Tu información es privada y confidencial.
                </p>
              </div>
            </form>
          </div>
        )}

        {/* ── PASO 2: WhatsApp ──────────────────────────────────────────── */}
        {step === 2 && (
          <div className={`${styles.card} animate-fade-up`}>
            <div className={styles.cardHeader}>
              <h1 className={styles.cardTitle}>Tu número de WhatsApp</h1>
              <p className={styles.cardDesc}>
                Ahí vas a recibir tu horóscopo personalizado cada noche.
              </p>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              <Input
                label="Teléfono WhatsApp"
                name="phone_whatsapp"
                type="tel"
                placeholder="+54 9 11 1234 5678"
                required
                value={formData.phone_whatsapp}
                onChange={handleChange}
              />

              <div className={styles.whatsappNote}>
                <span className={styles.whatsappIcon}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.49" />
                  </svg>
                </span>
                Incluí el código de país. Ej: +54 para Argentina.
              </div>

              {error && <p className={styles.errorMsg}>{error}</p>}

              <div className={styles.formFooter}>
                <Button variant="primary" fullWidth type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creando cuenta...' : 'Finalizar registro'}
                </Button>
                <button
                  type="button"
                  className={styles.backBtn}
                  onClick={() => setStep(1)}
                >
                  ← Volver
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
