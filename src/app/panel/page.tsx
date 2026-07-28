import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import styles from './panel.module.css';

export default function PanelPage() {
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
            <div className={styles.cardLabel}>Suscripción</div>
            <span className={styles.activeBadge}>
              <span className={styles.activeDot} />
              Activa
            </span>
          </div>
          <div className={styles.cardRows}>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Estado</span>
              <span className={`${styles.rowValue} ${styles.rowSuccess}`}>Activa</span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Próximo cobro</span>
              <span className={styles.rowValue}>—</span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>WhatsApp vinculado</span>
              <span className={styles.rowValue}>—</span>
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
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>◈</span>
            <p className={styles.emptyText}>Tu primera lectura llegará esta noche.</p>
          </div>
        </div>

        {/* ── Birth data ──────────────────────────────────────────────── */}
        <div className={styles.card}>
          <div className={styles.cardLabel}>Datos natales</div>
          <div className={styles.cardRows}>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Fecha</span>
              <span className={styles.rowValue}>—</span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Hora</span>
              <span className={styles.rowValue}>—</span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Lugar</span>
              <span className={styles.rowValue}>—</span>
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
