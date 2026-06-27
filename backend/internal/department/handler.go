package department

import (
	"encoding/json"
	"log/slog"
	"net/http"
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

// GET /api/v1/departments — public, actifs uniquement (dropdown inscription)
func (h *Handler) ListActive(w http.ResponseWriter, r *http.Request) {
	depts, err := h.svc.ListActive(r.Context())
	if err != nil {
		slog.Error("list active departments", "erreur", err)
		writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		return
	}
	writeJSON(w, http.StatusOK, depts, "")
}

// GET /api/v1/departments/all — admin, tous les départements
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	depts, err := h.svc.List(r.Context())
	if err != nil {
		slog.Error("list departments", "erreur", err)
		writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		return
	}
	writeJSON(w, http.StatusOK, depts, "")
}

// POST /api/v1/departments
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name     string `json:"name"`
		Category string `json:"category"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Name == "" {
		writeJSON(w, http.StatusBadRequest, nil, "nom requis")
		return
	}
	d, err := h.svc.Create(r.Context(), body.Name, body.Category)
	if err != nil {
		slog.Error("create department", "erreur", err)
		writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		return
	}
	writeJSON(w, http.StatusCreated, d, "")
}

// PATCH /api/v1/departments/:id
func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var body struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Name == "" {
		writeJSON(w, http.StatusBadRequest, nil, "nom requis")
		return
	}
	if err := h.svc.Update(r.Context(), id, body.Name); err != nil {
		slog.Error("update department", "erreur", err)
		writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		return
	}
	writeJSON(w, http.StatusOK, nil, "")
}

// PATCH /api/v1/departments/:id/deactivate
func (h *Handler) Deactivate(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.svc.Deactivate(r.Context(), id); err != nil {
		slog.Error("deactivate department", "erreur", err)
		writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		return
	}
	writeJSON(w, http.StatusOK, nil, "")
}

// PATCH /api/v1/departments/:id/activate
func (h *Handler) Activate(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.svc.Activate(r.Context(), id); err != nil {
		slog.Error("activate department", "erreur", err)
		writeJSON(w, http.StatusInternalServerError, nil, "erreur serveur")
		return
	}
	writeJSON(w, http.StatusOK, nil, "")
}
