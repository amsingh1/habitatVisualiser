# Base image
FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm

# Create app directory
WORKDIR /app

# Install dependencies using pnpm lockfile for reproducible installs
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Make sure .env.local is included
COPY .env.local .env.local

RUN mkdir -p /app/public/uploads /app/uploads && chmod -R 777 /app/public/uploads /app/uploads

# Build the application
RUN pnpm run build

# Expose the port the app will run on
EXPOSE 3001

# Start the application
CMD ["pnpm", "next", "start", "-H", "0.0.0.0", "-p", "3001"]
