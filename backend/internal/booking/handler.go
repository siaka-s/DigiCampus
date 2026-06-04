package booking

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

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var input CreateInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, nil, "corps invalide")
		return
	}
	userID, _ := r.Context().Value(middleware.ContextUserID).(string)
	b, err := h.svc.Create(r.Context(), input, userID)
	if err != nil {
		switch {
		case errors.Is(err, ErrTooSoon):
			writeJSON(w, http.StatusUnprocessableEntity, nil, err.Error())
		case errors.Is(err, ErrCapacityExceeded):
			writeJSON(w, http.StatusUnprocessableEntity, nil, err.Error())
		case errors.Is(err, ErrSpaceNotAvailable):
			writeJSON(w, http.StatusConflict, nil, err.Error())
		default:
			slog.Error("create booking", "erreur", err)
			writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		}
		return
	}
	writeJSON(w, http.StatusCreated, b, "")
}

func (h *Handler) CreateUrgent(w http.ResponseWriter, r *http.Request) {
	var input CreateInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, nil, "corps invalide")
		return
	}
	input.IsUrgent = true
	userID, _ := r.Context().Value(middleware.ContextUserID).(string)
	b, err := h.svc.Create(r.Context(), input, userID)
	if err != nil {
		switch {
		case errors.Is(err, ErrCapacityExceeded):
			writeJSON(w, http.StatusUnprocessableEntity, nil, err.Error())
		case errors.Is(err, ErrSpaceNotAvailable):
			writeJSON(w, http.StatusConflict, nil, err.Error())
		default:
			slog.Error("create urgent booking", "erreur", err)
			writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		}
		return
	}
	writeJSON(w, http.StatusCreated, b, "")
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.ContextUserID).(string)
	role, _ := r.Context().Value(middleware.ContextUserRole).(string)
	bookings, err := h.svc.List(r.Context(), userID, role)
	if err != nil {
		slog.Error("list bookings", "erreur", err)
		writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		return
	}
	writeJSON(w, http.StatusOK, bookings, "")
}

func (h *Handler) Validate(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.svc.Validate(r.Context(), id); err != nil {
		switch {
		case errors.Is(err, ErrBookingNotFound):
			writeJSON(w, http.StatusNotFound, nil, err.Error())
		case errors.Is(err, ErrNotPending):
			writeJSON(w, http.StatusConflict, nil, err.Error())
		default:
			slog.Error("validate booking", "erreur", err)
			writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		}
		return
	}
	writeJSON(w, http.StatusOK, nil, "réservation validée")
}

func (h *Handler) Refuse(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var body struct {
		Comment string `json:"comment"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, nil, "corps invalide")
		return
	}
	if err := h.svc.Refuse(r.Context(), id, body.Comment); err != nil {
		switch {
		case errors.Is(err, ErrBookingNotFound):
			writeJSON(w, http.StatusNotFound, nil, err.Error())
		case errors.Is(err, ErrNotPending):
			writeJSON(w, http.StatusConflict, nil, err.Error())
		default:
			slog.Error("refuse booking", "erreur", err)
			writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		}
		return
	}
	writeJSON(w, http.StatusOK, nil, "réservation refusée")
}

func (h *Handler) CreateDirect(w http.ResponseWriter, r *http.Request) {
	var input DirectInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, nil, "corps invalide")
		return
	}
	adminID, _ := r.Context().Value(middleware.ContextUserID).(string)
	b, err := h.svc.CreateDirect(r.Context(), input, adminID)
	if err != nil {
		switch {
		case errors.Is(err, ErrCapacityExceeded):
			writeJSON(w, http.StatusUnprocessableEntity, nil, err.Error())
		case errors.Is(err, ErrSpaceNotAvailable):
			writeJSON(w, http.StatusConflict, nil, err.Error())
		default:
			slog.Error("create direct", "erreur", err)
			writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		}
		return
	}
	writeJSON(w, http.StatusCreated, b, "")
}

func (h *Handler) CreateRecurring(w http.ResponseWriter, r *http.Request) {
	var input RecurringInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, nil, "corps invalide")
		return
	}
	adminID, _ := r.Context().Value(middleware.ContextUserID).(string)
	bookings, err := h.svc.CreateRecurring(r.Context(), input, adminID)
	if err != nil {
		slog.Error("create recurring", "erreur", err)
		writeJSON(w, http.StatusInternalServerError, nil, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, bookings, "")
}

func (h *Handler) Cancel(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	userID, _ := r.Context().Value(middleware.ContextUserID).(string)
	role, _ := r.Context().Value(middleware.ContextUserRole).(string)
	if err := h.svc.Cancel(r.Context(), id, userID, role); err != nil {
		switch {
		case errors.Is(err, ErrBookingNotFound):
			writeJSON(w, http.StatusNotFound, nil, err.Error())
		case errors.Is(err, ErrForbidden):
			writeJSON(w, http.StatusForbidden, nil, err.Error())
		case errors.Is(err, ErrNotPending):
			writeJSON(w, http.StatusConflict, nil, err.Error())
		default:
			slog.Error("cancel booking", "erreur", err)
			writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		}
		return
	}
	writeJSON(w, http.StatusOK, nil, "réservation annulée")
}
