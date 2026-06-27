package logger

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"os"
	"sync"
)

const (
	ansiReset  = "\033[0m"
	ansiGray   = "\033[90m"
	ansiGreen  = "\033[32m"
	ansiYellow = "\033[33m"
	ansiRed    = "\033[31m"
)

// Setup initialise le logger global slog.
// Terminal détecté → format coloré lisible (dev).
// Sinon (Docker, CI) → JSON (prod).
func Setup() {
	if isTerminal(os.Stdout) {
		slog.SetDefault(slog.New(&colorHandler{out: os.Stdout, level: slog.LevelInfo}))
	} else {
		slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})))
	}
}

func isTerminal(f *os.File) bool {
	fi, err := f.Stat()
	if err != nil {
		return false
	}
	return (fi.Mode() & os.ModeCharDevice) != 0
}

// ── colorHandler ──────────────────────────────────────────────────────────────

type colorHandler struct {
	mu    sync.Mutex
	out   io.Writer
	level slog.Level
	attrs []slog.Attr
}

func (h *colorHandler) Enabled(_ context.Context, level slog.Level) bool {
	return level >= h.level
}

func (h *colorHandler) Handle(_ context.Context, r slog.Record) error {
	color, label := levelStyle(r.Level)
	ts := r.Time.Format("15:04:05")

	line := fmt.Sprintf("%s%s%s  %s%s%s  %s",
		ansiGray, ts, ansiReset,
		color, label, ansiReset,
		r.Message,
	)

	var extra string
	for _, a := range h.attrs {
		extra += fmt.Sprintf("  %s%s%s=%v", ansiGray, a.Key, ansiReset, a.Value.Any())
	}
	r.Attrs(func(a slog.Attr) bool {
		extra += fmt.Sprintf("  %s%s%s=%v", ansiGray, a.Key, ansiReset, a.Value.Any())
		return true
	})

	h.mu.Lock()
	defer h.mu.Unlock()
	fmt.Fprintln(h.out, line+extra)
	return nil
}

func (h *colorHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	merged := make([]slog.Attr, len(h.attrs)+len(attrs))
	copy(merged, h.attrs)
	copy(merged[len(h.attrs):], attrs)
	return &colorHandler{out: h.out, level: h.level, attrs: merged}
}

func (h *colorHandler) WithGroup(_ string) slog.Handler { return h }

func levelStyle(level slog.Level) (color, label string) {
	switch level {
	case slog.LevelDebug:
		return ansiGray, "DEBUG"
	case slog.LevelInfo:
		return ansiGreen, "INFO "
	case slog.LevelWarn:
		return ansiYellow, "WARN "
	default:
		return ansiRed, "ERROR"
	}
}
