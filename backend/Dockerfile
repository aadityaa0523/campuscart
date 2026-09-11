FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma

EXPOSE 3000
USER node
# Run pending migrations before starting — exec-form CMD passes the whole
# string to `-c` correctly, unlike a host's own "start command" field, which
# may not shell-interpret it the same way. `exec` swaps the shell for the
# node process so it (not sh) receives Render's SIGTERM on redeploy/restart.
CMD ["sh", "-c", "npx prisma migrate deploy && exec node dist/index.js"]
