# RAG-Powered Farming Knowledge Platform

A monorepo application providing RAG-powered agricultural insights and farm management.

## Project Structure

```
.
├── apps/
│   └── web/                 # React frontend application
├── functions/               # Firebase Cloud Functions with tRPC
├── packages/
│   ├── shared/             # Shared Zod schemas and types
│   └── rag-service/        # RAG logic and implementation
└── Docs/                   # Project documentation
```

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Firebase, tRPC, TypeScript
- **Validation**: Zod
- **Build System**: Turborepo
- **Package Manager**: PNPM

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- PNPM >= 8.0.0

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

### Build

```bash
pnpm build
```

## Development Principles

- **Type Safety**: Strict TypeScript configuration across all packages
- **Security**: Principle of Least Privilege with Firestore Security Rules
- **Validation**: Zod schemas for all data entities
- **Code Quality**: ESLint and Prettier configured

## License

MIT

