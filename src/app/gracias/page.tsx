"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import styles from "./gracias.module.css";

type ConfirmationState = "checking" | "active" | "pending" | "error";

function GraciasContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");
  const checkoutToken = searchParams.get("checkoutToken");

  const [state, setState] = useState<ConfirmationState>("checking");
  const [message, setMessage] = useState(
    "Estamos confirmando tu suscripción con Mercado Pago."
  );

  useEffect(() => {
    if (!userId) {
      setState("error");
      setMessage(
        "No encontramos los datos necesarios para confirmar la suscripción."
      );
      return;
    }

    let cancelled = false;

    async function confirmSubscription() {
      for (let attempt = 1; attempt <= 4; attempt += 1) {
        try {
          const response = await fetch("/api/mp-confirm-subscription", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, checkoutToken }),
            cache: "no-store",
          });

          const data = await response.json();

          if (cancelled) return;

          if (response.ok && data.subscriptionStatus === "active") {
            setState("active");
            setMessage(
              "Tu pago está confirmado. Estamos preparando tu lectura para enviártela ahora. Después se usará tu horario de entrega. El valor inicial es a las 22 del día anterior y podés cambiarlo desde tu cuenta."
            );
            return;
          }

          if (response.ok && data.mercadoPagoStatus === "pending") {
            setState("pending");
            setMessage(
              "Mercado Pago todavía está terminando de confirmar la suscripción."
            );
          } else if (!response.ok) {
            setState("error");
            setMessage(data.error || "No pudimos confirmar la suscripción.");
          }
        } catch {
          if (cancelled) return;
          setState("error");
          setMessage("No pudimos confirmar la suscripción en este momento.");
        }

        if (attempt < 4) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }
    }

    confirmSubscription();

    return () => {
      cancelled = true;
    };
  }, [userId, checkoutToken]);

  const isActive = state === "active";
  const isChecking = state === "checking";
  const isPending = state === "pending";

  return (
    <div className={styles.root}>
      <div className="stars-bg" aria-hidden="true" />
      <div className={styles.glowTop} aria-hidden="true" />

      <div className={`${styles.pageWrap} page-content`}>
        <div className={styles.logoRow}>
          <span className={styles.logo}>✦ ID Astral</span>
        </div>

        <div className={styles.celebrationIcon} aria-hidden="true">
          <div className={styles.celebrationRing} />
          <span className={styles.celebrationCheck}>
            {isActive ? "✓" : "◐"}
          </span>
        </div>

        <h1 className={styles.title}>
          {isActive ? (
            <>
              Bienvenido/a a<br />
              <em className={styles.titleEmphasis}>ID Astral.</em>
            </>
          ) : (
            <>
              Confirmando tu<br />
              <em className={styles.titleEmphasis}>suscripción.</em>
            </>
          )}
        </h1>

        <p className={styles.subtitle}>{message}</p>

        <div className={styles.statusGrid}>
          <div className={styles.statusCard}>
            <span className={styles.statusIcon}>◎</span>
            <div className={styles.statusText}>
              <span className={styles.statusLabel}>Suscripción</span>
              <span
                className={`${styles.statusValue} ${
                  isActive ? styles.statusActive : ""
                }`}
              >
                {isActive && <span className={styles.activeDot} />}
                {isActive
                  ? "Activa"
                  : isChecking
                  ? "Confirmando"
                  : isPending
                  ? "Pendiente"
                  : "Revisar"}
              </span>
            </div>
          </div>

          <div className={styles.statusCard}>
            <span className={styles.statusIcon}>◐</span>
            <div className={styles.statusText}>
              <span className={styles.statusLabel}>Carta natal</span>
              <span className={styles.statusValue}>
                {isActive ? "Calculada" : "En espera"}
              </span>
            </div>
          </div>

          <div className={styles.statusCard}>
            <span className={styles.statusIcon}>☽</span>
            <div className={styles.statusText}>
              <span className={styles.statusLabel}>Envío diario</span>
              <span className={styles.statusValue}>22:00 por defecto</span>
            </div>
          </div>

          <div className={styles.statusCard}>
            <span className={styles.statusIcon}>→</span>
            <div className={styles.statusText}>
              <span className={styles.statusLabel}>Lectura</span>
              <span className={styles.statusValue}>Configurable en Mi cuenta</span>
            </div>
          </div>
        </div>

        <div className={styles.welcomeCard}>
          <p className={styles.welcomeText}>
            Cada lectura se construye sobre tu carta natal y los tránsitos
            correspondientes a la fecha que vas a recibir.
          </p>
          <p className={styles.welcomeText}>
            No es un horóscopo genérico. Es tu horóscopo.
          </p>
        </div>

        <div className={styles.cta}>
          <Button
            href={isActive ? "/login" : "/suscripcion"}
            variant="primary"
            fullWidth
          >
            {isActive ? "Ingresar a mi panel →" : "Volver →"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function GraciasPage() {
  return (
    <Suspense fallback={<div className="stars-bg" aria-hidden="true" />}>
      <GraciasContent />
    </Suspense>
  );
}
