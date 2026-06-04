package equipment

import (
	"context"
	"errors"
	"time"
)

var (
	ErrNotFound   = errors.New("ressource introuvable")
	ErrNotPending = errors.New("seules les demandes en attente peuvent être modifiées")
)

type Service struct{ repo *Repository }

func NewService(repo *Repository) *Service { return &Service{repo: repo} }

type CreateEquipmentInput struct {
	Type string `json:"type" validate:"required"`
	Name string `json:"name" validate:"required"`
}

type UpdateEquipmentInput struct {
	Status     string  `json:"status"`
	AssignedTo *string `json:"assigned_to"`
	ReturnDate *string `json:"return_date"`
}

type CreateRequestInput struct {
	Type      string `json:"type"       validate:"required"`
	Mission   string `json:"mission"`
	Location  string `json:"location"`
	StartDate string `json:"start_date" validate:"required"`
	EndDate   string `json:"end_date"   validate:"required"`
}

func (s *Service) ListEquipment(ctx context.Context) ([]*Equipment, error) {
	return s.repo.FindAll(ctx)
}

func (s *Service) AddEquipment(ctx context.Context, input CreateEquipmentInput) (*Equipment, error) {
	return s.repo.Create(ctx, &Equipment{Type: input.Type, Name: input.Name, Status: "disponible"})
}

func (s *Service) UpdateEquipment(ctx context.Context, id string, input UpdateEquipmentInput) error {
	var returnDate *time.Time
	if input.ReturnDate != nil && *input.ReturnDate != "" {
		t, err := time.Parse("2006-01-02", *input.ReturnDate)
		if err == nil {
			returnDate = &t
		}
	}
	return s.repo.UpdateEquipment(ctx, id, input.Status, input.AssignedTo, returnDate)
}

func (s *Service) CreateRequest(ctx context.Context, input CreateRequestInput, userID string) (*Request, error) {
	start, err := time.Parse("2006-01-02", input.StartDate)
	if err != nil {
		return nil, errors.New("date de début invalide")
	}
	end, err := time.Parse("2006-01-02", input.EndDate)
	if err != nil {
		return nil, errors.New("date de fin invalide")
	}
	var mission, location *string
	if input.Mission != "" {
		mission = &input.Mission
	}
	if input.Location != "" {
		location = &input.Location
	}
	return s.repo.CreateRequest(ctx, &Request{
		UserID:    userID,
		Type:      input.Type,
		Mission:   mission,
		Location:  location,
		StartDate: start,
		EndDate:   end,
	})
}

func (s *Service) ListRequests(ctx context.Context, userID, role string) ([]*Request, error) {
	return s.repo.FindRequests(ctx, userID, role)
}

func (s *Service) Validate(ctx context.Context, id string) error {
	req, err := s.repo.FindRequestByID(ctx, id)
	if err != nil {
		return err
	}
	if req == nil {
		return ErrNotFound
	}
	if req.Status != "en_attente" {
		return ErrNotPending
	}
	return s.repo.UpdateRequestStatus(ctx, id, "validee", nil)
}

func (s *Service) Refuse(ctx context.Context, id, comment string) error {
	req, err := s.repo.FindRequestByID(ctx, id)
	if err != nil {
		return err
	}
	if req == nil {
		return ErrNotFound
	}
	if req.Status != "en_attente" {
		return ErrNotPending
	}
	return s.repo.UpdateRequestStatus(ctx, id, "refusee", &comment)
}

func (s *Service) CloseRental(ctx context.Context, id string) error {
	req, err := s.repo.FindRequestByID(ctx, id)
	if err != nil {
		return err
	}
	if req == nil {
		return ErrNotFound
	}
	return s.repo.UpdateRequestStatus(ctx, id, "cloturee", nil)
}

func (s *Service) GetOverdueRentals(ctx context.Context) ([]*Request, error) {
	today := time.Now().Format("2006-01-02")
	return s.repo.FindOverdueRentals(ctx, today)
}
