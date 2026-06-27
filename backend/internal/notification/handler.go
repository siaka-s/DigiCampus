package notification

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/digifemmes/digicampus/pkg/middleware"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func writeJSON(w http.ResponseWriter, status int, data any, errMsg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]any{
		"data":    data,
		"error":   errMsg,
		"message": http.StatusText(status),
	})
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.ContextUserID).(string)
	items, err := h.svc.List(r.Context(), userID)
	if err != nil {
		slog.Error("list notifications", "erreur", err)
		writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		return
	}
	writeJSON(w, http.StatusOK, items, "")
}

func (h *Handler) MarkRead(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	userID, _ := r.Context().Value(middleware.ContextUserID).(string)
	if err := h.svc.MarkRead(r.Context(), id, userID); err != nil {
		slog.Error("mark notification read", "erreur", err)
		writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		return
	}
	writeJSON(w, http.StatusOK, nil, "")
}

func (h *Handler) MarkAllRead(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.ContextUserID).(string)
	if err := h.svc.MarkAllRead(r.Context(), userID); err != nil {
		slog.Error("mark all notifications read", "erreur", err)
		writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		return
	}
	writeJSON(w, http.StatusOK, nil, "")
}
