import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function SuscripcionPage() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingTop: '4rem' }}>
      <h1 className="heading-lg">Estás a un paso de suscribirte.</h1>
      <p className="text-body mb-8">
        En el siguiente paso vas a completar el pago mensual.
      </p>
      
      <div style={{ marginTop: 'auto', marginBottom: '2rem' }}>
        <Button href="/onboarding" variant="primary" fullWidth>Continuar al pago</Button>
      </div>
    </div>
  );
}
