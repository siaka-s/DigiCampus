package photo

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Photo struct {
	ID         string    `json:"id"`
	Filename   string    `json:"filename"`
	Caption    string    `json:"caption"`
	OrderIndex int       `json:"order_index"`
	IsActive   bool      `json:"is_active"`
	CreatedAt  time.Time `json:"created_at"`
}

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func scan(rows interface {
	Scan(...any) error
}, p *Photo) error {
	return rows.Scan(&p.ID, &p.Filename, &p.Caption, &p.OrderIndex, &p.IsActive, &p.CreatedAt)
}

func (r *Repository) FindAll(ctx context.Context) ([]*Photo, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, filename, caption, order_index, is_active, created_at
		 FROM campus_photos
		 ORDER BY order_index ASC, created_at DESC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var photos []*Photo
	for rows.Next() {
		p := &Photo{}
		if err := rows.Scan(&p.ID, &p.Filename, &p.Caption, &p.OrderIndex, &p.IsActive, &p.CreatedAt); err != nil {
			return nil, err
		}
		photos = append(photos, p)
	}
	return photos, nil
}

func (r *Repository) FindActive(ctx context.Context) ([]*Photo, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, filename, caption, order_index, is_active, created_at
		 FROM campus_photos
		 WHERE is_active = true
		 ORDER BY order_index ASC, created_at DESC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var photos []*Photo
	for rows.Next() {
		p := &Photo{}
		if err := rows.Scan(&p.ID, &p.Filename, &p.Caption, &p.OrderIndex, &p.IsActive, &p.CreatedAt); err != nil {
			return nil, err
		}
		photos = append(photos, p)
	}
	return photos, nil
}

func (r *Repository) Create(ctx context.Context, p *Photo) (*Photo, error) {
	out := &Photo{}
	err := r.db.QueryRow(ctx,
		`INSERT INTO campus_photos (filename, caption, order_index)
		 VALUES ($1, $2, $3)
		 RETURNING id, filename, caption, order_index, is_active, created_at`,
		p.Filename, p.Caption, p.OrderIndex,
	).Scan(&out.ID, &out.Filename, &out.Caption, &out.OrderIndex, &out.IsActive, &out.CreatedAt)
	return out, err
}

func (r *Repository) Update(ctx context.Context, p *Photo) error {
	_, err := r.db.Exec(ctx,
		`UPDATE campus_photos SET caption=$1, is_active=$2, order_index=$3 WHERE id=$4`,
		p.Caption, p.IsActive, p.OrderIndex, p.ID,
	)
	return err
}

func (r *Repository) Delete(ctx context.Context, id string) (string, error) {
	var filename string
	err := r.db.QueryRow(ctx,
		`DELETE FROM campus_photos WHERE id=$1 RETURNING filename`,
		id,
	).Scan(&filename)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", nil
	}
	return filename, err
}
