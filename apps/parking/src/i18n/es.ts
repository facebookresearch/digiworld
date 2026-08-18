// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Translations } from './en'

const es: Translations = {
  common: {
    ok: 'OK',
    cancel: 'Cancelar',
    back: 'Atrás',
    logOut: 'Cerrar Sesión',
    loading: 'Cargando...',
    retry: 'Reintentar',
    error: 'Error',
    save: 'Guardar',
    delete: 'Eliminar',
    edit: 'Editar',
    play: 'Reproducir',
    pause: 'Pausar',
    duration: '{{minutes}}:{{seconds}}',
    noResults: 'No se encontraron resultados',
    emptyState: 'No hay nada que ver aquí todavía',
    songs: {
      one: '{{count}} canción',
      other: '{{count}} canciones',
    },
  },
  welcomeScreen: {
    appName: 'Andojo Bank',
    poweredBy: 'Desarrollado por Andojo',
    copyright: '© 2024 Andojo. Todos los derechos reservados.',
    version: 'Versión 1.0.0',
    loading: 'Cargando...',
    postscript:
      'psst — Esto probablemente no es cómo se va a ver tu app. (A menos que tu diseñador te haya enviado estas pantallas, y en ese caso, ¡lánzalas en producción!)',
    readyForLaunch: 'Tu app, casi lista para su lanzamiento',
    exciting: '(¡ohh, esto es emocionante!)',
    letsGo: '¡Vamos!',
  },
  errorScreen: {
    title: '¡Algo salió mal!',
    friendlySubtitle:
      'Esta es la pantalla que verán tus usuarios en producción cuando haya un error. Vas a querer personalizar este mensaje (que está ubicado en `app/i18n/es.ts`) y probablemente también su diseño (`app/screens/ErrorScreen`). Si quieres eliminarlo completamente, revisa `app/app.tsx` y el componente <ErrorBoundary>.',
    reset: 'REINICIA LA APP',
    traceTitle: 'Error desde %{name}',
  },
  emptyStateComponent: {
    generic: {
      heading: 'Muy vacío... muy triste',
      content:
        'No se han encontrado datos por el momento. Intenta darle clic en el botón para refrescar o recargar la app.',
      button: 'Intentemos de nuevo',
    },
  },

  errors: {
    invalidEmail: 'Correo electrónico inválido.',
    initialization: 'Error al inicializar la aplicación',
  },
  loginScreen: {
    logIn: 'Iniciar sesión',
    enterDetails:
      'Ingresa tus datos a continuación para desbloquear información ultra secreta. Nunca vas a adivinar lo que te espera al otro lado. O quizás si lo harás; la verdad no hay mucha ciencia alrededor.',
    emailFieldLabel: 'Email',
    passwordFieldLabel: 'Contraseña',
    emailFieldPlaceholder: 'Ingresa tu email',
    passwordFieldPlaceholder: 'Contraseña super secreta aquí',
    tapToLogIn: '¡Presiona acá para iniciar sesión!',
    hint: 'Consejo: puedes usar cualquier email y tu contraseña preferida :)',
  },
  demoNavigator: {
    componentsTab: 'Componentes',
    debugTab: 'Debug',
    communityTab: 'Comunidad',
    podcastListTab: 'Podcasts',
  },
  demoCommunityScreen: {
    title: 'Conecta con la comunidad',
    tagLine:
      'Únete a la comunidad React Native con los ingenieros de Infinite Red y mejora con nosotros tus habilidades para el desarrollo de apps.',
    joinUsOnSlackTitle: 'Únete a nosotros en Slack',
    joinUsOnSlack:
      '¿Quieres conectar con desarrolladores de React Native de todo el mundo? Únete a la conversación en nuestra comunidad de Slack. Nuestra comunidad, que crece día a día, es un espacio seguro para hacer preguntas, aprender de los demás y ampliar tu red.',
    joinSlackLink: 'Únete a la comunidad de Slack',
    makeIgniteEvenBetterTitle: 'Haz que Ignite sea aún mejor',
    makeIgniteEvenBetter:
      '¿Tienes una idea para hacer que Ignite sea aún mejor? ¡Nos encantaría escucharla! Estamos siempre buscando personas que quieran ayudarnos a construir las mejores herramientas para React Native. Únete a nosotros en GitHub para ayudarnos a construir el futuro de Ignite.',
    contributeToIgniteLink: 'Contribuir a Ignite',
    theLatestInReactNativeTitle: 'Lo último en el mundo de React Native',
    theLatestInReactNative:
      'Estamos aquí para mantenerte al día con todo lo que React Native tiene para ofrecer.',
    reactNativeRadioLink: 'React Native Radio',
    reactNativeNewsletterLink: 'Newsletter de React Native',
    reactNativeLiveLink: 'React Native Live',
    chainReactConferenceLink: 'Conferencia Chain React',
    hireUsTitle: 'Trabaja con Infinite Red en tu próximo proyecto',
    hireUs:
      'Ya sea para gestionar un proyecto de inicio a fin o educación a equipos a través de nuestros cursos y capacitación práctica, Infinite Red puede ayudarte en casi cualquier proyecto de React Native.',
    hireUsLink: 'Envíanos un mensaje',
  },
  demoShowroomScreen: {
    jumpStart: 'Componentes para comenzar tu proyecto',
    lorem2Sentences:
      'Nulla cupidatat deserunt amet quis aliquip nostrud do adipisicing. Adipisicing excepteur elit laborum Lorem adipisicing do duis.',
    demoHeaderTxExample: 'Yay',
    demoViaTxProp: 'A través de el atributo `tx`',
    demoViaSpecifiedTxProp: 'A través de el atributo específico `{{prop}}Tx`',
  },
  demoDebugScreen: {
    howTo: 'CÓMO HACERLO',
    title: 'Debug',
    tagLine:
      'Felicidades, aquí tienes una propuesta de arquitectura y base de código avanzada para una app en React Native. ¡Disfrutalos!',
    reactotron: 'Enviar a Reactotron',
    reportBugs: 'Reportar errores',
    demoList: 'Lista demo',
    demoPodcastList: 'Lista demo de podcasts',
    androidReactotronHint:
      'Si esto no funciona, asegúrate de que la app de escritorio de Reactotron se esté ejecutando, corre adb reverse tcp:9090 tcp:9090 desde tu terminal, y luego recarga la app.',
    iosReactotronHint:
      'Si esto no funciona, asegúrate de que la app de escritorio de Reactotron se esté ejecutando, y luego recarga la app.',
    macosReactotronHint:
      'Si esto no funciona, asegúrate de que la app de escritorio de Reactotron se esté ejecutando, y luego recarga la app.',
    webReactotronHint:
      'Si esto no funciona, asegúrate de que la app de escritorio de Reactotron se esté ejecutando, y luego recarga la app.',
    windowsReactotronHint:
      'Si esto no funciona, asegúrate de que la app de escritorio de Reactotron se esté ejecutando, y luego recarga la app.',
  },
  demoPodcastListScreen: {
    title: 'Episodios de React Native Radio',
    onlyFavorites: 'Mostrar solo favoritos',
    favoriteButton: 'Favorito',
    unfavoriteButton: 'No favorito',
    accessibility: {
      cardHint:
        'Haz doble clic para escuchar el episodio. Haz doble clic y mantén presionado para {{action}} este episodio.',
      switch: 'Activa para mostrar solo favoritos',
      favoriteAction: 'Cambiar a favorito',
      favoriteIcon: 'Episodio no favorito',
      unfavoriteIcon: 'Episodio favorito',
      publishLabel: 'Publicado el {{date}}',
      durationLabel:
        'Duración: {{hours}} horas {{minutes}} minutos {{seconds}} segundos',
    },
    noFavoritesEmptyState: {
      heading: 'Esto está un poco vacío',
      content:
        'No se han agregado episodios favoritos todavía. ¡Presiona el corazón dentro de un episodio para agregarlo a tus favoritos!',
    },
  },
  auth: {
    welcomeBack: 'Bienvenido de nuevo',
    signInToContinue: 'Inicia sesión para continuar',
    createAccount: 'Crear una cuenta',
    signUpToStart: 'Regístrate para comenzar',
    email: 'Correo electrónico',
    password: 'Contraseña',
    fullName: 'Nombre completo',
    forgotPassword: '¿Olvidaste tu contraseña?',
    signIn: 'Iniciar sesión',
    signUp: 'Registrarse',
    noAccount: '¿No tienes una cuenta? Regístrate',
    hasAccount: '¿Ya tienes una cuenta? Inicia sesión',
    emailPlaceholder: 'Ingresa tu correo electrónico',
    passwordPlaceholder: 'Ingresa tu contraseña',
    namePlaceholder: 'Ingresa tu nombre completo',
    validation: {
      emailRequired: 'El correo electrónico es requerido',
      emailInvalid: 'Formato de correo electrónico inválido',
      passwordRequired: 'La contraseña es requerida',
      passwordLength: 'La contraseña debe tener al menos 8 caracteres',
      nameRequired: 'El nombre completo es requerido',
    },
  },
  player: {
    nowPlaying: 'Reproduciendo',
    playback: {
      play: 'Reproducir',
      pause: 'Pausar',
      next: 'Siguiente',
      previous: 'Anterior',
      shuffle: 'Aleatorio',
      repeat: {
        none: 'Sin repetición',
        all: 'Repetir todo',
        one: 'Repetir una',
      },
    },
    actions: {
      addToFavorites: 'Agregar a favoritos',
      removeFromFavorites: 'Quitar de favoritos',
      share: 'Compartir canción',
    },
    errors: {
      playbackFailed: 'Error al reproducir la canción',
      toggleFavoriteFailed: 'Error al actualizar favoritos',
    },
    queue: 'Cola de reproducción',
    lyrics: 'Letras',
    addToPlaylist: 'Agregar a lista',
    removeFromPlaylist: 'Quitar de lista',
    share: 'Compartir',
  },
  library: {
    title: 'Biblioteca',
    playlists: 'Listas de reproducción',
    favorites: 'Favoritos',
    recentlyPlayed: 'Reproducido recientemente',
    albums: 'Álbumes',
    artists: 'Artistas',
    songs: 'Canciones',
    createPlaylist: 'Crear lista',
    editPlaylist: 'Editar lista',
    deletePlaylist: 'Eliminar lista',
    playlistName: 'Nombre de la lista',
    playlistDescription: 'Descripción de la lista',
    emptyPlaylist: 'Esta lista está vacía',
    addSongs: 'Agregar canciones',
    confirmDelete: '¿Estás seguro de que quieres eliminar esta lista?',
    details: {
      addSongs: 'Agregar Canciones',
      emptyState: 'Esta lista está vacía',
      emptyStateSubtext: '¡Comienza a agregar canciones!',
      songCount: '{{count}} canciones',
      duration: '{{minutes}}:{{seconds}}',
      remove: 'Quitar de la lista',
      monthlyListeners: '{{count}} oyentes mensuales',
      releaseYear: 'Lanzado en {{year}}',
      playbackSettings: {
        shuffle: 'Aleatorio',
        repeat: {
          none: 'Sin repetición',
          all: 'Repetir todo',
          one: 'Repetir una',
        },
      },
      errors: {
        playFailed: 'Error al reproducir {{type}}',
        toggleRepeatFailed: 'Error al cambiar el modo de repetición',
        removeSongFailed: 'Error al quitar la canción',
      },
    },
  },
  search: {
    title: 'Buscar',
    placeholder: 'Buscar canciones, artistas o álbumes',
    noResults: 'No se encontraron resultados',
    topResults: 'Mejores resultados',
    categories: {
      all: 'Todo',
      songs: 'Canciones',
      artists: 'Artistas',
      albums: 'Álbumes',
      playlists: 'Listas',
    },
    recentSearches: 'Búsquedas recientes',
    trending: 'Tendencias',
    clearHistory: 'Borrar historial',
    clear: 'Borrar',
    seeAll: 'Ver todo',
    details: {
      songCount: '{{count}} canciones',
      monthlyListeners: '{{count}} oyentes mensuales',
      playAll: 'Reproducir Todo',
      shuffle: 'Aleatorio',
      duration: '{{minutes}}:{{seconds}}',
    },
  },
  profile: {
    stats: {
      playlists: 'Listas',
      timeSpent: 'Tiempo de escucha',
      timeFormat: {
        hoursAndMinutes: '{{hours}} hora{{plural}} {{minutes}} min',
        onlyMinutes: '{{minutes}} min',
      },
    },
    sections: {
      preferences: {
        title: 'Preferencias',
        language: 'Idioma',
      },
      support: {
        title: 'Soporte',
        helpAndSupport: 'Ayuda y soporte',
        about: 'Acerca de',
      },
      legal: {
        title: 'Legal',
        termsAndConditions: 'Términos y condiciones',
        privacyPolicy: 'Política de privacidad',
      },
    },
    actions: {
      logOut: 'Cerrar sesión',
    },
  },
  creditCardTerms: {
    headerTitle: 'Términos de Tarjeta de Crédito',
    lastUpdated: 'Última actualización: {{date}}',
    acceptTerms: 'Acepto los Términos y Condiciones',
    applyNow: 'Solicitar Ahora',
    applying: 'Solicitando...',
    cancel: 'Cancelar',
    pleaseAcceptTerms:
      'Por favor acepta los términos y condiciones para continuar',
    applicationSuccess:
      '¡Solicitud de tarjeta de crédito enviada exitosamente!',
    applicationError: 'Error al solicitar tarjeta de crédito',
    loginRequired:
      'Por favor inicia sesión para solicitar una tarjeta de crédito',
    sections: {
      introduction: {
        title: '1. INTRODUCCIÓN',
        text: 'Estos Términos y Condiciones ("Términos") rigen el uso de la Tarjeta de Crédito Andojo ("Tarjeta") emitida por Andojo Bank. Al solicitar y usar esta Tarjeta, aceptas estar sujeto a estos Términos.',
      },
      creditLimit: {
        title: '2. LÍMITE DE CRÉDITO',
        text: [
          '• Tu límite de crédito inicial será determinado basado en tu solvencia crediticia',
          '• Podemos aumentar o disminuir tu límite de crédito a nuestra discreción',
          '• No puedes exceder tu límite de crédito sin nuestra aprobación previa',
          '• Se pueden aplicar tarifas por exceso de límite si excedes tu límite de crédito',
        ],
      },
      interestRatesAndFees: {
        title: '3. TASAS DE INTERÉS Y TARIFAS',
        text: [
          '• Tasa de Porcentaje Anual (APR): 18.99% (variable)',
          '• Tarifa Anual: $0 el primer año, $95 después',
          '• Tarifa por Pago Tardío: Hasta $40',
          '• Tarifa por Exceso de Límite: Hasta $35',
          '• Tarifa por Adelanto en Efectivo: 5% del monto del adelanto (mínimo $10)',
          '• Tarifa por Transacción Extranjera: 3% del monto de la transacción',
        ],
      },
      paymentTerms: {
        title: '4. TÉRMINOS DE PAGO',
        text: [
          '• El pago mínimo vence en la fecha de vencimiento cada mes',
          '• El pago mínimo es 2% de tu saldo pendiente o $25, lo que sea mayor',
          '• Los pagos recibidos después de las 5:00 PM ET se acreditan el siguiente día hábil',
          '• Los pagos tardíos pueden resultar en APR de penalización de hasta 29.99%',
        ],
      },
      billingAndStatements: {
        title: '5. FACTURACIÓN Y ESTADOS DE CUENTA',
        text: [
          '• Los estados de cuenta mensuales se proporcionarán electrónicamente o por correo',
          '• Debes notificarnos cualquier error de facturación dentro de 60 días',
          '• Los cargos por intereses comienzan a acumularse inmediatamente en adelantos en efectivo',
          '• Se aplica un período de gracia de 25 días a las compras (si pagas en su totalidad)',
        ],
      },
      cardUsage: {
        title: '6. USO DE LA TARJETA',
        text: [
          '• La tarjeta sigue siendo nuestra propiedad y debe ser devuelta cuando se solicite',
          '• Eres responsable de todas las transacciones autorizadas',
          '• Reporta tarjetas perdidas o robadas inmediatamente',
          '• La tarjeta puede usarse en todo el mundo donde sea aceptada',
        ],
      },
      rewardsProgram: {
        title: '7. PROGRAMA DE RECOMPENSAS',
        text: [
          '• Gana 1% de reembolso en todas las compras',
          '• Gana 2% de reembolso en compras de gasolina y supermercado',
          '• Las recompensas se acreditan a tu cuenta mensualmente',
          '• Las recompensas no tienen fecha de vencimiento',
        ],
      },
      securityAndFraud: {
        title: '8. SEGURIDAD Y PROTECCIÓN CONTRA FRAUDE',
        text: [
          '• Responsabilidad cero por transacciones no autorizadas cuando se reportan prontamente',
          '• Monitoreo de fraude y alertas 24/7',
          '• Tecnología de chip y PIN para mayor seguridad',
          '• Notificaciones de la aplicación móvil para todas las transacciones',
        ],
      },
      creditReporting: {
        title: '9. REPORTE CREDITICIO',
        text: [
          '• Podemos reportar la información de tu cuenta a las agencias de crédito',
          '• El historial de pagos afecta tu puntaje crediticio',
          '• El cierre de cuenta puede ser reportado a las agencias de crédito',
        ],
      },
      changesToTerms: {
        title: '10. CAMBIOS A LOS TÉRMINOS',
        text: [
          '• Podemos modificar estos términos con 45 días de aviso previo',
          '• El uso continuo de la tarjeta constituye aceptación de los cambios',
          '• Puedes cerrar tu cuenta si no estás de acuerdo con los cambios',
        ],
      },
      accountClosure: {
        title: '11. CIERRE DE CUENTA',
        text: [
          '• Puedes cerrar tu cuenta en cualquier momento',
          '• Podemos cerrar tu cuenta por cualquier razón con aviso',
          '• Los saldos pendientes siguen siendo debidos después del cierre de cuenta',
          '• Los pagos automáticos pueden continuar hasta que se pague el saldo',
        ],
      },
      disputeResolution: {
        title: '12. RESOLUCIÓN DE DISPUTAS',
        text: [
          '• Las disputas se resolverán a través de arbitraje vinculante',
          '• Se renuncian las demandas colectivas',
          '• Se permiten disputas en tribunales de reclamos menores',
        ],
      },
      contactInformation: {
        title: '13. INFORMACIÓN DE CONTACTO',
        text: [
          '• Servicio al Cliente: 1-800-ANDOJO-1',
          '• En línea: www.andojobank.com',
          '• Aplicación Móvil: Disponible en iOS y Android',
          '• Correo electrónico: support@andojobank.com',
        ],
      },
      legalCompliance: {
        title: '14. CUMPLIMIENTO LEGAL',
        text: [
          '• Sujeto a regulaciones bancarias federales y estatales',
          '• Cumplimiento de la Ley de Igualdad de Oportunidades de Crédito',
          '• Cumplimiento de la Ley de Veracidad en los Préstamos',
          '• Cumplimiento de la Ley de Reporte de Crédito Justo',
        ],
      },
      agreement: {
        text: 'Al marcar la casilla a continuación y hacer clic en "Solicitar Ahora", reconoces que has leído, entendido y aceptas estar sujeto a estos Términos y Condiciones.',
      },
    },
  },
  creditCardDiscovery: {
    steps: {
      reviewingProfile: 'Revisando tu perfil...',
      checkingCreditScore: 'Verificando puntaje crediticio...',
      waitingApproval: 'Esperando aprobación instantánea...',
    },
    success: {
      congratulations: '¡Felicitaciones!',
      approved: '¡Tu tarjeta de crédito ha sido aprobada exitosamente!',
      benefits:
        'Disfruta los beneficios de tu nueva Tarjeta de Crédito Andojo con 1% de reembolso en todas las compras y 2% en gasolina y supermercado.',
      readyToUse: 'Listo para Usar',
    },
    card: {
      creditCard: 'TARJETA DE CRÉDITO',
      cardName: 'Tarjeta de Crédito Andojo',
      limit: 'Límite $5,000',
      apr: 'APR 18.99%',
    },
  },
  termsAndConditions: {
    headerTitle: 'Términos y Condiciones',
    lastUpdated: 'Última actualización: 1 de noviembre de 2025',
    sections: {
      acceptance: {
        title: '1. Aceptación de los Términos',
        text: 'Al acceder y usar la aplicación móvil y los servicios de Andojo Bank, aceptas estos Términos y Condiciones. Si no estás de acuerdo, no uses los servicios.',
      },
      serviceDescription: {
        title: '2. Descripción del Servicio',
        text: 'Andojo Bank ofrece servicios bancarios y financieros a través de esta aplicación móvil, incluyendo gestión de cuentas, transferencias, pago de facturas y productos financieros relacionados.',
      },
      userAccounts: {
        title: '3. Cuentas de Usuario y Seguridad',
        text: [
          '3.1. Debes proporcionar información precisa al crear una cuenta y mantenerla actualizada.',
          '3.2. Eres responsable de la confidencialidad de tus credenciales, PINs y métodos de autenticación.',
          '3.3. Notifica inmediatamente si sospechas de acceso no autorizado a tu cuenta.',
        ],
      },
      feesAndCharges: {
        title: '4. Tarifas y Cargos',
        text: [
          '4.1. Las tarifas por servicios (si las hubiera) se muestran en la app y antes de completar una transacción.',
          '4.2. Podemos modificar tarifas con el aviso correspondiente según la ley.',
          '4.3. Eres responsable de cargos impuestos por bancos o procesadores de pago terceros.',
        ],
      },
      paymentsAndTransfers: {
        title: '5. Pagos y Transferencias',
        text: [
          '5.1. Las transacciones pueden estar sujetas a límites y demoras de procesamiento.',
          '5.2. Autorizas a Andojo Bank a ejecutar las transacciones que inicies desde la app.',
          '5.3. No somos responsables por errores causados por datos de destinatario incorrectos proporcionados por ti.',
        ],
      },
      privacyAndData: {
        title: '6. Privacidad y Datos',
        text: 'El uso del servicio también está regido por nuestra Política de Privacidad que explica cómo recopilamos, usamos y protegemos tu información personal.',
      },
      userConduct: {
        title: '7. Conducta del Usuario',
        text: [
          'Aceptas no:',
          '- Usar el servicio para actividades ilegales',
          '- Intentar eludir controles de seguridad',
          '- Usar la cuenta de otra persona sin autorización',
        ],
      },
      liability: {
        title: '8. Responsabilidad y Exenciones',
        text: 'Ofrecemos los servicios "tal cual". En la máxima medida permitida por la ley, Andojo Bank no será responsable por daños indirectos o consecuentes derivados del uso del servicio.',
      },
      termination: {
        title: '9. Terminación',
        text: 'Podemos suspender o terminar el acceso al servicio por violaciones de estos términos o por motivos de seguridad. Puedes cerrar tu cuenta siguiendo los procedimientos en la app.',
      },
      changes: {
        title: '10. Cambios a los Términos',
        text: 'Podemos modificar estos Términos con el aviso correspondiente. El uso continuado después del aviso constituye aceptación de los Términos actualizados.',
      },
      contact: {
        title: '11. Contacto',
        text: 'Si tienes preguntas sobre estos Términos, contacta a legal@andojobank.com',
      },
    },
  },

  privacyPolicy: {
    headerTitle: 'Política de Privacidad',
    lastUpdated: 'Última actualización: 1 de noviembre de 2025',
    sections: {
      introduction: {
        title: '1. Introducción',
        text: 'Esta Política de Privacidad explica cómo Andojo Bank ("nosotros", "nuestro") recopila, usa y protege tu información personal cuando utilizas nuestros servicios bancarios y la aplicación móvil.',
      },
      informationWeCollect: {
        title: '2. Información que Recopilamos',
        text: [
          '2.1. Información de identidad y cuenta:',
          '- Nombre completo, dirección, fecha de nacimiento',
          '- Documentos de identidad y verificación',
          '- Información de contacto (correo, teléfono)',
          '',
          '2.2. Información financiera y de transacciones:',
          '- Historial de transacciones, saldos y estados',
          '- Detalles de pago y beneficiarios',
          '',
          '2.3. Información del dispositivo y uso:',
          '- Identificadores de dispositivo, dirección IP y registros de uso',
          '- Datos de ubicación cuando esté permitido',
        ],
      },
      howWeUseInfo: {
        title: '3. Cómo Usamos Tu Información',
        text: [
          'Usamos tu información para:',
          '- Proveer y operar tus cuentas y los servicios solicitados',
          '- Procesar transacciones y pagos',
          '- Verificar identidad y prevenir fraude',
          '- Comunicarnos sobre tu cuenta',
          '- Cumplir obligaciones legales y regulatorias',
        ],
      },
      informationSharing: {
        title: '4. Compartir Información',
        text: [
          'Podemos compartir tu información con:',
          '- Proveedores de servicios y procesadores de pago',
          '- Autoridades regulatorias y legales según se requiera por ley',
          '- Otras instituciones financieras cuando inicies transferencias',
        ],
      },
      dataSecurity: {
        title: '5. Seguridad de los Datos',
        text: 'Implementamos medidas estándar de la industria para proteger tu información personal. Si sospechas una brecha, repórtalo inmediatamente.',
      },
      yourRights: {
        title: '6. Tus Derechos',
        text: [
          'Tienes derecho a:',
          '- Acceder y corregir tus datos personales',
          '- Solicitar eliminación cuando lo permita la ley',
          '- Oponerte a ciertos tratamientos',
          '- Presentar una reclamación ante la autoridad de protección de datos',
        ],
      },
      cookies: {
        title: '7. Cookies y Seguimiento',
        text: 'Usamos cookies y tecnologías similares para seguridad, análisis y mejorar la experiencia. Puedes gestionar preferencias de cookies en tu dispositivo.',
      },
      children: {
        title: '8. Privacidad de los Niños',
        text: 'Nuestros servicios no están dirigidos a menores de 13 años. No recopilamos conscientemente información personal de niños menores de 13 años.',
      },
      international: {
        title: '9. Transferencias Internacionales de Datos',
        text: 'Tu información puede ser procesada fuera de tu país. Tomamos medidas para asegurar salvaguardas apropiadas para dichas transferencias.',
      },
      changes: {
        title: '10. Cambios en la Política de Privacidad',
        text: 'Podemos actualizar esta Política de Privacidad. Notificaremos cambios materiales según lo requiera la ley.',
      },
      contact: {
        title: '11. Contacto',
        text: 'Para consultas de privacidad, contacta privacy@andojobank.com',
      },
    },
  },
}

export default es
