#------------build stage--------------
FROM node:20-alpine AS build

WORKDIR /app

# install curl for health checks
RUN apk add --no-cache curl

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- runtime stage ----------
FROM node:20-alpine

WORKDIR /app

RUN npm install -g serve

COPY --from=build /app/dist ./dist

EXPOSE 8080

CMD ["serve", "-s", "dist", "-l", "8080"]

# Use CMD as JSON array to avoid signal issues
#CMD ["npm", "run", "preview"]
# or if your backend: CMD ["node", "server.js"]
