# https://learndocker.online/courses/
# beginner resources

FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of your application code
COPY . .

EXPOSE 3000

# Define the command to run your app in dev mode (matches your docker-compose command)
CMD ["npm", "run", "dev"]