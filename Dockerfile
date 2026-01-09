FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci --include=dev

COPY . .
RUN npm run build -- --configuration production

FROM nginx:1.27-alpine AS runtime
ENV NODE_ENV=production

COPY --from=build /app/dist/asset-management/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80  # Changed from 4300
CMD ["nginx", "-g", "daemon off;"]