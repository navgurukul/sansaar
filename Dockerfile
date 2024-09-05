################################################################################
# Use node image for base image for all stages.
FROM node:14.21.3

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the container
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code to the container
COPY . .

# Expose the port the app runs on
EXPOSE 6111

# Command to run the application
CMD ["npm", "start"]