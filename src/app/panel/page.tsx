import DeliverySettings from "@/components/DeliverySettings";
import { deliveryTimeLabel } from "@/lib/delivery-schedule";
import Image from "next/image";
import { subscriptionAccess } from "@/lib/subscription-access";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import styles from "./panel.module.css";
import { createClient } from "@/lib/supabase-server";
import ReadingDocument from "@/components/ReadingDocument";
import { displayLocation } from "@/lib/google-places";
import AstroChart from "@/components/AstroChart";
import LocationSettings from "@/components/LocationSettings";
import GenerateReportsButton from "@/components/GenerateReportsButton";
import { deliveryTimezone, effectiveLocation } from "@/lib/location-time";

export default async function PanelPage() {
  const supabase = await createClient();

  // Verificar usuario autenticado
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Obtener perfil del usuario
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  const access=subscriptionAccess(profile);
  const isActive=access.allowed;

  // Fetch the latest horoscope
  const { data: horoscope } = await supabase
    .from("daily_horoscopes")
    .select("*")
    .eq("user_id", profile.id)
    .is("superseded_at",null)
    .order("horoscope_date", { ascending: false })
    .limit(1)
    .single();

  const [{ data: trips }, { data: reports }] = await Promise.all([
    supabase.from("user_trips").select("*").eq("user_id", profile.id).is("cancelled_at", null).order("starts_at"),
    supabase.from("astro_reports").select("id,kind,year,status,chart,interpretation,return_at,location,location_basis,created_at").eq("user_id", profile.id).eq("kind", "solar").order("year", { ascending: false }).order("created_at", { ascending: false }),
  ]);
  const residenceDisplay = await displayLocation(profile.residence);
  const tripsDisplay = await Promise.all((trips ?? []).map(async t => ({...t, location: await displayLocation(t.location)})));
  const activeLocation = effectiveLocation(residenceDisplay, tripsDisplay);
  const timezone = deliveryTimezone(profile.residence, trips ?? [], profile.timezone);

  const nextPaymentDate = profile.subscription_next_payment_at
    ? new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(profile.subscription_next_payment_at))
    : "—";

  const formattedDate =
    profile.birth_day && profile.birth_month && profile.birth_year
      ? `${String(profile.birth_day).padStart(2, "0")}/${String(
        profile.birth_month
      ).padStart(2, "0")}/${profile.birth_year}`
      : "—";

  const formattedTime =
    profile.birth_hour !== null && profile.birth_min !== null
      ? `${String(profile.birth_hour).padStart(2, "0")}:${String(
        profile.birth_min
      ).padStart(2, "0")}`
      : "—";

  return (
    <div className={styles.root}>
      <div className="stars-bg" aria-hidden="true" />
      <div className={styles.glowTop} aria-hidden="true" />

      <div className={`${styles.pageWrap} page-content`}>
        {/* Header */}
        <header className={styles.header}>
          <Image src="/id-astral-horizontal.png" alt="ID Astral" width={190} height={48} style={{ objectFit: "contain" }} />
          <h1 className={styles.pageTitle}>Mi cuenta</h1>
        </header>

        <nav className={styles.sectionNav} aria-label="Mi cuenta">
          <a href="#carta-natal">Carta natal</a><a href="#revolucion-solar">Revolución solar</a><a href="#ubicacion">Residencia y viajes</a>
        </nav>
        {/* Subscription status */}
        <div className={styles.card}>
          <div className={styles.cardTop}>
            <div className={styles.cardLabel}>
              Hola, {profile.full_name || "Astral"}
            </div>

            {isActive ? (
              <span className={styles.activeBadge}>
                <span className={styles.activeDot} />
                {access.inGrace?"Pago pendiente · período de gracia":"Activa"}
              </span>
            ) : (
              <span
                className={styles.activeBadge}
                style={{
                  color: "#ef4444",
                  background: "rgba(239, 68, 68, 0.1)",
                  borderColor: "rgba(239, 68, 68, 0.2)",
                }}
              >
                En pausa
              </span>
            )}
          </div>

          <div className={styles.cardRows}>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Estado</span>
              <span
                className={`${styles.rowValue} ${isActive ? styles.rowSuccess : ""
                  }`}
              >
                {isActive ? access.inGrace?"Pago pendiente":"Activa" : "En pausa"}
              </span>
            </div>

            <div className={styles.row}>
              <span className={styles.rowLabel}>Próximo cobro</span>
              <span className={styles.rowValue}>{nextPaymentDate}</span>
            </div>

            <div className={styles.row}>
              <span className={styles.rowLabel}>WhatsApp vinculado</span>
              <span className={styles.rowValue}>
                {profile.phone_whatsapp || "—"}
              </span>
            </div>
          </div>
        </div>

        {access.inGrace && <div className={styles.card}><p>Tu pago mensual está pendiente. Conservás tus lecturas hasta el {new Date(profile.subscription_grace_until).toLocaleDateString('es-AR')}. Si el pago no se confirma, la suscripción se pausa.</p><Button href="/suscripcion/gestionar">Regularizar pago</Button></div>}
        {!isActive && <div className={styles.card}><p>Tu suscripción está en pausa. Podés consultar tu dashboard y los informes anteriores. Las nuevas lecturas y los envíos por WhatsApp se reanudan al confirmarse el pago; prepararemos una lectura para enviártela en ese momento.</p><Button href="/suscripcion/gestionar">Reactivar suscripción</Button></div>}
        {/* Next delivery */}
        <div className={styles.card}>
          <div className={styles.cardLabel}>Próximo envío</div>

          <div className={styles.nextDelivery}>
            <span className={styles.nextDeliveryIcon}>☽</span>

            <div className={styles.nextDeliveryText}>
              <p className={styles.nextDeliveryTime}>{isActive?`${profile.delivery_day === "same_day" ? "El mismo día" : "El día anterior"} · ${deliveryTimeLabel(profile)}`:"Envíos en pausa"}</p>
              <p className={styles.nextDeliveryDesc}>{activeLocation?.label ?? timezone} · hora local</p>

              <p className={styles.nextDeliveryDesc}>
                {profile.delivery_day === "same_day" ? "Recibís la lectura correspondiente al mismo día." : "Recibís la lectura correspondiente al día siguiente."}
              </p>
            </div>
          </div>
        </div>

        <DeliverySettings preferences={{delivery_day:profile.delivery_day,delivery_minute:profile.delivery_minute}} timezone={timezone} active={isActive} />
        {/* Last horoscope */}
        <div className={styles.card}>
          <div className={styles.cardLabel}>Tu lectura diaria</div>

          {horoscope ? (
            <>
              <h2 className={styles.readingTitle}>{new Intl.DateTimeFormat('es-AR',{dateStyle:'long',timeZone:'UTC'}).format(new Date(`${horoscope.horoscope_date}T12:00:00Z`))}</h2>
              <p className={styles.helpText}>Tu lectura personal, en seis momentos.</p>
              <ReadingDocument text={horoscope.horoscope_text} kind="daily" id="lectura-diaria" />
            </>
          ) : (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>◈</span>
              <p className={styles.emptyText}>
                Al confirmarse el pago se preparará tu primera lectura. Después se aplicará el horario que elegiste.
              </p>
            </div>
          )}
        </div>

        <section className={styles.card} id="ubicacion">
          <h2 className={styles.cardLabel}>Residencia y viajes</h2>
          <LocationSettings residence={residenceDisplay} trips={tripsDisplay} now={new Date().toISOString()} />
        </section>

        <section className={styles.card} id="carta-natal">
          <h2 className={styles.sectionTitle}>Mi carta natal</h2>
          <p className={styles.helpText}>Tu carta de nacimiento permanece disponible para consultarla cuando quieras. Los aspectos muestran las relaciones entre los planetas de tu nacimiento. Viajar no modifica esta carta.</p>
          {profile.natal_chart && <AstroChart data={profile.natal_chart} title="Tu carta natal" />}
          {profile.natal_interpretation ? <div className={styles.natalInterpretation}><p className={styles.cardLabel}>Más allá del gráfico</p><h2 className={styles.readingTitle}>Tu interpretación natal</h2><ReadingDocument text={profile.natal_interpretation} id="interpretacion-natal" /></div> : <>
            <p className={styles.helpText}>{isActive ? 'Tu interpretación todavía no está preparada. Podés generarla ahora.' : 'La carta se prepara al activar tu suscripción.'}</p>
            {isActive && <GenerateReportsButton />}
          </>}
        </section>

        <section className={styles.card} id="revolucion-solar">
          <h2 className={styles.sectionTitle}>Mi revolución solar</h2>
          <p className={styles.helpText}>Tu lectura anual se prepara hasta 30 días antes del retorno exacto del Sol a su posición natal, cerca de tu cumpleaños. Se calcula para la ubicación declarada en ese momento.</p>
          {!profile.residence && <p className={styles.helpText}>Guardá tu residencia y, si vas a viajar cerca de tu cumpleaños, informá el viaje antes de preparar el informe.</p>}
          {reports?.length ? reports.map(report => <details key={report.id} className={styles.reportDetails}>
            <summary>Ciclo {report.year}–{report.year + 1} · {report.status === 'ready' ? report.location?.label ?? 'Informe anual' : report.status === 'processing' ? 'Preparando' : 'Pendiente de completar'}</summary>
            {report.return_at && <p className={styles.helpText}>Retorno solar: {new Intl.DateTimeFormat('es-AR', { dateStyle:'long', timeStyle:'short', timeZone:report.location?.timezone ?? timezone }).format(new Date(report.return_at))} ({report.location?.timezone ?? timezone}).</p>}
            {report.location_basis === 'residence' && <p className={styles.helpText}>Ubicación de referencia: residencia declarada al calcular el informe. Si el retorno ya ocurrió, comprobá que coincide con el lugar donde estabas.</p>}
            {report.status === 'ready' && <><AstroChart data={report.chart} title={`Revolución solar ${report.year}`} /><ReadingDocument text={report.interpretation} id={`solar-${report.id}`} /></>}
          </details>) : <p className={styles.helpText}>Tus informes anuales aparecerán acá y quedarán guardados por ciclo.</p>}
          {isActive && profile.residence && <GenerateReportsButton />}
          <p className={styles.helpText}>Si cambiás la ubicación prevista, se preparará una nueva versión. Las anteriores conservan su lugar de cálculo.</p>
        </section>

        {/* Birth data */}
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
              <span className={styles.rowValue}>
                {profile.birth_place_resolved || "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <Button href="/suscripcion/gestionar" variant="outline" fullWidth>
            Gestionar suscripción
          </Button>
        </div>
      </div>
    </div>
  );
}