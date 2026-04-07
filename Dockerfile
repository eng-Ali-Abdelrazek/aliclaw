# Use Node.js 20 LTS as the base image
FROM node:20-slim

# Create and change to the app directory.
WORKDIR /usr/src/app

# Install system dependencies for node-canvas / better-sqlite3 if needed
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy application dependency manifests to the container image.
COPY package*.json ./

# Install production dependencies.
RUN npm install

# Copy local code to the container image.
COPY . .

# Build the project (if using TypeScript)
RUN npm run build

# Run the web service on container startup.
CMD [ "npm", "start" ]
