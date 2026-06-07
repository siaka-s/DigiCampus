package main

import (
	"log/slog"
	"net/http"
	"os"

	"github.com/joho/godotenv"

	"github.com/digifemmes/digicampus/internal/booking"
	"github.com/digifemmes/digicampus/internal/equipment"
	"github.com/digifemmes/digicampus/internal/photo"
	"github.com/digifemmes/digicampus/internal/presence"
	"github.com/digifemmes/digicampus/internal/space"
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
	// Logs lisibles en développement
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})))

	slog.Info("DigiCampus — démarrage du serveur")

	if err := godotenv.Load(); err != nil {
		slog.Warn("pas de fichier .env trouvé, utilisation des variables système")
	} else {
		slog.Info("configuration chargée", "fichier", ".env")
	}

	for _, v := range requiredEnvVars {
		if os.Getenv(v) == "" {
			slog.Error("variable d'environnement manquante", "variable", v)
			os.Exit(1)
		}
	}
	slog.Info("variables d'environnement OK")

	pool, err := database.NewPool(os.Getenv("DATABASE_URL"))
	if err != nil {
		slog.Error("connexion base de données échouée", "erreur", err)
		os.Exit(1)
	}
	defer pool.Close()
	slog.Info("base de données connectée")

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

	spaceRepo    := space.NewRepository(pool)
	spaceSvc     := space.NewService(spaceRepo)
	spaceHandler := space.NewHandler(spaceSvc)

	// Lecture espaces — tous les connectés
	privateMux := http.NewServeMux()
	privateMux.HandleFunc("GET /api/v1/spaces", spaceHandler.GetSpaces)
	privateMux.HandleFunc("GET /api/v1/spaces/occupancy", spaceHandler.GetOccupancy)
	privateMux.HandleFunc("GET /api/v1/spaces/occupancy/week", spaceHandler.GetOccupancyWeek)
	mux.Handle("/api/v1/spaces", middleware.Auth(privateMux))
	mux.Handle("/api/v1/spaces/occupancy", middleware.Auth(privateMux))
	mux.Handle("/api/v1/spaces/occupancy/week", middleware.Auth(privateMux))

	// Écriture espaces — admin uniquement
	spaceAdminMux := http.NewServeMux()
	spaceAdminMux.HandleFunc("POST /api/v1/spaces", spaceHandler.CreateSpace)
	spaceAdminMux.HandleFunc("PATCH /api/v1/spaces/{id}", spaceHandler.UpdateSpace)
	spaceAdminMux.HandleFunc("PATCH /api/v1/spaces/{id}/deactivate", spaceHandler.DeactivateSpace)
	mux.Handle("/api/v1/spaces/", middleware.Auth(middleware.RequireRole("admin", "super_admin")(spaceAdminMux)))

	// Disponibilité des salles — tous les connectés
	mux.Handle("/api/v1/spaces/available", middleware.Auth(http.HandlerFunc(spaceHandler.GetAvailable)))

	// Réservations
	bookingRepo    := booking.NewRepository(pool)
	bookingSvc     := booking.NewService(bookingRepo, spaceRepo)
	bookingHandler := booking.NewHandler(bookingSvc)

	bookingMux := http.NewServeMux()
	bookingMux.HandleFunc("POST /api/v1/bookings", bookingHandler.Create)
	bookingMux.HandleFunc("GET /api/v1/bookings", bookingHandler.List)
	bookingMux.HandleFunc("POST /api/v1/bookings/urgent", bookingHandler.CreateUrgent)
	mux.Handle("/api/v1/bookings", middleware.Auth(bookingMux))
	mux.Handle("/api/v1/bookings/urgent", middleware.Auth(bookingMux))

	bookingAdminMux := http.NewServeMux()
	bookingAdminMux.HandleFunc("PATCH /api/v1/bookings/{id}/validate", bookingHandler.Validate)
	bookingAdminMux.HandleFunc("PATCH /api/v1/bookings/{id}/refuse", bookingHandler.Refuse)
	bookingAdminMux.HandleFunc("PATCH /api/v1/bookings/{id}/cancel", bookingHandler.Cancel)
	bookingAdminMux.HandleFunc("POST /api/v1/bookings/direct", bookingHandler.CreateDirect)
	bookingAdminMux.HandleFunc("POST /api/v1/bookings/recurring", bookingHandler.CreateRecurring)
	mux.Handle("/api/v1/bookings/direct", middleware.Auth(middleware.RequireRole("admin", "super_admin")(bookingAdminMux)))
	mux.Handle("/api/v1/bookings/recurring", middleware.Auth(middleware.RequireRole("admin", "super_admin")(bookingAdminMux)))
	mux.Handle("/api/v1/bookings/", middleware.Auth(bookingAdminMux))

	presenceRepo    := presence.NewRepository(pool)
	presenceSvc     := presence.NewService(presenceRepo, spaceRepo)
	presenceHandler := presence.NewHandler(presenceSvc)

	presenceMux := http.NewServeMux()
	presenceMux.HandleFunc("POST /api/v1/presence", presenceHandler.Declare)
	presenceMux.HandleFunc("GET /api/v1/presence", presenceHandler.GetBySpace)
	presenceMux.HandleFunc("GET /api/v1/presence/me", presenceHandler.GetMyPresence)
	presenceMux.HandleFunc("PATCH /api/v1/presence/{id}", presenceHandler.Update)
	presenceMux.HandleFunc("GET /api/v1/presence/capacity", presenceHandler.CheckOverCapacity)
	mux.Handle("/api/v1/presence", middleware.Auth(presenceMux))
	mux.Handle("/api/v1/presence/me", middleware.Auth(presenceMux))
	mux.Handle("/api/v1/presence/capacity", middleware.Auth(presenceMux))
	mux.Handle("/api/v1/presence/", middleware.Auth(presenceMux))

	equipmentRepo    := equipment.NewRepository(pool)
	equipmentSvc     := equipment.NewService(equipmentRepo)
	equipmentHandler := equipment.NewHandler(equipmentSvc)

	// Lecture équipements — tous les connectés
	eqReadMux := http.NewServeMux()
	eqReadMux.HandleFunc("GET /api/v1/equipment", equipmentHandler.ListEquipment)
	eqReadMux.HandleFunc("GET /api/v1/equipment/requests", equipmentHandler.ListRequests)
	mux.Handle("/api/v1/equipment", middleware.Auth(eqReadMux))
	mux.Handle("/api/v1/equipment/requests", middleware.Auth(eqReadMux))

	// Demandes collaborateurs
	eqRequestMux := http.NewServeMux()
	eqRequestMux.HandleFunc("POST /api/v1/equipment/requests", equipmentHandler.CreateRequest)
	eqRequestMux.HandleFunc("POST /api/v1/equipment/rentals", equipmentHandler.CreateRequest)
	mux.Handle("/api/v1/equipment/rentals", middleware.Auth(eqRequestMux))

	// Écriture équipements — admin IT
	eqAdminMux := http.NewServeMux()
	eqAdminMux.HandleFunc("POST /api/v1/equipment", equipmentHandler.AddEquipment)
	eqAdminMux.HandleFunc("PATCH /api/v1/equipment/{id}", equipmentHandler.UpdateEquipment)
	eqAdminMux.HandleFunc("PATCH /api/v1/equipment/requests/{id}/validate", equipmentHandler.ValidateRequest)
	eqAdminMux.HandleFunc("PATCH /api/v1/equipment/requests/{id}/refuse", equipmentHandler.RefuseRequest)
	eqAdminMux.HandleFunc("PATCH /api/v1/equipment/rentals/{id}/close", equipmentHandler.CloseRental)
	eqAdminMux.HandleFunc("GET /api/v1/equipment/overdue", equipmentHandler.GetOverdueRentals)
	mux.Handle("/api/v1/equipment/overdue", middleware.Auth(middleware.RequireRole("admin", "super_admin", "admin_it")(eqAdminMux)))
	mux.Handle("/api/v1/equipment/", middleware.Auth(middleware.RequireRole("admin", "super_admin", "admin_it")(eqAdminMux)))

	// Photos campus — GET public, mutations admin
	photoRepo    := photo.NewRepository(pool)
	photoSvc     := photo.NewService(photoRepo, "./uploads")
	photoHandler := photo.NewHandler(photoSvc)

	mux.HandleFunc("GET /api/v1/photos", photoHandler.List)
	mux.Handle("POST /api/v1/photos", middleware.Auth(middleware.RequireRole("admin", "super_admin")(http.HandlerFunc(photoHandler.Upload))))

	photoMutMux := http.NewServeMux()
	photoMutMux.HandleFunc("PATCH /api/v1/photos/{id}", photoHandler.Update)
	photoMutMux.HandleFunc("DELETE /api/v1/photos/{id}", photoHandler.Delete)
	mux.Handle("/api/v1/photos/", middleware.Auth(middleware.RequireRole("admin", "super_admin")(photoMutMux)))

	// Fichiers statiques uploads
	mux.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir("./uploads"))))

	slog.Info("routes enregistrées", "modules", "auth · users · spaces · bookings · presence · equipment · photos")

	handler := middleware.Security(middleware.CORS(mux))

	addr := ":" + os.Getenv("PORT")
	slog.Info("─────────────────────────────────────────")
	slog.Info("serveur prêt", "port", os.Getenv("PORT"), "url", "http://localhost"+addr)
	slog.Info("─────────────────────────────────────────")

	if err := http.ListenAndServe(addr, handler); err != nil {
		slog.Error("erreur serveur", "erreur", err)
		os.Exit(1)
	}
}
