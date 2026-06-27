package presence

import (
	"context"
	"errors"
	"time"
)

var (
	ErrPresenceNotFound = errors.New("déclaration introuvable")
	ErrForbidden        = errors.New("action non autorisée")
)

type SpaceRepository interface {
	GetSeats(ctx context.Context, spaceID string) (int, error)
	GetName(ctx context.Context, spaceID string) (string, error)
}

type AdminRepository interface {
	FindAdminEmails(ctx context.Context) ([]string, error)
}

type Service struct {
	repo      *Repository
	spaceRepo SpaceRepository
	adminRepo AdminRepository
}

func NewService(repo *Repository, spaceRepo SpaceRepository, adminRepo AdminRepository) *Service {
	return &Service{repo: repo, spaceRepo: spaceRepo, adminRepo: adminRepo}
}

func (s *Service) GetAdminEmails(ctx context.Context) ([]string, error) {
	return s.adminRepo.FindAdminEmails(ctx)
}

func (s *Service) GetSpaceName(ctx context.Context, spaceID string) (string, error) {
	return s.spaceRepo.GetName(ctx, spaceID)
}

type DeclareInput struct {
	SpaceID string   `json:"space_id" validate:"required"`
	Week    string   `json:"week"     validate:"required"` // YYYY-MM-DD lundi de la semaine
	Dates   []string `json:"dates"`
}

// Declare remplace atomiquement la présence de l'utilisateur pour (bureau + semaine).
func (s *Service) Declare(ctx context.Context, input DeclareInput, userID string) ([]*Presence, error) {
	if err := s.repo.DeleteByUserSpaceWeek(ctx, userID, input.SpaceID, input.Week); err != nil {
		return nil, err
	}
	var created []*Presence
	for _, dateStr := range input.Dates {
		date, err := time.Parse("2006-01-02", dateStr)
		if err != nil {
			continue
		}
		p, err := s.repo.Create(ctx, &Presence{
			UserID:  userID,
			SpaceID: input.SpaceID,
			Date:    date,
		})
		if err != nil || p.ID == "" {
			continue
		}
		created = append(created, p)
	}
	return created, nil
}

func (s *Service) GetBySpaceAndWeek(ctx context.Context, spaceID, week string) ([]*Presence, error) {
	return s.repo.FindBySpaceAndWeek(ctx, spaceID, week)
}

func (s *Service) GetByUserAndWeek(ctx context.Context, userID, week string) ([]*Presence, error) {
	return s.repo.FindByUserAndWeek(ctx, userID, week)
}

func (s *Service) Update(ctx context.Context, id, newDate, userID, role string) error {
	p, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return err
	}
	if p == nil {
		return ErrPresenceNotFound
	}
	isAdmin := role == "admin" || role == "super_admin"
	if !isAdmin && p.UserID != userID {
		return ErrForbidden
	}
	return s.repo.Update(ctx, id, newDate)
}

func (s *Service) IsOverCapacity(ctx context.Context, spaceID, date string) (bool, int, int, error) {
	seats, err := s.spaceRepo.GetSeats(ctx, spaceID)
	if err != nil {
		return false, 0, 0, err
	}
	count, err := s.repo.CountBySpaceAndDate(ctx, spaceID, date)
	if err != nil {
		return false, 0, 0, err
	}
	return count > seats, count, seats, nil
}
