"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

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
        headers: {
          "Content-Type": "application/json",
        },
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
    <main style={{ padding: "60px", textAlign: "center" }}>
      <h1>Suscripción</h1>

      <p style={{ marginTop: "16px" }}>
        Recibí todos los días tu lectura personalizada por WhatsApp.
      </p>

      {missingParams ? (
        <p style={{ color: "red", marginTop: "40px", fontSize: "16px" }}>
          Faltan los datos del usuario. Por favor, completá el formulario de registro primero.
        </p>
      ) : (
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
      )}

      {error && (
        <p style={{ color: "red", marginTop: "20px" }}>
          {error}
        </p>
      )}
    </main>
  );
}

export default function SuscripcionPage() {
  return (
    <Suspense fallback={<main style={{ padding: "60px", textAlign: "center" }}>Cargando...</main>}>
      <SuscripcionContent />
    </Suspense>
  );
}