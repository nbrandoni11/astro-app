import { Button } from '@/components/ui/Button';
import styles from './panel.module.css';

export default function PanelPage() {
  return (
    <div className={styles.container}>
      <h1 className="heading-lg mb-8">Mi cuenta</h1>
      
      <div className={styles.section}>
        <div className={styles.row}>
          <span className={styles.label}>Estado de suscripción:</span>
          <span className={styles.value}>Activa</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Próximo cobro:</span>
          <span className={styles.value}>—</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>WhatsApp vinculado:</span>
          <span className={styles.value}>—</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Datos natales:</span>
          <span className={styles.value}>completos</span>
        </div>
      </div>

      <div className={styles.actions}>
        <Button variant="outline" fullWidth>Actualizar datos</Button>
        <Button variant="secondary" fullWidth>Gestionar suscripción</Button>
      </div>
    </div>
  );
}
