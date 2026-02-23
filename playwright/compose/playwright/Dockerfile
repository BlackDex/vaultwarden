FROM docker.io/library/node:24-trixie-slim AS base

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install -y ca-certificates curl \
    && curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc \
    && chmod a+r /etc/apt/keyrings/docker.asc \
    && echo "deb [signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian trixie stable" | tee /etc/apt/sources.list.d/docker.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        containerd.io \
        docker-buildx-plugin \
        docker-ce \
        docker-ce-cli \
        docker-compose-plugin \
        git \
        libmariadb-dev-compat \
        libpq5 \
        openssl \
    && rm -rf /var/lib/apt/lists/*

# Create main playwright directory and the needed certs directory
RUN mkdir -pv /playwright/certs
WORKDIR /playwright

COPY package.json package-lock.json .
RUN npm ci --ignore-scripts && \
    npx playwright install-deps && \
    npx playwright install --with-deps firefox

COPY docker-compose.yml test.env ./
COPY compose ./compose

COPY *.ts test.env ./
COPY tests ./tests

# ## Stage: test
# Default headless test runner — same as before, no behaviour change.
FROM base AS test
ENTRYPOINT ["/usr/local/bin/npx", "playwright"]
CMD ["test"]


# ## Stage: codegen
# Adds a virtual desktop (TigerVNC) + noVNC so `playwright codegen` has a
# display inside the container, accessible via http://localhost:6080/vnc.html
FROM base AS codegen
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        dbus-x11 \
        fluxbox \
        novnc \
        tigervnc-standalone-server \
    && rm -rf /var/lib/apt/lists/*

RUN npx playwright install --with-deps chromium

ENV DISPLAY=:99
ENV VNC_PORT=5900
ENV NOVNC_PORT=6080
ENV SCREEN_RES=1920x1080

COPY compose/playwright/entrypoint-codegen.sh /entrypoint-codegen.sh
RUN chmod +x /entrypoint-codegen.sh

EXPOSE 5900 6080

ENTRYPOINT ["/entrypoint-codegen.sh"]
CMD ["codegen"]
