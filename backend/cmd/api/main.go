package main

import (
	"log/slog"
	"net/http"
	"os"

	"github.com/joho/godotenv"

	"github.com/digifemmes/digicampus/internal/booking"
	"github.com/digifemmes/digicampus/internal/department"
	"github.com/digifemmes/digicampus/internal/equipment"
	"github.com/digifemmes/digicampus/internal/event"
	"github.com/digifemmes/digicampus/internal/notification"
	"github.com/digifemmes/digicampus/internal/photo"
	"github.com/digifemmes/digicampus/internal/presence"
	"github.com/digifemmes/digicampus/internal/space"
	"github.com/digifemmes/digicampus/internal/user"
	"github.com/digifemmes/digicampus/pkg/database"
	"github.com/digifemmes/digicampus/pkg/logger"
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
	logger.Setup()

	slog.Info("DigiSpace — démarrage du serveur")

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

	notifRepo    := notification.NewRepository(pool)
	notifSvc     := notification.NewService(notifRepo)
	notifHandler := notification.NewHandler(notifSvc)

	userRepo := user.NewRepository(pool)
	userSvc := user.NewService(userRepo)
	userHandler := user.NewHandler(userSvc, notifSvc)

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

	// Routes espaces — méthodes explicites pour éviter tout conflit exact/préfixe
	adminRole := middleware.RequireRole("admin", "super_admin")
	mux.Handle("GET /api/v1/spaces",                    middleware.Auth(http.HandlerFunc(spaceHandler.GetSpaces)))
	mux.Handle("POST /api/v1/spaces",                   middleware.Auth(adminRole(http.HandlerFunc(spaceHandler.CreateSpace))))
	mux.Handle("GET /api/v1/spaces/occupancy",          middleware.Auth(http.HandlerFunc(spaceHandler.GetOccupancy)))
	mux.Handle("GET /api/v1/spaces/occupancy/week",     middleware.Auth(adminRole(http.HandlerFunc(spaceHandler.GetOccupancyWeek))))
	mux.Handle("GET /api/v1/spaces/occupancy/month",    middleware.Auth(http.HandlerFunc(spaceHandler.GetOccupancyMonth)))
	mux.Handle("GET /api/v1/spaces/available",          middleware.Auth(http.HandlerFunc(spaceHandler.GetAvailable)))
	mux.Handle("PATCH /api/v1/spaces/{id}/deactivate",  middleware.Auth(adminRole(http.HandlerFunc(spaceHandler.DeactivateSpace))))
	mux.Handle("PATCH /api/v1/spaces/{id}",             middleware.Auth(adminRole(http.HandlerFunc(spaceHandler.UpdateSpace))))

	// Réservations
	bookingRepo    := booking.NewRepository(pool)
	bookingSvc     := booking.NewService(bookingRepo, spaceRepo)
	bookingHandler := booking.NewHandler(bookingSvc, notifSvc)

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
	presenceSvc     := presence.NewService(presenceRepo, spaceRepo, userRepo)
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
	equipmentSvc     := equipment.NewService(equipmentRepo, userRepo)
	equipmentHandler := equipment.NewHandler(equipmentSvc, notifSvc)

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
	mux.Handle("/api/v1/equipment/overdue", middleware.Auth(middleware.RequireRole("admin", "super_admin")(eqAdminMux)))
	mux.Handle("/api/v1/equipment/", middleware.Auth(middleware.RequireRole("admin", "super_admin")(eqAdminMux)))

	// Départements — GET public (dropdown inscription), mutations admin
	deptRepo    := department.NewRepository(pool)
	deptSvc     := department.NewService(deptRepo)
	deptHandler := department.NewHandler(deptSvc)

	mux.HandleFunc("GET /api/v1/departments", deptHandler.ListActive)

	deptAdminMux := http.NewServeMux()
	deptAdminMux.HandleFunc("GET /api/v1/departments/all", deptHandler.List)
	deptAdminMux.HandleFunc("POST /api/v1/departments", deptHandler.Create)
	deptAdminMux.HandleFunc("PATCH /api/v1/departments/{id}", deptHandler.Update)
	deptAdminMux.HandleFunc("PATCH /api/v1/departments/{id}/deactivate", deptHandler.Deactivate)
	deptAdminMux.HandleFunc("PATCH /api/v1/departments/{id}/activate", deptHandler.Activate)
	mux.Handle("/api/v1/departments/all", middleware.Auth(middleware.RequireRole("admin", "super_admin")(deptAdminMux)))
	mux.Handle("/api/v1/departments/", middleware.Auth(middleware.RequireRole("admin", "super_admin")(deptAdminMux)))

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

	// Événements campus
	eventRepo    := event.NewRepository(pool)
	eventSvc     := event.NewService(eventRepo)
	eventHandler := event.NewHandler(eventSvc)

	mux.Handle("GET /api/v1/events", middleware.Auth(http.HandlerFunc(eventHandler.List)))

	eventAdminMux := http.NewServeMux()
	eventAdminMux.HandleFunc("GET /api/v1/events/all",               eventHandler.ListAll)
	eventAdminMux.HandleFunc("POST /api/v1/events",                  eventHandler.Create)
	eventAdminMux.HandleFunc("PATCH /api/v1/events/{id}/publish",    eventHandler.Publish)
	eventAdminMux.HandleFunc("PATCH /api/v1/events/{id}/unpublish",  eventHandler.Unpublish)
	eventAdminMux.HandleFunc("PATCH /api/v1/events/{id}",            eventHandler.Update)
	eventAdminMux.HandleFunc("DELETE /api/v1/events/{id}",           eventHandler.Delete)
	mux.Handle("/api/v1/events/all", middleware.Auth(middleware.RequireRole("admin", "super_admin")(eventAdminMux)))
	mux.Handle("/api/v1/events/",    middleware.Auth(middleware.RequireRole("admin", "super_admin")(eventAdminMux)))

	// Notifications — lecture + marquage
	notifMux := http.NewServeMux()
	notifMux.HandleFunc("GET /api/v1/notifications", notifHandler.List)
	notifMux.HandleFunc("PATCH /api/v1/notifications/read-all", notifHandler.MarkAllRead)
	notifMux.HandleFunc("PATCH /api/v1/notifications/{id}/read", notifHandler.MarkRead)
	mux.Handle("/api/v1/notifications", middleware.Auth(notifMux))
	mux.Handle("/api/v1/notifications/", middleware.Auth(notifMux))

	slog.Info("routes enregistrées", "modules", "auth · users · spaces · bookings · presence · equipment · photos · departments · notifications · events")

	handler := middleware.RequestLogger(middleware.Security(middleware.CORS(mux)))

	addr := ":" + os.Getenv("PORT")
	slog.Info("─────────────────────────────────────────")
	slog.Info("serveur prêt", "port", os.Getenv("PORT"), "url", "http://localhost"+addr)
	slog.Info("─────────────────────────────────────────")

	if err := http.ListenAndServe(addr, handler); err != nil {
		slog.Error("erreur serveur", "erreur", err)
		os.Exit(1)
	}
}
