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
          userId: "4affe580-890f-4e91-8b4b-ec1eb061e1df",
          email: "nbrandoni.exe@gmail.com",
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
    <main style={{ padding: "48px", maxWidth: "720px", margin: "0 auto" }}>
      <h1>Suscripción diaria</h1>

      <p>
        Recibí todos los días tu lectura astrológica personalizada por WhatsApp.
      </p>

      <button
        onClick={handleCheckout}
        disabled={loading}
        style={{
          padding: "14px 22px",
          borderRadius: "10px",
          border: "none",
          cursor: loading ? "not-allowed" : "pointer",
          fontSize: "16px",
          fontWeight: 600,
        }}
      >
        {loading ? "Abriendo Mercado Pago..." : "Pagar con Mercado Pago"}
      </button>

      {error && (
        <p style={{ color: "red", marginTop: "16px" }}>
          {error}
        </p>
      )}
    </main>
  );
}