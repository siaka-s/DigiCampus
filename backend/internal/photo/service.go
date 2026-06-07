package photo

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
)

type Service struct {
	repo      *Repository
	uploadDir string
}

func NewService(repo *Repository, uploadDir string) *Service {
	return &Service{repo: repo, uploadDir: uploadDir}
}

func (s *Service) List(ctx context.Context, activeOnly bool) ([]*Photo, error) {
	if activeOnly {
		return s.repo.FindActive(ctx)
	}
	return s.repo.FindAll(ctx)
}

func (s *Service) Upload(ctx context.Context, file multipart.File, header *multipart.FileHeader, caption string) (*Photo, error) {
	ext := strings.ToLower(filepath.Ext(header.Filename))
	allowed := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true}
	if !allowed[ext] {
		return nil, fmt.Errorf("format non autorisé (jpg, png, webp uniquement)")
	}

	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return nil, err
	}
	filename := hex.EncodeToString(b) + ext

	if err := os.MkdirAll(s.uploadDir, 0755); err != nil {
		return nil, err
	}

	dst, err := os.Create(filepath.Join(s.uploadDir, filename))
	if err != nil {
		return nil, err
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		return nil, err
	}

	return s.repo.Create(ctx, &Photo{Filename: filename, Caption: caption})
}

func (s *Service) Update(ctx context.Context, id, caption string, isActive bool, orderIndex int) error {
	return s.repo.Update(ctx, &Photo{
		ID:         id,
		Caption:    caption,
		IsActive:   isActive,
		OrderIndex: orderIndex,
	})
}

func (s *Service) Delete(ctx context.Context, id string) error {
	filename, err := s.repo.Delete(ctx, id)
	if err != nil {
		return err
	}
	if filename != "" {
		os.Remove(filepath.Join(s.uploadDir, filename))
	}
	return nil
}
