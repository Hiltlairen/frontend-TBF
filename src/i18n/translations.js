// ============================================================
// translations.js — Diccionarios de la interfaz (punto 7: i18n)
// ============================================================
// IMPORTANTE — alcance deliberado (ver README, sección "Internacionalización"):
// Esto traduce el CHROME fijo de la interfaz (botones, etiquetas, mensajes
// de error de validación) de las pantallas SIN cuenta por las que pasa
// cualquier persona antes de identificarse: entrada del estudiante, login
// del personal, y las pantallas de carga/error/resultado del juego.
//
// NO traduce el contenido pedagógico que genera Gemini (instrucciones de
// cada actividad, oraciones, vocabulario): ese texto se genera en español
// porque el producto enseña inglés A estudiantes hispanohablantes — es un
// problema de "localización de contenido", distinto de "internacionalizar
// la interfaz", y no tiene sentido resolverlo traduciendo strings fijos.
// Tampoco cubre el panel de docente/curaduría/admin: quienes lo usan son
// personal de instituciones bolivianas, hispanohablante por definición del
// despliegue actual, así que el valor real de traducirlo hoy es ~nulo.
//
// El patrón (dic anidado + t(clave, vars) con interpolación simple) es el
// mismo para agregar más pantallas o idiomas después — ver LanguageContext.jsx.
export const TRADUCCIONES = {
  es: {
    login: {
      sub: 'Acceso para personal de la institución',
      email_label: 'Correo institucional',
      password_label: 'Contraseña',
      show_pass: 'Mostrar contraseña',
      hide_pass: 'Ocultar contraseña',
      show: 'ver',
      hide: 'ocultar',
      signing_in: 'Entrando…',
      sign_in: 'Entrar',
      forgot_password: '¿Olvidaste tu contraseña?',
      student_link: '¿Eres estudiante? Entra con tu código →',
      captcha_needed: 'Completa la verificación "No soy un robot".',
      code_title: 'Revisa tu correo',
      code_sent: 'Te enviamos un código de 6 dígitos a {email}. Vale por {n} minutos.',
      code_label: 'Código de verificación',
      code_verify: 'Verificar y entrar',
      code_verifying: 'Verificando…',
      code_resend: 'Reenviar código',
      code_resend_wait: 'Reenviar en {n} s',
      code_resent: 'Te mandamos un código nuevo.',
      code_back: '← Usar otra cuenta',
    },
    student: {
      enter_code_prompt: 'Ingresa el código que te dio tu profesor',
      what_is_your_name: '¿Cómo te llamas?',
      room_code_label: 'Código de sala',
      digit_aria: 'Dígito {n}',
      searching_room: 'Buscando sala…',
      continue: 'Continuar →',
      privacy_note: 'Tu nombre y tus resultados se usan solo para esta clase y se eliminan automáticamente pasado un tiempo. El registro oficial lo conserva tu institución.',
      mode_adventure: 'Aventura',
      mode_activity: 'Actividad',
      teacher_prefix: 'Prof. {nombre}',
      capacity: 'Cupo: {dentro}/{limite} estudiantes',
      your_student_code_label: 'Tu código de estudiante',
      code_placeholder: 'Ej. AB12CD',
      code_note: 'Es el código que te entregó tu profesor a inicio de semestre. No necesitas nombre ni contraseña.',
      your_name_label: 'Tu nombre',
      name_placeholder: 'Nombre y apellido',
      name_note: 'Así aparecerás en la lista de tu profesor. No necesitas crear una cuenta.',
      entering: 'Entrando…',
      start: 'Empezar →',
      use_other_code: '← Usar otro código',
      teacher_link: 'Soy docente — ir al panel →',
      error_missing_student_code: 'Escribe tu código de estudiante.',
      error_missing_name: 'Escribe tu nombre para continuar.',
    },
    game: {
      loading: 'Preparando tu sala…',
      error_title: 'Algo salió mal',
      back_home: 'Volver al inicio',
      submitted_title: 'Entregado',
      finished_title: '¡Terminaste!',
      pending_review: 'Tu profesor revisará esta actividad y te dará la nota.',
      exit: 'Salir',
      current_average: 'Promedio actual: {n}',
      // Pantalla final (punto 8: pantalla de resultado)
      verdict_alto: '¡Excelente trabajo!',
      verdict_medio: 'Buen trabajo, todavía puedes subir',
      verdict_bajo: 'Sigue practicando, ya casi',
      score_aria: 'Puntaje: {n} de 100',
      route_title: 'Tu recorrido',
      stages_done: 'Pasaste por {n} etapas',
      // Resumen de errores (repaso del sistema + tutor IA)
      correct_of: 'Acertaste {ok} de {total}',
      mastered_title: 'Dominaste',
      review_title: 'Para repasar',
      perfect: '¡Sin errores! Lo dominaste todo.',
      correct_answer: 'Correcta',
      your_answer: 'Tú',
      no_answer: 'sin responder',
      practice_btn: 'Repasar mis errores ({n})',
      practice_again: 'Repasar otra vez',
      practice_done: 'Repaso hecho: {n}/100',
      tutor_btn: 'Consejos del tutor IA',
      tutor_loading: 'El tutor está pensando',
      tutor_title: 'Tu tutor dice',
      tutor_retry: 'Reintentar',
    },
    theme: {
      to_dark: 'Cambiar a tema oscuro',
      to_light: 'Cambiar a tema claro',
      dark: 'Oscuro',
      light: 'Claro',
    },
  },
  en: {
    login: {
      sub: 'Access for institution staff',
      email_label: 'Institutional email',
      password_label: 'Password',
      show_pass: 'Show password',
      hide_pass: 'Hide password',
      show: 'show',
      hide: 'hide',
      signing_in: 'Signing in…',
      sign_in: 'Sign in',
      forgot_password: 'Forgot your password?',
      student_link: 'Are you a student? Enter with your code →',
      captcha_needed: 'Please complete the "I am not a robot" check.',
      code_title: 'Check your email',
      code_sent: 'We sent a 6-digit code to {email}. It is valid for {n} minutes.',
      code_label: 'Verification code',
      code_verify: 'Verify and sign in',
      code_verifying: 'Verifying…',
      code_resend: 'Resend code',
      code_resend_wait: 'Resend in {n} s',
      code_resent: 'We sent you a new code.',
      code_back: '← Use another account',
    },
    student: {
      enter_code_prompt: 'Enter the code your teacher gave you',
      what_is_your_name: "What's your name?",
      room_code_label: 'Room code',
      digit_aria: 'Digit {n}',
      searching_room: 'Looking up room…',
      continue: 'Continue →',
      privacy_note: 'Your name and results are used only for this class and are automatically deleted after some time. Your institution keeps the official record.',
      mode_adventure: 'Adventure',
      mode_activity: 'Activity',
      teacher_prefix: 'Teacher: {nombre}',
      capacity: 'Spots: {dentro}/{limite} students',
      your_student_code_label: 'Your student code',
      code_placeholder: 'E.g. AB12CD',
      code_note: 'This is the code your teacher gave you at the start of the term. No name or password needed.',
      your_name_label: 'Your name',
      name_placeholder: 'First and last name',
      name_note: "This is how you'll appear on your teacher's list. No account needed.",
      entering: 'Signing in…',
      start: 'Start →',
      use_other_code: '← Use a different code',
      teacher_link: "I'm a teacher — go to the dashboard →",
      error_missing_student_code: 'Enter your student code.',
      error_missing_name: 'Enter your name to continue.',
    },
    game: {
      loading: 'Getting your room ready…',
      error_title: 'Something went wrong',
      back_home: 'Back to home',
      submitted_title: 'Submitted',
      finished_title: 'You finished!',
      pending_review: 'Your teacher will review this activity and give you a grade.',
      exit: 'Exit',
      current_average: 'Current average: {n}',
      // Final screen
      verdict_alto: 'Excellent work!',
      verdict_medio: 'Good job — there is still room to grow',
      verdict_bajo: 'Keep practising, you are getting there',
      score_aria: 'Score: {n} out of 100',
      route_title: 'Your route',
      stages_done: 'You went through {n} stages',
      // Mistake summary (system review + AI tutor)
      correct_of: 'You got {ok} out of {total} right',
      mastered_title: 'You mastered',
      review_title: 'To review',
      perfect: 'No mistakes! You mastered everything.',
      correct_answer: 'Correct',
      your_answer: 'You',
      no_answer: 'no answer',
      practice_btn: 'Practise my mistakes ({n})',
      practice_again: 'Practise again',
      practice_done: 'Practice done: {n}/100',
      tutor_btn: 'Tips from the AI tutor',
      tutor_loading: 'The tutor is thinking',
      tutor_title: 'Your tutor says',
      tutor_retry: 'Try again',
    },
    theme: {
      to_dark: 'Switch to dark theme',
      to_light: 'Switch to light theme',
      dark: 'Dark',
      light: 'Light',
    },
  },
}

/** Busca una clave con puntos ("login.sign_in") dentro de un diccionario anidado. */
function buscar(dic, clave) {
  return clave.split('.').reduce((o, k) => (o == null ? o : o[k]), dic)
}

/** Interpola {variable} dentro de un string con los valores de `vars`. */
function interpolar(texto, vars) {
  if (!vars) return texto
  return texto.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m))
}

/**
 * Traduce `clave` en el idioma dado. Si falta en ese idioma cae a español
 * (el idioma con cobertura completa); si falta en los dos, devuelve la
 * clave misma para que el faltante sea visible en vez de romper la UI.
 */
export function traducir(idioma, clave, vars) {
  const texto = buscar(TRADUCCIONES[idioma], clave) ?? buscar(TRADUCCIONES.es, clave) ?? clave
  return interpolar(texto, vars)
}

export const IDIOMAS_DISPONIBLES = ['es', 'en']
