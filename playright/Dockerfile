FROM mcr.microsoft.com/playwright:v1.58.2-noble

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY *.ts ./
COPY tests ./test
COPY docker/scripts/playwright-entrypoint.sh /playwright-entrypoint.sh

ENTRYPOINT ["/playwright-entrypoint.sh"]
CMD ["npx", "playwright", "test" "--browser", "firefox"]
