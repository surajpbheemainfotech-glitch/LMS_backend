FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
RUN npm install -g nodemon
ENV NODE_ENV=production
COPY . .
EXPOSE 5000
CMD ["npx","nodemon", "server.js"]