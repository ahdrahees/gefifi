# Use the official Bun image as a base, which is optimized and small
FROM oven/bun:latest

# Set the working directory inside the container to /app
WORKDIR /app

# Copy all project files from your local machine into the container
COPY . .

# Change to the backend directory and install ONLY production dependencies
# This keeps the final container size smaller and more secure
RUN cd backend && bun install --production

# Tell the container to listen on port 3000 (GCP will map this automatically)
# Google Cloud Run provides a PORT environment variable.
# We'll default to 8080 if it's not set.
ENV PORT 8080
EXPOSE 8080

# The command to start your server when the container runs
CMD ["bun", "run", "backend/src/server.ts"]
