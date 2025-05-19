ARG NODE_VERSION=14.21.3

################################################################################
# Use node image for base image for all stages.
FROM node:${NODE_VERSION} as base

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the container
COPY package*.json ./

# Install dependencies
RUN npm install
RUN npm install -g nodemon
# Copy the rest of the application code to the container
COPY . .

# Expose the port the app runs on
EXPOSE 6111

# Command to run the application
CMD ["npm", "start"]