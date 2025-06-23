#
# Build Stage: Install all dependencies, compile TypeScript
#
FROM oven/bun:latest as builder

# Set the working directory for the entire build stage
WORKDIR /app

# Copy package manifests first to leverage Docker layer caching
COPY backend/package.json backend/bun.lockb ./backend/

# Install ALL dependencies (including devDependencies like typescript)
# This is necessary to get the `tsc` compiler
RUN cd backend && bun install

# Copy the rest of the project source code
# The .dockerignore file will prevent copying unnecessary files
COPY . .

# Run the build script which compiles TypeScript to JavaScript in the `dist` folder
RUN cd backend && bun run build

# Prune development dependencies after the build is complete.
# This creates a lean node_modules folder that we can copy to the final image.
RUN cd backend && bun install --production


#
# Runner Stage: Create a small, clean image with only the compiled code and production dependencies
#
FROM oven/bun:latest

# Set environment to production for security and performance
ENV NODE_ENV=production

# The port the application will listen on. Google Cloud Run provides this dynamically.
ENV PORT=8080

# Set the working directory for the final image
WORKDIR /app

# Copy the compiled code from the builder stage
COPY --from=builder /app/backend/dist ./backend/dist

# Copy the pruned production node_modules from the builder stage
COPY --from=builder /app/backend/node_modules ./backend/node_modules

# Copy the backend's package.json for context (e.g., for the start script)
COPY --from=builder /app/backend/package.json ./backend/package.json

# Expose the port that the application will run on
EXPOSE 8080

# The command to start the application.
# This directly runs the compiled JavaScript file with Node.js.
CMD ["node", "backend/dist/server.js"]
