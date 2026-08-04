import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import styles from './panel.module.css';
import { createClient } from '@/lib/supabase-server';
import ReactMarkdown from 'react-markdown';

export default async function PanelPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch user profile from public.users using SSR client
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) {
    redirect('/login');
  }

  const isActive = profile.subscription_status === 'active';

  // Fetch the latest horoscope
  const { data: horoscope } = await supabase
    .from('daily_horoscopes')
    .select('*')
    .eq('user_id', profile.id)
    .order('horoscope_date', { ascending: false })
    .limit(1)
    .single();

  const formattedDate = profile.birth_day && profile.birth_month && profile.birth_year
    ? `${String(profile.birth_day).padStart(2, '0')}/${String(profile.birth_month).padStart(2, '0')}/${profile.birth_year}`
    : '—';
    
  const formattedTime = profile.birth_hour !== null && profile.birth_min !== null
    ? `${String(profile.birth_hour).padStart(2, '0')}:${String(profile.birth_min).padStart(2, '0')}`
    : '—';

  return (
    <div className={styles.root}>
      <div className="stars-bg" aria-hidden="true" />
      <div className={styles.glowTop} aria-hidden="true" />

      <div className={`${styles.pageWrap} page-content`}>
        {/* ── Header ─────────────────────────────────────────────────── */}
        <header className={styles.header}>
          <span className={styles.logo}>✦ Astrologiqa</span>
          <h1 className={styles.pageTitle}>Mi cuenta</h1>
        </header>

        {/* ── Subscription status ─────────────────────────────────────── */}
        <div className={styles.card}>
          <div className={styles.cardTop}>
            <div className={styles.cardLabel}>Hola, {profile.full_name || 'Astral'}</div>
            {isActive ? (
              <span className={styles.activeBadge}>
                <span className={styles.activeDot} />
                Activa
              </span>
            ) : (
              <span className={styles.activeBadge} style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                Inactiva
              </span>
            )}
          </div>
          <div className={styles.cardRows}>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Estado</span>
              <span className={`${styles.rowValue} ${isActive ? styles.rowSuccess : ''}`}>{isActive ? 'Activa' : 'Inactiva'}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Próximo cobro</span>
              <span className={styles.rowValue}>—</span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>WhatsApp vinculado</span>
              <span className={styles.rowValue}>{profile.phone_whatsapp || '—'}</span>
            </div>
          </div>
        </div>

        {/* ── Next delivery ───────────────────────────────────────────── */}
        <div className={styles.card}>
          <div className={styles.cardLabel}>Próximo envío</div>
          <div className={styles.nextDelivery}>
            <span className={styles.nextDeliveryIcon}>☽</span>
            <div className={styles.nextDeliveryText}>
              <p className={styles.nextDeliveryTime}>Esta noche</p>
              <p className={styles.nextDeliveryDesc}>
                Tu lectura personalizada llegará antes de la medianoche.
              </p>
            </div>
          </div>
        </div>

        {/* ── Last horoscope ──────────────────────────────────────────── */}
        <div className={styles.card}>
          <div className={styles.cardLabel}>Último horóscopo</div>
          {horoscope ? (
            <div style={{ fontSize: '0.875rem', lineHeight: '1.6', color: 'var(--text-dim)' }}>
              <ReactMarkdown>{horoscope.horoscope_text}</ReactMarkdown>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>◈</span>
              <p className={styles.emptyText}>Tu primera lectura llegará esta noche.</p>
            </div>
          )}
        </div>

        {/* ── Natal Interpretation ────────────────────────────────────── */}
        {profile.natal_interpretation && (
          <div className={styles.card}>
            <div className={styles.cardLabel}>Tu Carta Natal</div>
            <div style={{ fontSize: '0.875rem', lineHeight: '1.6', color: 'var(--text-dim)' }}>
              <ReactMarkdown>{profile.natal_interpretation}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* ── Birth data ──────────────────────────────────────────────── */}
        <div className={styles.card}>
          <div className={styles.cardLabel}>Datos natales</div>
          <div className={styles.cardRows}>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Fecha</span>
              <span className={styles.rowValue}>{formattedDate}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Hora</span>
              <span className={styles.rowValue}>{formattedTime}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Lugar</span>
              <span className={styles.rowValue}>{profile.birth_place_resolved || '—'}</span>
            </div>
          </div>
        </div>

        {/* ── Actions ─────────────────────────────────────────────────── */}
        <div className={styles.actions}>
          <Button variant="secondary" fullWidth>
            Actualizar datos
          </Button>
          <Button variant="outline" fullWidth>
            Gestionar suscripción
          </Button>
        </div>
      </div>
    </div>
  );
}
