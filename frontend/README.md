# VerifyDev Frontend

Modern React frontend for the VerifyDev platform.

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **TailwindCSS** for styling
- **Shadcn/UI** components (Radix UI based)
- **TanStack React Query** for server state management
- **Zustand** for client state management
- **React Router** for routing
- **Framer Motion** for animations
- **Recharts** for data visualization

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or pnpm

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## Project Structure

```
src/
├── api/           # API client and service modules
├── components/    # Reusable UI components
│   ├── ui/        # Base UI components (Button, Card, etc.)
│   ├── layout/    # Layout components
│   └── auth/      # Auth-related components
├── hooks/         # Custom React hooks
├── lib/           # Utility functions
├── pages/         # Page components
├── store/         # Zustand stores
└── types/         # TypeScript type definitions
```

## Features

- 🔐 GitHub OAuth authentication
- 📊 Dashboard with aura score visualization
- 📁 Project management and analysis
- 💼 Job board with skill matching
- 👤 Public developer profiles
- 📄 Resume generation
- 🌙 Dark mode support

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `/api` |

## Building for Production

```bash
npm run build
```

The build output will be in the `dist/` directory.

## Docker

```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## License

MIT
