'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
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
  /** Lo que el usuario escribió o seleccionó (visible en el UI) */
  displayLabel: string;
  /** Ciudad resuelta para guardar en DB */
  resolvedLabel: string;
  lat: number | null;
  lon: number | null;
  tzone: number | null;
  isFallback: boolean;
  matchReason?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente BirthPlaceSearch
// ─────────────────────────────────────────────────────────────────────────────
const matchReasonLabels: Record<string, string> = {
  exact_match: "Coincidencia exacta",
  priority_barrio: "Barrio reconocido",
  priority_barrio_reference: "Barrio reconocido",
  fallback_city_or_province: "Ubicación aproximada",
  priority_caba: "Nombre alternativo reconocido",
  priority_province: "Nombre alternativo reconocido",
  priority_alternative: "Nombre alternativo reconocido",
};

function MatchReasonBadge({ reason }: { reason?: string }) {
  if (!reason) return null;
  const text = matchReasonLabels[reason] || "Coincidencia";
  
  let bg = "rgba(100, 100, 100, 0.15)";
  let color = "#bbb";
  let border = "1px solid rgba(100, 100, 100, 0.3)";
  
  if (reason === "exact_match") {
    bg = "rgba(0, 255, 200, 0.1)";
    color = "#0df";
    border = "1px solid rgba(0, 255, 200, 0.3)";
  } else if (reason.startsWith("priority_barrio")) {
    bg = "rgba(180, 100, 255, 0.1)";
    color = "#c9f";
    border = "1px solid rgba(180, 100, 255, 0.3)";
  } else if (reason === "fallback_city_or_province") {
    bg = "rgba(255, 180, 50, 0.1)";
    color = "#fa0";
    border = "1px solid rgba(255, 180, 50, 0.3)";
  } else if (reason.startsWith("priority_")) {
    bg = "rgba(50, 150, 255, 0.1)";
    color = "#5af";
    border = "1px solid rgba(50, 150, 255, 0.3)";
  }
  
  return (
    <span
      style={{
        fontSize: "0.72rem",
        padding: "2px 6px",
        borderRadius: "4px",
        background: bg,
        color: color,
        border: border,
        marginLeft: "8px",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

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
    
    if (city.isFallback) {
      // conservar lo escrito
    } else {
      // normal: actualizar el input con el label del resultado
      setQuery(city.label);
    }
    
    onSelect(city, inputText);
  };

  // Cerrar dropdown al hacer clic fuera
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
    <div ref={containerRef} style={{ position: 'relative', marginBottom: '1.25rem' }}>
      <Input
        label="Lugar de nacimiento"
        placeholder="Ej. Buenos Aires, Mar del Plata, Barrio X San Juan..."
        value={query}
        onChange={handleInputChange}
        autoComplete="off"
        error={error}
      />

      {loading && (
        <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '-0.75rem', marginBottom: '0.5rem' }}>
          Buscando...
        </p>
      )}

      {notFound && !loading && (
        <p style={{ fontSize: '0.8rem', color: '#e05', marginTop: '-0.75rem', marginBottom: '0.5rem' }}>
          No se encontraron resultados. Intentá con otro nombre o ciudad cercana.
        </p>
      )}

      {open && results.length > 0 && (
        <ul
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 100,
            margin: 0,
            padding: 0,
            listStyle: 'none',
            background: '#1a1a2e',
            border: '1px solid #333',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            maxHeight: '240px',
            overflowY: 'auto',
          }}
        >
          {results.map((city, i) => (
            <li
              key={`${city.lat}-${city.lon}-${i}`}
              onClick={() => handleSelect(city)}
              style={{
                padding: '10px 14px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                color: '#e0e0e0',
                borderBottom: i < results.length - 1 ? '1px solid #2a2a3e' : 'none',
                transition: 'background 0.15s',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#2a2a4e')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ flex: 1, minWidth: 0, paddingRight: '8px' }}>
                {city.isFallback ? (
                  <span>
                    <span style={{ color: '#e0e0e0', wordBreak: 'break-word' }}>{city.displayLabel}</span>
                    <span style={{ color: '#888', fontSize: '0.8rem', display: 'block', marginTop: '2px', wordBreak: 'break-word' }}>
                      → Usar como referencia: {city.resolvedLabel}
                    </span>
                  </span>
                ) : (
                  <span style={{ wordBreak: 'break-word' }}>{city.label}</span>
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

function BirthPlaceConfirmation({ place }: { place: BirthPlace }) {
  if (!place.displayLabel) return null;

  const friendlyReason = place.matchReason ? matchReasonLabels[place.matchReason] : null;

  if (place.isFallback) {
    return (
      <div
        style={{
          fontSize: '0.82rem',
          marginTop: '-0.75rem',
          marginBottom: '1rem',
          padding: '8px 12px',
          background: 'rgba(255,180,50,0.08)',
          borderRadius: '6px',
          borderLeft: '3px solid #fa0',
          lineHeight: 1.5,
        }}
      >
        <p style={{ color: '#fa0', margin: 0 }}>
          📍 Lugar ingresado: <strong>{place.displayLabel}</strong>
          {friendlyReason && (
            <span style={{ fontSize: '0.75rem', opacity: 0.8, marginLeft: '6px', background: 'rgba(255,180,50,0.15)', padding: '1px 5px', borderRadius: '3px' }}>
              ({friendlyReason})
            </span>
          )}
        </p>
        <p style={{ color: '#aaa', margin: '4px 0 0' }}>
          Usaremos <strong style={{ color: '#fa0' }}>{place.resolvedLabel}</strong> como referencia para calcular tu carta natal.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        fontSize: '0.82rem',
        color: '#7c9',
        marginTop: '-0.75rem',
        marginBottom: '1rem',
        padding: '6px 10px',
        background: 'rgba(100,200,120,0.08)',
        borderRadius: '6px',
        borderLeft: '3px solid #7c9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}
    >
      <span>
        ✓ Lugar detectado: <strong>{place.resolvedLabel}</strong>
      </span>
      {friendlyReason && (
        <span style={{ fontSize: '0.72rem', color: '#7c9', background: 'rgba(100,200,120,0.15)', padding: '2px 6px', borderRadius: '4px' }}>
          {friendlyReason}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Página principal
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

  // Timezone del dispositivo del usuario (se envía siempre)
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

    // displayLabel = lo que el usuario escribió
    // resolvedLabel = ciudad real resuelta (para mostrar referencia y guardar en DB)
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

      router.push(
        `/suscripcion?userId=${data.userId}&email=${encodeURIComponent(data.email)}`
      );
    } catch (err: any) {
      setError(err?.message || 'Error inesperado');
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingTop: '2rem' }}>

      {/* ── PASO 1: Datos de nacimiento ── */}
      {step === 1 && (
        <>
          <div style={{ marginBottom: '3rem' }}>
            <h1 className="heading-lg">Tus datos de nacimiento</h1>
            <p className="text-body">
              Completá esta información con precisión para calcular tu carta natal y generar interpretaciones más precisas.
            </p>
          </div>

          <form onSubmit={handleNextStep} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
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

            <Input
              label="Fecha de nacimiento"
              name="birth_date"
              type="date"
              required
              onChange={handleDateChange}
            />

            <Input
              label="Hora de nacimiento"
              name="birth_time"
              type="time"
              placeholder="--:--"
              required
              onChange={handleTimeChange}
            />

            {/* Buscador de ciudad — reemplaza lat/lon/tzone manuales */}
            <BirthPlaceSearch
              onSelect={handleCitySelect}
              error={placeError}
            />

            {/* Confirmación visual: normal o fallback */}
            {birthPlace.displayLabel && !placeError && (
              <BirthPlaceConfirmation place={birthPlace} />
            )}

            <div style={{ marginTop: 'auto', marginBottom: '2rem' }}>
              <Button variant="primary" fullWidth type="submit">
                Continuar
              </Button>
            </div>
          </form>
        </>
      )}

      {/* ── PASO 2: WhatsApp ── */}
      {step === 2 && (
        <>
          <div style={{ marginBottom: '3rem' }}>
            <h1 className="heading-lg">Tu número de WhatsApp</h1>
            <p className="text-body">
              Vamos a enviarte tu horóscopo diario a este número.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <Input
              label="Teléfono (WhatsApp)"
              name="phone_whatsapp"
              type="tel"
              placeholder="+54 9 11 1234 5678"
              required
              value={formData.phone_whatsapp}
              onChange={handleChange}
            />

            {error && (
              <p style={{ color: '#e05', marginTop: '1rem', fontSize: '0.9rem' }}>
                {error}
              </p>
            )}

            <div style={{ marginTop: 'auto', marginBottom: '2rem' }}>
              <Button variant="primary" fullWidth type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creando cuenta...' : 'Finalizar'}
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
