# Use Node.js LTS version as the base image
FROM node:20-slim

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /usr/src/app

# Copy package files first for better caching
COPY package.json package-lock.json ./

# Install dependencies
RUN pnpm install

# Copy the rest of the application
COPY . .

# Create the required directory structure
RUN mkdir -p /home/public_html/public

# Copy public files and subdirectories
RUN cp -r public/. /home/public_html/public/

# Expose the port the app runs on
EXPOSE 4030

# Command to run the application
CMD ["pnpm", "run", "app-start"]