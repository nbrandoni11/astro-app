import Link from 'next/link';
import styles from '@/app/panel/panel.module.css';
export default function PrivacyPage(){return <main className={styles.root}><div className={styles.pageWrap}>
 <Link href="/">✦ ID Astral</Link><h1>Privacidad</h1><div className={styles.reading}>
 <h2>Datos que usa el servicio</h2><p>ID Astral utiliza los datos que ingresás —nombre, email, WhatsApp, fecha, hora y lugar de nacimiento, residencia y viajes— para gestionar tu cuenta, calcular tus lecturas y entregarlas. El proveedor de pagos procesa la información de pago.</p>
 <h2>Búsquedas de ubicación</h2><p>Cuando se usa Google Maps, el texto de búsqueda y el lugar seleccionado se envían a Google para obtener sugerencias, coordenadas y huso horario. ID Astral conserva el identificador del lugar y tu texto de búsqueda. La copia de los datos de Google se guarda temporalmente durante un máximo de 30 días y puede renovarse para realizar cálculos.</p>
 <p>El buscador de respaldo utiliza una base local de ciudades y señala cuando está funcionando como referencia aproximada.</p>
 <h2>Proveedores</h2><p>El funcionamiento del servicio utiliza Supabase y Vercel para cuenta y alojamiento, AstrologyAPI para cálculos, OpenAI para interpretaciones, Twilio y WhatsApp para mensajes, y Mercado Pago para suscripciones. Cada proveedor recibe los datos necesarios para su función.</p>
 <h2>Acceso y conservación</h2><p>Los informes se vinculan a tu cuenta para que puedas consultarlos. Las búsquedas no envían tu carta natal a Google. Los registros de control de consumo del buscador guardan un identificador técnico transformado y se eliminan después de 32 días.</p>
 <p>Para solicitar asistencia sobre tu información, contactá a ID Astral por el canal por el que contrataste el servicio.</p>
 <p>También se aplica la <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Política de Privacidad de Google</a> a sus servicios de ubicación.</p>
 </div><Link href="/terminos">Condiciones de uso</Link></div></main>;}
