FROM python:3.14.10-slim-bookworm AS dependencies
ENV PIP_DISABLE_PIP_VERSION_CHECK=1 PIP_NO_CACHE_DIR=1
WORKDIR /build
COPY requirements/ requirements/
RUN pip install --prefix=/install -r requirements/production.txt

FROM python:3.14.10-slim-bookworm
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 DJANGO_SETTINGS_MODULE=config.settings.production
ARG APP_UID=10001
ARG APP_GID=10001
RUN test "$APP_UID" -gt 0 && test "$APP_GID" -gt 0 \
    && groupadd --gid "$APP_GID" app \
    && useradd --uid "$APP_UID" --gid app --create-home app
COPY --from=dependencies /install /usr/local
WORKDIR /app
COPY --chown=app:app . .
RUN mkdir -p media staticfiles && chown app:app media staticfiles
USER app
EXPOSE 8000
CMD ["python", "scripts/start.py"]
