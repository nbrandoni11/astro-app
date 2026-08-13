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

/* ────────────────────────────────────────────────────────────────────────────
   PLACEHOLDER_PLANETARY_VISUAL
   Replace with <Image src="/planetary-visual.png" …> when asset is ready.
   ──────────────────────────────────────────────────────────────────────────── */
function PlanetaryVisual() {
  return (
    <div className={styles.planetOrbit} aria-hidden="true">
      <div className={styles.ambientGlow} />

      <div className={styles.orbitRing1} />
      <div className={styles.orbitRing2} />
      <div className={styles.orbitRing3} />
      <div className={styles.orbitRing4} />
      <div className={styles.orbitRing5} />

      <div className={styles.orbitCenter} />

      <div className={styles.planetLarge} />
      <div className={styles.planetMedium} />
      <div className={styles.planetSmall1} />
      <div className={styles.planetSmall2} />
      <div className={styles.planetTiny} />

      <div className={styles.decorLine1} />
      <div className={styles.decorLine2} />
      <div className={styles.decorStar1} />
      <div className={styles.decorStar2} />
      <div className={styles.decorStar3} />
    </div>
  );
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
            src="/id-astral-logo.png"
            alt="ID Astral"
            width={150}
            height={50}
            className={styles.brandLogo}
            style={{
              width: "auto",
              height: "50px",
            }}
            priority
          />

          <Link href="/onboarding" className={styles.navCta}>
            Empezar
          </Link>
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

            <p className={styles.heroSub}>
              Cada noche recibís una lectura privada basada en tu carta natal
              y los tránsitos astrológicos del día, interpretada
              exclusivamente para vos.
            </p>

            <div className={styles.heroCtas}>
              <Link
                href="/onboarding"
                className={styles.ctaPrimary}
                id="hero-cta-main"
              >
                <span className={styles.ctaWhatsapp}>
                  <WhatsAppIcon />
                </span>
                Quiero mi horóscopo
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
              Precisión antes que generalidades
            </p>

            <h2 className={styles.precisionTitle}>
              Tu lectura parte de tu mapa,
              <br />
              <em>no de tu signo solar.</em>
            </h2>

            <p className={styles.precisionBody}>
              Calculamos tu carta natal a partir de tu fecha, hora y lugar de
              nacimiento usando efemérides astronómicas de referencia
              internacional. Cada día interpretamos los tránsitos planetarios
              sobre esa carta, no un horóscopo genérico.
            </p>
          </div>

          <ul className={styles.precisionList}>
            <li className={styles.precisionItem}>
              <span className={styles.precisionDot} />
              Posiciones planetarias calculadas con efemérides profesionales
            </li>

            <li className={styles.precisionItem}>
              <span className={styles.precisionDot} />
              Interpretación diaria sobre tu carta natal personal
            </li>

            <li className={styles.precisionItem}>
              <span className={styles.precisionDot} />
              Sin horóscopos genéricos por signo solar
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
            Una lectura diaria construida
            <br />
            <em>sobre tu mapa natal</em>
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
                  Fecha, hora y lugar. Con eso construimos el mapa que te
                  pertenece solo a vos.
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
                  Calculamos tu mapa personal
                </h3>

                <p className={styles.timelineDesc}>
                  Tu carta natal queda guardada. Cada día cruzamos los
                  tránsitos actuales contra ese mapa para encontrar lo que es
                  relevante para vos.
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
                <p className={styles.timelineLabel}>Cada noche</p>

                <h3 className={styles.timelineTitle}>
                  Recibís tu lectura por WhatsApp
                </h3>

                <p className={styles.timelineDesc}>
                  Antes de dormir, un mensaje privado con lo que el cielo tiene
                  para vos al día siguiente.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Preview de lectura ──────────────────────────────────────────── */}
      <section className={`${styles.previewSection} page-content`}>
        <div className={styles.sectionInner}>
          <p className={`label-upper ${styles.sectionLabel}`}>
            Tu lectura, cada noche
          </p>

          <h2 className={`heading-lg ${styles.sectionTitle}`}>
            Así se ve por dentro
          </h2>

          <div className={styles.readingCard}>
            <div className={styles.readingHeader}>
              <div className={styles.readingDate}>
                <span className={styles.readingDateLabel}>Tu lectura</span>
                <span className={styles.readingDateValue}>28 de mayo</span>
              </div>

              <span className={styles.readingBadge}>✦ Carta natal</span>
            </div>

            <div className={styles.readingBody}>
              <p className={styles.readingIntro}>
                Mercurio en trígono con tu Mercurio natal activa tu claridad
                mental. La comunicación fluye con facilidad hoy — es un buen
                momento para conversaciones que venías postergando.
              </p>
            </div>

            <div className={styles.readingGrid}>
              <div className={styles.readingSection}>
                <div className={styles.readingSectionIcon}>◐</div>
                <div className={styles.readingSectionName}>
                  Panorama general
                </div>

                <div className={styles.readingSectionBar}>
                  <div
                    className={styles.readingSectionFill}
                    style={{ width: "82%" }}
                  />
                </div>

                <p className={styles.readingSectionText}>
                  Lo más relevante del día en todos los ámbitos.
                </p>
              </div>

              <div className={styles.readingSection}>
                <div className={styles.readingSectionIcon}>♄</div>
                <div className={styles.readingSectionName}>
                  Trabajo y dinero
                </div>

                <div className={styles.readingSectionBar}>
                  <div
                    className={styles.readingSectionFill}
                    style={{ width: "78%" }}
                  />
                </div>

                <p className={styles.readingSectionText}>
                  Oportunidades, foco profesional y energía productiva.
                </p>
              </div>

              <div className={styles.readingSection}>
                <div className={styles.readingSectionIcon}>♀</div>
                <div className={styles.readingSectionName}>Relaciones</div>

                <div className={styles.readingSectionBar}>
                  <div
                    className={styles.readingSectionFill}
                    style={{ width: "65%" }}
                  />
                </div>

                <p className={styles.readingSectionText}>
                  Vínculos, parejas y conexiones del día.
                </p>
              </div>

              <div className={styles.readingSection}>
                <div className={styles.readingSectionIcon}>☽</div>
                <div className={styles.readingSectionName}>
                  Energía interna
                </div>

                <div className={styles.readingSectionBar}>
                  <div
                    className={styles.readingSectionFill}
                    style={{ width: "71%" }}
                  />
                </div>

                <p className={styles.readingSectionText}>
                  Tu estado emocional e intuición para hoy.
                </p>
              </div>
            </div>

            <div className={styles.readingFooter}>
              <span className={styles.readingFooterLabel}>
                Base astrológica
              </span>

              <span className={styles.readingFooterValue}>
                ☿ trígono ☿ natal · ♃ sextil ASC · ☽ en Casa 4
              </span>
            </div>
          </div>
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
            Empezá a recibir tu lectura personal cada noche, basada en tu mapa
            natal y los tránsitos del día.
          </p>

          <Link
            href="/onboarding"
            className={styles.ctaPrimary}
            id="final-cta"
          >
            <span className={styles.ctaWhatsapp}>
              <WhatsAppIcon />
            </span>
            Quiero mi horóscopo
          </Link>

          <div className={styles.trustGrid}>
            <div className={styles.trustItem}>
              <span className={styles.trustIcon}>🔒</span>
              <span className={styles.trustLabel}>
                Privado y confidencial
              </span>
            </div>

            <div className={styles.trustItem}>
              <span className={styles.trustIcon}>↩</span>
              <span className={styles.trustLabel}>Sin permanencia</span>
            </div>

            <div className={styles.trustItem}>
              <span className={styles.trustIcon}>◇</span>
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
            src="/id-astral-logo.png"
            alt="ID Astral"
            width={130}
            height={44}
            className={styles.footerBrandLogo}
            style={{
              width: "auto",
              height: "44px",
            }}
          />

          <p className={styles.footerText}>
            © 2025 — Todos los derechos reservados
          </p>
        </div>
      </footer>
    </div>
  );
}