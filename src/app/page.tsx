import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import styles from './page.module.css';

export default function LandingPage() {
  return (
    <div className={styles.container}>
      <section className={styles.hero}>
        <h1 className="heading-xl">
          Tu horóscopo, interpretado de manera personal y exclusiva.
        </h1>
        <p className="text-body mb-8">
          Recibís cada noche tu horóscopo, interpretado específicamente según tu carta natal.
        </p>
        <div className={styles.ctaWrapper}>
          <Button href="/suscripcion" variant="primary" fullWidth>Suscribirme</Button>
        </div>
      </section>

      <section>
        <p className="text-body mb-4">
          Completás tus datos de nacimiento para calcular tu carta natal.
        </p>
        <p className="text-body">
          A partir de eso, comenzás a recibir tu horóscopo personal todos los días.
        </p>
      </section>
    </div>
  );
}
