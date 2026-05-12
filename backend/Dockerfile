FROM golang:1.26.1-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /flowbit-api .

FROM alpine:3.22

WORKDIR /app

RUN addgroup -S app && adduser -S app -G app

COPY --from=builder /flowbit-api /usr/local/bin/flowbit-api

ENV PORT=8080
EXPOSE 8080

USER app

CMD ["flowbit-api"]
