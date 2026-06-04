package middleware

import (
	"net/http"
	"os"
	"strconv"
	"sync"
	"time"
)

type ipEntry struct {
	count   int
	resetAt time.Time
}

var (
	ipMap sync.Map
)

func RateLimit(next http.Handler) http.Handler {
	max, _ := strconv.Atoi(os.Getenv("RATE_LIMIT_MAX"))
	window, _ := strconv.Atoi(os.Getenv("RATE_LIMIT_WINDOW"))
	if max == 0 {
		max = 5
	}
	if window == 0 {
		window = 60
	}
	windowDur := time.Duration(window) * time.Second

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := r.RemoteAddr

		now := time.Now()
		val, _ := ipMap.LoadOrStore(ip, &ipEntry{count: 0, resetAt: now.Add(windowDur)})
		entry := val.(*ipEntry)

		if now.After(entry.resetAt) {
			entry.count = 0
			entry.resetAt = now.Add(windowDur)
		}

		entry.count++
		if entry.count > max {
			http.Error(w, `{"error":"trop de requêtes"}`, http.StatusTooManyRequests)
			return
		}

		next.ServeHTTP(w, r)
	})
}
