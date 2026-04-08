# STALK

<div align="center">

# 🕵️ STALK
### OSINT Assistant Desktop Application

Desktop-приложение для OSINT-задач с удобным интерфейсом, рабочей доской, инструментами анализа и мультиязычной поддержкой.

![Electron](https://img.shields.io/badge/Electron-desktop-2b2e3a?logo=electron)
![Vite](https://img.shields.io/badge/Vite-fast-purple?logo=vite)
![React](https://img.shields.io/badge/React-frontend-61dafb?logo=react)
![Tailwind](https://img.shields.io/badge/TailwindCSS-UI-38bdf8?logo=tailwindcss)
![Status](https://img.shields.io/badge/status-active%20development-orange)

</div>

---

## 📌 Overview

**STALK** is a desktop OSINT assistant built with **Electron**, **React**, **Vite**, and **Tailwind CSS**.

The project is designed as a unified environment for investigation workflows, data enrichment, quick analysis, and structured visual work inside a desktop app.

Instead of using multiple scattered tabs and tools, STALK brings key functionality into one interface.

---

## ✨ Features

- 🖥️ Desktop application powered by **Electron**
- ⚛️ Frontend built with **React + Vite**
- 🎨 Modern UI with **Tailwind CSS**
- 🧩 Investigation board / visual workspace
- 🌐 Domain information tools
- 🖼️ EXIF metadata reader
- 📊 Reports-related interface
- 🔌 API-related module
- 📞 Phone enrichment utilities
- 🌍 Multilanguage support via built-in i18n
- 🔔 Notification window support

---

## 🧠 Core Modules

The current project structure includes modules such as:

- **Board** — visual workspace for organizing and linking investigation entities
- **DomainInfo** — domain-related lookup and display logic
- **ExifReader** — metadata extraction / EXIF-related functionality
- **Api** — API interaction layer / UI
- **Reports** — reporting-related view
- **Settings** — app configuration and preferences
- **i18n** — localization system with multiple language packs
- **Enrichment** — enrichment actions for:
  - domains
  - IPs
  - phone numbers

---

## 🛠️ Tech Stack

- **Electron**
- **React**
- **Vite**
- **Tailwind CSS**
- **PostCSS**
- **JavaScript / JSX**
- **Node.js**

---

## 📂 Project Structure

```bash
STALK/
├── assets/                      # Icons, audio, static assets
├── electron/                    # Electron main/preload/desktop logic
├── src/                         # React frontend source
│   ├── board/                   # Board workspace modules
│   ├── i18n/                    # Localization system
│   ├── About.jsx
│   ├── Api.jsx
│   ├── App.jsx
│   ├── Board.jsx
│   ├── DomainInfo.jsx
│   ├── ExifReader.jsx
│   ├── MainLayout.jsx
│   ├── Settings.jsx
│   ├── SplashScreen.jsx
│   ├── UpdateBanner.jsx
│   ├── WindowControls.jsx
│   ├── reports.jsx
│   └── settingsStore.js
├── .gitignore
├── index.html
├── package.json
├── package-lock.json
├── postcss.config.js
├── tailwind.config.js
└── vite.config.js