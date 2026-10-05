import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { Button } from "@/components/ui/Button";
import CancelSubscriptionButton from "./CancelSubscriptionButton";
import styles from "../../panel/panel.module.css";

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export default async function ManageSubscriptionPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select(
      "subscription_status,mercadopago_subscription_status,subscription_next_payment_at"
    )
    .eq("auth_user_id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  const isActive = profile.subscription_status === "active";
  const subscribeHref = `/suscripcion?userId=${encodeURIComponent(
    user.id
  )}&email=${encodeURIComponent(user.email || "")}`;

  return (
    <div className={styles.root}>
      <div className="stars-bg" aria-hidden="true" />
      <div className={styles.glowTop} aria-hidden="true" />

      <div className={`${styles.pageWrap} page-content`}>
        <header className={styles.header}>
          <span className={styles.logo}>✦ ID Astral</span>
          <h1 className={styles.pageTitle}>Suscripción</h1>
        </header>

        <div className={styles.card}>
          <div className={styles.cardTop}>
            <div className={styles.cardLabel}>Estado actual</div>

            <span
              className={styles.activeBadge}
              style={
                isActive
                  ? undefined
                  : {
                      color: "#ef4444",
                      background: "rgba(239, 68, 68, 0.1)",
                      borderColor: "rgba(239, 68, 68, 0.2)",
                    }
              }
            >
              {isActive && <span className={styles.activeDot} />}
              {isActive ? "Activa" : "Inactiva"}
            </span>
          </div>

          <div className={styles.cardRows}>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Plan</span>
              <span className={styles.rowValue}>ARS 4.990 / mes</span>
            </div>

            <div className={styles.row}>
              <span className={styles.rowLabel}>Mercado Pago</span>
              <span className={styles.rowValue}>
                {profile.mercadopago_subscription_status || "—"}
              </span>
            </div>

            <div className={styles.row}>
              <span className={styles.rowLabel}>Próximo cobro</span>
              <span className={styles.rowValue}>
                {formatDate(profile.subscription_next_payment_at)}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          {isActive ? (
            <CancelSubscriptionButton />
          ) : (
            <Button href={subscribeHref} variant="primary" fullWidth>
              Activar suscripción
            </Button>
          )}

          <Button href="/panel" variant="secondary" fullWidth>
            Volver al panel
          </Button>
        </div>
      </div>
    </div>
  );
}
