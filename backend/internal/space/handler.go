package space

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"time"
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

func (h *Handler) GetSpaces(w http.ResponseWriter, r *http.Request) {
	spaces, err := h.svc.List(r.Context())
	if err != nil {
		slog.Error("list spaces", "erreur", err)
		writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		return
	}
	writeJSON(w, http.StatusOK, spaces, "")
}

func (h *Handler) CreateSpace(w http.ResponseWriter, r *http.Request) {
	var input CreateInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, nil, "corps invalide")
		return
	}
	s, err := h.svc.Create(r.Context(), input)
	if err != nil {
		if errors.Is(err, ErrInvalidType) {
			writeJSON(w, http.StatusBadRequest, nil, err.Error())
			return
		}
		slog.Error("create space", "erreur", err)
		writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		return
	}
	writeJSON(w, http.StatusCreated, s, "")
}

func (h *Handler) UpdateSpace(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var input UpdateInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, nil, "corps invalide")
		return
	}
	if err := h.svc.Update(r.Context(), id, input); err != nil {
		if errors.Is(err, ErrSpaceNotFound) {
			writeJSON(w, http.StatusNotFound, nil, err.Error())
			return
		}
		if errors.Is(err, ErrInvalidType) {
			writeJSON(w, http.StatusBadRequest, nil, err.Error())
			return
		}
		slog.Error("update space", "erreur", err)
		writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		return
	}
	writeJSON(w, http.StatusOK, nil, "espace mis à jour")
}

func (h *Handler) GetOccupancy(w http.ResponseWriter, r *http.Request) {
	date := r.URL.Query().Get("date")
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}
	items, err := h.svc.GetOccupancy(r.Context(), date)
	if err != nil {
		slog.Error("get occupancy", "erreur", err)
		writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		return
	}
	writeJSON(w, http.StatusOK, items, "")
}

func (h *Handler) GetAvailable(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	startTime, _ := time.Parse(time.RFC3339, q.Get("start_time"))
	duration, _ := strconv.Atoi(q.Get("duration"))
	participants, _ := strconv.Atoi(q.Get("participants"))
	spaces, err := h.svc.FindAvailable(r.Context(), startTime, duration, participants)
	if err != nil {
		slog.Error("find available", "erreur", err)
		writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		return
	}
	writeJSON(w, http.StatusOK, spaces, "")
}

func (h *Handler) DeactivateSpace(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.svc.Deactivate(r.Context(), id); err != nil {
		slog.Error("deactivate space", "erreur", err)
		writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		return
	}
	writeJSON(w, http.StatusOK, nil, "espace désactivé")
}
