import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translations for MVP
const resources = {
  en: {
    translation: {
      "todayTasks": "Today's Tasks",
      "tasksCompleted": "Completed",
      "assigned": "Assigned",
      "slaAlert": "SLA Alert",
      "fillLevel": "Fill Level",
      "startTask": "Start Task",
      "viewDetails": "View Details",
      "taskDetails": "Task Details",
      "proofOfWork": "Proof of Work",
      "markCompleted": "Mark Task Completed",
      "scanQr": "Step 1: Scan Bin QR",
      "beforePhoto": "Step 2: Before Photo",
      "afterPhoto": "Step 3: After Photo"
    }
  },
  hi: {
    translation: {
      "todayTasks": "आज के कार्य",
      "tasksCompleted": "पूरा हुआ",
      "assigned": "सौंपा गया",
      "slaAlert": "समय सीमा अलर्ट",
      "fillLevel": "भराव स्तर",
      "startTask": "कार्य शुरू करें",
      "viewDetails": "विवरण देखें",
      "taskDetails": "कार्य विवरण",
      "proofOfWork": "कार्य का प्रमाण",
      "markCompleted": "कार्य पूर्ण चिह्न करें",
      "scanQr": "कदम 1: बिन QR स्कैन करें",
      "beforePhoto": "कदम 2: पहले की फोटो",
      "afterPhoto": "कदम 3: बाद की फोटो"
    }
  },
  mr: {
    translation: {
      "todayTasks": "आजची कामे",
      "tasksCompleted": "पूर्ण झाले",
      "assigned": "नेमून दिलेले",
      "slaAlert": "SLA सूचना",
      "fillLevel": "भराव पातळी",
      "startTask": "काम सुरू करा",
      "viewDetails": "तपशील पहा",
      "taskDetails": "कामाचे तपशील",
      "proofOfWork": "कामाचा पुरावा",
      "markCompleted": "काम पूर्ण झाल्याचे चिन्हांकित करा",
      "scanQr": "पायरी 1: डबा QR स्कॅन करा",
      "beforePhoto": "पायरी 2: आधीचा फोटो",
      "afterPhoto": "पायरी 3: नंतरचा फोटो"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en", // default language
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;