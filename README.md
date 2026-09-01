# Premio Joven Empresario Sanjuanino — Edición 2026

Landing de la convocatoria + base de datos de postulaciones + panel de administración.

- **Framework:** Astro 5 en modo `server` (SSR), adaptador `@astrojs/vercel`
- **Base de datos:** [Supabase](https://supabase.com) (Postgres). El formulario y el panel hablan con la API en el servidor; RLS deja las tablas cerradas al público.
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

### Usuarios del panel

Los usuarios viven en la tabla `admins` de Supabase. Creá el tuyo con `npm run admin:create`
(interactivo) o de una sola vez:

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
    db.ts           cliente de Supabase (service role, solo servidor)
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

## Deploy en Vercel

El proyecto ya usa el adaptador `@astrojs/vercel`. Vercel detecta Astro solo: no hace falta
tocar el comando de build ni el directorio de salida.

### 1. Base de datos en Supabase

El proyecto **Came Joven** ya tiene las tablas `postulaciones` y `admins`, con RLS
activado: el navegador no puede leer ni escribir. El servidor usa la *service role*.

En el dashboard: *Settings → API* copiá la `service_role` (secret).

### 2. Variables de entorno en Vercel

En *Project → Settings → Environment Variables*, para **Production** y **Preview**:

| Variable | Valor |
|---|---|
| `SUPABASE_URL` | `https://ftdhunbwaglhxuwnbrit.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | La clave `service_role` de Settings → API |
| `SESSION_SECRET` | Cadena aleatoria larga — **distinta** de la de desarrollo |
| `PUBLIC_FECHA_CIERRE` | `2026-09-14T23:59:00-03:00` |

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Se leen de `process.env` **en tiempo de ejecución**, así que cambiar la fecha de
cierre o rotar el secreto no exige recompilar: alcanza con reiniciar el deploy.

### 3. Conectar el repo

Importá `webplotcentersj-hash/came` desde el dashboard de Vercel, o desde la terminal:

```bash
vercel --prod
```

### 4. Crear el primer usuario del panel

Con `SUPABASE_SERVICE_ROLE_KEY` en el `.env` local (es la misma base de producción):

```bash
npm run admin:create
```

### Probar el entorno de Vercel en local

```bash
npm run vercel:dev
```

Requiere `vercel link` una vez. Para el día a día alcanza con `npm run dev`.

---

## Volver a un servidor propio

Si en algún momento conviene autohospedarlo en lugar de Vercel:

```bash
npm i @astrojs/node && npm rm @astrojs/vercel
```

Cambiá el adaptador en `astro.config.mjs` por `node({ mode: 'standalone' })`.
La base sigue siendo Supabase: no hace falta un archivo local.

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

- **Email de contacto**: todavía no hay casilla oficial publicada en el sitio.
- **Bases y condiciones**: `/bases` tiene un resumen redactado a partir de los requisitos
  conocidos. Reemplazar por el reglamento oficial cuando esté firmado.
- **Emails automáticos**: hoy no se envía ninguno (la copia del formulario no promete uno).
  Para sumar el acuse de recibo a quien se postula y el aviso interno al equipo, conectar un
  proveedor (Resend, SMTP institucional) en [src/pages/api/postular.ts](src/pages/api/postular.ts),
  después del `INSERT`.

