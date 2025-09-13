/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary Colors
        'primary': '#1B365D', // Deep professional blue - blue-900
        'primary-50': '#EBF2F7', // Very light blue tint
        'primary-100': '#D6E4ED', // Light blue tint
        'primary-200': '#ADC9DB', // Medium light blue
        'primary-300': '#84AEC9', // Medium blue
        'primary-400': '#5B93B7', // Medium dark blue
        'primary-500': '#3278A5', // Standard blue
        'primary-600': '#295D84', // Dark blue
        'primary-700': '#204763', // Darker blue
        'primary-800': '#173142', // Very dark blue
        'primary-900': '#1B365D', // Deep professional blue (primary)

        // Secondary Colors
        'secondary': '#4A90A4', // Lighter professional blue - blue-500
        'secondary-50': '#F0F7F9', // Very light secondary tint
        'secondary-100': '#E1EFF3', // Light secondary tint
        'secondary-200': '#C3DFE7', // Medium light secondary
        'secondary-300': '#A5CFDB', // Medium secondary
        'secondary-400': '#87BFCF', // Medium dark secondary
        'secondary-500': '#4A90A4', // Lighter professional blue (secondary)
        'secondary-600': '#3B7383', // Dark secondary
        'secondary-700': '#2C5662', // Darker secondary
        'secondary-800': '#1D3941', // Very dark secondary
        'secondary-900': '#0E1C20', // Deepest secondary

        // Accent Colors
        'accent': '#E67E22', // Warm orange - orange-500
        'accent-50': '#FDF4F0', // Very light accent tint
        'accent-100': '#FBE9E1', // Light accent tint
        'accent-200': '#F7D3C3', // Medium light accent
        'accent-300': '#F3BDA5', // Medium accent
        'accent-400': '#EFA787', // Medium dark accent
        'accent-500': '#E67E22', // Warm orange (accent)
        'accent-600': '#B8651B', // Dark accent
        'accent-700': '#8A4C14', // Darker accent
        'accent-800': '#5C330D', // Very dark accent
        'accent-900': '#2E1A06', // Deepest accent

        // Background Colors
        'background': '#FAFBFC', // Soft off-white - gray-50
        'surface': '#FFFFFF', // Pure white - white

        // Text Colors
        'text-primary': '#2C3E50', // Dark blue-gray - slate-700
        'text-secondary': '#7F8C8D', // Medium gray - gray-500

        // Status Colors
        'success': '#27AE60', // Professional green - green-600
        'success-50': '#ECFDF5', // Very light success tint
        'success-100': '#D1FAE5', // Light success tint
        'success-200': '#A7F3D0', // Medium light success
        'success-300': '#6EE7B7', // Medium success
        'success-400': '#34D399', // Medium dark success
        'success-500': '#10B981', // Standard success
        'success-600': '#27AE60', // Professional green (success)
        'success-700': '#047857', // Dark success
        'success-800': '#065F46', // Very dark success
        'success-900': '#064E3B', // Deepest success

        'warning': '#F39C12', // Balanced orange - yellow-500
        'warning-50': '#FFFBEB', // Very light warning tint
        'warning-100': '#FEF3C7', // Light warning tint
        'warning-200': '#FDE68A', // Medium light warning
        'warning-300': '#FCD34D', // Medium warning
        'warning-400': '#FBBF24', // Medium dark warning
        'warning-500': '#F39C12', // Balanced orange (warning)
        'warning-600': '#D97706', // Dark warning
        'warning-700': '#B45309', // Darker warning
        'warning-800': '#92400E', // Very dark warning
        'warning-900': '#78350F', // Deepest warning

        'error': '#E74C3C', // Clear red - red-500
        'error-50': '#FEF2F2', // Very light error tint
        'error-100': '#FEE2E2', // Light error tint
        'error-200': '#FECACA', // Medium light error
        'error-300': '#FCA5A5', // Medium error
        'error-400': '#F87171', // Medium dark error
        'error-500': '#E74C3C', // Clear red (error)
        'error-600': '#DC2626', // Dark error
        'error-700': '#B91C1C', // Darker error
        'error-800': '#991B1B', // Very dark error
        'error-900': '#7F1D1D', // Deepest error

        // Border Colors
        'border': '#E1E8ED', // Light border - gray-200
        'border-light': '#F1F5F9', // Very light border - gray-100
        'border-dark': '#CBD5E1', // Dark border - gray-300
      },
      fontFamily: {
        'heading': ['Inter', 'sans-serif'], // Modern geometric sans-serif - Inter
        'body': ['Source Sans Pro', 'sans-serif'], // Humanist sans-serif - Source Sans Pro
        'caption': ['Roboto', 'sans-serif'], // Clean neutral typeface - Roboto
        'mono': ['JetBrains Mono', 'monospace'], // Monospace for data - JetBrains Mono
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0, 0, 0, 0.1)',
        'modal': '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
      transitionDuration: {
        '200': '200ms',
        '300': '300ms',
      },
      transitionTimingFunction: {
        'smooth': 'ease-out',
        'modal': 'ease-in-out',
      },
      zIndex: {
        '1000': '1000',
        '1010': '1010',
        '1020': '1020',
      },
    },
  },
  plugins: [],
}