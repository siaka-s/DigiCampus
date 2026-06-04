package booking

import (
	"context"
	"errors"
	"time"
)

var (
	ErrBookingNotFound   = errors.New("réservation introuvable")
	ErrSpaceNotAvailable = errors.New("salle non disponible sur ce créneau")
	ErrCapacityExceeded  = errors.New("participants dépassent la capacité de la salle")
	ErrTooSoon           = errors.New("délai minimum de 24h requis")
	ErrNotPending        = errors.New("seules les demandes en attente peuvent être modifiées")
	ErrForbidden         = errors.New("action non autorisée")
)

type SpaceRepository interface {
	GetCapacity(ctx context.Context, spaceID string) (int, error)
	HasConflict(ctx context.Context, spaceID string, startTime time.Time, duration int, excludeID string) (bool, error)
}

type Service struct {
	repo      *Repository
	spaceRepo SpaceRepository
}

func NewService(repo *Repository, spaceRepo SpaceRepository) *Service {
	return &Service{repo: repo, spaceRepo: spaceRepo}
}

type CreateInput struct {
	SpaceID      string    `json:"space_id"     validate:"required"`
	Program      string    `json:"program"      validate:"required"`
	StartTime    time.Time `json:"start_time"   validate:"required"`
	Duration     int       `json:"duration"     validate:"required,min=30"`
	Participants int       `json:"participants" validate:"required,min=1"`
	IsUrgent     bool      `json:"is_urgent"`
}

func (s *Service) Create(ctx context.Context, input CreateInput, userID string) (*Booking, error) {
	// R10 — délai minimum 24h (sauf urgence)
	if !input.IsUrgent && time.Until(input.StartTime) < 24*time.Hour {
		return nil, ErrTooSoon
	}

	// R3 — contrôle de capacité
	capacity, err := s.spaceRepo.GetCapacity(ctx, input.SpaceID)
	if err != nil {
		return nil, err
	}
	if input.Participants > capacity {
		return nil, ErrCapacityExceeded
	}

	// R1 — pas de conflit de créneau
	conflict, err := s.spaceRepo.HasConflict(ctx, input.SpaceID, input.StartTime, input.Duration, "")
	if err != nil {
		return nil, err
	}
	if conflict {
		return nil, ErrSpaceNotAvailable
	}

	return s.repo.Create(ctx, &Booking{
		SpaceID:      input.SpaceID,
		UserID:       userID,
		Program:      input.Program,
		StartTime:    input.StartTime,
		Duration:     input.Duration,
		Participants: input.Participants,
		IsUrgent:     input.IsUrgent,
	})
}

func (s *Service) List(ctx context.Context, userID, role string) ([]*Booking, error) {
	return s.repo.FindAll(ctx, userID, role)
}

func (s *Service) Validate(ctx context.Context, id string) error {
	b, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return err
	}
	if b == nil {
		return ErrBookingNotFound
	}
	if b.Status != "en_attente" {
		return ErrNotPending
	}
	return s.repo.UpdateStatus(ctx, id, "validee", nil)
}

func (s *Service) Refuse(ctx context.Context, id, comment string) error {
	b, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return err
	}
	if b == nil {
		return ErrBookingNotFound
	}
	if b.Status != "en_attente" {
		return ErrNotPending
	}
	return s.repo.UpdateStatus(ctx, id, "refusee", &comment)
}

func (s *Service) Cancel(ctx context.Context, id, userID, role string) error {
	b, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return err
	}
	if b == nil {
		return ErrBookingNotFound
	}
	isAdmin := role == "admin" || role == "super_admin"
	if !isAdmin && b.UserID != userID {
		return ErrForbidden
	}
	if !isAdmin && b.Status != "en_attente" {
		return ErrNotPending
	}
	return s.repo.UpdateStatus(ctx, id, "annulee", nil)
}
