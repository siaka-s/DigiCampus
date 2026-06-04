package user

import (
	"context"
	"errors"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrEmailTaken     = errors.New("cet email est déjà utilisé")
	ErrInvalidCreds   = errors.New("email ou mot de passe incorrect")
	ErrAccountPending = errors.New("compte en attente de validation")
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

type RegisterInput struct {
	Email    string `json:"email"    validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
	Honeypot string `json:"website"  validate:"-"`
}

type LoginInput struct {
	Email    string `json:"email"    validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

func (s *Service) Register(ctx context.Context, input RegisterInput) error {
	existing, err := s.repo.FindByEmail(ctx, input.Email)
	if err != nil {
		return err
	}
	if existing != nil {
		return ErrEmailTaken
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	_, err = s.repo.Create(ctx, input.Email, string(hash), "collaborateur_digifemmes")
	return err
}

func (s *Service) Login(ctx context.Context, input LoginInput) (string, error) {
	u, err := s.repo.FindByEmail(ctx, input.Email)
	if err != nil {
		return "", err
	}
	if u == nil {
		return "", ErrInvalidCreds
	}

	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(input.Password)); err != nil {
		return "", ErrInvalidCreds
	}

	if !u.IsActive {
		return "", ErrAccountPending
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":  u.ID,
		"role": u.Role,
		"exp":  time.Now().Add(24 * time.Hour).Unix(),
	})

	return token.SignedString([]byte(os.Getenv("JWT_SECRET")))
}
