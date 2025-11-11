export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: '#34d399',
        surface: '#020617',
        ink: '#e2e8f0',
      },
      borderRadius: {
        '4xl': '2.5rem',
      },
      fontFamily: {
        sans: ['Inter', 'Inter var', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
