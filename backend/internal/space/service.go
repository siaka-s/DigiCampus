package space

import (
	"context"
	"errors"
	"time"
)

var (
	ErrSpaceNotFound = errors.New("espace introuvable")
	ErrInvalidType   = errors.New("type d'espace invalide")
)

var validTypes = map[string]bool{
	"salle_programme":   true,
	"bureau_individuel": true,
	"bureau_partage":    true,
}

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

type CreateInput struct {
	Name           string   `json:"name"            validate:"required"`
	Type           string   `json:"type"            validate:"required"`
	Capacity       int      `json:"capacity"        validate:"min=0"`
	Seats          int      `json:"seats"           validate:"min=0"`
	Location       string   `json:"location"`
	EquipmentFixed []string `json:"equipment_fixed"`
	DepartmentIDs  []string `json:"department_ids"`
}

type UpdateInput struct {
	Name           string   `json:"name"            validate:"required"`
	Type           string   `json:"type"            validate:"required"`
	Capacity       int      `json:"capacity"        validate:"min=0"`
	Seats          int      `json:"seats"           validate:"min=0"`
	Location       string   `json:"location"`
	EquipmentFixed []string `json:"equipment_fixed"`
	DepartmentIDs  []string `json:"department_ids"`
}

func (s *Service) List(ctx context.Context) ([]*Space, error) {
	return s.repo.FindAll(ctx)
}

func (s *Service) Create(ctx context.Context, input CreateInput) (*Space, error) {
	if !validTypes[input.Type] {
		return nil, ErrInvalidType
	}
	if input.EquipmentFixed == nil {
		input.EquipmentFixed = []string{}
	}
	return s.repo.Create(ctx, &Space{
		Name:           input.Name,
		Type:           input.Type,
		Capacity:       input.Capacity,
		Seats:          input.Seats,
		Location:       input.Location,
		EquipmentFixed: input.EquipmentFixed,
	}, input.DepartmentIDs)
}

func (s *Service) Update(ctx context.Context, id string, input UpdateInput) error {
	if !validTypes[input.Type] {
		return ErrInvalidType
	}
	existing, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return err
	}
	if existing == nil {
		return ErrSpaceNotFound
	}
	if input.EquipmentFixed == nil {
		input.EquipmentFixed = []string{}
	}
	return s.repo.Update(ctx, &Space{
		ID:             id,
		Name:           input.Name,
		Type:           input.Type,
		Capacity:       input.Capacity,
		Seats:          input.Seats,
		Location:       input.Location,
		EquipmentFixed: input.EquipmentFixed,
	}, input.DepartmentIDs)
}

func (s *Service) Deactivate(ctx context.Context, id string) error {
	return s.repo.SetActive(ctx, id, false)
}

func (s *Service) GetOccupancy(ctx context.Context, date string) ([]*OccupancyItem, error) {
	return s.repo.GetOccupancy(ctx, date)
}

func (s *Service) GetOccupancyWeek(ctx context.Context, monday string) ([][]*OccupancyItem, error) {
	return s.repo.GetOccupancyWeek(ctx, monday)
}

func (s *Service) GetOccupancyMonth(ctx context.Context, month string) ([]*DailyOccupancyRate, error) {
	return s.repo.GetOccupancyMonth(ctx, month)
}

func (s *Service) FindAvailable(ctx context.Context, startTime time.Time, duration, participants int, endDate string) ([]*Space, error) {
	return s.repo.FindAvailable(ctx, startTime, duration, participants, endDate)
}
