# ── Stage 1 : build ──────────────────────────────────────────────────────────
FROM golang:1.22-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o digicampus ./cmd/api

# ── Stage 2 : image finale ────────────────────────────────────────────────────
FROM alpine:3.19

RUN apk --no-cache add ca-certificates tzdata
ENV TZ=Africa/Abidjan

WORKDIR /app
COPY --from=builder /app/digicampus .
COPY --from=builder /app/migrations ./migrations

EXPOSE 8080
CMD ["./digicampus"]
