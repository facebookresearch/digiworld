// Copyright (c) Meta Platforms, Inc. and affiliates.
import { Translations } from './en'

const hi: Translations = {
  common: {
    ok: 'ठीक है!',
    cancel: 'रद्द करें',
    back: 'वापस',
    search: 'खोजें',
    empty: 'कोई आइटम नहीं मिला',
    alert: 'भाषा बदलें',
    confirm: 'पुष्टि करें',
  },
  welcomeScreen: {
    title: 'मेटा ईमेल में आपका स्वागत है',
    secureText: 'सुरक्षित ईमेल वातावरण',
    connecting: 'सुरक्षित ईमेल सेवाओं से कनेक्ट हो रहा है...',
    version: 'संस्करण 2.0.1',
    copyright: '© 2024 मेटा ईमेल',
  },
  emailScreen: {
    search: 'ईमेल खोजें...',
    noEmails: 'कोई ईमेल नहीं मिला',
    folders: {
      inbox: 'इनबॉक्स',
      sent: 'भेजे गए',
      draft: 'ड्राफ्ट',
      trash: 'ट्रैश',
    },
    compose: 'नया ईमेल',
    menu: 'मेनू',
  },
  composeScreen: {
    attachments: {
      title: 'अटैचमेंट',
      add: 'अटैचमेंट जोड़ें',
      remove: 'हटाएं',
    },
  },
  contactsScreen: {
    search: 'संपर्क खोजें...',
    favorites: 'पसंदीदा',
    contacts: 'संपर्क',
    empty: 'कोई संपर्क नहीं मिला',
  },
  inboxScreen: {
    search: 'ईमेल खोजें...',
    empty: 'आपका इनबॉक्स खाली है',
    preview: 'संदेश पूर्वावलोकन',
    unread: 'अपठित',
  },
  authScreen: {
    login: {
      title: 'वापसी पर स्वागत है',
      subtitle: 'अपने ईमेल खाते में साइन इन करें',
      emailPlaceholder: 'ईमेल पता',
      passwordPlaceholder: 'पासवर्ड',
      signInButton: 'साइन इन करें',
      forgotPassword: 'पासवर्ड भूल गए?',
      createAccount: 'नया बनाएं',
      createAccountPrompt: 'खाता नहीं है?',
    },
  },
  errorScreen: {
    title: 'कुछ गलत हो गया!',
    friendlySubtitle:
      'कृपया बाद में पुनः प्रयास करें या सहायता से संपर्क करें।',
    reset: 'ऐप रीसेट करें',
  },
  emptyStateComponent: {
    generic: {
      heading: 'अभी तक कोई ईमेल नहीं',
      content: 'आपका इनबॉक्स खाली है। नए संदेश यहां दिखाई देंगे।',
      button: 'रीफ्रेश करें',
    },
  },
  profileScreen: {
    editProfile: 'प्रोफ़ाइल संपादित करें',
    theme: 'थीम',
    language: 'भाषा',
    emailSettings: 'ईमेल सेटिंग्स',
    security: 'सुरक्षा और गोपनीयता',
    notifications: 'सूचनाएं',
    currentTheme: 'वर्तमान: {{theme}}',
    currentLanguage: 'वर्तमान: {{language}}',
    twoFactorStatus: '2FA: {{status}}',
    notificationStatus: 'स्थिति: {{status}}',
    languageChangeMessage:
      'भाषा बदलने के लिए ऐप को पुनः प्रारंभ करना होगा। जारी रखें?',
  },
}

export default hi
