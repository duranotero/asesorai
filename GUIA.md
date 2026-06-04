# Asesor Financiero — Guía de instalación y despliegue

App de asesor financiero con cuentas de usuario, datos privados por persona, asesor de IA. Cualquiera puede registrarse y usarla con sus propios datos.

**Privacidad:** cada usuario solo ve sus propios datos. Esto lo garantiza Supabase con Row Level Security (RLS) — no es una promesa del código, es una regla aplicada en el servidor de la base de datos.

---

## Lo que vas a necesitar (todo gratis para empezar)

1. Una cuenta en **Supabase** → https://supabase.com
2. Una cuenta en **Netlify** → https://netlify.com
3. Una cuenta en **GitHub** → https://github.com (para conectar el código con Netlify)
4. Una clave de API de **Anthropic** (para el asesor IA) → https://console.anthropic.com

No necesitas saber programar. Solo seguir los pasos en orden.

---

## PASO 1 — Crear la base de datos en Supabase

1. Entra a supabase.com y crea una cuenta.
2. Pulsa **New project**. Ponle un nombre (ej. "asesor"), elige una contraseña para la base de datos (guárdala) y una región cercana. Espera 1-2 minutos a que se cree.
3. En el menú izquierdo abre **SQL Editor** → **New query**.
4. Abre el archivo `supabase_schema.sql` de este proyecto, copia TODO su contenido y pégalo en el editor.
5. Pulsa **Run** (abajo a la derecha). Debe decir "Success". Esto crea las tablas y las reglas de privacidad.
6. Ve a **Project Settings** (engranaje) → **API**. Copia y guarda estos dos valores:
   - **Project URL** (algo como `https://xxxx.supabase.co`)
   - **anon public** key (una cadena larga)

> La "anon key" es pública y segura de exponer: la protección real la dan las reglas RLS que acabas de crear.

### (Opcional) Registro sin confirmar correo
Por defecto Supabase pide confirmar el email. Si quieres que la gente entre al instante:
- Ve a **Authentication** → **Sign In / Providers** → **Email** y desactiva "Confirm email". (Para uso real, es más seguro dejarlo activado.)

---

## PASO 2 — Subir el código a GitHub

1. Crea una cuenta en github.com.
2. Crea un repositorio nuevo (botón **New**), por ejemplo "asesor-financiero". Déjalo público o privado, da igual.
3. Sube todos los archivos de esta carpeta al repositorio. La forma más fácil sin usar la terminal:
   - En la página del repo vacío, pulsa **uploading an existing file**.
   - Arrastra todos los archivos y carpetas del proyecto (incluyendo `src`, `netlify`, `package.json`, etc.).
   - Pulsa **Commit changes**.

---

## PASO 3 — Desplegar en Netlify

1. Entra a netlify.com y crea una cuenta (puedes entrar con GitHub).
2. Pulsa **Add new site** → **Import an existing project** → **GitHub**, y elige tu repositorio.
3. Netlify detecta la configuración automáticamente (gracias al archivo `netlify.toml`). Verás:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Antes de desplegar, abre **Add environment variables** (o luego en Site settings → Environment variables) y añade estas tres:

   | Nombre | Valor |
   |---|---|
   | `VITE_SUPABASE_URL` | tu Project URL de Supabase |
   | `VITE_SUPABASE_ANON_KEY` | tu anon public key de Supabase |
   | `ANTHROPIC_API_KEY` | tu clave secreta de Anthropic |

5. Pulsa **Deploy**. En 1-2 minutos tu app estará online en una dirección tipo `https://nombre-al-azar.netlify.app`.
6. Puedes cambiar ese nombre en **Site settings** → **Change site name**.

¡Listo! Comparte el enlace. Cualquiera puede entrar, registrarse con su correo y usar la app con sus propios datos privados.

---

## Probarlo en tu computadora antes (opcional)

Si quieres verlo localmente:

1. Instala Node.js (https://nodejs.org).
2. En la carpeta del proyecto, copia `.env.example` como `.env` y rellena tus valores.
3. En la terminal:
   ```
   npm install
   npm run dev
   ```
4. Abre la dirección que aparezca (normalmente http://localhost:5173).

> Nota: el asesor IA usa una función de Netlify, que en local requiere `netlify dev` (instalando la CLI de Netlify) en lugar de `npm run dev`. El resto de la app funciona con `npm run dev`.

---

## Costos

- **Supabase**: plan gratuito generoso (suficiente para cientos de usuarios personales).
- **Netlify**: plan gratuito suficiente para empezar.
- **Anthropic**: se paga por uso. Cada respuesta del asesor consume una pequeña cantidad. Puedes poner un límite de gasto en tu consola de Anthropic.

---

## Notas de seguridad y privacidad

- Las contraseñas las gestiona Supabase de forma cifrada; tú nunca las ves ni las almacenas.
- Cada usuario solo accede a sus filas gracias a las políticas RLS. Si las borras, se rompe la privacidad: no las quites.
- La clave de Anthropic vive solo en el servidor (variable de entorno de Netlify), nunca llega al navegador.
- Esta app da orientación financiera general, no asesoría regulada.
