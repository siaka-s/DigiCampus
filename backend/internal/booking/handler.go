package booking

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"

	"github.com/digifemmes/digicampus/internal/notification"
	"github.com/digifemmes/digicampus/pkg/mailer"
	"github.com/digifemmes/digicampus/pkg/middleware"
)

type Handler struct {
	svc      *Service
	notifSvc *notification.Service
}

func NewHandler(svc *Service, notifSvc *notification.Service) *Handler {
	return &Handler{svc: svc, notifSvc: notifSvc}
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
	b, err := h.svc.Validate(r.Context(), id)
	if err != nil {
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
	go func() {
		refID := b.ID
		h.notifSvc.Create(context.Background(), b.UserID, "booking_validated",
			fmt.Sprintf("Votre réservation \"%s\" a été validée.", b.Program), &refID)
		prenom := strings.Split(b.UserEmail, "@")[0]
		date := b.StartTime.Format("02/01/2006")
		horaire := fmt.Sprintf("%02dh%02d", b.StartTime.Hour(), b.StartTime.Minute())
		subj, html := mailer.ReservationValidee(prenom, b.Program, b.SpaceName, date, horaire)
		if err := mailer.Send(b.UserEmail, subj, html); err != nil {
			slog.Warn("email réservation validée", "erreur", err)
		}
	}()
	writeJSON(w, http.StatusOK, nil, "")
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
	b, err := h.svc.Refuse(r.Context(), id, body.Comment)
	if err != nil {
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
	go func() {
		refID := b.ID
		msg := fmt.Sprintf("Votre réservation \"%s\" a été refusée.", b.Program)
		if body.Comment != "" {
			msg += " Motif : " + body.Comment
		}
		h.notifSvc.Create(context.Background(), b.UserID, "booking_refused", msg, &refID)
		prenom := strings.Split(b.UserEmail, "@")[0]
		subj, html := mailer.ReservationRefusee(prenom, b.Program, body.Comment)
		if err := mailer.Send(b.UserEmail, subj, html); err != nil {
			slog.Warn("email réservation refusée", "erreur", err)
		}
	}()
	writeJSON(w, http.StatusOK, nil, "")
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
	go func() {
		if b == nil || b.UserEmail == "" {
			return
		}
		prenom := strings.Split(b.UserEmail, "@")[0]
		date := b.StartTime.Format("02/01/2006")
		horaire := fmt.Sprintf("%02dh%02d", b.StartTime.UTC().Hour(), b.StartTime.UTC().Minute())
		subj, html := mailer.RappelCreneau(prenom, b.Program, b.SpaceName, date, horaire)
		if err := mailer.Send(b.UserEmail, subj, html); err != nil {
			slog.Warn("email rappel créneau direct", "erreur", err)
		}
	}()
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
	writeJSON(w, http.StatusOK, nil, "")
}
