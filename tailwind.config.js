/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        gov: {
          blue: "#1a3a5c",       // 深藏蓝：顶栏/主色
          blueDark: "#122a45",   // 深藏蓝 hover
          blueLight: "#eef3f8",  // 浅蓝：表头/选中底
          red: "#c41e3a",        // 正红：激活/主按钮/高亮
          redDark: "#9c162d",    // 正红 hover
          bg: "#f5f7fa",         // 页面浅灰底
          border: "#e8e8e8",     // 边框
          text: "#333333",       // 正文
          textSecondary: "#666666",
          textMuted: "#999999",
        },
      },
    },
  },
  plugins: [],
};
