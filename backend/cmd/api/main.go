package main

import (
	"log/slog"
	"net/http"
	"os"

	"github.com/joho/godotenv"

	"github.com/digifemmes/digicampus/internal/user"
	"github.com/digifemmes/digicampus/pkg/database"
	"github.com/digifemmes/digicampus/pkg/middleware"
)

var requiredEnvVars = []string{
	"PORT",
	"DATABASE_URL",
	"JWT_SECRET",
	"RESEND_API_KEY",
	"ALLOWED_ORIGINS",
}

func main() {
	if err := godotenv.Load(); err != nil {
		slog.Warn("pas de fichier .env trouvé, utilisation des variables système")
	}

	for _, v := range requiredEnvVars {
		if os.Getenv(v) == "" {
			slog.Error("variable d'environnement manquante", "variable", v)
			os.Exit(1)
		}
	}

	pool, err := database.NewPool(os.Getenv("DATABASE_URL"))
	if err != nil {
		slog.Error("connexion base de données échouée", "erreur", err)
		os.Exit(1)
	}
	defer pool.Close()

	userRepo := user.NewRepository(pool)
	userSvc := user.NewService(userRepo)
	userHandler := user.NewHandler(userSvc)

	mux := http.NewServeMux()

	// Routes publiques
	publicMux := http.NewServeMux()
	publicMux.HandleFunc("POST /api/v1/auth/register", userHandler.Register)
	publicMux.HandleFunc("POST /api/v1/auth/login", userHandler.Login)

	mux.Handle("/api/v1/auth/", middleware.RateLimit(publicMux))

	// Routes privées admin (JWT + rôle super_admin)
	adminMux := http.NewServeMux()
	adminMux.HandleFunc("GET /api/v1/users", userHandler.GetUsers)
	adminMux.HandleFunc("PATCH /api/v1/users/{id}/activate", userHandler.ActivateUser)
	adminMux.HandleFunc("PATCH /api/v1/users/{id}/role", userHandler.UpdateRole)
	adminMux.HandleFunc("PATCH /api/v1/users/{id}/department", userHandler.UpdateDepartment)
	adminMux.HandleFunc("DELETE /api/v1/users/{id}", userHandler.DeactivateUser)

	mux.Handle("/api/v1/users", middleware.Auth(middleware.RequireRole("super_admin")(adminMux)))
	mux.Handle("/api/v1/users/", middleware.Auth(middleware.RequireRole("super_admin")(adminMux)))

	handler := middleware.Security(middleware.CORS(mux))

	addr := ":" + os.Getenv("PORT")
	slog.Info("serveur démarré", "adresse", addr)
	if err := http.ListenAndServe(addr, handler); err != nil {
		slog.Error("erreur serveur", "erreur", err)
		os.Exit(1)
	}
}
