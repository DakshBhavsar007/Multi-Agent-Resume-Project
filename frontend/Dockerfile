FROM node:18-alpine

WORKDIR /app

# Install dependencies first (for build caching)
COPY package*.json ./
RUN npm install

# Copy frontend source code
COPY . .

# Expose port
EXPOSE 5173

# Run Vite development server
CMD ["npm", "run", "dev"]
