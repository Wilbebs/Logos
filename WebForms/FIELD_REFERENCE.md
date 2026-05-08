# LOGOS Forms — Field Reference

Forms are submitted via MachForm webhooks to:
- Form 1 → POST /webhook/machform/1
- Form 2 → POST /webhook/machform/2
- Form 3 → POST /webhook/machform/3

---

## Form 1 — Solicitud Oficial de Admisión Estados Unidos y el Mundo
**URL:** https://logoscu.com/forms/view.php?id=3  
**Purpose:** Main application — filled out by the applicant. Drives eligibility pipeline.

### General Information
- Title/Título
- Name prefix / Prefijo de Nombre
- First Name / Nombre *
- Last Name / Apellido *
- Gender/Género *
- Study levels / Niveles de Estudio * → maps to `program_level`
  - Certificate - Certificado → `certificate`
  - Diplomado → `institute`
  - Associate - Técnico Superior → `associate`
  - Bachelor - Licenciatura → `bachelors`
  - Master - Maestría → `masters`
  - Doctoral - Doctorado → `doctorate`
- Area of interest / Área de Interés *
  - Teología - Estudios Teológicos, Estudios Bíblicos, Consejería Cristiana,
    Capellanía, Estudios Pastorales, Liderazgo & Coaching, Librería Ilumina,
    Revista Logos, Otro: Educación Cristiana, Evangelismo, Misiones

### Address
- Street Address *, City *, State *, Postal/Zip *, Country *

### Contact Information
- Phone Home, Phone Work, Phone Mobile/Celular *
- Email I - Correo Electrónico I * → maps to `email`
- Confirmar Email *, Email II
- WhatsApp, Skype, Facebook, Instagram, LinkedIn
- Language Preferred

### Personal Information
- Date of Birth *, State of Birth, Birth Country
- Marital Status, Country of Citizenship
- Nearest Relative/Friend, Relationship, Tel Number

### Ministerial Information
- Ministry/Ministerio: Leader, Minister, Pastor, Prophet, Evangelist, Apostle, Otro
- En que año fue ordenado como Pastor
- Church/Iglesia Ministry/Ministerio
- ¿Desde cuándo asiste a la iglesia?
- ¿Desde cuándo pastorea en la Iglesia?
- ¿Cuántas personas asisten a la iglesia el domingo?
- ¿A qué denominación pertenece? *
- Resumen de vida en el ministerio (200 words max)

### High School
- Completo Su Escuela Secundaria * → used to derive `highest_education`
- Name, City, State, Country, Graduation Year
- GED section: State Issuing, Type of Diploma, Date Issuing

### University / College / Seminary
Each section has: Name, City, State, Country, Degree Earned, Date of Graduation
- **Associate *** → if Yes, sets `highest_education = associate`
- **Licenciatura (Bachelor) *** → if Yes, sets `highest_education = bachelors`
- **Maestría (Master) *** → if Yes, sets `highest_education = masters`
- **Doctorado *** → if Yes, sets `highest_education = doctorate`
- **Otro ***

### Educational Goal
- Desired Program / Programa Deseado * → maps to `program_applied`

### Documents Checklist (self-reported)
Multi-checkbox: "Marque los documentos que está incluyendo"
- Copia del título de Secundaria
- Hoja de metas educacionales
- Copia de la Licenciatura → used to detect `submitted_diploma`
- Copia del Associate - Técnico
- Copia del título de postgrado → used to detect `submitted_undergraduate_diploma`
- Transcripts - Registros oficiales de Notas de grado → used to detect `submitted_transcripts`
- File upload (up to 20 documents)

### Financial Information
- Budgets / Presupuesto → maps to `monthly_budget`
  - $25 USD - $50 USD → `low` tier (institute/certificate only)
  - $50 USD - $100 USD → `medium` tier (undergraduate programs)
  - (not answered) → `high` tier assumed (no constraint)
  - NOTE: No >$100 option exists. Graduate applicants who can afford it leave blank.

### Comments
- Notas (free text)

---

## Form 2 — Formulario de Recomendación Pastoral
**URL:** https://logoscu.com/forms/view.php?id=5  
**Purpose:** Filled out by the applicant's pastor. Character/spiritual reference.

### Applicant Info (entered by pastor)
- Nombre *, Apellido *
- Fecha de nacimiento *
- Dirección, Correo Electrónico * → used to link to applicant record
- Teléfono celular *, Teléfono alterno, WhatsApp, Skype, Facebook, Instagram, LinkedIn

### Pastor Info
- Nombre del Pastor, Nombre de la Iglesia, Denominación
- Dirección de la Iglesia, Ciudad, Estado, Código Postal
- Correo Electrónico *, Teléfono *, Fecha

