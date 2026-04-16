import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function GraciasPage() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: '4rem', paddingBottom: '4rem' }}>
      <h1 className="heading-xl">Listo</h1>
      <p className="text-body mb-12">
        A partir de ahora, vas a recibir cada noche tu horóscopo personal en WhatsApp.
      </p>
      
      <div>
        <Button href="/panel" variant="primary" fullWidth>Ir al panel</Button>
      </div>
    </div>
  );
}
