package presence

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
		"data": data, "error": errMsg, "message": http.StatusText(status),
	})
}

func (h *Handler) Declare(w http.ResponseWriter, r *http.Request) {
	var input DeclareInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, nil, "corps invalide")
		return
	}
	userID, _ := r.Context().Value(middleware.ContextUserID).(string)
	items, err := h.svc.Declare(r.Context(), input, userID)
	if err != nil {
		slog.Error("declare presence", "erreur", err)
		writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		return
	}
	writeJSON(w, http.StatusCreated, items, "")
}

func (h *Handler) GetBySpace(w http.ResponseWriter, r *http.Request) {
	spaceID := r.URL.Query().Get("space_id")
	week := r.URL.Query().Get("week")
	items, err := h.svc.GetBySpaceAndWeek(r.Context(), spaceID, week)
	if err != nil {
		slog.Error("get presence by space", "erreur", err)
		writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		return
	}
	writeJSON(w, http.StatusOK, items, "")
}

func (h *Handler) GetMyPresence(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.ContextUserID).(string)
	week := r.URL.Query().Get("week")
	items, err := h.svc.GetByUserAndWeek(r.Context(), userID, week)
	if err != nil {
		slog.Error("get my presence", "erreur", err)
		writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		return
	}
	writeJSON(w, http.StatusOK, items, "")
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var body struct {
		Date string `json:"date"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, nil, "corps invalide")
		return
	}
	userID, _ := r.Context().Value(middleware.ContextUserID).(string)
	role, _ := r.Context().Value(middleware.ContextUserRole).(string)
	if err := h.svc.Update(r.Context(), id, body.Date, userID, role); err != nil {
		if errors.Is(err, ErrPresenceNotFound) {
			writeJSON(w, http.StatusNotFound, nil, err.Error())
			return
		}
		if errors.Is(err, ErrForbidden) {
			writeJSON(w, http.StatusForbidden, nil, err.Error())
			return
		}
		slog.Error("update presence", "erreur", err)
		writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		return
	}
	writeJSON(w, http.StatusOK, nil, "déclaration mise à jour")
}

func (h *Handler) CheckOverCapacity(w http.ResponseWriter, r *http.Request) {
	spaceID := r.URL.Query().Get("space_id")
	date := r.URL.Query().Get("date")
	over, count, seats, err := h.svc.IsOverCapacity(r.Context(), spaceID, date)
	if err != nil {
		slog.Error("check over capacity", "erreur", err)
		writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"is_over_capacity": over,
		"presence_count":   count,
		"seats":            seats,
	}, "")
}
