# Premio Joven Empresario Sanjuanino — Edición 2026

Landing de la convocatoria + base de datos de postulaciones + panel de administración.

- **Framework:** Astro 5 en modo `server` (SSR) con adaptador Node standalone
- **Base de datos:** SQLite vía `@libsql/client` (archivo local; en producción puede apuntarse a Turso sin cambiar código)
- **Sin dependencias de UI:** CSS propio, cero frameworks de estilos

**Paleta:** rosa `#ffd8dd` · violeta `#662d91` · arena `#c7b299`

---

## Puesta en marcha

```bash
npm install
```

Copiá las variables de entorno y generá una clave de sesión:

```bash
cp .env.example .env
```

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Pegá el resultado en `SESSION_SECRET` dentro de `.env`.

Creá el primer usuario del panel:

```bash
npm run admin:create
```

Levantá el sitio:

```bash
npm run dev
```

- Landing: http://localhost:4325
- Panel: http://localhost:4325/admin

### Datos de ejemplo

```bash
npm run db:seed
```

Carga cinco postulaciones ficticias (emails `@ejemplo.test`) para ver el panel con contenido.
Para empezar de cero, borrá `data/premio.db` y volvé a levantar el sitio: el esquema se recrea solo.

### Usuarios del panel

Los usuarios viven en la tabla `admins` de la base local, que **no se versiona**: al clonar el
repo no existe ninguno. Creá el tuyo con `npm run admin:create` (interactivo) o de una sola vez:

```bash
npm run admin:create -- tuemail@dominio.com "Tu Nombre" "una-clave-larga"
```

Correr el comando con un email ya existente **pisa la contraseña** de ese usuario.
Las contraseñas se guardan con scrypt + salt; nunca en texto plano.

---

## Estructura

```
src/
  lib/
    db.ts           cliente libSQL + esquema (se crea solo al primer uso)
    auth.ts         hash scrypt, cookie de sesión firmada, requireAdmin()
    validacion.ts   validación del formulario (edad 18-40, CUIT, 1 año operando)
    consultas.ts    filtros, listado paginado, métricas, export
    fechas.ts       formateo en zona horaria de Argentina
  components/
    Formulario.astro  formulario público (postulación / nominación)
    LogoPremio.astro  emblema oficial (blanco / violeta)
    Footer.astro      pie con las entidades organizadoras
  layouts/
    Base.astro      layout público
    Admin.astro     layout del panel
  pages/
    index.astro         landing
    bases.astro         bases y condiciones
    gracias.astro       confirmación post-envío
    api/postular.ts     endpoint del formulario
    admin/
      login.astro       ingreso
      index.astro       listado + KPIs + filtros
      [id].astro        ficha completa, estado, notas, eliminar
      export.csv.ts     exportación (respeta los filtros activos)
      logout.ts
scripts/
  create-admin.mjs  alta de usuarios del panel
  seed.mjs          datos de ejemplo
data/
  premio.db         base SQLite (ignorada por git)
```

---

## Cómo funciona

### Formulario público

Un mismo formulario cubre los dos CTA del flyer:

- **Postulate ahora** → `tipo=postulacion`
- **Nominá a alguien** → `tipo=nominacion`, que suma el bloque con los datos de quien nomina

Se validan del lado del servidor los tres requisitos del premio: edad entre 18 y 40 años
(calculada desde la fecha de nacimiento), CUIT argentino válido con dígito verificador, y
al menos un año de actividad desde el año de inicio declarado.

Anti-spam: campo trampa invisible + descarte de envíos hechos en menos de 3 segundos.
Los bots reciben un `ok` silencioso y no se guarda nada. También se descartan envíos
repetidos del mismo email + CUIT dentro de una ventana de 10 minutos.

El formulario envía por `fetch` y muestra los errores campo por campo; sin JavaScript
funciona igual con `POST` nativo y redirección a `/gracias`.

### Panel

