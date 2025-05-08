# Base image
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source code
COPY . .

# Make sure .env.local is included
COPY .env.local .env.local

RUN mkdir -p /app/public/uploads /app/uploads && chmod -R 777 /app/public/uploads /app/uploads

# Build the application
RUN npm run build

# Expose the port the app will run on
EXPOSE 3001

# Start the application
CMD ["npx", "next", "start", "-H", "0.0.0.0", "-p", "3001"]
