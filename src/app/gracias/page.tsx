import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import styles from './gracias.module.css';

export default function GraciasPage() {
  return (
    <div className={styles.root}>
      <div className="stars-bg" aria-hidden="true" />
      <div className={styles.glowTop} aria-hidden="true" />

      <div className={`${styles.pageWrap} page-content`}>
        {/* Logo */}
        <div className={styles.logoRow}>
          <span className={styles.logo}>✦ Astrologiqa</span>
        </div>

        {/* Celebration icon */}
        <div className={styles.celebrationIcon} aria-hidden="true">
          <div className={styles.celebrationRing} />
          <span className={styles.celebrationCheck}>✓</span>
        </div>

        {/* Headline */}
        <h1 className={styles.title}>
          Bienvenido/a a<br />
          <em className={styles.titleEmphasis}>Astrologiqa.</em>
        </h1>

        <p className={styles.subtitle}>
          Tu suscripción está activa. Esta noche vas a recibir
          tu primera lectura personalizada en WhatsApp.
        </p>

        {/* Status cards */}
        <div className={styles.statusGrid}>
          <div className={styles.statusCard}>
            <span className={styles.statusIcon}>◎</span>
            <div className={styles.statusText}>
              <span className={styles.statusLabel}>Suscripción</span>
              <span className={`${styles.statusValue} ${styles.statusActive}`}>
                <span className={styles.activeDot} />
                Activa
              </span>
            </div>
          </div>

          <div className={styles.statusCard}>
            <span className={styles.statusIcon} style={{ color: '#25D366' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.49" />
              </svg>
            </span>
            <div className={styles.statusText}>
              <span className={styles.statusLabel}>WhatsApp</span>
              <span className={styles.statusValue}>Registrado</span>
            </div>
          </div>

          <div className={styles.statusCard}>
            <span className={styles.statusIcon}>◐</span>
            <div className={styles.statusText}>
              <span className={styles.statusLabel}>Carta natal</span>
              <span className={styles.statusValue}>Calculada</span>
            </div>
          </div>

          <div className={styles.statusCard}>
            <span className={styles.statusIcon}>☽</span>
            <div className={styles.statusText}>
              <span className={styles.statusLabel}>Primer envío</span>
              <span className={styles.statusValue}>Esta noche</span>
            </div>
          </div>
        </div>

        {/* Welcome message card */}
        <div className={styles.welcomeCard}>
          <p className={styles.welcomeText}>
            A partir de hoy, cada noche vas a recibir una lectura 
            construida exclusivamente para vos, basada en tu carta natal 
            y los movimientos planetarios del día.
          </p>
          <p className={styles.welcomeText}>
            No es un horóscopo genérico. Es tu horóscopo.
          </p>
        </div>

        {/* CTA */}
        <div className={styles.cta}>
          <Button href="/panel" variant="primary" fullWidth>
            Ver mi panel →
          </Button>
        </div>
      </div>
    </div>
  );
}
