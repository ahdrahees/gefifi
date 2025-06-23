#
# Build Stage
#
FROM oven/bun:latest as builder

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and bun.lockb to leverage Docker cache
COPY backend/package.json backend/bun.lockb ./backend/

# Install ONLY production dependencies
RUN cd backend && bun install --production

# Copy the rest of the project files
COPY . .

# Compile the TypeScript code to JavaScript
RUN cd backend && bun run build


#
# Runner Stage
#
FROM oven/bun:latest

# Set environment to production
ENV NODE_ENV=production
# The port the application will listen on. Google Cloud Run provides its own.
ENV PORT=8080

# Set the working directory
WORKDIR /app

# Copy the compiled code and production dependencies from the builder stage
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/package.json ./backend/package.json

# Expose the port the app runs on
EXPOSE 8080

# The command to start the application by running the compiled JavaScript
CMD ["bun", "run", "backend/start"]