### Questions (answered by pastor)
1. ¿Cuánto tiempo ha conocido al aplicante?
2. ¿Cuán bien conoce al aplicante? (de nombre/vista → extremadamente bien)
3. ¿Cree que el aplicante ha profesado ser salvo / nacido de nuevo? (Si/No/No estoy seguro)
4. ¿Observa evidencias que apoyen esta profesión de Fe?
5. ¿Es el aplicante miembro de su iglesia?
6. ¿Señale el nivel de participación? (Buen participante / Participa / No participa)
7. Actitud hacia la iglesia (Optimista, Organizador, Innovador, Estimulador, Crítico, etc.)
8. Describa el envolvimiento del aplicante en la iglesia local (free text)
9. De acuerdo a su conocimiento, el aplicante... (fuma / bebe / usa sustancias ilegales)
10. ¿Es responsable en pagar sus deudas? (Si/No/No sabe)
11. Rate applicant in areas (Bajo Promedio → Excepcional):
    - Compromiso Cristiano, Integridad y Carácter, Potencial de Liderazgo,
      Moral y Ética, Habilidad para hablar, Honestidad, Cooperación,
      Apariencia Personal, Confidencia, Orientación Familiar, Logros en el Ministerio,
      Salud Física, Constancia, Se resiste a los cambios, Fiel trabajador en equipo,
      Consideración por otros, Muestras de amor, Persistencia, Habilidad mental,
      Estabilidad emocional, Iniciativa, Solucionador de problemas, Innovativo,
      Trata de hacer muchas cosas al mismo tiempo
12. Información adicional sobre espiritualidad, carácter, temperamento (free text)
13. ¿Recomendaría a esta persona? (Si / Si con reservaciones / No) + Comentarios
14. Actitud hacia la autoridad (Consistente con enseñanzas bíblicas / Cuestionable / Problemática)

---

## Form 3 — Formulario de Experiencia Ministerial
**URL:** https://logoscu.com/forms/view.php?id=45982  
**Purpose:** Filled out by the applicant. Ministerial & professional background.

### Datos Personales
- Nombre *, Apellido *
- Dirección de Residencia * (street, city, state, postal, country)
- Correo Electrónico * → used to link to applicant record
- Confirmar Correo Electrónico *
- Teléfono, # de Whatsapp *, Facebook, Instagram, LinkedIn, Skype

### Datos de la Iglesia
- Nombre de la Iglesia *, Nombre del Pastor *
- Dirección de la Iglesia * (street, city, state, postal, country)
- Teléfono

### Experiencia Ministerial
- ¿Hace cuántos años que asiste a la Iglesia? * → used for ministerial experience calc
- Si es Pastor ¿Desde cuándo pastorea?
- ¿Cuántas veces asiste a la iglesia en la semana?
- ¿A qué denominación pertenece? *
- ¿Apoya a la Iglesia Financieramente? (Si / No / Diezmo / Ofrenda / Otros)
- Es usted * (Anciano / Evangelista / Diácono / Líder / Maestro / Pastor / Otro)
- ¿Con qué clase de grupo, denominación o ministerio mantiene su afiliación?
- Liste los ministerios en los que ha estado involucrado y por cuánto tiempo
- Resuma el entrenamiento Bíblico que ha recibido en la Iglesia
- Liste el entrenamiento especial (seminarios / talleres)
- Enumere las tareas que ha desempeñado en la Iglesia
- Liste los logros más sobresalientes en su ministerio
- Enumere los seminarios y/o talleres más importantes
- De una descripción general de su vida devocional
- ¿A quién está sometido ministerialmente?
- ¿Qué ministerio ha influenciado su vida?
- Mencione tres ministerios que puedan avalar su trayectoria
- Provea el nombre de sus tres mejores amigos
- Resuma su Testimonio

### Experiencia Profesional
- Área de desempeño Profesional * (Administración, Economía, Ingeniería, Medicina,
  Derecho, Programación, Marketing, Diseño Gráfico, Docencia, Medios, Dueño de Negocio,
  Empleado, Emprendedor, Freelancer)
- Profesión u Oficio (Especifique) *
- Años de Experiencia (0-1 / 1-5 / 5-10 / Más de 10)
- Habilidades Personales * (max 5 from list)
- Software o Herramientas que Maneja

### Documents
- File upload (1 or more)
- Liste los documentos que envía

### Life/Ministerial Credit Info (informational text, no fields)
- Up to 30 credits for 12+ years in ministry ($20/credit)
- Up to 15 credits for Biblical Knowledge Exam ($50)
- Up to 15 credits for ministerial internships ($300 total)
- Max 45 total credits, applicable up to Bachelor level only
