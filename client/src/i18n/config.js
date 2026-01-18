import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// 导入翻译资源
import zhCN from './locales/zh-CN.json';
import zhTW from './locales/zh-TW.json';
import enUS from './locales/en-US.json';
import ruRU from './locales/ru-RU.json';

// 获取浏览器语言
const getBrowserLanguage = () => {
  const browserLang = navigator.language || navigator.languages[0];
  
  // 映射浏览器语言到我们支持的语言
  if (browserLang.startsWith('zh')) {
    if (browserLang.includes('TW') || browserLang.includes('HK')) {
      return 'zh-TW';
    }
    return 'zh-CN';
  }
  if (browserLang.startsWith('en')) {
    return 'en-US';
  }
  if (browserLang.startsWith('ru')) {
    return 'ru-RU';
  }
  
  // 默认返回简体中文
  return 'zh-CN';
};

// 从本地存储获取用户设置的语言，如果没有则使用浏览器语言
const getInitialLanguage = () => {
  const savedLanguage = localStorage.getItem('halloChat_language');
  return savedLanguage || getBrowserLanguage();
};

// 配置 i18next
i18n
  .use(initReactI18next) // 将 i18next 传递给 react-i18next
  .init({
    resources: {
      'zh-CN': {
        translation: zhCN
      },
      'zh-TW': {
        translation: zhTW
      },
      'en-US': {
        translation: enUS
      },
      'ru-RU': {
        translation: ruRU
      }
    },
    lng: getInitialLanguage(), // 默认语言
    fallbackLng: 'zh-CN', // 后备语言
    interpolation: {
      escapeValue: false // React 已经默认转义了
    },
    react: {
      useSuspense: false // 禁用 Suspense，避免加载问题
    }
  });

// 监听语言变化，保存到本地存储
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('halloChat_language', lng);
});

export default i18n;
