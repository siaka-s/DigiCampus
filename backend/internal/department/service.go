package department

import "context"

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) List(ctx context.Context) ([]*Department, error) {
	return s.repo.FindAll(ctx)
}

func (s *Service) ListActive(ctx context.Context) ([]*Department, error) {
	return s.repo.FindActive(ctx)
}

var validCategories = map[string]bool{
	"interne":    true,
	"partenaire": true,
}

func (s *Service) Create(ctx context.Context, name, category string) (*Department, error) {
	if !validCategories[category] {
		category = "interne"
	}
	return s.repo.Create(ctx, name, category)
}

func (s *Service) Update(ctx context.Context, id, name string) error {
	return s.repo.Update(ctx, id, name)
}

func (s *Service) Deactivate(ctx context.Context, id string) error {
	return s.repo.SetActive(ctx, id, false)
}

func (s *Service) Activate(ctx context.Context, id string) error {
	return s.repo.SetActive(ctx, id, true)
}
