# 🚌 BUSIT: Digital Shuttle Credit System

BUSIT is a modern, full-stack Next.js web application designed to completely digitize campus shuttle payments. It eliminates the need for physical cash or hardware scanners by utilizing dynamic QR codes and a software-based live camera scanning portal.

## 🌟 Key Features

- **Software-Based Scanning**: Drivers use a built-in `html5-qrcode` camera portal to scan student passes directly from the web app. No proprietary hardware required!
- **Dynamic Digital Passes**: Students are automatically assigned a unique QR code boarding pass upon registration.
- **Secure Architecture**: Built with Next.js App Router, Prisma ORM, and NextAuth.js. Passwords are mathematically hashed via `bcrypt` to prevent plaintext data leaks.
- **Automated Email Receipts**: Integrated `nodemailer` system automatically sends beautiful HTML email receipts when fares are deducted or wallets are topped up.
- **Premium UI/UX**: Features a highly refined, professional dark-mode design built from scratch using strict Tailwind CSS utility classes.

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL (Production via Neon) / SQLite (Local Development)
- **ORM**: Prisma
- **Authentication**: NextAuth.js (Credentials Provider)
- **Styling**: Tailwind CSS v4
- **QR Engine**: `qrcode` & `html5-qrcode`
- **Emails**: `nodemailer`

## 🚀 Getting Started Locally

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed on your machine.

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/TRITUSLegend/busit-web.git
cd busit-web
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory and add the following:
```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your_secure_random_string"
NEXTAUTH_URL="http://localhost:3000"

# Gmail SMTP Configuration for Email Receipts
SMTP_EMAIL="your_gmail_address@gmail.com"
SMTP_PASSWORD="your_16_character_app_password"
```

### 4. Database Setup
Initialize the Prisma database schema:
```bash
npx prisma generate
npx prisma db push
```

### 5. Run the Application
Start the Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🧪 How to Test the Scanning Flow

To test the core QR scanning functionality without a real shuttle:
1. Open the app and register a new **Student** account.
2. Open an **Incognito Window** (or use a separate device) and register a **Driver** account.
3. On the Driver dashboard, grant camera permissions to activate the Live Scanner.
4. Point the Driver's camera at the Student's QR code on the other screen.
5. The system will instantly verify the pass, deduct 20 credits, and email a receipt to the student!

## 📦 Production Deployment (Vercel)
This application is fully ready for serverless deployment on [Vercel](https://vercel.com).
1. Import your GitHub repository to Vercel.
2. Provide a cloud PostgreSQL database connection string (e.g., via [Neon](https://neon.tech)) in the `DATABASE_URL` environment variable.
3. Add your `NEXTAUTH_SECRET` and SMTP credentials.
4. Deploy! Run `npx prisma db push` locally using your cloud URL to sync the database schema.
