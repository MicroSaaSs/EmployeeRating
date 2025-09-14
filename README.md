# React

A modern React-based project utilizing the latest frontend technologies and tools for building responsive web applications.

## 🚀 Features

## Employee Rating — Client

### Tech Stack

- **React 18** - React version with improved rendering and concurrent features
- **Vite** - Lightning-fast build tool and development server
- **Redux Toolkit** - State management with simplified Redux setup
- **TailwindCSS** - Utility-first CSS framework with extensive customization
- **React Router v6** - Declarative routing for React applications
- **Data Visualization** - Integrated D3.js and Recharts for powerful data visualization
- **Form Management** - React Hook Form for efficient form handling
- **Animation** - Framer Motion for smooth UI animations
- **Testing** - Jest and React Testing Library setup

## 📋 Prerequisites

- Node.js 22.19.0 (LTS)
- npm 10+

Use nvm to select the correct version:

```bash
nvm use
```

If you don't have it installed yet:

```bash
nvm install 22.19.0 && nvm use 22.19.0
```

### Scripts

- `npm start` — dev server
- `npm run build` — production build
- `npm run serve` — preview build

The project uses React 18 + Vite, TailwindCSS, TypeScript, and React Router v6.

> Note: This project now targets Node.js 22.19.0 LTS. Earlier references to Node 14+ are deprecated.

## 🛠️ Installation

1. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```
2. Start the development server:
   ```bash
   npm start
   # or
   yarn start
   ```

## 📁 Project Structure

```
client/
├── public/                  # Static assets
├── src/
│   ├── components/          # Reusable UI components
│   ├── pages/               # Page components
│   ├── styles/              # Global styles and Tailwind configuration
│   ├── App.tsx              # Main application component
│   ├── Routes.tsx           # Application routes
│   └── index.tsx            # Application entry point
├── .env                     # Environment variables (optional)
├── index.html               # HTML template
├── package.json             # Project dependencies and scripts
├── tailwind.config.js       # Tailwind CSS configuration
├── tsconfig.json            # TypeScript configuration
├── vite.config.mjs          # Vite configuration
└── src/vite-env.d.ts        # Vite TypeScript types
```

## 🧩 Adding Routes

To add new routes to the application, update the `src/Routes.tsx` file:

```tsx
import React from "react";
import { useRoutes } from "react-router-dom";
import DashboardHome from "./pages/dashboard-home";
import NotFound from "./pages/NotFound";

const ProjectRoutes: React.FC = () => {
  const element = useRoutes([
    { path: "/", element: <DashboardHome /> },
    { path: "*", element: <NotFound /> },
  ]);
  return element;
};

export default ProjectRoutes;
```

## 🎨 Styling

This project uses Tailwind CSS for styling. The configuration includes:

- Forms plugin for form styling
- Typography plugin for text styling
- Aspect ratio plugin for responsive elements
- Container queries for component-specific responsive design
- Fluid typography for responsive text
- Animation utilities

## 📱 Responsive Design

The app is built with responsive design using Tailwind CSS breakpoints.

## 📦 Deployment

Build the application for production:

```bash
npm run build
```

## 🙏 Acknowledgments

- Built with [Rocket.new](https://rocket.new)
- Powered by React and Vite
- Styled with Tailwind CSS

Built with ❤️ on Rocket.new
