FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Install dependencies pertama (sebagai root)
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

# CREATE nodejs user - TAMBAHKAN INI!
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Change ownership ke nodejs user
RUN chown -R nodejs:nodejs /usr/src/app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]