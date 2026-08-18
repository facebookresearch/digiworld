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
    appName: 'Andojo Video',
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
}

export default es
