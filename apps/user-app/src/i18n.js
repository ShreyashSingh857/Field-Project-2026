import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      appName: "GramWaste Connect",
      appSubtitle: "Smart Waste Dashboard",
      menu: {
        profile: "Profile",
        settings: "Settings",
        language: "Language Selection",
        help: "Help",
        logout: "Logout",
      },
      dashboardTitle: "Villager Dashboard",
      dashboardSubtitle: "Manage waste quickly from your phone",
      cards: {
        nearbyBins: {
          title: "Nearby Smart Bins",
          description: "View nearby bins and their fill level.",
        },
        aiScanner: {
          title: "AI Waste Scanner",
          description: "Take a photo and identify waste type.",
        },
        marketplace: {
          title: "Marketplace",
          description: "Buy or sell reusable items.",
        },
        reportIssue: {
          title: "Report Issue",
          description: "Report overflowing or damaged bins.",
        },
        wasteTips: {
          title: "Waste Awareness / Tips",
          description: "Daily waste management tips.",
        },
      },
      chatbot: "Open Waste Chatbot",
      aiScannerPage: {
        title: "AI Waste Scanner",
        subtitle: "Identify waste & dispose it right",
        tapToScan: "Tap to scan your waste",
        analysing: "Analysing your waste…",
        aiIdentifying: "AI is identifying your waste…",
        tip: "📸 Snap a photo — AI will tell you how to sort it.",
        cancel: "Cancel",
        capture: "Capture",
        error: "Could not analyse image. Please try again.",
        wasteType: "Waste Type",
        category: "Category",
        disposeIn: "Dispose In",
        nearestBin: "Nearest Bin",
        viewOnMap: "View Bin on Map",
        scanAnother: "Scan Another Item",
      },
    },
  },
  hi: {
    translation: {
      appName: "ग्रामवेस्ट कनेक्ट",
      appSubtitle: "स्मार्ट वेस्ट डैशबोर्ड",
      menu: {
        profile: "प्रोफाइल",
        settings: "सेटिंग्स",
        language: "भाषा चयन",
        help: "सहायता",
        logout: "लॉगआउट",
      },
      dashboardTitle: "ग्रामवासी डैशबोर्ड",
      dashboardSubtitle: "फ़ोन से तेज़ी से कचरा प्रबंधन करें",
      cards: {
        nearbyBins: {
          title: "नज़दीकी स्मार्ट बिन",
          description: "नज़दीकी बिन और उनका फिल लेवल देखें।",
        },
        aiScanner: {
          title: "एआई वेस्ट स्कैनर",
          description: "फोटो लें और कचरे का प्रकार पहचानें।",
        },
        marketplace: {
          title: "मार्केटप्लेस",
          description: "दोबारा उपयोग होने वाली चीजें खरीदें या बेचें।",
        },
        reportIssue: {
          title: "समस्या रिपोर्ट करें",
          description: "ओवरफ्लो या खराब बिन की सूचना दें।",
        },
        wasteTips: {
          title: "कचरा जागरूकता / टिप्स",
          description: "रोज़ाना कचरा प्रबंधन सुझाव।",
        },
      },
      chatbot: "वेस्ट चैटबॉट खोलें",
      aiScannerPage: {
        title: "एआई वेस्ट स्कैनर",
        subtitle: "कचरा पहचानें और सही तरीके से निपटाएं",
        tapToScan: "कचरा स्कैन करने के लिए टैप करें",
        analysing: "कचरे का विश्लेषण हो रहा है…",
        aiIdentifying: "एआई आपका कचरा पहचान रही है…",
        tip: "📸 फ़ोटो लें — AI बताएगा इसे कहाँ फेंकें।",
        cancel: "रद्द करें",
        capture: "कैप्चर करें",
        error: "छवि का विश्लेषण नहीं हो सका। कृपया पुनः प्रयास करें।",
        wasteType: "कचरे का प्रकार",
        category: "श्रेणी",
        disposeIn: "किसमें फेंकें",
        nearestBin: "निकटतम बिन",
        viewOnMap: "मानचित्र पर बिन देखें",
        scanAnother: "दूसरा आइटम स्कैन करें",
      },
    },
  },
  mr: {
    translation: {
      appName: "ग्रामवेस्ट कनेक्ट",
      appSubtitle: "स्मार्ट वेस्ट डॅशबोर्ड",
      menu: {
        profile: "प्रोफाइल",
        settings: "सेटिंग्ज",
        language: "भाषा निवड",
        help: "मदत",
        logout: "लॉगआउट",
      },
      dashboardTitle: "ग्रामस्थ डॅशबोर्ड",
      dashboardSubtitle: "फोनवरून कचरा व्यवस्थापन सोप्या पद्धतीने करा",
      cards: {
        nearbyBins: {
          title: "जवळील स्मार्ट बिन",
          description: "जवळील बिन आणि त्यांचा भराव स्तर पहा.",
        },
        aiScanner: {
          title: "एआय वेस्ट स्कॅनर",
          description: "फोटो काढा आणि कचऱ्याचा प्रकार ओळखा.",
        },
        marketplace: {
          title: "मार्केटप्लेस",
          description: "पुन्हा वापरता येणाऱ्या वस्तू खरेदी किंवा विक्री करा.",
        },
        reportIssue: {
          title: "समस्या नोंदवा",
          description: "ओसंडलेले किंवा खराब बिन नोंदवा.",
        },
        wasteTips: {
          title: "कचरा जनजागृती / टिप्स",
          description: "दररोजचे कचरा व्यवस्थापन टिप्स.",
        },
      },
      chatbot: "वेस्ट चॅटबॉट उघडा",
      aiScannerPage: {
        title: "एआय वेस्ट स्कॅनर",
        subtitle: "कचरा ओळखा आणि योग्य प्रकारे विल्हेवाट लावा",
        tapToScan: "कचरा स्कॅन करण्यासाठी टॅप करा",
        analysing: "कचऱ्याचे विश्लेषण होत आहे…",
        aiIdentifying: "AI तुमचा कचरा ओळखत आहे…",
        tip: "📸 फोटो काढा — AI सांगेल कुठे टाकायचे.",
        cancel: "रद्द करा",
        capture: "कॅप्चर करा",
        error: "प्रतिमेचे विश्लेषण करता आले नाही. कृपया पुन्हा प्रयत्न करा.",
        wasteType: "कचऱ्याचा प्रकार",
        category: "श्रेणी",
        disposeIn: "कुठे टाकायचे",
        nearestBin: "जवळचा बिन",
        viewOnMap: "नकाशावर बिन पहा",
        scanAnother: "दुसरी वस्तू स्कॅन करा",
      },
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem("i18n-lang") ?? "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

// Persist language choice across pages and refreshes
i18n.on("languageChanged", (lang) => {
  localStorage.setItem("i18n-lang", lang);
});

export default i18n;
