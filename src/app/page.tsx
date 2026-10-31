import PublicDailyReading from "@/components/PublicDailyReading";
import Link from "next/link";
import Image from "next/image";
import styles from "./landing.module.css";

/* WhatsApp icon — extracted to avoid JSX repetition */
function WhatsAppIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.49" />
    </svg>
  );
}

function PlanetaryVisual() {
  return <figure className={styles.orrery} aria-label="Ilustración animada de órbitas planetarias, sin escala astronómica">
    <div className={styles.orbitalMap} aria-hidden="true">
      <div className={styles.sun} />
      {[0,1,2,3,4].map(i => <div key={i} className={`${styles.orbit} ${styles[`orbit${i}`]}`}><div className={styles.revolution}><span className={styles.planet} /></div></div>)}
    </div>
    <figcaption className={styles.orbitCaption}>EL CIELO DE CADA DÍA, LEÍDO PARA VOS.</figcaption>
  </figure>;
}

export default function LandingPage() {
  return (
    <div className={styles.root}>
      {/* Stars background */}
      <div className="stars-bg" aria-hidden="true" />

      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <nav className={`${styles.nav} page-content`}>
        <div className={styles.navInner}>
          <Image
            src="/id-astral-horizontal.png"
            alt="ID Astral"
            width={1920}
            height={483}
            className={styles.brandLogo}
            style={{
              width: "190px",
              height: "auto",
            }}
            priority
          />

          <div className={styles.navLinks}><Link href="/login">Mi cuenta</Link><Link href="/onboarding" className={styles.navCta}>
            Empezar
          </Link></div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className={`${styles.hero} page-content`}>
        <div className={styles.heroLayout}>
          <div className={styles.heroCopy}>
            <h1 className={styles.heroTitle}>
              Tu horóscopo
              <br />
              <em className={styles.heroEmphasis}>personal.</em>
            </h1>

            <p className={styles.heroKicker}>Una herramienta para cada día.</p>
            <p className={styles.heroSub}>Una lectura basada en tu fecha, hora y lugar de nacimiento para ayudarte a ordenar prioridades, reflexionar sobre lo que estás viviendo y tomar decisiones con más perspectiva.</p>
            <p className={styles.heroPromise}>Precisión astrológica. Interpretación personalizada.<br />Cada noche, en tu WhatsApp. O en el horario que elijas.</p>

            <div className={styles.heroCtas}>
              <Link
                href="/onboarding"
                className={styles.ctaPrimary}
                id="hero-cta-main"
              >
                <span className={styles.ctaWhatsapp}>
                  <WhatsAppIcon />
                </span>
                Quiero mi lectura personal
              </Link>

              <a
                href="#como-funciona"
                className={styles.ctaSecondary}
                id="hero-cta-how"
              >
                Cómo funciona
              </a>
            </div>

            <div className={styles.heroTrust}>
              <span>Carta natal precisa</span>
              <span className={styles.trustSep}>·</span>
              <span>Tránsitos diarios</span>
              <span className={styles.trustSep}>·</span>
              <span>Entrega privada por WhatsApp</span>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <PlanetaryVisual />
          </div>
        </div>
      </section>

      {/* ── Bloque de precisión ─────────────────────────────────────────── */}
      <section className={`${styles.precisionSection} page-content`}>
        <div className={styles.precisionInner}>
          <div className={styles.precisionText}>
            <p className={`label-upper ${styles.sectionLabel}`}>
              Precisión astrológica
            </p>

            <h2 className={styles.precisionTitle}>
              Precisión en cada cálculo.
              <br />
              <em>Una lectura hecha para vos.</em>
            </h2>

            <p className={styles.precisionBody}>
              Calculamos las posiciones planetarias para tu fecha, hora y lugar de nacimiento, teniendo en cuenta coordenadas y zona horaria. Cada día analizamos sus relaciones con los movimientos del cielo y elaboramos tu lectura personal.
            </p>
          </div>

          <ul className={styles.precisionList}>
            <li className={styles.precisionItem}>
              <span className={styles.precisionDot} />
              Posiciones planetarias calculadas con tus datos de nacimiento
            </li>

            <li className={styles.precisionItem}>
              <span className={styles.precisionDot} />
              Interpretación diaria sobre tu carta natal personal
            </li>

            <li className={styles.precisionItem}>
              <span className={styles.precisionDot} />
              Una herramienta para reflexionar y decidir con más perspectiva
            </li>
          </ul>
        </div>
      </section>

      {/* ── Cómo funciona ───────────────────────────────────────────────── */}
      <section
        id="como-funciona"
        className={`${styles.howSection} page-content`}
      >
        <div className={styles.sectionInner}>
          <p className={`label-upper ${styles.sectionLabel}`}>El proceso</p>

          <h2 className={`heading-lg ${styles.sectionTitle}`}>
            Una lectura diaria basada
            <br />
            <em>sobre tu carta natal</em>
          </h2>

          <div className={styles.timeline}>
            <div className={styles.timelineStep}>
              <div className={styles.timelineLeft}>
                <div className={styles.timelineNode} />
                <div className={styles.timelineLine} />
              </div>

              <div className={styles.timelineContent}>
                <p className={styles.timelineLabel}>Primero</p>

                <h3 className={styles.timelineTitle}>
                  Compartís tus datos de nacimiento
                </h3>

                <p className={styles.timelineDesc}>
                  Fecha, hora y lugar. Es el punto de partida para calcular tu carta natal y personalizar la lectura.
                </p>
              </div>
            </div>

            <div className={styles.timelineStep}>
              <div className={styles.timelineLeft}>
                <div className={styles.timelineNode} />
                <div className={styles.timelineLine} />
              </div>

              <div className={styles.timelineContent}>
                <p className={styles.timelineLabel}>Luego</p>

                <h3 className={styles.timelineTitle}>
                  Calculamos tu carta natal
                </h3>

                <p className={styles.timelineDesc}>
                  Tu carta natal queda disponible en tu cuenta. Cada día analizamos los tránsitos planetarios en relación con ella.
                </p>
              </div>
            </div>

            <div
              className={`${styles.timelineStep} ${styles.timelineStepLast}`}
            >
              <div className={styles.timelineLeft}>
                <div className={styles.timelineNode} />
              </div>

              <div className={styles.timelineContent}>
                <p className={styles.timelineLabel}>A tu horario</p>

                <h3 className={styles.timelineTitle}>
                  Recibís tu lectura por WhatsApp
                </h3>

                <p className={styles.timelineDesc}>
                  Por defecto, a las 22 del día anterior. Desde tu cuenta podés elegir el mismo día o el anterior y la hora de entrega.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={`${styles.previewSection} page-content`} id="lectura-de-hoy">
        <div className={styles.sectionInner}>
          <p className={`label-upper ${styles.sectionLabel}`}>El horóscopo de hoy</p>
          <h2 className={`heading-lg ${styles.sectionTitle}`}>El cielo de hoy en Argentina</h2>
          <PublicDailyReading />
        </div>
      </section>

      {/* ── CTA final ───────────────────────────────────────────────────── */}
      <section className={`${styles.ctaSection} page-content`}>
        <div className={styles.ctaSectionInner}>
          <h2 className={styles.ctaSectionTitle}>
            Tu carta natal es única.
            <br />
            <em>Tu horóscopo también debería serlo.</em>
          </h2>

          <p className={styles.ctaSectionSub}>
            Recibí tu lectura personal basada en tu carta natal y los tránsitos del día. Elegí el horario que mejor acompañe tu rutina.
          </p>

          <Link
            href="/onboarding"
            className={styles.ctaPrimary}
            id="final-cta"
          >
            <span className={styles.ctaWhatsapp}>
              <WhatsAppIcon />
            </span>
            Quiero mi lectura personal
          </Link>

          <div className={styles.trustGrid}>
            <div className={styles.trustItem}>
              
              <span className={styles.trustLabel}>
                Privado y confidencial
              </span>
            </div>

            <div className={styles.trustItem}>
              
              <span className={styles.trustLabel}>Sin permanencia</span>
            </div>

            <div className={styles.trustItem}>
              
              <span className={styles.trustLabel}>
                Atención personalizada
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className={`${styles.footer} page-content`}>
        <div className={styles.footerInner}>
          <Image
            src="/id-astral-horizontal.png"
            alt="ID Astral"
            width={1920}
            height={483}
            className={styles.footerBrandLogo}
            style={{
              width: "190px",
              height: "auto",
            }}
          />

          <div className={styles.navLinks}><Link href="/terminos">Términos</Link><Link href="/privacidad">Privacidad</Link><a href="mailto:nbrandoni.exe@gmail.com">Contacto</a></div>
          <p className={styles.footerText}>
            © 2026 ID Astral. La astrología es interpretativa y no garantiza acontecimientos.
          </p>
        </div>
      </footer>
    </div>
  );
}