# Production Dockerfile for MERN QA Assessment Platform
FROM node:22-alpine

WORKDIR /app

# Copy project files
COPY package.json ./
COPY server ./server
COPY client ./client

# Expose server port
EXPOSE 8000
ENV PORT=8000

# Start server
CMD ["node", "server/server.js"]
