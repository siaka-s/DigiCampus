package user

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/digifemmes/digicampus/internal/notification"
	"github.com/digifemmes/digicampus/pkg/mailer"
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
	email, err := h.svc.ActivateUser(r.Context(), id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		return
	}
	go func() {
		h.notifSvc.Create(context.Background(), id, "account_activated",
			"Votre compte DigiSpace a été activé. Vous pouvez maintenant vous connecter.", nil)
		prenom := strings.Split(email, "@")[0]
		subj, html := mailer.CompteActive(prenom, email)
		if err := mailer.Send(email, subj, html); err != nil {
			slog.Warn("email compte activé", "erreur", err)
		}
	}()
	writeJSON(w, http.StatusOK, nil, "")
}

func (h *Handler) DeactivateUser(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.svc.DeactivateUser(r.Context(), id); err != nil {
		writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		return
	}
	writeJSON(w, http.StatusOK, nil, "")
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
	writeJSON(w, http.StatusOK, nil, "")
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
	writeJSON(w, http.StatusOK, nil, "")
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
