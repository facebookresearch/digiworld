// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Translations } from './en'

const hi: Translations = {
  common: {
    ok: 'ठीक है!',
    cancel: 'रद्द करें',
    back: 'वापस',
    logOut: 'लॉग आउट',
    loading: 'लोड हो रहा है...',
    retry: 'पुनः प्रयास करें',
    error: 'त्रुटि',
    save: 'सहेजें',
    delete: 'हटाएं',
    edit: 'संपादित करें',
    play: 'चलाएं',
    pause: 'रोकें',
    duration: '{{minutes}}:{{seconds}}',
    noResults: 'कोई परिणाम नहीं मिला',
    emptyState: 'अभी यहां कुछ नहीं है',
    songs: {
      one: '{{count}} गाना',
      other: '{{count}} गाने',
    },
  },
  welcomeScreen: {
    title: 'अंडोजोफ्लाई में आपका स्वागत है',
    secureText: 'आपका यात्रा साथी',
    connecting: 'फ्लाइट सेवाओं से कनेक्ट हो रहा है...',
    version: 'संस्करण 1.0.0',
    copyright: '© 2025 अंडोजो. सर्वाधिकार सुरक्षित।',
    loading: 'लोड हो रहा है...',
  },
  errorScreen: {
    title: 'कुछ गलत हो गया!',
    friendlySubtitle:
      'यह वह स्क्रीन है जो आपके उपयोगकर्ता संचालन में देखेंगे जब कोई त्रुटि होगी। आप इस संदेश को बदलना चाहेंगे (जो `app/i18n/hi.ts` में स्थित है) और शायद लेआउट भी (`app/screens/ErrorScreen`)। यदि आप इसे पूरी तरह से हटाना चाहते हैं, तो `app/app.tsx` में <ErrorBoundary> कंपोनेंट की जांच करें।',
    reset: 'ऐप रीसेट करें',
    traceTitle: '%{name} स्टैक से त्रुटि',
  },
  emptyStateComponent: {
    generic: {
      heading: 'इतना खाली... इतना उदास',
      content:
        'अभी तक कोई डेटा नहीं मिला। रीफ्रेश करने या ऐप को पुनः लोड करने के लिए बटन दबाएं।',
      button: 'चलो फिर से कोशिश करते हैं',
    },
  },

  errors: {
    invalidEmail: 'अमान्य ईमेल पता।',
    initialization: 'एप्लिकेशन प्रारंभ करने में विफल',
  },
  loginScreen: {
    logIn: 'लॉग इन करें',
    enterDetails:
      'सर्वश्रेष्ठ रहस्य पता करने के लिए नीचे अपना विवरण दर्ज करें। आप कभी अनुमान नहीं लगा पाएंगे कि हमारे पास क्या इंतजार कर रहा है। या शायद आप कर सकते हैं; यह रॉकेट साइंस नहीं है।',
    emailFieldLabel: 'ईमेल',
    passwordFieldLabel: 'पासवर्ड',
    emailFieldPlaceholder: 'अपना ईमेल पता दर्ज करें',
    passwordFieldPlaceholder: 'सुपर सीक्रेट पासवर्ड यहाँ',
    tapToLogIn: 'लॉग इन करने के लिए टैप करें!',
    hint: 'संकेत: आप किसी भी ईमेल पते और अपने पसंदीदा पासवर्ड का उपयोग कर सकते हैं :)',
  },
  demoNavigator: {
    componentsTab: 'कंपोनेंट्स',
    debugTab: 'डीबग',
    communityTab: 'समुदाय',
    podcastListTab: 'पॉडकास्ट',
  },
  demoCommunityScreen: {
    title: 'समुदाय से जुड़ें',
    tagLine:
      'Infinite Red के React Native इंजीनियरों के समुदाय से जुड़ें और हमारे साथ अपने ऐप विकास को बेहतर बनाएं!',
    joinUsOnSlackTitle: 'Slack पर हमसे जुड़ें',
    joinUsOnSlack:
      'क्या आप चाहते हैं कि दुनिया भर के React Native इंजीनियरों से जुड़ने के लिए कोई जगह हो? Infinite Red Community Slack में बातचीत में शामिल हों! हमारा बढ़ता हुआ समुदाय प्रश्न पूछने, दूसरों से सीखने और अपने नेटवर्क को बढ़ाने के लिए एक सुरक्षित स्थान है।',
    joinSlackLink: 'Slack समुदाय में शामिल हों',
    makeIgniteEvenBetterTitle: 'Ignite को और बेहतर बनाएं',
    makeIgniteEvenBetter:
      'Ignite को और बेहतर बनाने का कोई विचार है? हमें यह सुनकर खुशी होगी! हम हमेशा ऐसे लोगों की तलाश में रहते हैं जो हमें सर्वश्रेष्ठ React Native टूलिंग बनाने में मदद करना चाहते हैं। Ignite के भविष्य को बनाने में हमारे साथ शामिल होने के लिए GitHub पर हमसे जुड़ें।',
    contributeToIgniteLink: 'Ignite में योगदान दें',
    theLatestInReactNativeTitle: 'React Native में नवीनतम',
    theLatestInReactNative:
      'हम आपको React Native के सभी प्रस्तावों पर अपडेट रखने के लिए यहां हैं।',
    reactNativeRadioLink: 'React Native रेडियो',
    reactNativeNewsletterLink: 'React Native न्यूजलेटर',
    reactNativeLiveLink: 'React Native लाइव',
    chainReactConferenceLink: 'Chain React कॉन्फ्रेंस',
    hireUsTitle: 'अपने अगले प्रोजेक्ट के लिए Infinite Red को काम पर रखें',
    hireUs:
      'चाहे वह एक पूरा प्रोजेक्ट चलाना हो या हमारे हैंड्स-ऑन प्रशिक्षण के साथ टीमों को गति देना हो, Infinite Red लगभग किसी भी React Native प्रोजेक्ट में मदद कर सकता है।',
    hireUsLink: 'हमें एक संदेश भेजें',
  },
  demoShowroomScreen: {
    jumpStart: 'अपने प्रोजेक्ट को जंप स्टार्ट करने के लिए कंपोनेंट्स!',
    lorem2Sentences:
      'कोई भी काम जो आप नहीं करना चाहते, उसे करने के लिए किसी और को ढूंढना चाहिए। जो लोग दूसरों की मदद करते हैं, वे खुद की भी मदद करते हैं।',
    demoHeaderTxExample: 'हाँ',
    demoViaTxProp: '`tx` प्रॉप के माध्यम से',
    demoViaSpecifiedTxProp: '`{{prop}}Tx` प्रॉप के माध्यम से',
  },
  demoDebugScreen: {
    howTo: 'कैसे करें',
    title: 'डीबग',
    tagLine:
      'बधाई हो, आपके पास यहां एक बहुत उन्नत React Native ऐप टेम्पलेट है। इस बॉयलरप्लेट का लाभ उठाएं!',
    reactotron: 'Reactotron को भेजें',
    reportBugs: 'बग्स की रिपोर्ट करें',
    demoList: 'डेमो सूची',
    demoPodcastList: 'डेमो पॉडकास्ट सूची',
    androidReactotronHint:
      'यदि यह काम नहीं करता है, तो सुनिश्चित करें कि Reactotron डेस्कटॉप ऐप चल रहा है, अपने टर्मिनल से adb reverse tcp:9090 tcp:9090 चलाएं, और ऐप को पुनः लोड करें।',
    iosReactotronHint:
      'यदि यह काम नहीं करता है, तो सुनिश्चित करें कि Reactotron डेस्कटॉप ऐप चल रहा है और ऐप को पुनः लोड करें।',
    macosReactotronHint:
      'यदि यह काम नहीं करता है, तो सुनिश्चित करें कि Reactotron डेस्कटॉप ऐप चल रहा है और ऐप को पुनः लोड करें।',
    webReactotronHint:
      'यदि यह काम नहीं करता है, तो सुनिश्चित करें कि Reactotron डेस्कटॉप ऐप चल रहा है और ऐप को पुनः लोड करें।',
    windowsReactotronHint:
      'यदि यह काम नहीं करता है, तो सुनिश्चित करें कि Reactotron डेस्कटॉप ऐप चल रहा है और ऐप को पुनः लोड करें।',
  },
  demoPodcastListScreen: {
    title: 'React Native रेडियो एपिसोड',
    onlyFavorites: 'केवल पसंदीदा दिखाएं',
    favoriteButton: 'पसंदीदा',
    unfavoriteButton: 'नापसंद',
    accessibility: {
      cardHint:
        'एपिसोड सुनने के लिए डबल टैप करें। इस एपिसोड को {{action}} करने के लिए डबल टैप करें और होल्ड करें।',
      switch: 'केवल पसंदीदा दिखाने के लिए स्विच करें',
      favoriteAction: 'पसंदीदा टॉगल करें',
      favoriteIcon: 'एपिसोड पसंदीदा नहीं है',
      unfavoriteIcon: 'एपिसोड पसंदीदा है',
      publishLabel: '{{date}} को प्रकाशित',
      durationLabel: 'अवधि: {{hours}} घंटे {{minutes}} मिनट {{seconds}} सेकंड',
    },
    noFavoritesEmptyState: {
      heading: 'यह थोड़ा खाली लगता है',
      content:
        'अभी तक कोई पसंदीदा नहीं जोड़ा गया है। इसे अपने पसंदीदा में जोड़ने के लिए किसी एपिसोड पर दिल पर टैप करें!',
    },
  },
  auth: {
    welcomeBack: 'वापसी पर स्वागत है',
    signInToContinue: 'जारी रखने के लिए साइन इन करें',
    createAccount: 'खाता बनाएं',
    signUpToStart: 'शुरू करने के लिए साइन अप करें',
    email: 'ईमेल',
    password: 'पासवर्ड',
    fullName: 'पूरा नाम',
    forgotPassword: 'पासवर्ड भूल गए?',
    signIn: 'साइन इन करें',
    signUp: 'साइन अप करें',
    noAccount: 'खाता नहीं है? साइन अप करें',
    hasAccount: 'पहले से खाता है? साइन इन करें',
    emailPlaceholder: 'अपना ईमेल दर्ज करें',
    passwordPlaceholder: 'अपना पासवर्ड दर्ज करें',
    namePlaceholder: 'अपना पूरा नाम दर्ज करें',
    validation: {
      emailRequired: 'ईमेल आवश्यक है',
      emailInvalid: 'अमान्य ईमेल प्रारूप',
      passwordRequired: 'पासवर्ड आवश्यक है',
      passwordLength: 'पासवर्ड कम से कम 8 अक्षर का होना चाहिए',
      nameRequired: 'पूरा नाम आवश्यक है',
    },
  },
  player: {
    nowPlaying: 'अभी चल रहा है',
    playback: {
      play: 'चलाएं',
      pause: 'रोकें',
      next: 'अगला',
      previous: 'पिछला',
      shuffle: 'शफ़ल',
      repeat: {
        none: 'दोहराएं नहीं',
        all: 'सभी दोहराएं',
        one: 'एक दोहराएं',
      },
    },
    actions: {
      addToFavorites: 'पसंदीदा में जोड़ें',
      removeFromFavorites: 'पसंदीदा से हटाएं',
      share: 'गाना शेयर करें',
    },
    errors: {
      playbackFailed: 'गाना चलाने में विफल',
      toggleFavoriteFailed: 'पसंदीदा अपडेट करने में विफल',
    },
  },
  library: {
    title: 'लाइब्रेरी',
    playlists: 'प्लेलिस्ट',
    favorites: 'पसंदीदा',
    recentlyPlayed: 'हाल ही में चलाए गए',
    albums: 'एल्बम',
    artists: 'कलाकार',
    songs: 'गाने',
    createPlaylist: 'प्लेलिस्ट बनाएं',
    editPlaylist: 'प्लेलिस्ट संपादित करें',
    deletePlaylist: 'प्लेलिस्ट हटाएं',
    playlistName: 'प्लेलिस्ट का नाम',
    playlistDescription: 'प्लेलिस्ट का विवरण',
    emptyPlaylist: 'यह प्लेलिस्ट खाली है',
    addSongs: 'गाने जोड़ें',
    confirmDelete: 'क्या आप वाकई इस प्लेलिस्ट को हटाना चाहते हैं?',
    details: {
      addSongs: 'गाने जोड़ें',
      emptyState: 'यह प्लेलिस्ट खाली है',
      emptyStateSubtext: 'गाने जोड़ना शुरू करें!',
      songCount: '{{count}} गाने',
      duration: '{{minutes}}:{{seconds}}',
      remove: 'प्लेलिस्ट से हटाएं',
      monthlyListeners: '{{count}} मासिक श्रोता',
      releaseYear: '{{year}} में रिलीज़',
      playbackSettings: {
        shuffle: 'शफ़ल',
        repeat: {
          none: 'दोहराएं नहीं',
          all: 'सभी दोहराएं',
          one: 'एक दोहराएं',
        },
      },
      errors: {
        playFailed: '{{type}} चलाने में विफल',
        toggleRepeatFailed: 'दोहराने का मोड बदलने में विफल',
        removeSongFailed: 'गाना हटाने में विफल',
      },
    },
  },
  search: {
    title: 'खोजें',
    placeholder: 'गाने, कलाकार या एल्बम खोजें',
    noResults: 'कोई परिणाम नहीं मिला',
    topResults: 'शीर्ष परिणाम',
    categories: {
      all: 'सभी',
      songs: 'गाने',
      artists: 'कलाकार',
      albums: 'एल्बम',
      playlists: 'प्लेलिस्ट',
    },
    recentSearches: 'हाल की खोजें',
    trending: 'ट्रेंडिंग',
    clearHistory: 'इतिहास साफ़ करें',
    clear: 'साफ़ करें',
    seeAll: 'सभी देखें',
    details: {
      songCount: '{{count}} गाने',
      monthlyListeners: '{{count}} मासिक श्रोता',
      playAll: 'सभी चलाएं',
      shuffle: 'शफ़ल करें',
      duration: '{{minutes}}:{{seconds}}',
    },
  },
  profile: {
    stats: {
      playlists: 'प्लेलिस्ट',
      timeSpent: 'सुनने का समय',
      timeFormat: {
        hoursAndMinutes: '{{hours}} घंटा {{minutes}} मिनट',
        onlyMinutes: '{{minutes}} मिनट',
      },
    },
    sections: {
      preferences: {
        title: 'प्राथमिकताएं',
        language: 'भाषा',
      },
      support: {
        title: 'सहायता',
        helpAndSupport: 'मदद और सहायता',
        about: 'जानकारी',
      },
      legal: {
        title: 'कानूनी',
        termsAndConditions: 'नियम और शर्तें',
        privacyPolicy: 'गोपनीयता नीति',
      },
    },
    actions: {
      logOut: 'लॉग आउट',
    },
  },
}

export default hi
