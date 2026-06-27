package event

import (
	"encoding/json"
	"errors"
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

// GET /api/v1/events — publié + à venir (tous les connectés)
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	events, err := h.svc.ListUpcoming(r.Context())
	if err != nil {
		slog.Error("list events", "erreur", err)
		writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		return
	}
	if events == nil {
		events = []*PublicEvent{}
	}
	writeJSON(w, http.StatusOK, events, "")
}

// GET /api/v1/events/all — tous les événements (admin)
func (h *Handler) ListAll(w http.ResponseWriter, r *http.Request) {
	events, err := h.svc.ListAll(r.Context())
	if err != nil {
		slog.Error("list all events", "erreur", err)
		writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		return
	}
	if events == nil {
		events = []*Event{}
	}
	writeJSON(w, http.StatusOK, events, "")
}

// POST /api/v1/events — créer (admin)
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.ContextUserID).(string)
	if userID == "" {
		writeJSON(w, http.StatusUnauthorized, nil, "non authentifié")
		return
	}
	var input CreateInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, nil, "corps invalide")
		return
	}
	if input.Title == "" || input.Date == "" || input.StartTime == "" || input.EndTime == "" {
		writeJSON(w, http.StatusBadRequest, nil, "titre, date, heure de début et fin sont requis")
		return
	}
	e, err := h.svc.Create(r.Context(), input, userID)
	if err != nil {
		slog.Error("create event", "erreur", err)
		writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		return
	}
	writeJSON(w, http.StatusCreated, e, "")
}

// PATCH /api/v1/events/{id} — modifier (admin)
func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var input UpdateInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, nil, "corps invalide")
		return
	}
	if err := h.svc.Update(r.Context(), id, input); err != nil {
		if errors.Is(err, ErrNotFound) {
			writeJSON(w, http.StatusNotFound, nil, err.Error())
			return
		}
		slog.Error("update event", "erreur", err)
		writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		return
	}
	writeJSON(w, http.StatusOK, nil, "")
}

// PATCH /api/v1/events/{id}/publish — publier (admin)
func (h *Handler) Publish(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.svc.Publish(r.Context(), id); err != nil {
		if errors.Is(err, ErrNotFound) {
			writeJSON(w, http.StatusNotFound, nil, err.Error())
			return
		}
		slog.Error("publish event", "erreur", err)
		writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		return
	}
	writeJSON(w, http.StatusOK, nil, "")
}

// PATCH /api/v1/events/{id}/unpublish — dépublier (admin)
func (h *Handler) Unpublish(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.svc.Unpublish(r.Context(), id); err != nil {
		if errors.Is(err, ErrNotFound) {
			writeJSON(w, http.StatusNotFound, nil, err.Error())
			return
		}
		slog.Error("unpublish event", "erreur", err)
		writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		return
	}
	writeJSON(w, http.StatusOK, nil, "")
}

// DELETE /api/v1/events/{id} — supprimer (admin)
func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.svc.Delete(r.Context(), id); err != nil {
		if errors.Is(err, ErrNotFound) {
			writeJSON(w, http.StatusNotFound, nil, err.Error())
			return
		}
		slog.Error("delete event", "erreur", err)
		writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		return
	}
	writeJSON(w, http.StatusOK, nil, "")
}
