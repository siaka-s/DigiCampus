package event

import "context"

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) ListUpcoming(ctx context.Context) ([]*PublicEvent, error) {
	return s.repo.ListUpcoming(ctx)
}

func (s *Service) ListAll(ctx context.Context) ([]*Event, error) {
	return s.repo.ListAll(ctx)
}

func (s *Service) Create(ctx context.Context, input CreateInput, createdBy string) (*Event, error) {
	return s.repo.Create(ctx, input, createdBy)
}

func (s *Service) Update(ctx context.Context, id string, input UpdateInput) error {
	return s.repo.Update(ctx, id, input)
}

func (s *Service) Publish(ctx context.Context, id string) error {
	return s.repo.SetPublished(ctx, id, true)
}

func (s *Service) Unpublish(ctx context.Context, id string) error {
	return s.repo.SetPublished(ctx, id, false)
}

func (s *Service) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}
