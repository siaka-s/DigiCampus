package equipment

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"github.com/digifemmes/digicampus/pkg/middleware"
)

type Handler struct{ svc *Service }

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

func writeJSON(w http.ResponseWriter, status int, data any, errMsg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]any{
		"data": data, "error": errMsg, "message": http.StatusText(status),
	})
}

func (h *Handler) ListEquipment(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.ListEquipment(r.Context())
	if err != nil {
		slog.Error("list equipment", "erreur", err)
		writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		return
	}
	writeJSON(w, http.StatusOK, items, "")
}

func (h *Handler) AddEquipment(w http.ResponseWriter, r *http.Request) {
	var input CreateEquipmentInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, nil, "corps invalide")
		return
	}
	e, err := h.svc.AddEquipment(r.Context(), input)
	if err != nil {
		slog.Error("add equipment", "erreur", err)
		writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		return
	}
	writeJSON(w, http.StatusCreated, e, "")
}

func (h *Handler) UpdateEquipment(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var input UpdateEquipmentInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, nil, "corps invalide")
		return
	}
	if err := h.svc.UpdateEquipment(r.Context(), id, input); err != nil {
		slog.Error("update equipment", "erreur", err)
		writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		return
	}
	writeJSON(w, http.StatusOK, nil, "équipement mis à jour")
}

func (h *Handler) CreateRequest(w http.ResponseWriter, r *http.Request) {
	var input CreateRequestInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, nil, "corps invalide")
		return
	}
	userID, _ := r.Context().Value(middleware.ContextUserID).(string)
	req, err := h.svc.CreateRequest(r.Context(), input, userID)
	if err != nil {
		slog.Error("create equipment request", "erreur", err)
		writeJSON(w, http.StatusInternalServerError, nil, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, req, "")
}

func (h *Handler) ListRequests(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.ContextUserID).(string)
	role, _ := r.Context().Value(middleware.ContextUserRole).(string)
	items, err := h.svc.ListRequests(r.Context(), userID, role)
	if err != nil {
		slog.Error("list equipment requests", "erreur", err)
		writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		return
	}
	writeJSON(w, http.StatusOK, items, "")
}

func (h *Handler) ValidateRequest(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.svc.Validate(r.Context(), id); err != nil {
		if errors.Is(err, ErrNotFound) {
			writeJSON(w, http.StatusNotFound, nil, err.Error())
			return
		}
		if errors.Is(err, ErrNotPending) {
			writeJSON(w, http.StatusConflict, nil, err.Error())
			return
		}
		slog.Error("validate equipment request", "erreur", err)
		writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		return
	}
	writeJSON(w, http.StatusOK, nil, "demande validée")
}

func (h *Handler) RefuseRequest(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var body struct {
		Comment string `json:"comment"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, nil, "corps invalide")
		return
	}
	if err := h.svc.Refuse(r.Context(), id, body.Comment); err != nil {
		if errors.Is(err, ErrNotFound) {
			writeJSON(w, http.StatusNotFound, nil, err.Error())
			return
		}
		if errors.Is(err, ErrNotPending) {
			writeJSON(w, http.StatusConflict, nil, err.Error())
			return
		}
		slog.Error("refuse equipment request", "erreur", err)
		writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		return
	}
	writeJSON(w, http.StatusOK, nil, "demande refusée")
}

func (h *Handler) CloseRental(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.svc.CloseRental(r.Context(), id); err != nil {
		if errors.Is(err, ErrNotFound) {
			writeJSON(w, http.StatusNotFound, nil, err.Error())
			return
		}
		slog.Error("close rental", "erreur", err)
		writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		return
	}
	writeJSON(w, http.StatusOK, nil, "location clôturée")
}

func (h *Handler) GetOverdueRentals(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.GetOverdueRentals(r.Context())
	if err != nil {
		slog.Error("get overdue rentals", "erreur", err)
		writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		return
	}
	writeJSON(w, http.StatusOK, items, "")
}
