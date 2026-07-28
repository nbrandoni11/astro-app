"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./suscripcion.module.css";

// ─────────────────────────────────────────────────────────────────────────────
// Lógica intacta — solo rediseño visual
// ─────────────────────────────────────────────────────────────────────────────
function SuscripcionContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");
  const email = searchParams.get("email");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const missingParams = !userId || !email;

  async function handleCheckout() {
    if (missingParams) return;
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/mp-create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, email }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Error creando checkout");
        setLoading(false);
        return;
      }
      window.location.href = data.init_point;
    } catch (err: any) {
      setError(err?.message || "Error inesperado");
      setLoading(false);
    }
  }

  return (
    <div className={styles.root}>
      <div className="stars-bg" aria-hidden="true" />
      <div className={styles.glowTop} aria-hidden="true" />

      <div className={`${styles.pageWrap} page-content`}>
        {/* Logo */}
        <div className={styles.logoRow}>
          <span className={styles.logo}>✦ Astrologiqa</span>
        </div>

        <div className={styles.card}>
          {/* Badge */}
          <div className={styles.badgeRow}>
            <span className={styles.badge}>Suscripción mensual</span>
          </div>

          {/* Headline */}
          <h1 className={styles.title}>
            Tu horóscopo personal,<br />
            <em>todas las noches.</em>
          </h1>

          <p className={styles.subtitle}>
            Una lectura exclusiva basada en tu carta natal y los tránsitos
            del día, interpretada por inteligencia artificial.
          </p>

          {/* Value props */}
          <ul className={styles.valueList} aria-label="Qué incluye">
            <li className={styles.valueItem}>
              <span className={styles.valueIcon}>◐</span>
              <div className={styles.valueText}>
                <span className={styles.valueTitle}>Carta natal completa</span>
                <span className={styles.valueDesc}>Calculamos tu carta a partir de tu fecha, hora y lugar exactos de nacimiento.</span>
              </div>
            </li>
            <li className={styles.valueItem}>
              <span className={styles.valueIcon}>☽</span>
              <div className={styles.valueText}>
                <span className={styles.valueTitle}>Tránsitos diarios</span>
                <span className={styles.valueDesc}>Analizamos cómo los planetas del día impactan tu carta natal específica.</span>
              </div>
            </li>
            <li className={styles.valueItem}>
              <span className={styles.valueIcon}>◈</span>
              <div className={styles.valueText}>
                <span className={styles.valueTitle}>Interpretación por IA</span>
                <span className={styles.valueDesc}>Una lectura real, profunda y accionable. No genérica, exclusivamente tuya.</span>
              </div>
            </li>
            <li className={styles.valueItem}>
              <span className={styles.valueIcon} style={{ color: '#25D366' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.49" />
                </svg>
              </span>
              <div className={styles.valueText}>
                <span className={styles.valueTitle}>Entrega por WhatsApp</span>
                <span className={styles.valueDesc}>Cada noche, antes de dormir, en tu número registrado. Sin apps extra.</span>
              </div>
            </li>
          </ul>

          {/* Divider */}
          <div className={styles.divider} />

          {/* What happens after */}
          <div className={styles.afterPayBox}>
            <p className={styles.afterPayLabel}>¿Qué pasa después del pago?</p>
            <div className={styles.afterPaySteps}>
              <span className={styles.afterPayStep}>
                <span className={styles.afterPayNum}>1</span>
                Confirmamos tu suscripción
              </span>
              <span className={styles.afterPayStep}>
                <span className={styles.afterPayNum}>2</span>
                Calculamos tu carta natal
              </span>
              <span className={styles.afterPayStep}>
                <span className={styles.afterPayNum}>3</span>
                Recibís tu primera lectura esa noche
              </span>
            </div>
          </div>

          <div className={styles.divider} />

          {/* Price + CTA */}
          {missingParams ? (
            <div className={styles.missingParams}>
              <p>Faltan los datos del usuario. Por favor, completá el formulario de registro primero.</p>
            </div>
          ) : (
            <div className={styles.ctaSection}>
              <div className={styles.priceRow}>
                <span className={styles.priceLabel}>Suscripción mensual</span>
                <span className={styles.price}>ARS 4.990<span className={styles.pricePer}>/mes</span></span>
              </div>

              <button
                id="btn-pagar"
                onClick={handleCheckout}
                disabled={loading}
                className={styles.payButton}
              >
                {loading ? (
                  <span className={styles.payButtonLoading}>
                    <span className={styles.spinner} /> Redirigiendo...
                  </span>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                      <line x1="1" y1="10" x2="23" y2="10" />
                    </svg>
                    Pagar con Mercado Pago
                  </>
                )}
              </button>

              {error && <p className={styles.errorMsg}>{error}</p>}

              <p className={styles.cancelNote}>
                Cancelás cuando quieras · Sin permanencia
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SuscripcionPage() {
  return (
    <Suspense
      fallback={
        <div className="stars-bg" aria-hidden="true" />
      }
    >
      <SuscripcionContent />
    </Suspense>
  );
}