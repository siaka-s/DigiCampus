package notification

import (
	"context"
	"log/slog"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Create(ctx context.Context, userID, notifType, message string, referenceID *string) {
	n := &Notification{
		UserID:      userID,
		Type:        notifType,
		Message:     message,
		ReferenceID: referenceID,
	}
	if err := s.repo.Create(ctx, n); err != nil {
		slog.Warn("create notification", "erreur", err)
	}
}

func (s *Service) List(ctx context.Context, userID string) ([]*Notification, error) {
	return s.repo.FindByUser(ctx, userID)
}

func (s *Service) MarkRead(ctx context.Context, id, userID string) error {
	return s.repo.MarkRead(ctx, id, userID)
}

func (s *Service) MarkAllRead(ctx context.Context, userID string) error {
	return s.repo.MarkAllRead(ctx, userID)
}
