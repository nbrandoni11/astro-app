"use client";

import { useState } from "react";

export default function SuscripcionPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCheckout() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/mp-create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: "4affe580-890f-4e91-8b4b-ec1eb061e1df", // después lo hacemos dinámico
          email: "tu-email-real@email.com", // después lo hacemos dinámico
        }),
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
    <main style={{ padding: "60px", textAlign: "center" }}>
      <h1>Suscripción</h1>

      <p style={{ marginTop: "16px" }}>
        Recibí todos los días tu lectura personalizada por WhatsApp.
      </p>

      <button
        onClick={handleCheckout}
        disabled={loading}
        style={{
          marginTop: "40px",
          padding: "16px 28px",
          fontSize: "18px",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Redirigiendo..." : "Pagar con Mercado Pago"}
      </button>

      {error && (
        <p style={{ color: "red", marginTop: "20px" }}>
          {error}
        </p>
      )}
    </main>
  );
}