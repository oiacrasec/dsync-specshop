FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ARG API_BASE_URL=/api/v1
# A configuração pertence à imagem; não altera o environment no checkout.
RUN node -e 'const fs = require("node:fs"); const file = "src/environments/environment.prod.ts"; const url = process.env.API_BASE_URL; if (!url || (!/^\/(?!\/)/.test(url) && !/^https:\/\//.test(url))) throw new Error("API_BASE_URL inválida"); fs.writeFileSync(file, fs.readFileSync(file, "utf8").replace(/apiBaseUrl:\s*[^,]+,/, "apiBaseUrl: " + JSON.stringify(url) + ","));'
RUN npm run build -- --configuration production

FROM nginx:1.30.6-alpine

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/datasync-core-frontend/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

