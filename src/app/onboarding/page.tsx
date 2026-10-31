'use client';

import Image from "next/image";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import styles from './onboarding.module.css';
import CityPicker from '@/components/CityPicker';
import { wallTimeToUtc, offsetHours, type Location } from '@/lib/location-time';

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

  const [birthLocation, setBirthLocation] = useState<Location | null>(null);
  const [residence, setResidence] = useState<Location | null>(null);

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

  const birthOffset = () => {
    if (!birthLocation) throw new Error('Seleccioná un lugar de nacimiento de la lista.');
    const wall = `${formData.birth_year}-${formData.birth_month}-${formData.birth_day}T${formData.birth_hour}:${formData.birth_min}`;
    return offsetHours(wallTimeToUtc(wall, birthLocation.timezone), birthLocation.timezone);
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPlaceError('');
    try { birthOffset(); } catch (e) { setPlaceError(e instanceof Error ? e.message : 'Verificá el lugar y horario de nacimiento.'); return; }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    let birthTzone: number;
    try { birthTzone = birthOffset(); } catch (e) { setError(e instanceof Error ? e.message : 'Verificá los datos de nacimiento.'); return; }
    if (!residence) { setError('Seleccioná tu ciudad y país de residencia.'); return; }
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
          birth_lat: birthLocation!.lat,
          birth_lon: birthLocation!.lon,
          birth_tzone: birthTzone,
          birth_location: birthLocation,
          timezone: residence.timezone,
          residence,
          birth_place_input: birthLocation!.input_label || birthLocation!.label,
          birth_place_resolved: birthLocation!.label,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || 'Error creando el usuario');
        setIsSubmitting(false);
        return;
      }
      router.push(`/suscripcion?userId=${data.userId}&email=${encodeURIComponent(data.email)}&checkoutToken=${encodeURIComponent(data.checkoutToken)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
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
          <Image src="/id-astral-horizontal.png" alt="ID Astral" width={190} height={48} style={{ objectFit: "contain" }} />
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
                    value={formData.birth_year ? `${formData.birth_year}-${formData.birth_month}-${formData.birth_day}` : ""}
                    type="date"
                    required
                    onChange={handleDateChange}
                  />
                </div>
                <div className={styles.timeField}>
                  <Input
                    label="Hora de nacimiento"
                    name="birth_time"
                    value={formData.birth_hour ? `${formData.birth_hour}:${formData.birth_min}` : ""}
                    type="time"
                    placeholder="--:--"
                    required
                    onChange={handleTimeChange}
                  />
                </div>
              </div>

              <CityPicker label="Lugar de nacimiento" kind="birth" value={birthLocation} onChange={setBirthLocation} />
              {placeError && <p className={styles.errorMsg} role="alert">{placeError}</p>}

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
                Ahí vas a recibir tu lectura personal. Después podés elegir el horario desde tu cuenta.
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

              <CityPicker label="Ciudad y país donde vivís" value={residence} onChange={setResidence} />
              <p className={styles.formNote}>Te enviaremos la lectura a las 22:00 de esa ciudad. Podrás informar tus viajes desde tu cuenta.</p>
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
