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
  emptyState: {
    noEmails: 'कोई ईमेल नहीं मिला',
    emptyInbox: 'आपका इनबॉक्स खाली है',
    emptySent: 'कोई भेजे गए ईमेल नहीं',
    emptyDraft: 'कोई ड्राफ्ट नहीं',
    emptyTrash: 'कचरा खाली है',
    emptyArchived: 'कोई संग्रहित ईमेल नहीं',
  },
  emailScreen: {
    search: 'ईमेल खोजें...',
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
    allContacts: 'सभी संपर्क',
    searchResult: 'खोज परिणाम',
  },
  inboxScreen: {
    search: 'ईमेल खोजें...',
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
      loggingIn: 'लॉग इन कर रहे हैं...',
      forgotPassword: 'पासवर्ड भूल गए?',
      createAccount: 'नया बनाएं',
      createAccountPrompt: 'खाता नहीं है?',
      enterEmail: 'कृपया ईमेल दर्ज करें',
      enterPswd: 'कृपया पासवर्ड दर्ज करें',
      validEmail: 'कृपया एक मान्य ईमेल पता प्रविष्ट करें',
      emailPasswordValidationMsg: 'कृपया ईमेल और पासवर्ड दोनों दर्ज करें',
    },
    editProfile: {
      validationMsg: 'प्रथम नाम, अंतिम नाम और ईमेल आवश्यक हैं।',
      validEmail: 'कृपया एक मान्य ईमेल पता प्रविष्ट करें',
      validPhpne: 'कृपया 10 अंकों का फ़ोन नंबर दर्ज करें',
      error: 'गलती',
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
    editProfileSubtitle: 'नाम, अवतार और व्यक्तिगत जानकारी',
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
