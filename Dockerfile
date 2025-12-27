# Dockerfile for Photogram API
FROM oven/bun:1 as base
WORKDIR /app

# Install dependencies
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

# Copy source code
COPY src ./src
COPY tsconfig.json ./

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

# Expose port
EXPOSE 8080

# Run the application
CMD ["bun", "run", "src/index.ts"]
