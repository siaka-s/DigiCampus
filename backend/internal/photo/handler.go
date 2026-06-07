package photo

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func respond(w http.ResponseWriter, status int, data any, errMsg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]any{
		"data":    data,
		"error":   errMsg,
		"message": "success",
	})
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	activeOnly := r.URL.Query().Get("active") == "true"
	photos, err := h.svc.List(r.Context(), activeOnly)
	if err != nil {
		slog.Error("erreur liste photos", "erreur", err)
		respond(w, 500, nil, "erreur serveur")
		return
	}
	if photos == nil {
		photos = []*Photo{}
	}
	respond(w, 200, photos, "")
}

func (h *Handler) Upload(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		respond(w, 400, nil, "formulaire invalide (max 10 Mo)")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		respond(w, 400, nil, "fichier manquant")
		return
	}
	defer file.Close()

	photo, err := h.svc.Upload(r.Context(), file, header, r.FormValue("caption"))
	if err != nil {
		respond(w, 400, nil, err.Error())
		return
	}
	respond(w, 201, photo, "")
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(strings.TrimSuffix(r.URL.Path, "/"), "/")
	id := parts[len(parts)-1]

	var body struct {
		Caption    string `json:"caption"`
		IsActive   bool   `json:"is_active"`
		OrderIndex int    `json:"order_index"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		respond(w, 400, nil, "corps invalide")
		return
	}

	if err := h.svc.Update(r.Context(), id, body.Caption, body.IsActive, body.OrderIndex); err != nil {
		slog.Error("erreur mise à jour photo", "erreur", err)
		respond(w, 500, nil, "erreur serveur")
		return
	}
	respond(w, 200, nil, "")
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(strings.TrimSuffix(r.URL.Path, "/"), "/")
	id := parts[len(parts)-1]

	if err := h.svc.Delete(r.Context(), id); err != nil {
		slog.Error("erreur suppression photo", "erreur", err)
		respond(w, 500, nil, "erreur serveur")
		return
	}
	respond(w, 200, nil, "")
}
