# Use Node.js 20 LTS as the base image
FROM node:20-slim

# Create and change to the app directory.
WORKDIR /usr/src/app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy application dependency manifests to the container image.
COPY package*.json ./

# Install ALL dependencies (including devDependencies for TypeScript build)
RUN npm install

# Copy local code to the container image.
COPY . .

# Build the TypeScript project
RUN npm run build

# Copy skills folder into the dist output folder so the compiled code can find it
# (skills are loaded relative to __dirname in dist/)
RUN cp -r skills dist/../skills 2>/dev/null || true

# Run the bot on container startup
CMD [ "npm", "start" ]
