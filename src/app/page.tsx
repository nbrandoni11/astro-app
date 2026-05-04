"use client";

import { useState } from "react";

export default function SuscripcionPage() {
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    setLoading(true);

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

    window.location.href = data.init_point;
  }

  return (
    <main style={{ padding: "60px", textAlign: "center" }}>
      <h1>Suscripción activa</h1>

      <button
        onClick={handleCheckout}
        disabled={loading}
        style={{
          marginTop: "40px",
          padding: "16px 28px",
          fontSize: "18px",
          cursor: "pointer",
        }}
      >
        {loading ? "Redirigiendo..." : "Pagar con Mercado Pago"}
      </button>
    </main>
  );
}