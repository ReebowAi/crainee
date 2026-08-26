# Use official Node.js 20 image as the base
FROM node:20-alpine

# Set working directory inside the container
WORKDIR /app

# Copy package dependency manifests first to leverage Docker caching
COPY package*.json ./

# Install all production and development dependencies cleanly
RUN npm install

# Copy the rest of your application source code into the container
COPY . .

# Expose the port your server runs on
EXPOSE 3000

# Start the application using your start script
CMD ["npm", "start"]
