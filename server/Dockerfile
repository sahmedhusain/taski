# Stage 1: Build Go Binary
FROM golang:1.26-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o main ./cmd/main.go

# Stage 2: Secure Production Runner
FROM alpine:latest
RUN apk --no-cache add ca-certificates tzdata && \
    addgroup -S app && adduser -S -G app app
WORKDIR /app
COPY --from=builder /app/main .
USER app
EXPOSE 8080
CMD ["./main"]
