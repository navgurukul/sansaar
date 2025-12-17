ARG NODE_VERSION=16.20.2

################################################################################
# Use node image for base image for all stages.
FROM node:${NODE_VERSION}-alpine as base

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the container
COPY package*.json ./

# Copy patches directory for patch-package
COPY patches ./patches

# Install dependencies
RUN npm ci --only=production

# Copy the rest of the application code to the container
COPY . .

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
USER nodejs

# Note: Port is read from .env file at runtime
# Default EXPOSE for documentation (actual port comes from .env)
EXPOSE 6111

# Health check (uses PORT from environment at runtime)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const port=process.env.PORT||6111;require('http').get('http://localhost:'+port+'/health',(r)=>{process.exit(r.statusCode===200?0:1)})"

# Command to run the application
CMD ["npm", "start"]