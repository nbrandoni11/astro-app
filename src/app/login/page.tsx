"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();

        setLoading(true);

        try {
            console.log("=== MAGIC LINK START ===");
            console.log("Email:", email);
            console.log(
                "Redirect:",
                `${window.location.origin}/auth/callback`
            );

            const { data, error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            console.log("Magic Link data:", data);
            console.log("Magic Link error:", error);

            if (error) {
                console.error("=== MAGIC LINK ERROR ===");
                console.error("Full error:", error);
                console.error("Message:", error.message);
                console.error("Status:", error.status);
                console.error("Code:", error.code);

                alert(
                    `Error enviando Magic Link

Message: ${error.message || "Sin mensaje"}
Status: ${error.status ?? "Sin status"}
Code: ${error.code ?? "Sin código"}`
                );

                return;
            }

            console.log("=== MAGIC LINK SUCCESS ===");
            setSent(true);

        } catch (err: any) {
            console.error("=== UNEXPECTED MAGIC LINK ERROR ===");
            console.error("Full error:", err);
            console.error("Message:", err?.message);
            console.error("Stack:", err?.stack);

            alert(
                `Error inesperado

Message: ${err?.message || "Sin mensaje"}

Revisar consola del navegador.`
            );
        } finally {
            setLoading(false);
        }
    }

    if (sent) {
        return (
            <main
                style={{
                    maxWidth: 500,
                    margin: "80px auto",
                    textAlign: "center",
                    padding: 20,
                }}
            >
                <h1>Revisá tu correo</h1>

                <p style={{ marginTop: 20 }}>
                    Te enviamos un enlace de acceso a:
                </p>

                <strong>{email}</strong>

                <p style={{ marginTop: 20 }}>
                    Abrí ese correo y hacé clic en el botón para ingresar a tu panel.
                </p>
            </main>
        );
    }

    return (
        <main
            style={{
                maxWidth: 500,
                margin: "80px auto",
                padding: 20,
            }}
        >
            <h1>Ingresar</h1>

            <p style={{ marginTop: 10, marginBottom: 30 }}>
                Ingresá el mismo email con el que realizaste la suscripción.
            </p>

            <form onSubmit={handleLogin}>
                <input
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{
                        width: "100%",
                        padding: 12,
                        marginBottom: 20,
                        borderRadius: 8,
                        border: "1px solid #ccc",
                    }}
                />

                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        width: "100%",
                        padding: 12,
                        borderRadius: 8,
                        cursor: "pointer",
                    }}
                >
                    {loading ? "Enviando..." : "Enviarme enlace de acceso"}
                </button>
            </form>
        </main>
    );
}