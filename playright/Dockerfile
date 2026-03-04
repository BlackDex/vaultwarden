FROM mcr.microsoft.com/playwright:v1.58.2-noble

SHELL ["/bin/bash", "-eux", "-o", "pipefail", "-c"]

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY *.ts ./
COPY tests ./tests
COPY docker/scripts/playwright-entrypoint.sh /playwright-entrypoint.sh

ENTRYPOINT ["/playwright-entrypoint.sh"]
CMD ["npx", "playwright", "test"]
