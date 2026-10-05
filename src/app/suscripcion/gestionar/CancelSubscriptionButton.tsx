"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export default function CancelSubscriptionButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleCancel() {
    const confirmed = window.confirm(
      "¿Querés cancelar la suscripción mensual? No se realizarán nuevos cobros."
    );

    if (!confirmed) return;

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/mp-cancel-subscription", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setMessage(data.error || "No pudimos cancelar la suscripción.");
        return;
      }

      setMessage("Suscripción cancelada correctamente.");
      router.refresh();
    } catch (error: any) {
      setMessage(error?.message || "No pudimos cancelar la suscripción.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        fullWidth
        onClick={handleCancel}
        disabled={loading}
      >
        {loading ? "Cancelando..." : "Cancelar suscripción"}
      </Button>

      {message && (
        <p
          style={{
            marginTop: 12,
            fontSize: "0.82rem",
            lineHeight: 1.5,
            opacity: 0.8,
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
