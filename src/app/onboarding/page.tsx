'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call and redirect
    setTimeout(() => {
      router.push('/gracias');
    }, 1000);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingTop: '2rem' }}>
      
      {step === 1 && (
        <>
          <div style={{ marginBottom: '3rem' }}>
            <h1 className="heading-lg">Tus datos de nacimiento</h1>
            <p className="text-body">
              Completá esta información con precisión para calcular tu carta natal y generar interpretaciones más precisas.
            </p>
          </div>

          <form onSubmit={handleNextStep} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <Input 
              label="Nombre completo" 
              placeholder="Ej. María Pérez" 
              required 
            />
            
            <Input 
              label="Fecha de nacimiento" 
              type="date" 
              required 
            />
            
            <Input 
              label="Hora de nacimiento" 
              type="time" 
              placeholder="--:--" 
              required 
            />
            
            <Input 
              label="Lugar de nacimiento" 
              placeholder="Ciudad, país" 
              required 
            />
            
            <div style={{ marginTop: 'auto', marginBottom: '2rem' }}>
              <Button variant="primary" fullWidth type="submit">
                Continuar
              </Button>
            </div>
          </form>
        </>
      )}

      {step === 2 && (
        <>
          <div style={{ marginBottom: '3rem' }}>
            <h1 className="heading-lg">Tu número de WhatsApp</h1>
            <p className="text-body">
              Vamos a enviarte tu horóscopo diario a este número.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <Input 
              label="Teléfono (WhatsApp)" 
              type="tel" 
              placeholder="+54 9 11 1234 5678" 
              required 
            />
            
            <div style={{ marginTop: 'auto', marginBottom: '2rem' }}>
              <Button variant="primary" fullWidth type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : 'Finalizar'}
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
