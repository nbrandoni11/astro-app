import Link from 'next/link';
import styles from '@/app/panel/panel.module.css';
export default function TermsPage(){return <main className={styles.root}><div className={styles.pageWrap}>
 <Link href="/">✦ ID Astral</Link><h1>Condiciones de uso</h1><div className={styles.reading}>
 <h2>Datos y lecturas</h2><p>ID Astral prepara interpretaciones astrológicas a partir de la información declarada. Verificá fecha, hora, lugar de nacimiento y ubicación de tus viajes. Las interpretaciones no garantizan acontecimientos futuros ni sustituyen asesoramiento profesional.</p>
 <h2>Ubicaciones</h2><p>Las sugerencias proporcionadas por Google Maps están sujetas a los <a href="https://maps.google.com/help/terms_maps/" target="_blank" rel="noreferrer">Términos de Servicio de Google Maps</a>. Comprobá el resultado antes de seleccionarlo. Cuando Google no está disponible, el servicio puede ofrecer una base local de referencia, identificada como respaldo.</p>
 <h2>Suscripción</h2><p>El precio y las condiciones de pago se muestran al contratar. Podés consultar el estado y gestionar tu suscripción desde tu cuenta. La disponibilidad de mensajería depende también de los proveedores que realizan la entrega.</p>
 <p>Consultá cómo se utiliza tu información en nuestra <Link href="/privacidad">política de privacidad</Link>.</p>
 </div></div></main>;}