- KPIs: total, sin revisar, preseleccionadas, últimos 7 días
- Búsqueda por nombre, empresa, email o CUIT; filtros por estado y por tipo
- Cambio de estado directo desde el listado
- Ficha completa con notas internas, accesos a email y WhatsApp, y trazabilidad (IP, navegador)
- Exportación a CSV con separador `;` y BOM, para que Excel en español lo abra bien
- Sesión por cookie `HttpOnly` firmada con HMAC-SHA256, válida 8 horas; contraseñas con scrypt

Todo `/admin/*` está detrás de `requireAdmin()` y marcado `noindex`.

---

## Producción

```bash
npm run build
npm run preview     # node ./dist/server/entry.mjs
```

El servidor escucha en `HOST`/`PORT` (por defecto `4321`). Variables necesarias:

| Variable | Para qué |
|---|---|
| `SESSION_SECRET` | Firma de la cookie de sesión. Obligatoria, larga y aleatoria. |
| `DATABASE_URL` | `file:./data/premio.db` local, o `libsql://…turso.io` en la nube. |
| `DATABASE_AUTH_TOKEN` | Solo si `DATABASE_URL` es remota. |
| `PUBLIC_FECHA_CIERRE` | Fecha ISO del cierre; alimenta la cuenta regresiva del hero. |

Con SQLite local hay que **persistir el volumen `data/`** entre despliegues. Si el hosting
no lo permite (Vercel, Netlify y similares), creá una base en [Turso](https://turso.tech),
apuntá `DATABASE_URL` y `DATABASE_AUTH_TOKEN` ahí y cambiá el adaptador de Astro por el
del proveedor: el resto del código no se toca.

---

## Identidad visual

Los assets oficiales ya están integrados y optimizados en `public/`:

| Archivo | Qué es | Dónde se usa |
|---|---|---|
| `logos/emblema-blanco.png` | Emblema, versión blanca | Hero, barra sobre el hero, panel |
| `logos/emblema-violeta.png` | Emblema recoloreado a #662d91 | Barra al scrollear, login, /gracias |
| `logos/lockup-blanco.png` | Marca completa con tipografía | Pie de página, imagen de Open Graph |
| `logos/jefes.png` · `fesj.png` · `came-joven.png` · `came.png` | Entidades organizadoras | Pie de página |
| `hongo-640/1100/1920.jpg` | El Hongo de Ischigualasto | Fondo del hero (`srcset` responsivo, 20–139 KB) |
| `favicon.png` | Emblema sobre violeta | Pestaña del navegador |

Los logos son blancos sobre transparencia, así que **solo funcionan sobre fondos oscuros**.
Para usarlos sobre fondo claro hay que recolorearlos, como se hizo con el emblema violeta.

La foto del hero lleva tres capas encima: un tinte violeta en `multiply`, un degradado que
oscurece arriba y abajo, y manchas de color desenfocadas. Si se cambia la foto, revisar
`.hero-tinte` y `.hero-velo` en [src/pages/index.astro](src/pages/index.astro).

**Tipografía:** Outfit para títulos, Poppins para texto, ambas desde Google Fonts.

---

## Pendientes de contenido

- **Fecha de cierre**: el flyer decía "martes 18 de agosto", que ya pasó. En `.env` quedó una
  fecha provisoria (`PUBLIC_FECHA_CIERRE`) que alimenta la cuenta regresiva del hero y la
  barra fija de mobile. Ajustala a la fecha real de esta edición.
- **Email de contacto**: hoy figura `premio@camejovensanjuan.org` en el pie, el FAQ, `/bases`
  y `/gracias`. Cambiarlo por la casilla oficial.
- **Bases y condiciones**: `/bases` tiene un resumen redactado a partir de los requisitos
  conocidos. Reemplazar por el reglamento oficial cuando esté firmado.
- **Emails automáticos**: hoy no se envía ninguno (la copia del formulario no promete uno).
  Para sumar el acuse de recibo a quien se postula y el aviso interno al equipo, conectar un
  proveedor (Resend, SMTP institucional) en [src/pages/api/postular.ts](src/pages/api/postular.ts),
  después del `INSERT`.

