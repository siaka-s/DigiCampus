package user

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
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

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var input RegisterInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, nil, "corps de requête invalide")
		return
	}

	// Délai minimum de soumission : rejet si soumis en moins de 2 secondes
	submittedAt := r.Header.Get("X-Submitted-At")
	if submittedAt != "" {
		t, err := time.Parse(time.RFC3339, submittedAt)
		if err == nil && time.Since(t) < 2*time.Second {
			writeJSON(w, http.StatusBadRequest, nil, "soumission trop rapide")
			return
		}
	}

	// Honeypot : champ caché — rejet si rempli
	if input.Honeypot != "" {
		writeJSON(w, http.StatusBadRequest, nil, "soumission invalide")
		return
	}

	if err := h.svc.Register(r.Context(), input); err != nil {
		if errors.Is(err, ErrEmailTaken) {
			writeJSON(w, http.StatusConflict, nil, err.Error())
			return
		}
		slog.Error("register", "erreur", err)
		writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		return
	}

	writeJSON(w, http.StatusCreated, nil, "compte créé, en attente de validation")
}

func (h *Handler) GetUsers(w http.ResponseWriter, r *http.Request) {
	users, err := h.svc.ListUsers(r.Context())
	if err != nil {
		slog.Error("list users", "erreur", err)
		writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		return
	}
	writeJSON(w, http.StatusOK, users, "")
}

func (h *Handler) ActivateUser(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.svc.ActivateUser(r.Context(), id); err != nil {
		writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		return
	}
	writeJSON(w, http.StatusOK, nil, "compte activé")
}

func (h *Handler) DeactivateUser(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.svc.DeactivateUser(r.Context(), id); err != nil {
		writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		return
	}
	writeJSON(w, http.StatusOK, nil, "compte désactivé")
}

func (h *Handler) UpdateRole(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var body struct {
		Role string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, nil, "corps invalide")
		return
	}
	if err := h.svc.ChangeRole(r.Context(), id, body.Role); err != nil {
		if errors.Is(err, ErrInvalidRole) {
			writeJSON(w, http.StatusBadRequest, nil, err.Error())
			return
		}
		writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		return
	}
	writeJSON(w, http.StatusOK, nil, "rôle mis à jour")
}

func (h *Handler) UpdateDepartment(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var body struct {
		Department *string `json:"department"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, nil, "corps invalide")
		return
	}
	if err := h.svc.ChangeDepartment(r.Context(), id, body.Department); err != nil {
		writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		return
	}
	writeJSON(w, http.StatusOK, nil, "département mis à jour")
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var input LoginInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, nil, "corps de requête invalide")
		return
	}

	token, err := h.svc.Login(r.Context(), input)
	if err != nil {
		if errors.Is(err, ErrInvalidCreds) {
			writeJSON(w, http.StatusUnauthorized, nil, err.Error())
			return
		}
		if errors.Is(err, ErrAccountPending) {
			writeJSON(w, http.StatusForbidden, nil, err.Error())
			return
		}
		slog.Error("login", "erreur", err)
		writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"token": token}, "")
}
