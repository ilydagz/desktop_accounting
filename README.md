# Desktop Accounting
# Modern Accounting Manager

A high-performance, secure, and offline-first desktop accounting application designed for small businesses, freelancers, and building/apartment management.

Built with the power of **Tauri v2**, it ensures a small footprint and native performance, keeping all your financial data stored locally on your device using **SQLite**.

## ✨ Key Features

### 👥 Advanced Account Management
* **Individual & Corporate Support:**
    * **Individual:** Track by Name, Surname, and National ID (TC).
    * **Corporate:** Track by Company Title, Tax ID (VKN), and Tax Office.
* **Detailed Contact Info:** Country-coded phone input, Email, City, and District tracking.
* **Property & Building Details:** Specialized fields for property managers (Land Share, Block No, Parcel, Flat Count).
* **Smart Interactions:**
    * One-click **Copy Phone Number**.
    * **Edit** existing account details easily.
    * **Delete** accounts with safety checks.
* **Powerful Filtering:** * Instant search by Name or Phone.
    * **Filter Menu:** View only Individuals, only Corporates, or All.

### 💰 Financial Tracking & Transactions
* **Real-time Balances:** Automatically calculates Total Debt, Total Credit, and Net Balance for each account.
* **Transaction Logging:** Record Collections (Inflow) and Payments (Outflow) with date and time precision.
* **History View:** View the last 10 transactions directly within the account detail panel.
* **Dashboard:** A visual overview of your financial health (Total Receivables vs. Payables).

### 🛠 Technical Highlights
* **Local Database:** Data is stored securely in a local `SQLite` database. No cloud dependencies.
* **Modern UI:** Clean, responsive interface built with **Shadcn/UI** and **Tailwind CSS**.
* **Dark/Light Mode:** System-adaptive theming.

---

## 🚀 Tech Stack

This project is built using the latest web and desktop technologies:

* **Core:** [Tauri v2](https://tauri.app/) (Rust + Webview)
* **Frontend:** [React](https://react.dev/) + TypeScript
* **Styling:** [Tailwind CSS](https://tailwindcss.com/)
* **Components:** [Shadcn/ui](https://ui.shadcn.com/)
* **Icons:** [Lucide React](https://lucide.dev/)
* **Database:** SQLite (`tauri-plugin-sql`)
* **Routing:** React Router DOM

---

## 📦 Installation & Setup

To develop or run this project locally:

### 1. Prerequisites
* [Node.js](https://nodejs.org/) (v16 or newer)
* [Rust](https://www.rust-lang.org/tools/install) (Required for Tauri)
* Visual Studio Code (Recommended)

### 2. Install Dependencies
Open your terminal in the project folder and run:
```bash
npm install
```
### 3. Run Development Server
```bash
npm run tauri dev
```